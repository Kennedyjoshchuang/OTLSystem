import React, { useEffect, useState } from 'react';

const PrintInvoiceAttachment = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('print_invoice_data');
    if (saved) setData(JSON.parse(saved));
  }, []);

  if (!data) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'sans-serif', color: '#64748b' }}>
      Memuat data lampiran…
    </div>
  );

  const { invoice, jo } = data;
  const photos = Array.isArray(jo?.photos) ? jo.photos : [];

  if (photos.length === 0) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Inter, sans-serif', color: '#94a3b8' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📷</div>
      <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>Tidak ada foto dokumentasi untuk invoice ini.</p>
    </div>
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f1f5f9; margin: 0; }
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #att-area {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.2cm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .photo-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .photo-item { height: 160px !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'white', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1e293b' }}>
            Lampiran Dokumentasi — {invoice?.id}
          </span>
          <span style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '0.7rem', fontWeight: '800', padding: '2px 10px', borderRadius: '20px' }}>
            {photos.length} FOTO
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.close()} style={{ padding: '8px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            Tutup
          </button>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
            🖨 Print / Simpan PDF
          </button>
        </div>
      </div>

      {/* A4 Attachment Page */}
      <div id="att-area" style={{ width: '210mm', minHeight: '297mm', background: 'white', margin: '24px auto', padding: '1.2cm', boxShadow: '0 4px 30px rgba(0,0,0,0.12)', color: '#1e293b', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e293b', paddingBottom: '18px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <img src="/assets/logo.png" alt="Logo" style={{ width: '55px', height: '55px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>PT. OMEGA TRUST LOGISTIK</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Green Sedayu Bizpark DM 11 No. 51, Kalideres, Jakarta Barat</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>LAMPIRAN</div>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>Ref. Invoice: {invoice?.id}</div>
          </div>
        </div>

        {/* Attachment Meta */}
        <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.82rem' }}>
            {[
              ['No. Invoice', invoice?.id],
              ['Ref. Job Order', invoice?.joId],
              ['Customer', invoice?.customerName],
              ['Tanggal', fmtDate(invoice?.date)],
              ['Container No.', jo?.containerNo || '—'],
              ['Vehicle No.', jo?.vehicleNo || '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{l}</div>
                <div style={{ fontWeight: '700', color: '#1e293b' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ height: '3px', width: '30px', background: '#d4af37', borderRadius: '2px' }}></div>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Dokumentasi Operasional — {photos.length} Foto
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
        </div>

        {/* Photo Grid */}
        <div
          className="photo-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', flex: 1 }}
        >
          {photos.map((p, i) => (
            <div
              key={i}
              className="photo-item"
              style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '160px', position: 'relative' }}
            >
              <img
                src={p}
                alt={`Foto ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: 'white', fontSize: '0.65rem', fontWeight: '700', padding: '3px 8px', textAlign: 'center' }}>
                Foto {i + 1} / {photos.length}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, fontWeight: '600' }}>
            * Dokumen ini merupakan lampiran resmi untuk Invoice {invoice?.id} dan tidak berlaku terpisah.
          </p>
          <div style={{ textAlign: 'center', minWidth: '200px' }}>
            <p style={{ margin: '0 0 55px 0', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disiapkan Oleh,</p>
            <div style={{ borderBottom: '2px solid #1e293b', width: '100%', marginBottom: '8px' }}></div>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '0.9rem', color: '#1e293b' }}>PT. Omega Trust Logistik</p>
            <p style={{ margin: '1px 0 0 0', fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Divisi Operasional</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintInvoiceAttachment;
