import React, { useState } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Review } from '../types';
import { 
  Star, 
  Scissors, 
  MessageSquarePlus, 
  Clock, 
  Award, 
  Sparkles, 
  Gift, 
  Phone, 
  Lock,
  ThumbsUp,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Coffee,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import { Link } from 'react-router-dom';
import './PublicLanding.css';

const QUICK_TAG_OPTIONS = [
  'Hasil Presisi & Rapi ✂️',
  'Pelayanan Sangat Ramah 😊',
  'Handuk Hangat Segar 🧼',
  'Pengerjaan Cepat & On-Time ⚡',
  'Sesuai Request Gaya 💈',
  'Konsultasi Gaya Ramah 💬',
  'Tempat Bersih & Steril 🌿',
  'Sangat Rekomendasi ⭐'
];

export const PublicLanding: React.FC = () => {
  // DB Queries
  const dbSettings = useLiveQuery(() => db.settings.get());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());
  const reviews = useLiveQuery(() => db.reviews.toArray());

  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);

  // Active Barbers & Services
  const activeBarbers = barbers?.filter(b => b.isActive) || [];
  const activeServices = services?.filter(s => s.isActive) || [];

  // Default Barber Portraits Mapping if not uploaded
  const getBarberPortrait = (name: string, uploadedPhoto?: string) => {
    if (uploadedPhoto && uploadedPhoto.length > 5) return uploadedPhoto;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('faiz')) return '/images/barber_faiz.jpg';
    if (lowerName.includes('fadli')) return '/images/barber_fadli.jpg';
    if (lowerName.includes('rizki')) return '/images/barber_rizki.jpg';
    return '/images/barber_faiz.jpg';
  };

  // Specialization Titles
  const getBarberSpecialty = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('faiz')) return 'Master Fade & Sculpting';
    if (lowerName.includes('fadli')) return 'Senior Classic Stylist';
    if (lowerName.includes('rizki')) return 'Precision Taper & Beard';
    return 'Professional Grooming Specialist';
  };

  // Calculate Barber Average Rating
  const getBarberRating = (barberId?: number) => {
    if (!barberId || !reviews) return { avg: 5.0, count: 0 };
    const barberReviews = reviews.filter(r => r.barberId === barberId);
    if (barberReviews.length === 0) return { avg: 5.0, count: 0 };
    const sum = barberReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      avg: Number((sum / barberReviews.length).toFixed(1)),
      count: barberReviews.length
    };
  };

  // Overall Shop Rating
  const totalReviewsCount = reviews?.length || 0;
  const overallAvgRating = totalReviewsCount > 0 
    ? Number((reviews!.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)) 
    : 5.0;

  // Toggle Tag Selection
  const toggleTag = (tag: string) => {
    sound.playBeep(850);
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      sound.playError();
      toast.error('Silakan isi nama Anda terlebih dahulu');
      return;
    }
    if (!selectedBarberId) {
      sound.playError();
      toast.error('Silakan pilih staf barber yang melayani Anda');
      return;
    }

    try {
      setIsSubmitting(true);
      const newReview: Review = {
        customerName: customerName.trim(),
        barberId: selectedBarberId,
        rating,
        comment: comment.trim(),
        tags: selectedTags.join(', '),
        createdAt: Date.now()
      };

      await db.reviews.add(newReview);
      
      sound.playKaching();
      setShowRewardModal(true);

      // Reset form
      setCustomerName('');
      setSelectedBarberId(null);
      setRating(5);
      setSelectedTags([]);
      setComment('');
    } catch (err) {
      console.error(err);
      sound.playError();
      toast.error('Gagal mengirim ulasan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    sound.playNav();
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="public-landing-container">
      {/* NAVBAR */}
      <nav className="public-navbar">
        <a href="#beranda" className="public-nav-brand">
          {dbSettings?.logo ? (
            <img src={dbSettings.logo} alt="Logo" className="brand-logo-img" />
          ) : (
            <div className="brand-logo-fallback">✂</div>
          )}
          <span className="brand-title gold-gradient-text">{dbSettings?.name || 'Classic BarberGo'}</span>
        </a>

        <div className="public-nav-links">
          <span onClick={() => scrollToSection('beranda')} className="public-nav-link">Beranda</span>
          <span onClick={() => scrollToSection('what-we-do')} className="public-nav-link">Layanan</span>
          <span onClick={() => scrollToSection('about')} className="public-nav-link">Tentang Kami</span>
          <span onClick={() => scrollToSection('barber')} className="public-nav-link">Staf Barber</span>
          <span onClick={() => scrollToSection('ulasan')} className="public-nav-link">Ulasan</span>
          <span onClick={() => scrollToSection('form-ulasan')} className="public-nav-link" style={{ color: '#FACC15', fontWeight: 800 }}>+ Beri Rating</span>
        </div>

        {/* Hidden / Discreet Staff Login Button */}
        <Link to="/login" className="discreet-staff-btn" title="Akses Portal Internal Staf Kasir / Admin">
          <Lock size={13} />
          <span>Staff Login</span>
        </Link>
      </nav>

      {/* HERO SECTION (CINEMATIC MOODY VINTAGE BARBERSHOP MATCHING REFERENCE) */}
      <section id="beranda" className="public-hero-cinematic">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Classic Barber Go — Gentlemen's Grooming Sanctuary</span>
          </div>

          <h1 className="hero-vintage-title">
            BARBER <span>SHOP</span>
          </h1>

          <p className="hero-vintage-subtitle">
            A man's haircut defines the image and emphasizes its strengths. Entrust the formation of your style to master professionals at {dbSettings?.name || 'Classic BarberGo'}.
          </p>

          <div className="hero-cta-buttons">
            <button onClick={() => scrollToSection('form-ulasan')} className="hero-order-btn">
              <Star size={18} fill="#FFF" />
              <span>BERI RATING & REVIEW</span>
            </button>

            <button onClick={() => scrollToSection('what-we-do')} className="hero-gold-btn">
              <Scissors size={18} />
              <span>KATALOG LAYANAN</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* WHAT WE DO SECTION (MATCHING REFERENCE IMAGE) */}
      <section id="what-we-do" className="public-section">
        <div className="section-header-center">
          <span className="section-tag">MENU LAYANAN UTAMA</span>
          <h2 className="section-title">WHAT WE <span>DO</span></h2>
          <p className="section-desc">Layanan pangkas rambut, shaving razor, dan perawatan pria presisi tinggi.</p>
        </div>

        <div className="what-we-do-container">
          {/* Left Side: Services Accordion */}
          <div className="service-accordion-list">
            {activeServices.map(srv => {
              const isExpanded = expandedServiceId === srv.id;
              return (
                <div 
                  key={srv.id} 
                  className={`accordion-item ${isExpanded ? 'active' : ''}`}
                  onClick={() => {
                    sound.playNav();
                    setExpandedServiceId(isExpanded ? null : (srv.id || null));
                  }}
                >
                  <div className="accordion-header">
                    <div className="accordion-title-wrap">
                      {isExpanded ? <ChevronUp size={18} className="gold-text" /> : <ChevronDown size={18} color="#a1a1aa" />}
                      <span className="accordion-title">{srv.name}</span>
                    </div>

                    <div className="accordion-price-tag">
                      {dbSettings?.currency || 'Rp'} {srv.price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div 
                      className="accordion-content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <p style={{ margin: '0 0 6px 0' }}>
                        Layanan pangkas profesional {srv.category} dengan estimasi pengerjaan <strong>{srv.duration} Menit</strong>. Menggunakan alat steril & produk grooming berkualitas tinggi.
                      </p>
                      <span style={{ fontSize: '0.82rem', color: '#FACC15', fontWeight: 700 }}>
                        Termasuk: Konsultasi gaya + Hair tonic segar + Handuk hangat steril.
                      </span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Side: High Resolution Interior Photo */}
          <div className="interior-photo-frame">
            <img src="/images/barber_interior.jpg" alt="Barbershop Interior" />
          </div>
        </div>
      </section>

      {/* ULTRA RICH ABOUT CLASSIC BARBERGO SECTION */}
      <section id="about" className="public-section">
        <div className="about-luxury-wrapper">
          <div className="section-header-center" style={{ marginBottom: '2.5rem' }}>
            <span className="section-tag">LEGACY & CRAFTSMANSHIP</span>
            <h2 className="section-title">TENTANG <span>CLASSIC BARBERGO</span></h2>
            <p className="section-desc">Bukan Sekadar Cukur, Ini Adalah Ritual Grooming Pria Sejati.</p>
          </div>

          <div className="about-columns-grid">
            {/* Story & Philosophy */}
            <div className="about-story-box">
              <p className="about-lead-text">
                Didirikan di Semarang, {dbSettings?.name || 'Classic BarberGo'} hadir untuk mendefinisikan ulang standar perawatan pria. Kami memadukan tradisi cukur klasik dengan kenyamanan tempat bernuansa *Luxury Vintage*.
              </p>
              
              <p className="about-body-text">
                Setiap pelanggan yang datang tidak hanya mendapatkan potongan rambut presisi, tetapi juga menikmati ketenangan suasana *Gentlemen's Lounge*, aroma hair tonic premium, dan pelayanan ramah dari staf barber bersertifikat berpengalaman.
              </p>

              {/* 4 Core Pillars */}
              <div className="pillars-grid">
                <div className="pillar-card">
                  <div className="pillar-icon">
                    <Scissors size={22} />
                  </div>
                  <h4 className="pillar-title">Master Craftsmen</h4>
                  <p className="pillar-desc">Barber bersertifikat dengan jam terbang tinggi menguasai fade & classic cuts.</p>
                </div>

                <div className="pillar-card">
                  <div className="pillar-icon">
                    <ShieldCheck size={22} />
                  </div>
                  <h4 className="pillar-title">100% Higienis</h4>
                  <p className="pillar-desc">Disinfeksi UV-C untuk tiap silet & handuk hangat sekali pakai.</p>
                </div>

                <div className="pillar-card">
                  <div className="pillar-icon">
                    <Coffee size={22} />
                  </div>
                  <h4 className="pillar-title">Luxury Sanctuary</h4>
                  <p className="pillar-desc">Ruang AC nyaman, WiFi kencang, dan sajian minuman kopi hangat gratis.</p>
                </div>

                <div className="pillar-card">
                  <div className="pillar-icon">
                    <Award size={22} />
                  </div>
                  <h4 className="pillar-title">Garansi Puas</h4>
                  <p className="pillar-desc">Jaminan re-touch gratis jika hasil cukur kurang sesuai dalam 3 hari.</p>
                </div>
              </div>
            </div>

            {/* Location & Contact Box */}
            <div className="location-card">
              <h3 style={{ fontSize: '1.35rem', color: '#FACC15', margin: 0, fontWeight: 900, fontFamily: 'Georgia, serif' }}>
                Lokasi & Jam Operasional
              </h3>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <MapPin size={24} className="gold-text" style={{ flexShrink: 0, marginTop: '3px' }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#FFF', fontSize: '1.05rem', fontWeight: 800 }}>Alamat Barbershop</h4>
                  <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    {dbSettings?.address || 'Jl. Mr. Koesbiyono Tjondrowibowo, Patemon, Kec. Gunungpati, Kota Semarang, Jawa Tengah'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Phone size={24} className="gold-text" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#FFF', fontSize: '1.05rem', fontWeight: 800 }}>WhatsApp Direct Booking</h4>
                  <a 
                    href={`https://wa.me/${dbSettings?.phone?.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#FACC15', textDecoration: 'none', fontWeight: 800, fontSize: '1rem' }}
                  >
                    {dbSettings?.phone || '0812-3456-7890'} (Chat CS)
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Clock size={24} className="gold-text" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#FFF', fontSize: '1.05rem', fontWeight: 800 }}>Jam Layanan</h4>
                  <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.92rem' }}>
                    Buka Setiap Hari: 09.00 - 21.00 WIB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Counter Row */}
          <div className="about-stats-row">
            <div>
              <div className="stat-number">12.500+</div>
              <div className="stat-label">Pelanggan Setia Servis</div>
            </div>
            <div>
              <div className="stat-number">4.9 / 5.0</div>
              <div className="stat-label">Skor Kepuasan Pelanggan</div>
            </div>
            <div>
              <div className="stat-number">100%</div>
              <div className="stat-label">Standar Sterilisasi UV-C</div>
            </div>
            <div>
              <div className="stat-number">3</div>
              <div className="stat-label">Master Barber Specialist</div>
            </div>
          </div>
        </div>
      </section>

      {/* STAF BARBER SECTION */}
      <section id="barber" className="public-section">
        <div className="section-header-center">
          <span className="section-tag">TIM STAF BARBER PANGKAS</span>
          <h2 className="section-title">OUR <span>MASTERS</span></h2>
          <p className="section-desc">Pangkas rambut berpengalaman yang siap mewujudkan potongan impian Anda.</p>
        </div>

        <div className="public-barbers-grid">
          {activeBarbers.map(barber => {
            const ratingData = getBarberRating(barber.id);
            const portraitUrl = getBarberPortrait(barber.name, barber.photo);
            const specialty = getBarberSpecialty(barber.name);

            return (
              <div key={barber.id} className="public-barber-card">
                <div className="barber-avatar-wrap">
                  <img src={portraitUrl} alt={barber.name} className="barber-avatar-img" />
                </div>

                <h3 className="barber-name">{barber.name}</h3>
                <p className="barber-shift" style={{ color: '#FACC15', fontWeight: 700 }}>{specialty}</p>

                <div className="barber-rating-badge">
                  <Star size={15} fill="#FACC15" color="#FACC15" />
                  <span>{ratingData.avg} ({ratingData.count} Ulasan)</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* REVIEWS & FEEDBACK FEED */}
      <section id="ulasan" className="public-section">
        <div className="section-header-center">
          <span className="section-tag">TESTIMONI PELANGGAN</span>
          <h2 className="section-title">CUSTOMER <span>REVIEWS</span></h2>
          <p className="section-desc">Ulasan nyata dari para pelanggan yang telah mempercayakan ketampanannya di {dbSettings?.name || 'Classic BarberGo'}.</p>
        </div>

        {/* Summary Card */}
        <div className="reviews-summary-card">
          <div className="summary-score-box">
            <div className="score-number">{overallAvgRating}</div>
            <div className="score-stars">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={22} fill={s <= Math.round(overallAvgRating) ? '#FACC15' : 'none'} color="#FACC15" />
              ))}
            </div>
            <div className="score-count">Berdasarkan {totalReviewsCount} Ulasan Pelanggan</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Award size={40} className="gold-gradient-text" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#FFF' }}>Standar Mutu Terjamin</h4>
            <p style={{ fontSize: '0.88rem', color: '#a1a1aa', margin: '4px 0 0 0' }}>Garansi kerapihan potongan & kepuasan pelanggan 100%</p>
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="reviews-feed-grid">
          {reviews && reviews.length > 0 ? (
            reviews.slice(0, 6).map(rev => (
              <div key={rev.id} className="review-feed-card">
                <div>
                  <div className="review-card-header">
                    <div>
                      <div className="reviewer-name">{rev.customerName}</div>
                      <div className="reviewer-barber">
                        Melayani oleh: <strong>{rev.barber?.name || 'Staf Barber'}</strong>
                      </div>
                    </div>

                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={15} fill={s <= rev.rating ? '#FACC15' : 'none'} color="#FACC15" />
                      ))}
                    </div>
                  </div>

                  {rev.comment && <p className="review-comment">"{rev.comment}"</p>}

                  {rev.tags && (
                    <div className="review-tags">
                      {rev.tags.split(',').map((tag, i) => (
                        <span key={i} className="review-tag-pill">{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="review-date">
                  {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem', color: '#71717a' }}>
              <MessageSquarePlus size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: '#D4AF37' }} />
              <p style={{ fontSize: '1rem', color: '#a1a1aa' }}>Belum ada ulasan. Berikan rating dan dapatkan voucher diskon Anda!</p>
            </div>
          )}
        </div>
      </section>

      {/* FORM BERI ULASAN INTERAKTIF WITH REAL BARBER PORTRAIT CARDS */}
      <section id="form-ulasan" className="public-section">
        <div className="section-header-center">
          <span className="section-tag">BERIKAN PENILAIAN ANDA</span>
          <h2 className="section-title">FORM <span>RATING & ULASAN</span></h2>
          <p className="section-desc">Pilih staf barber yang melayani Anda, beri rating bintang, dan dapatkan voucher diskon spesial.</p>
        </div>

        <div className="review-form-card">
          <form onSubmit={handleSubmitReview}>
            {/* 1. REAL BARBER STAFF PORTRAIT SELECTION CARDS */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ textAlign: 'center', display: 'block', fontSize: '1.1rem', fontWeight: 900, color: '#FACC15', letterSpacing: '0.5px' }}>
                1. Pilih Barber yang Melayani Anda
              </label>
              
              <div className="barber-staff-selection-grid">
                {activeBarbers.slice(0, 3).map(b => {
                  const ratingData = getBarberRating(b.id);
                  const isSelected = selectedBarberId === b.id;
                  const portraitUrl = getBarberPortrait(b.name, b.photo);
                  const specialty = getBarberSpecialty(b.name);

                  return (
                    <div
                      key={b.id}
                      className={`barber-staff-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        sound.playNav();
                        setSelectedBarberId(b.id || null);
                      }}
                    >
                      {isSelected && (
                        <div className="barber-selected-badge">
                          <Check size={16} />
                        </div>
                      )}

                      <div className="barber-portrait-wrap">
                        <img src={portraitUrl} alt={b.name} className="barber-portrait-img" />
                      </div>

                      <div className="barber-staff-name">{b.name}</div>
                      <div className="barber-staff-specialty">{specialty}</div>

                      <div className="barber-staff-rating-pill">
                        <Star size={14} fill="#FACC15" color="#FACC15" />
                        <span>{ratingData.avg} ★ ({ratingData.count} Ulasan)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Star Rating Picker */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 700, color: '#e4e4e7' }}>2. Berapa Bintang Kepuasan Anda?</label>
              <div className="star-rating-selector">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`star-btn ${s <= (hoverRating || rating) ? 'active' : ''}`}
                    onClick={() => {
                      sound.playBeep(900 + s * 100);
                      setRating(s);
                    }}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star size={44} fill={s <= (hoverRating || rating) ? '#FACC15' : 'none'} color="#FACC15" />
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '1rem', color: '#FACC15', fontWeight: 900 }}>
                {rating === 5 && 'Sangat Puas ⭐⭐⭐⭐⭐'}
                {rating === 4 && 'Puas ⭐⭐⭐⭐'}
                {rating === 3 && 'Cukup Puas ⭐⭐⭐'}
                {rating === 2 && 'Kurang Puas ⭐⭐'}
                {rating === 1 && 'Perlu Perbaikan ⭐'}
              </span>
            </div>

            {/* 3. Customer Name */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">3. Nama Lengkap Anda</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padding"
                  placeholder="Contoh: Budi Santoso"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 4. Quick Experience Impression Tags */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">4. Apa Kesan Terbaik Pelayanan Kami?</label>
              <div className="tag-options-grid">
                {QUICK_TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-select-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Comment Area */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">5. Komentar / Catatan Ulasan (Opsional)</label>
              <textarea
                className="form-input textarea-input"
                rows={3}
                placeholder="Tuliskan ulasan atau masukan pengalaman Anda..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '1.1rem', fontSize: '1.15rem', fontWeight: 900, display: 'flex', justifyContent: 'center', gap: '0.75rem', borderRadius: '14px' }}
            >
              <ThumbsUp size={22} />
              <span>{isSubmitting ? 'Mengirim Ulasan...' : 'KIRIM ULASAN PELANGGAN'}</span>
            </button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="public-footer">
        <div className="footer-brand">{dbSettings?.name || 'Classic BarberGo'}</div>
        <p className="footer-info">
          {dbSettings?.address || 'Jl. Mr. Koesbiyono Tjondrowibowo, Patemon, Kec. Gunungpati, Semarang'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {dbSettings?.phone && (
            <a 
              href={`https://wa.me/${dbSettings.phone.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: '#FACC15', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: 700 }}
            >
              <Phone size={16} />
              <span>WhatsApp Direct Chat: {dbSettings.phone}</span>
            </a>
          )}
        </div>

        <div className="footer-bottom-flex">
          <div>© 2026 Classic BarberGo. Created by Fazaa | XII PPLG 1</div>
          
          {/* Subtle discreet staff portal link in footer */}
          <Link to="/login" style={{ color: '#52525b', textDecoration: 'none', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={12} />
            <span>Akses Internal Staf</span>
          </Link>
        </div>
      </footer>

      {/* REWARD MODAL POPUP */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="reward-modal-overlay">
            <motion.div 
              className="reward-modal-card"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="reward-icon-ring">
                <Gift size={40} />
              </div>

              <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem 0', color: '#ffffff', fontWeight: 900 }}>
                Terima Kasih Banyak! 🎉
              </h2>

              <p style={{ fontSize: '0.92rem', color: '#a1a1aa', margin: 0, lineHeight: 1.55 }}>
                Ulasan Anda sangat berharga bagi kami. Sebagai bentuk apresiasi, tunjukkan kode voucher berikut saat mencukur berikutnya:
              </p>

              <div className="voucher-box">
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>VOUCHER DISKON KUNJUNGAN</div>
                <div className="voucher-code">BARBER10</div>
                <div style={{ fontSize: '0.78rem', color: '#FACC15', marginTop: '6px', fontWeight: 700 }}>Diskon 10% Potong Rambut Berikutnya</div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  sound.playBeep(900);
                  setShowRewardModal(false);
                }}
                style={{ width: '100%', padding: '0.85rem', fontWeight: 800 }}
              >
                Tutup & Kembali
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
