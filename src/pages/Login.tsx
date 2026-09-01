import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../store/AuthContext';
import { sound } from '../utils/audio';
import { db } from '../database/db';
import { hashPassword } from '../utils/crypto';
import { Scissors, Lock, User as UserIcon, Mail, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import './Login.css';

// Zod Schema for Login (Username or Real Email)
const loginSchema = zod.object({
  identity: zod.string().min(1, 'Username atau Email tidak boleh kosong'),
  password: zod.string().min(1, 'Password tidak boleh kosong'),
  remember: zod.boolean()
});

// Zod Schema for Customer Registration (Strict Real Email required)
const registerSchema = zod.object({
  name: zod.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: zod.string().email('Format email tidak valid. Gunakan email beneran (contoh: user@gmail.com)'),
  password: zod.string().min(6, 'Password minimal 6 karakter')
});

type LoginFormValues = zod.infer<typeof loginSchema>;
type RegisterFormValues = zod.infer<typeof registerSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Mode state: 'login' or 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form hook for Login
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identity: '',
      password: '',
      remember: true
    }
  });

  // Form hook for Register
  const {
    register: registerReg,
    handleSubmit: handleSubmitReg,
    formState: { errors: regErrors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: ''
    }
  });

  // Handle Login Submit
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    const success = await login(data.identity, data.password, data.remember);
    setIsSubmitting(false);
    
    if (success) {
      // Role-based redirection
      const savedUser = localStorage.getItem('barberflow_user') || sessionStorage.getItem('barberflow_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'cashier') {
          navigate('/cashier');
        } else if (parsed.role === 'customer') {
          navigate('/booking');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
  };

  // Handle Customer Registration Submit
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const passHash = await hashPassword(data.password);
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');

      // Check if email already exists in local DB or API
      const allUsers = await db.users.toArray();
      const existing = allUsers.find((u: any) => 
        (u.email && u.email.toLowerCase() === data.email.toLowerCase()) || 
        (u.username && u.username.toLowerCase() === data.email.toLowerCase())
      );
      if (existing) {
        sound.playError();
        toast.error('Email ini sudah terdaftar. Silakan login.');
        setIsSubmitting(false);
        return;
      }

      // Generate username from email
      const username = data.email.split('@')[0] + Math.floor(100 + Math.random() * 900);
      const newId = Date.now();
      const newUserObj: User & { id: number } = {
        id: newId,
        username,
        email: data.email,
        name: data.name,
        passwordHash: passHash,
        role: 'customer',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // 1. Send to Backend API if available
      try {
        await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            passwordHash: passHash
          })
        });
      } catch (_e) {
        console.warn('Backend API unavailable, account saved locally');
      }

      // 2. Save in Local DB (IndexedDB / MockTable)
      await db.users.add(newUserObj);

      // 3. Set Session active user immediately
      const sessionData = JSON.stringify(newUserObj);
      localStorage.setItem('barberflow_user', sessionData);
      sessionStorage.setItem('barberflow_user', sessionData);

      sound.playSuccess();
      toast.success(`Akun berhasil dibuat! Selamat datang, ${data.name}! 🎉`);

      // 4. Instant redirect to /booking page
      setTimeout(() => {
        window.location.href = '/booking';
      }, 500);

    } catch (err: any) {
      console.error('Register Error:', err);
      sound.playError();
      toast.error(err.message || 'Gagal mendaftar akun. Coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-background-overlay" />
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '100%', maxWidth: '440px', padding: '1rem' }}>
        <motion.div 
          className="login-card glass-panel"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="login-header">
            <div className="login-logo-container">
              <Scissors size={24} className="login-logo-icon" />
            </div>
            <h2 className="login-title">
              Classic Barber Go
            </h2>
            <p className="login-subtitle">PREMIUM GROOMING & POS SYSTEM</p>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{ 
            display: 'flex', 
            background: '#18181B', 
            borderRadius: '10px', 
            padding: '4px', 
            marginBottom: '1.5rem',
            border: '1px solid #27272A'
          }}>
            <button
              type="button"
              onClick={() => {
                sound.playNav();
                setMode('login');
              }}
              style={{
                flex: 1,
                padding: '0.6rem 0',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: mode === 'login' ? '#D4AF37' : 'transparent',
                color: mode === 'login' ? '#000000' : '#A1A1AA',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <LogIn size={15} />
              <span>Masuk (Login)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playNav();
                setMode('register');
              }}
              style={{
                flex: 1,
                padding: '0.6rem 0',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: mode === 'register' ? '#D4AF37' : 'transparent',
                color: mode === 'register' ? '#000000' : '#A1A1AA',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <UserPlus size={15} />
              <span>Daftar Akun</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              /* LOGIN FORM */
              <motion.form 
                key="login-form"
                className="login-form" 
                onSubmit={handleSubmitLogin(onLoginSubmit)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="form-group">
                  <label className="form-label uppercase-label" htmlFor="identity">USERNAME ATAU EMAIL BENERAN</label>
                  <div className="input-with-icon">
                    <UserIcon size={18} className="input-icon" />
                    <input
                      id="identity"
                      type="text"
                      className={`form-input icon-padding ${loginErrors.identity ? 'error-border' : ''}`}
                      placeholder="Admin/Kasir atau email@domain.com"
                      {...registerLogin('identity')}
                    />
                  </div>
                  {loginErrors.identity && <span className="form-error">{loginErrors.identity.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label uppercase-label" htmlFor="password">PASSWORD</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input icon-padding ${loginErrors.password ? 'error-border' : ''}`}
                      placeholder="Masukkan password"
                      {...registerLogin('password')}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => {
                        sound.playBeep(700, 0.05);
                        setShowPassword(!showPassword);
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginErrors.password && <span className="form-error">{loginErrors.password.message}</span>}
                </div>

                <div className="login-options">
                  <label className="checkbox-container" onClick={() => sound.playBeep(880, 0.05)}>
                    <input type="checkbox" {...registerLogin('remember')} />
                    <span className="checkmark" />
                    <span className="checkbox-label">Ingat Saya</span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary login-submit-btn" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="login-spinner"></div>
                  ) : (
                    'Masuk Aplikasi'
                  )}
                </button>
              </motion.form>
            ) : (
              /* REGISTER FORM (CUSTOMER) */
              <motion.form 
                key="register-form"
                className="login-form" 
                onSubmit={handleSubmitReg(onRegisterSubmit)}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <div className="form-group">
                  <label className="form-label uppercase-label" htmlFor="regName">NAMA LENGKAP</label>
                  <div className="input-with-icon">
                    <UserIcon size={18} className="input-icon" />
                    <input
                      id="regName"
                      type="text"
                      className={`form-input icon-padding ${regErrors.name ? 'error-border' : ''}`}
                      placeholder="Contoh: Budi Santoso"
                      {...registerReg('name')}
                    />
                  </div>
                  {regErrors.name && <span className="form-error">{regErrors.name.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label uppercase-label" htmlFor="regEmail">EMAIL BENERAN</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="regEmail"
                      type="email"
                      className={`form-input icon-padding ${regErrors.email ? 'error-border' : ''}`}
                      placeholder="contoh: nama@gmail.com"
                      {...registerReg('email')}
                    />
                  </div>
                  {regErrors.email && <span className="form-error">{regErrors.email.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label uppercase-label" htmlFor="regPassword">PASSWORD AKUN</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="regPassword"
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input icon-padding ${regErrors.password ? 'error-border' : ''}`}
                      placeholder="Minimal 6 karakter"
                      {...registerReg('password')}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => {
                        sound.playBeep(700, 0.05);
                        setShowPassword(!showPassword);
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {regErrors.password && <span className="form-error">{regErrors.password.message}</span>}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary login-submit-btn" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="login-spinner"></div>
                  ) : (
                    'Daftar Akun & Booking'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="login-outer-footer">
          Created by Fazaa 2026 | XII PPLG 1
        </p>
      </div>
    </div>
  );
};
