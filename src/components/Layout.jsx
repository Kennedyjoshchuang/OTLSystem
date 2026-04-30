import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  PlayCircle, 
  CreditCard, 
  Wallet,
  LogOut,
  ChevronRight,
  Globe,
  Sun,
  Moon,
  ShieldAlert,
  FileText,
  ShoppingCart,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  const location = useLocation();
  const { logout, user, t, language, toggleLanguage, theme, toggleTheme, loading } = useApp();

  const menuItems = [
    { path: '/marketing', label: t('marketing'), icon: Users, roles: ['owner', 'marketing'] },
    { path: '/admin', label: t('adminOffice'), icon: Briefcase, roles: ['owner', 'admin'] },
    { path: '/procurement', label: 'Procurement', icon: ShoppingCart, roles: ['owner', 'admin'] },
    { path: '/executor', label: t('executor'), icon: PlayCircle, roles: ['owner', 'executor'] },
    { path: '/accounting', label: t('accounting'), icon: CreditCard, roles: ['owner', 'accounting'] },
    { path: '/hrd', label: 'HRD', icon: UserCheck, roles: ['owner', 'hrd'] },
    { path: '/system-control', label: t('systemControl'), icon: ShieldAlert, roles: ['owner'] },
  ].filter(item => item.roles.includes(user?.role));

  const getCurrentTitle = () => {
    const item = menuItems.find(i => i.path === location.pathname);
    return item ? item.label : t('dashboard');
  };

  return (
    <div className={theme === 'light' ? 'light-theme' : ''} style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(3, 7, 18, 0.8)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '20px', backdropFilter: 'blur(10px)'
            }}
          >
            <div className="spinner" style={{ 
              width: '50px', height: '50px', border: '3px solid rgba(212, 175, 55, 0.1)', 
              borderTop: '3px solid var(--secondary)', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: 'var(--secondary)', fontWeight: '600', letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Synchronizing Data...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="glass-card no-print" style={{
        width: '300px',
        margin: '20px',
        padding: '40px 25px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: 'calc(100vh - 40px)',
        zIndex: 100,
        borderRadius: '24px',
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(3, 7, 18, 0.4)'
      }}>
        <div style={{ marginBottom: '50px', textAlign: 'center' }}>
          <img 
            src="/assets/logo.png" 
            alt="Logo" 
            style={{ width: '80px', marginBottom: '20px', filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.3))' }} 
          />
          <h2 className="shimmer-text" style={{ fontSize: '1.4rem', marginBottom: '5px', letterSpacing: '1px' }}>OMEGA TRUST</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '3px', textTransform: 'uppercase' }}>{t('logistikSystem')}</p>
        </div>

        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '14px 20px',
                  marginBottom: '12px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'var(--emerald-metallic)' : 'transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 10px 20px rgba(6, 95, 70, 0.3)' : 'none',
                  border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
                }}
              >
                <Icon size={20} style={{ opacity: isActive ? 1 : 0.6 }} />
                <span style={{ fontWeight: isActive ? '600' : '400', fontSize: '0.95rem' }}>{item.label}</span>
                {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '30px' }}>
          <button 
            className="btn" 
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              color: '#ef4444', 
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.1)' 
            }}
            onClick={logout}
          >
            <LogOut size={18} />
            <span>{t('signOut')}</span>
          </button>
          
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px', 
            fontSize: '0.65rem', 
            color: 'var(--text-muted)', 
            letterSpacing: '2px',
            opacity: 0.6
          }}>
            OTL SYSTEM v2.1.7-LOCAL
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        marginLeft: '340px', 
        padding: '50px 60px',
        maxWidth: '1400px'
      }}>
        <header className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '50px'
        }}>
          <div>
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              style={{ fontSize: '2.5rem', marginBottom: '8px' }}
            >
              {getCurrentTitle()}
            </motion.h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{t('welcomeMessage')}</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                cursor: 'pointer',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                background: 'var(--glass)',
                transition: 'all 0.3s'
              }}
            >
              {theme === 'dark' ? <Sun size={18} style={{ color: '#fbbf24' }} /> : <Moon size={18} style={{ color: '#475569' }} />}
            </button>

            {/* Language Switcher */}
            <button 
              onClick={toggleLanguage}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 15px',
                borderRadius: '100px',
                cursor: 'pointer',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                background: 'var(--glass)',
                transition: 'all 0.3s'
              }}
            >
              <Globe size={16} style={{ color: 'var(--secondary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{language === 'en' ? 'EN' : 'ID'}</span>
            </button>

            <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--glass)' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: 'var(--gold-metallic)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#030712',
                fontWeight: '700',
                fontSize: '1.2rem',
                boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
              }}>O</div>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>{t('authorized')} {user?.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('systemRole')} {user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
