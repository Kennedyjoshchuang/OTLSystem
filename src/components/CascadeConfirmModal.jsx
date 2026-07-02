import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CascadeConfirmModal = ({
  isOpen,
  oldName,
  newName,
  cascadeOptions = [],
  onConfirm,
  onCancel,
  loading = false
}) => {
  const { language } = useApp();
  const isID = language === 'id';

  // Local state to keep track of checked/unchecked option keys
  const [selectedKeys, setSelectedKeys] = useState([]);

  // Initialize selectedKeys when modal opens or options change
  useEffect(() => {
    if (isOpen) {
      // Checked by default
      setSelectedKeys(cascadeOptions.map(opt => opt.key));
    }
  }, [isOpen, cascadeOptions]);

  if (!isOpen) return null;

  const handleToggle = (key, required) => {
    if (required) return; // cannot deselect required options
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    const nonRequiredKeys = cascadeOptions.filter(o => !o.required).map(o => o.key);
    const requiredKeys = cascadeOptions.filter(o => o.required).map(o => o.key);
    
    const allSelected = nonRequiredKeys.every(k => selectedKeys.includes(k));
    if (allSelected) {
      // Uncheck all optional ones, keep required
      setSelectedKeys(requiredKeys);
    } else {
      // Check all
      setSelectedKeys(cascadeOptions.map(o => o.key));
    }
  };

  const hasPaidInvoices = cascadeOptions.some(opt => 
    selectedKeys.includes(opt.key) && opt.hasWarning
  );

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="glass-card" 
          style={{ 
            width: '100%', 
            maxWidth: '560px', 
            padding: '30px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            position: 'relative',
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Close button */}
          <button 
            onClick={onCancel} 
            disabled={loading}
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer' 
            }}
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <AlertTriangle className="text-gold" size={24} style={{ color: '#d4af37' }} />
            </div>
            <div>
              <h3 style={{ color: 'var(--secondary)', margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                {isID ? 'Konfirmasi Perubahan Nama' : 'Confirm Name Change'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                {isID ? 'Sesuaikan entitas mana saja yang akan di-cascade' : 'Choose which linked entities will be updated'}
              </p>
            </div>
          </div>

          {/* Name Comparison Panel */}
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.06)', 
              borderRadius: '12px', 
              padding: '16px', 
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                {isID ? 'Nama Lama' : 'Old Name'}
              </span>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through' }}>
                {oldName}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', color: '#d4af37' }}>
              <ArrowRight size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.65rem', color: '#d4af37', display: 'block', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                {isID ? 'Nama Baru' : 'New Name'}
              </span>
              <div style={{ color: 'var(--text)', fontSize: '0.95rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {newName}
              </div>
            </div>
          </div>

          {/* Checklist of options */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isID ? 'Perbarui Dokumen Terkait' : 'Update Related Documents'}
              </span>
              <button 
                type="button" 
                onClick={handleSelectAll}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#d4af37', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {cascadeOptions.filter(o => !o.required).every(k => selectedKeys.includes(k.key))
                  ? (isID ? 'Kosongkan Semua' : 'Deselect All') 
                  : (isID ? 'Pilih Semua' : 'Select All')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cascadeOptions.map(opt => {
                const isSelected = selectedKeys.includes(opt.key);
                return (
                  <div 
                    key={opt.key}
                    onClick={() => handleToggle(opt.key, opt.required)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: isSelected ? 'rgba(212, 175, 55, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                      border: isSelected ? '1px solid rgba(212, 175, 55, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      cursor: opt.required ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: opt.required ? 0.8 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid #d4af37' : '1px solid rgba(255, 255, 255, 0.2)',
                          background: isSelected ? '#d4af37' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} style={{ color: '#030712' }} />}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: isSelected ? 'var(--text)' : 'var(--text-muted)' }}>
                          {opt.label}
                        </span>
                        {opt.hasWarning && isSelected && (
                          <div style={{ color: '#ef4444', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <AlertTriangle size={10} />
                            {opt.hasWarning}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <span 
                      className="badge"
                      style={{ 
                        background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#d4af37' : 'var(--text-muted)',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: '700'
                      }}
                    >
                      {opt.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paid Invoice Warn Banner */}
          {hasPaidInvoices && (
            <div 
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <AlertTriangle size={16} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ color: '#fca5a5', fontSize: '0.75rem', lineHeight: '1.4' }}>
                <strong>{isID ? 'Peringatan Lunas:' : 'Paid Record Warning:'}</strong>{' '}
                {isID 
                  ? 'Beberapa dokumen yang dipilih sudah dibayar/lunas. Mengubah nama akan mengubah riwayat pencatatan dokumen tersebut.'
                  : 'Some selected records are marked as paid. Renaming them will alter historic financial documents.'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              onClick={onCancel}
              disabled={loading}
              className="btn" 
              style={{ 
                flex: 1, 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--border)', 
                color: 'var(--text)' 
              }}
            >
              {isID ? 'Batal' : 'Cancel'}
            </button>
            <button 
              type="button" 
              onClick={() => onConfirm(selectedKeys)}
              disabled={loading || selectedKeys.length === 0}
              className="btn btn-gold" 
              style={{ 
                flex: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px'
              }}
            >
              {loading ? (
                <span>{isID ? 'Menyimpan...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>{isID ? 'Konfirmasi & Simpan' : 'Confirm & Save'}</span>
                </>
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CascadeConfirmModal;
