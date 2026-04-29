import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const PrintQuotation = () => {
  const [data, setData] = useState(null);
  const { t } = useApp() || { t: (k) => k };

  useEffect(() => {
    // Load data from localStorage
    const savedData = localStorage.getItem('print_quotation_data');
    if (savedData) {
      setData(JSON.parse(savedData));
    }
  }, []);

  if (!data) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Quotation Data...</div>;

  return (
    <div className="print-page-wrapper bg-slate" style={{ minHeight: '100vh', padding: '20px 0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          .print-page-wrapper { padding: 0 !important; }
          #quotation-print-area { 
            width: 210mm !important; 
            height: 297mm !important; 
            padding: 1cm !important; 
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div
        id="quotation-print-area"
        className="quotation-modal-content"
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: 'white',
          margin: '0 auto',
          padding: '1cm',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          color: '#1e293b',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)'
        }}
      >
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <img src="/assets/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
            <div>
              <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOGISTICS & FREIGHT FORWARDING</h4>
              <div className="text-slate" style={{ fontSize: '0.7rem', lineHeight: '1.3', marginTop: '3px', maxWidth: '300px', fontWeight: '500' }}>
                {data.companyAddress || "Green Sedayu Bizpark DM 11 No. 51, Kalideres, Jakarta Barat"}
              </div>
            </div>
          </div>
          <div className="bg-slate" style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'right', minWidth: '200px' }}>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '1rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NO. {data.id}</p>
            <p className="text-slate" style={{ margin: '2px 0 0 0', fontWeight: '700', fontSize: '0.8rem' }}>
              {new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '30px' }}>
          {/* Customer Details */}
          <div style={{ borderLeft: '4px solid #065f46', paddingLeft: '20px' }}>
            <h5 className="text-slate" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800', marginBottom: '10px', letterSpacing: '1px' }}>CUSTOMER DETAILS</h5>
            <h3 className="text-gold" style={{ margin: '0 0 5px 0', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: '1.1' }}>{data.customerName}</h3>
            <p className="text-green" style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '800' }}>Attn: {data.pic || 'Purchasing Department'}</p>
            <p className="text-slate" style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{data.address || 'Batam'}</p>
          </div>

          {/* Marketing Details */}
          <div style={{ textAlign: 'right' }}>
            <h5 className="text-slate" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800', marginBottom: '10px', letterSpacing: '1px' }}>MARKETING PERSON</h5>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{data.marketingName || 'ALP Logistics Team'}</h4>
            <p className="text-slate" style={{ margin: 0, fontWeight: '700', fontSize: '0.85rem' }}>{data.marketingEmail || 'marketing@alplogistics.co.id'}</p>
            <p className="text-slate" style={{ margin: '2px 0 15px 0', fontWeight: '700', fontSize: '0.85rem' }}>+62 21 5000 8000</p>
            <div style={{ borderTop: '1px solid #e2e8f0', display: 'inline-block', paddingTop: '8px' }}>
              <span className="text-slate" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1px', marginRight: '10px' }}>VALIDITY PERIOD:</span>
              <span style={{ color: '#0f172a', fontWeight: '900', fontSize: '0.85rem' }}>{data.validTo || '-'}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #0f172a' }}>
                <th className="text-slate" style={{ padding: '10px 0', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px' }}>DESCRIPTION</th>
                <th className="text-slate" style={{ padding: '10px 0', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', width: '130px', letterSpacing: '1px' }}>UNIT RATE</th>
                <th className="text-slate" style={{ padding: '10px 0', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', width: '80px', letterSpacing: '1px' }}>QTY</th>
                <th className="text-slate" style={{ padding: '10px 0', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', width: '150px', letterSpacing: '1px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.length > 0 ? (
                data.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>{item.description}</div>
                      <div className="text-slate" style={{ fontSize: '0.75rem', marginTop: '2px', fontWeight: '600' }}>Premium Logistics & Freight Services</div>
                    </td>
                    <td className="text-slate" style={{ padding: '12px 0', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem' }}>
                      IDR {parseFloat(item.rate).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'center', color: '#0f172a' }}>
                      <div style={{ fontWeight: '900', fontSize: '1rem' }}>{item.quantity}</div>
                      <div className="text-slate" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '800' }}>{item.unit || 'Unit'}</div>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '950', fontSize: '1.1rem', color: '#0f172a' }}>
                      IDR {(Number(item.rate || 0) * Number(item.quantity || 1)).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-slate" style={{ padding: '40px 0', textAlign: 'center', fontStyle: 'italic', fontSize: '1rem' }}>
                    No services listed for this quotation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Grand Total Section */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '30px', marginTop: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <h3 className="text-gold" style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.1rem', fontWeight: '900', letterSpacing: '1px' }}>GRAND TOTAL</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 className="text-gold" style={{ margin: 0, fontSize: '3.2rem', fontWeight: '950', letterSpacing: '-2px' }}>
                IDR {Number(data.rate || 0).toLocaleString()}
              </h2>
            </div>
          </div>

          {data.generalNotes && (
            <div style={{ padding: '15px 0', marginTop: '15px', borderTop: '1px dashed #e2e8f0' }}>
              <h5 className="text-slate" style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px' }}>Notes & Terms:</h5>
              <p className="text-slate" style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontWeight: '500' }}>{data.generalNotes}</p>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div style={{ marginTop: 'auto', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ maxWidth: '400px' }}>
            <p className="text-slate" style={{ fontSize: '0.75rem', fontWeight: '700', margin: '0 0 4px 0' }}>* Pricing is inclusive of standard handling fees.</p>
            <p className="text-slate" style={{ fontSize: '0.75rem', fontWeight: '700', margin: 0 }}>* Validity is subject to space availability.</p>
          </div>
          <div style={{ textAlign: 'center', minWidth: '250px' }}>
            <p style={{ fontWeight: '900', fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '1px' }}>AUTHORIZED SIGNATURE</p>
            <div style={{ borderBottom: '2.5px solid #0f172a', width: '200px', margin: '0 auto 10px auto' }}></div>
            <p style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>Management</p>
            <p className="text-slate" style={{ margin: 0, fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>ALP LOGISTICS PRAKARSA</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintQuotation;
