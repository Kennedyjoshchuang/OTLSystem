import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Globe, Sun, Moon, Clock, Monitor } from 'lucide-react';

const Portal = () => {
  const { t, language, toggleLanguage, theme, toggleTheme, user } = useApp();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEnter = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={theme === 'light' ? 'light-theme' : ''} style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      color: 'var(--text)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Background Animated Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(6, 95, 70, 0.2) 0%, transparent 70%)',
        zIndex: 0,
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)',
        zIndex: 0,
        borderRadius: '50%'
      }} />

      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '30px 50px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/assets/logo.png" alt="Logo" style={{ height: '40px' }} />
          <div style={{ height: '30px', width: '1px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '700', fontSize: '1rem', letterSpacing: '1px' }}>PT. OMEGA TRUST</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logistics Management System</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={16} color="var(--secondary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button onClick={toggleTheme} className="btn-icon">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={toggleLanguage} className="btn-icon" style={{ width: 'auto', padding: '0 15px', fontSize: '0.8rem', fontWeight: '700' }}>
            <Globe size={16} style={{ marginRight: '8px' }} /> {language === 'en' ? 'EN' : 'ID'}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 10,
        paddingBottom: '5vh'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="shimmer-text" style={{ fontSize: '4.5rem', marginBottom: '10px', lineHeight: 1 }}>
            {language === 'en' ? 'ACCESS PORTAL' : 'AKSES PORTAL'}
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: 'var(--text-muted)', 
            marginBottom: '40px', 
            maxWidth: '600px',
            fontWeight: '300',
            letterSpacing: '2px'
          }}>
            {language === 'en' 
              ? 'INTEGRATED LOGISTICS COMMAND CENTER' 
              : 'PUSAT KOMANDO LOGISTIK TERINTEGRASI'}
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button 
              onClick={handleEnter}
              className="btn btn-gold" 
              style={{ 
                padding: '18px 45px', 
                fontSize: '1rem', 
                borderRadius: '100px',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}
            >
              <span>{language === 'en' ? 'ENTER SYSTEM' : 'MASUK SISTEM'}</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>

        {/* System Stats / Indicators */}
        <div style={{ 
          marginTop: '80px', 
          display: 'flex', 
          gap: '40px',
          padding: '20px 40px',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Network Status: Online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Monitor size={14} color="var(--secondary)" />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>V2.1.0 Revision</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={14} color="var(--secondary)" />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Secured Gateway</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '30px',
        textAlign: 'center',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        zIndex: 10,
        letterSpacing: '1px'
      }}>
        © {new Date().getFullYear()} PT. OMEGA TRUST LOGISTIK. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
};

export default Portal;
