import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../store/AuthContext';
import { Scissors, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import './Login.css';

const loginSchema = zod.object({
  username: zod.string().min(1, 'Username tidak boleh kosong'),
  password: zod.string().min(1, 'Password tidak boleh kosong'),
  remember: zod.boolean()
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      remember: false
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    const success = await login(data.username, data.password, data.remember);
    setIsSubmitting(false);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-background-overlay" />
      
      <motion.div 
        className="login-card glass-panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="login-header">
          <div className="login-logo-container animate-pulse-gold">
            <Scissors size={28} className="login-logo-icon" />
          </div>
          <h2 className="login-title">
            Barber<span className="gold-text">Go!</span>
          </h2>
          <p className="login-subtitle">Smart Barbershop Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="input-with-icon">
              <UserIcon size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                className={`form-input icon-padding ${errors.username ? 'error-border' : ''}`}
                placeholder="Masukkan username"
                {...register('username')}
              />
            </div>
            {errors.username && <span className="form-error">{errors.username.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input icon-padding ${errors.password ? 'error-border' : ''}`}
                placeholder="Masukkan password"
                {...register('password')}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className="login-options">
            <label className="checkbox-container">
              <input type="checkbox" {...register('remember')} />
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
        </form>

        <div className="login-footer">
          <p>Created by Fazaa 2026 | XII PPLG 1</p>
          <p className="credentials-info">
            Default: admin/admin123 | kasir/kasir123
          </p>
        </div>
      </motion.div>
    </div>
  );
};
