import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Truck, Camera, CheckCircle2, Package, History, PlayCircle, X, Search, FileSpreadsheet, Plus, FileText, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToExcel } from '../utils/exportUtils';
import { ButtonWithLoading } from '../components/ButtonWithLoading';

const Executor = () => {
  const { jobOrders, updateJOStatus, completeJO, t } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'records'
  const fileInputRef = useRef(null);
  const [uploadingForId, setUploadingForId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlePrint = () => {
    window.print();
  };

  const filterByDate = (itemDate) => {
    if (!itemDate) return true;
    const date = new Date(itemDate);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && date < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (date > endOfDay) return false;
    }
    return true;
  };

  const filteredJOs = jobOrders.filter(jo => {
    const tabMatch = activeTab === 'active' ? jo.status === 'dispatched' : jo.status === 'done';
    const searchMatch = (jo.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (jo.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return tabMatch && searchMatch && filterByDate(jo.date);
  });

  const handleExport = () => {
    const dataToExport = filteredJOs.map(jo => ({
      JO_ID: jo.id,
      Date: jo.date,
      Customer: jo.customerName,
      Instruction: jo.jobDescription,
      Container: jo.containerNo || '-',
      Vehicle: jo.vehicleNo || '-',
      Final_Status: jo.activityStatus || '-',
      Status: jo.status
    }));

    if (dataToExport.length === 0) {
      alert("Tidak ada data operasional untuk di-export pada rentang tanggal ini.");
      return;
    }

    const fileName = activeTab === 'active' ? "Field_Operations_Aktif" : "Field_Operations_Records";
    exportToExcel(dataToExport, fileName);
  };

  const handleUpdate = (joId, field, value) => {
    updateJOStatus(joId, { [field]: value });
  };

  const handleListItemUpdate = (joId, field, index, value) => {
    const jo = jobOrders.find(j => j.id === joId);
    const current = Array.isArray(jo[field]) ? [...jo[field]] : [];
    current[index] = value;
    updateJOStatus(joId, { [field]: current });
  };

  const addListItem = (joId, field) => {
    const jo = jobOrders.find(j => j.id === joId);
    const current = Array.isArray(jo[field]) ? [...jo[field]] : [];
    updateJOStatus(joId, { [field]: [...current, ''] });
  };

  const removeListItem = (joId, field, index) => {
    const jo = jobOrders.find(j => j.id === joId);
    const current = Array.isArray(jo[field]) ? [...jo[field]] : [];
    const updated = current.filter((_, i) => i !== index);
    updateJOStatus(joId, { [field]: updated });
  };

  const handlePhotoUpload = (e) => {
    const files = e.target.files;
    if (!files || !uploadingForId) return;

    const jo = jobOrders.find(j => j.id === uploadingForId);
    const currentPhotos = jo.photos || [];

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoUrl = event.target.result;
        updateJOStatus(uploadingForId, { photos: [...currentPhotos, photoUrl] });
      };
      reader.readAsDataURL(file);
    });
    setUploadingForId(null);
  };

  const removePhoto = (joId, photoIndex) => {
    const jo = jobOrders.find(j => j.id === joId);
    const newPhotos = jo.photos.filter((_, i) => i !== photoIndex);
    updateJOStatus(joId, { photos: newPhotos });
  };

  const handleDone = async (jo) => {
    if (!jo.activityStatus) {
      alert('Activity Status is required!');
      return;
    }
    await completeJO(jo.id);
    alert(`Job ${jo.id} completed and moved to Records!`);
  };

  return (
    <div className="executor-container" style={{ display: 'grid', gap: '30px' }}>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handlePhotoUpload} 
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
        <div>
          <h3 className="shimmer-text" style={{ fontSize: '1.8rem', margin: 0 }}>Field Operations</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time job execution and status tracking.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={() => setActiveTab('active')}
            style={{
              background: 'none', border: 'none', padding: '10px 0',
              color: activeTab === 'active' ? 'var(--secondary)' : 'var(--text-muted)',
              fontSize: '1rem', fontWeight: '600', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <PlayCircle size={18} />
            Active Jobs
            {activeTab === 'active' && <motion.div layoutId="execTab" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, background: 'var(--secondary)', height: '2px' }} />}
          </button>
          <button 
            onClick={() => setActiveTab('records')}
            style={{
              background: 'none', border: 'none', padding: '10px 0',
              color: activeTab === 'records' ? 'var(--secondary)' : 'var(--text-muted)',
              fontSize: '1rem', fontWeight: '600', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <History size={18} />
            JO Records
            {activeTab === 'records' && <motion.div layoutId="execTab" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, background: 'var(--secondary)', height: '2px' }} />}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '20px 25px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <input type="text" placeholder="Search Jobs or Customers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Filter Tanggal:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem' }} />
          <span style={{ color: 'var(--text-muted)' }}>s/d</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem' }} />
          {(startDate || endDate || searchTerm) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Reset</button>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-gold" onClick={handleExport} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <FileSpreadsheet size={18} /> Export Excel
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '25px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--secondary)' }}>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>JO ID</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Pelanggan</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Instruksi</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Container & Unit</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status Operasional</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Dokumentasi</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredJOs.map(jo => (
              <React.Fragment key={jo.id}>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }} className="table-row-hover" onClick={() => setUploadingForId(uploadingForId === jo.id ? null : jo.id)}>
                  <td style={{ padding: '15px', fontWeight: '800', color: 'var(--secondary)' }}>{jo.id}</td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: '600' }}>{jo.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty: {jo.quantity}</div>
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {jo.jobDescription}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>C:</span> {Array.isArray(jo.containerNo) ? jo.containerNo.join(', ') : jo.containerNo || '-'}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>V:</span> {Array.isArray(jo.vehicleNo) ? jo.vehicleNo.join(', ') : jo.vehicleNo || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeTab === 'active' ? '#f59e0b' : '#10b981' }} />
                      <span style={{ fontWeight: '600', color: activeTab === 'active' ? '#f59e0b' : '#10b981', fontSize: '0.9rem' }}>
                        {jo.activityStatus || (activeTab === 'active' ? 'Menunggu Update...' : 'Done')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                      <Camera size={16} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{jo.photos?.length || 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      {activeTab === 'active' ? (
                        <ButtonWithLoading 
                          className="btn btn-gold" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          onClick={(e) => { e.stopPropagation(); return handleDone(jo); }}
                        >
                          Selesai
                        </ButtonWithLoading>
                      ) : (
                        <span className="badge badge-done" style={{ fontSize: '0.7rem' }}>Archived</span>
                      )}
                      <button 
                        className="btn-icon" 
                        style={{ width: '38px', height: '38px', color: 'var(--secondary)', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/executor/surat-jalan/${jo.id}`); }}
                        title="View Surat Jalan"
                      >
                        <FileText size={20} />
                      </button>
                      <button 
                        className="btn-icon" 
                        style={{ width: '38px', height: '38px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/executor/surat-jalan/${jo.id}?print=true`); }}
                        title="Print Surat Jalan"
                      >
                        <Printer size={20} />
                      </button>
                      {activeTab === 'records' && (
                        <button 
                          className="btn-icon" 
                          style={{ width: '38px', height: '38px', color: 'var(--gold-metallic)', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                          onClick={(e) => { e.stopPropagation(); setUploadingForId(uploadingForId === jo.id ? null : jo.id); }}
                          title="Edit Data Records"
                        >
                          <Edit2 size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                
                {/* Expandable Row for Editing (only for active or when clicked) */}
                <AnimatePresence>
                  {uploadingForId === jo.id && (
                    <tr>
                      <td colSpan="7" style={{ padding: 0 }}>
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }} 
                          style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--secondary)' }}
                        >
                          <div style={{ padding: '25px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                            <div style={{ display: 'grid', gap: '20px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                {/* Multi Container */}
                                <div className="input-group">
                                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Container Number
                                    <Plus size={14} onClick={() => addListItem(jo.id, 'containerNo')} style={{ cursor: 'pointer' }} />
                                  </label>
                                  {(Array.isArray(jo.containerNo) ? jo.containerNo : [jo.containerNo || '']).map((c, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                      <input type="text" value={c} onChange={e => handleListItemUpdate(jo.id, 'containerNo', i, e.target.value)} placeholder="CONT-123456" />
                                      <button className="btn-icon" onClick={() => removeListItem(jo.id, 'containerNo', i)} style={{ padding: '5px', height: 'auto' }}><X size={12} /></button>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Multi Vehicle */}
                                <div className="input-group">
                                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Vehicle Number
                                    <Plus size={14} onClick={() => addListItem(jo.id, 'vehicleNo')} style={{ cursor: 'pointer' }} />
                                  </label>
                                  {(Array.isArray(jo.vehicleNo) ? jo.vehicleNo : [jo.vehicleNo || '']).map((v, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                      <input type="text" value={v} onChange={e => handleListItemUpdate(jo.id, 'vehicleNo', i, e.target.value)} placeholder="B 1234 ABC" />
                                      <button className="btn-icon" onClick={() => removeListItem(jo.id, 'vehicleNo', i)} style={{ padding: '5px', height: 'auto' }}><X size={12} /></button>
                                    </div>
                                  ))}
                                </div>

                                {/* Multi Driver */}
                                <div className="input-group">
                                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Driver Name
                                    <Plus size={14} onClick={() => addListItem(jo.id, 'driverName')} style={{ cursor: 'pointer' }} />
                                  </label>
                                  {(Array.isArray(jo.driverName) ? jo.driverName : [jo.driverName || '']).map((d, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                      <input type="text" value={d} onChange={e => handleListItemUpdate(jo.id, 'driverName', i, e.target.value)} placeholder="Nama Sopir" />
                                      <button className="btn-icon" onClick={() => removeListItem(jo.id, 'driverName', i)} style={{ padding: '5px', height: 'auto' }}><X size={12} /></button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="input-group">
                                <label>Activity Status (Required)</label>
                                <input type="text" value={jo.activityStatus || ''} onChange={e => handleUpdate(jo.id, 'activityStatus', e.target.value)} placeholder="Update status operasional terakhir..." disabled={activeTab !== 'active'} />
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px' }}>
                                <strong style={{ color: 'var(--text)' }}>Full Instruction:</strong> {jo.jobDescription}
                              </div>
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: '600' }}>Dokumentasi Lapangan</label>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                                {jo.photos?.map((photo, idx) => (
                                  <div key={idx} style={{ position: 'relative', width: '70px', height: '70px' }}>
                                    <img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                    {activeTab === 'active' && (
                                      <button onClick={() => removePhoto(jo.id, idx)} style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '10px' }}>×</button>
                                    )}
                                  </div>
                                ))}
                                {activeTab === 'active' && (
                                  <div 
                                    onClick={() => fileInputRef.current.click()}
                                    style={{ width: '70px', height: '70px', border: '2px dashed var(--glass-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                  >
                                    <Plus size={20} />
                                  </div>
                                )}
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Klik tombol "+" untuk mengunggah foto bukti operasional.</p>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Surat Jalan Modal */}
        {filteredJOs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <Package size={64} color="rgba(255,255,255,0.05)" style={{ marginBottom: '20px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              {activeTab === 'active' ? 'No active operations assigned.' : 'No completed records found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Executor;
