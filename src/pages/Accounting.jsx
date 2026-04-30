import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CreditCard, Download, Receipt, Wallet, CheckCircle, Plus, X, XCircle, DollarSign, Search, FileSpreadsheet, RotateCcw, Edit3, Save, Image, ChevronDown, ChevronUp, User, Briefcase, Banknote, Calendar, FileText, Trash2, Settings, ExternalLink, ShieldCheck } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { ButtonWithLoading } from '../components/ButtonWithLoading';

const Accounting = () => {
  const context = useApp();
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const [activeTab, setActiveTab] = useState('billing'); // 'billing', 'piutang', or 'costing'
  const [receivableSubTab, setReceivableSubTab] = useState('outstanding');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [costModal, setCostModal] = useState(null); // holds the JO being costed
  const [costLines, setCostLines] = useState([{ vendorId: '', serviceIdx: '', qty: 1 }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [photoViewer, setPhotoViewer] = useState(null); // holds { joId, photos }
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [isIssuedCollapsed, setIsIssuedCollapsed] = useState(false);
  const [undoConfirmJoId, setUndoConfirmJoId] = useState(null); // inline undo confirmation
  const [uploadSignedModal, setUploadSignedModal] = useState(null); // { invId, type: 'invoice' | 'receipt' }
  
  // Mass Selection State
  const [selectedLedger, setSelectedLedger] = useState(new Set());
  
  // PO States
  const [showPOModal, setShowPOModal] = useState(false);
  const [poJoId, setPoJoId] = useState('');
  const [poVendorId, setPoVendorId] = useState('');
  const [poItems, setPoItems] = useState([{ serviceIdx: '', qty: 1 }]);
  const [poNotes, setPoNotes] = useState('');
  const [printPO, setPrintPO] = useState(null);

  // Salary States
  const [salaryModal, setSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    name: '', position: '', bankAccount: '', bankName: '', baseSalary: '', period: '', nik: '', npwp: '', taxes: [], proofPhoto: '', expenseDate: ''
  });

  // Other Expense States
  const [otherExpenseModal, setOtherExpenseModal] = useState(false);
  const [otherExpenseForm, setOtherExpenseForm] = useState({
    employeeName: '', position: '', bankAccount: '', bankName: '', amount: '', description: '', taxes: [], proofPhoto: '', expenseDate: ''
  });

  const [salarySlip, setSalarySlip] = useState(null);
  const [financialReport, setFinancialReport] = useState(null); // holds report data for PDF
  const [payableSubTab, setPayableSubTab] = useState('outstanding');
  const [vendorInvoiceModal, setVendorInvoiceModal] = useState(null);
  const [paymentProofModal, setPaymentProofModal] = useState(null);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [batchPrintInvoices, setBatchPrintInvoices] = useState(null);
  const [bankModal, setBankModal] = useState(null); // { id, name, accountNo, bankName }
  const [showBankSettings, setShowBankSettings] = useState(false);

  // Invoice Bank Selection
  const [issuingInvoiceJoId, setIssuingInvoiceJoId] = useState(null);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [receivableProofModal, setReceivableProofModal] = useState(null); // invoice to upload proof for

  const { 
    jobOrders = [], invoices = [], createInvoice, settleInvoice, deleteInvoice, updateInvoice, 
    receivables = [], vendors = [], purchaseOrders = [], updateJOStatus, updatePurchaseOrder,
    quotations = [],
    salaries = [], addSalary, deleteSalary,
    otherExpenses = [], addOtherExpense, deleteOtherExpense,
    employees = [], companyBankAccounts = [], updateCompanyBank,
    loading 
  } = context || {};

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

  const poMap = React.useMemo(() => {
    const map = {};
    (purchaseOrders || []).forEach(po => {
      if (!map[po.joId]) map[po.joId] = [];
      map[po.joId].push(po);
    });
    return map;
  }, [purchaseOrders]);

  const invoiceMap = React.useMemo(() => {
    const map = {};
    (invoices || []).forEach(inv => {
      map[String(inv.joId)] = inv;
    });
    return map;
  }, [invoices]);

  const activeJOs = React.useMemo(() => {
    return jobOrders
      .filter(jo => jo.status !== 'pending')
      .filter(jo => filterByDate(jo.date))
      .filter(jo => {
        const id = jo.id || '';
        const name = jo.customerName || '';
        const term = searchTerm.toLowerCase();
        return id.toLowerCase().includes(term) || name.toLowerCase().includes(term);
      });
  }, [jobOrders, startDate, endDate, searchTerm]);

  const sortedActiveJOs = React.useMemo(() => {
    return [...activeJOs].sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }, [activeJOs]);

  const plFinancials = React.useMemo(() => {
    return activeJOs.reduce((acc, j) => {
      const manualCost = Array.isArray(j.costs) ? j.costs.reduce((a, c) => a + parseFloat(c.total || 0), 0) : 0;
      const poCost = (poMap[j.id] || []).reduce((a, p) => a + parseFloat(p.grandTotal || 0), 0);
      const cost = manualCost + poCost;
      const inv = invoiceMap[String(j.id)];
      const rev = inv ? parseFloat(inv.subtotal || inv.amount || 0) : 0;
      return { cost: acc.cost + cost, revenue: acc.revenue + rev };
    }, { cost: 0, revenue: 0 });
  }, [activeJOs, poMap, invoiceMap]);

  const vendorList = vendors || [];

  const addCostLine = () => setCostLines(prev => [...prev, { vendorId: '', serviceIdx: '', qty: 1 }]);
  const removeCostLine = (i) => setCostLines(prev => prev.filter((_, idx) => idx !== i));
  const updateCostLine = (i, field, val) => setCostLines(prev => { const n=[...prev]; n[i]={...n[i],[field]:val}; if(field==='vendorId') n[i].serviceIdx=''; return n; });

  // PO Helpers
  const addPOItem = () => setPoItems(p => [...p, { serviceIdx: '', qty: 1 }]);
  const removePOItem = (i) => setPoItems(p => p.filter((_, idx) => idx !== i));
  const updatePOItem = (i, field, val) => setPoItems(p => { const n=[...p]; n[i]={...n[i],[field]:val}; return n; });

  const buildPOPayload = () => {
    const jo = jobOrders.find(j => j.id === poJoId);
    if (!jo) { alert('Job Order tidak ditemukan.'); return null; }
    const vendor = vendorList.find(v => v.id === poVendorId);
    if (!vendor) { alert('Vendor tidak ditemukan.'); return null; }

    const items = poItems
      .filter(it => it.serviceIdx !== '')
      .map(it => {
        const svc = vendor.services[parseInt(it.serviceIdx)];
        const qty = parseFloat(it.qty) || 1;
        return {
          serviceDescription: svc.description,
          unitPrice: parseFloat(svc.price || 0),
          qty,
          total: parseFloat(svc.price || 0) * qty
        };
      });

    if (items.length === 0) { alert('Pilih minimal satu layanan vendor.'); return null; }

    return {
      joId: jo.id,
      customerName: jo.customerName,
      jobInstruction: jo.jobDescription || jo.instruction || '-',
      vendorId: vendor.id,
      vendorName: vendor.name,
      items,
      grandTotal: items.reduce((s, it) => s + it.total, 0),
      notes: poNotes
    };
  };

  const resetPOForm = () => {
    setShowPOModal(false);
    setPoJoId('');
    setPoVendorId('');
    setPoItems([{ serviceIdx: '', qty: 1 }]);
    setPoNotes('');
  };

  const handleSavePODraft = async () => {
    try {
      const payload = buildPOPayload();
      if (!payload) return;
      await context.createPurchaseOrder({ ...payload, status: 'draft' });
      resetPOForm();
    } catch (err) {
      alert('Gagal menyimpan draft: ' + err.message);
    }
  };

  const handleIssuePO = async () => {
    try {
      const payload = buildPOPayload();
      if (!payload) return;
      const newPO = await context.createPurchaseOrder({ ...payload, status: 'issued' });
      resetPOForm();
      setPrintPO({ ...newPO, status: 'issued' });
      setActiveTab('hutang');
      setPayableSubTab('outstanding');
    } catch (err) {
      alert('Gagal menerbitkan Purchase Order: ' + err.message);
    }
  };

  const handleUploadVendorInvoice = async (poId, photos) => {
    await updatePurchaseOrder(poId, { vendorInvoicePhoto: photos });
    setVendorInvoiceModal(null);
    setModalPhotos([]);
  };

  const handleSettlePayable = async (poId, photos) => {
    const paidDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    await updatePurchaseOrder(poId, { 
      paymentProofPhoto: photos, 
      status: 'paid',
      paidDate
    });
    setPaymentProofModal(null);
    setModalPhotos([]);
  };

  const handleExport = () => {
    let dataToExport = [];
    let fileName = "";

    if (activeTab === 'costing') {
      dataToExport = activeJOs.map(jo => {
        const manualCost = Array.isArray(jo.costs) ? jo.costs.reduce((s,c)=>s+(c.total||0),0) : 0;
        const poCost = (purchaseOrders || []).filter(po => po.joId === jo.id).reduce((s,p)=>s+(p.grandTotal||0),0);
        const totalCost = manualCost + poCost;
        const invoice = (invoices || []).find(inv => inv.joId === jo.id);
        const revenue = invoice ? parseFloat(invoice.subtotal || 0) : 0;
        
        return {
          JO_ID: jo.id,
          Date: jo.date,
          Customer: jo.customerName,
          Status: jo.status,
          Revenue_Inv: revenue,
          Total_Biaya: totalCost,
          Profit_Loss: revenue - totalCost
        };
      });
      fileName = "JO_Records_Financial";
    } else if (activeTab === 'billing') {
      // For billing, we can export issued invoices as primary
      dataToExport = invoices
        .filter(inv => filterByDate(inv.date))
        .filter(inv => inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(inv => ({
          Invoice_ID: inv.id,
          JO_ID: inv.joId,
          Date: inv.date,
          Customer: inv.customerName,
          Subtotal: inv.subtotal,
          Tax: inv.tax,
          Total_Amount: inv.amount,
          Status: inv.status
        }));
      fileName = "Issued_Invoices_Report";
    } else if (activeTab === 'piutang') {
      const source = receivableSubTab === 'outstanding' ? receivables : paidInvoices;
      dataToExport = source
        .filter(item => filterByDate(item.date))
        .filter(item => item.id.toLowerCase().includes(searchTerm.toLowerCase()) || item.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(item => ({
          Invoice_ID: item.id,
          Date: item.date,
          Customer: item.customerName,
          Amount: item.amount,
          Balance: item.balance || 0,
          Status: item.status
        }));
      fileName = receivableSubTab === 'outstanding' ? "Accounts_Receivable_Ledger" : "Invoice_Lunas_Archive";
    } else if (activeTab === 'outstanding_summary') {
      const summary = Object.values(receivables.reduce((acc, r) => {
        if (!acc[r.customerName]) acc[r.customerName] = { Customer: r.customerName, Total_Outstanding: 0, Total_Invoices: 0 };
        acc[r.customerName].Total_Outstanding += (r.balance || r.amount);
        acc[r.customerName].Total_Invoices += 1;
        return acc;
      }, {}));
      dataToExport = summary;
      fileName = "Outstanding_Receivables_By_Customer";
    }

    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk di-export pada rentang tanggal ini.");
      return;
    }

    exportToExcel(dataToExport, fileName);
  };

  const handleSaveCosts = async () => {
    if (!costModal) return;
    const newEntries = costLines
      .filter(l => l.vendorId && l.serviceIdx !== '')
      .map(l => {
        const vendor = vendorList.find(v => v.id === l.vendorId);
        const svc = vendor?.services?.[parseInt(l.serviceIdx)];
        const qty = parseFloat(l.qty) || 1;
        return { vendorId: l.vendorId, vendorName: vendor?.name || '', serviceDescription: svc?.description || '', unitPrice: parseFloat(svc?.price || 0), qty, total: parseFloat(svc?.price || 0) * qty };
      });
    const existingCosts = Array.isArray(costModal.costs) ? costModal.costs : [];
    await updateJOStatus(costModal.id, { costs: [...existingCosts, ...newEntries] });
    setCostModal(null);
    setCostLines([{ vendorId: '', serviceIdx: '', qty: 1 }]);
  };

  const handleDeleteCost = async (jo, costIdx) => {
    const updatedCosts = jo.costs.filter((_, i) => i !== costIdx);
    await updateJOStatus(jo.id, { costs: updatedCosts });
  };


  if (!context) return null;
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--secondary)' }}>Loading Accounting Module...</div>;
  }


  const completedJOs = jobOrders
    .filter(jo => jo.status === 'done' || jo.status === 'dispatched')
    .filter(jo => filterByDate(jo.date))
    .filter(jo => {
      const id = jo.id || '';
      const name = jo.customerName || '';
      const term = searchTerm.toLowerCase();
      return id.toLowerCase().includes(term) || name.toLowerCase().includes(term);
    });

  const paidInvoices = invoices
    .filter(inv => inv.status === 'paid')
    .filter(inv => filterByDate(inv.date))
    .filter(inv => {
      const id = inv.id || '';
      const name = inv.customerName || '';
      const term = searchTerm.toLowerCase();
      return id.toLowerCase().includes(term) || name.toLowerCase().includes(term);
    });
  
  const handleIssueInvoice = async (joId, bankAccount) => {
    try {
      if (!bankAccount) {
        setIssuingInvoiceJoId(joId);
        if (companyBankAccounts.length > 0) {
          setSelectedBankId(companyBankAccounts[0].id);
        }
        return;
      }

      console.log("Issuing invoice for JO:", joId, "with bank:", bankAccount.bankName);
      const newInv = await createInvoice(joId);
      
      if (!newInv) {
        throw new Error("Gagal menerbitkan invoice. Pastikan data Job Order & Quotation tersedia.");
      }

      // Find linked JO and Quotation for draft print
      const linkedJO = jobOrders.find(j => String(j.id) === String(joId));
      const linkedQuo = linkedJO
        ? quotations.find(q => String(q.id) === String(linkedJO.quotationId))
        : null;

      // Store data for the print page
      const printData = {
        invoice: newInv,
        jo: linkedJO || null,
        quotation: linkedQuo || null,
        bankAccount: bankAccount // Pass selected bank
      };
      
      localStorage.setItem('print_invoice_data', JSON.stringify(printData));

      // Open multiple tabs as requested
      // Note: Browsers might block multiple popups. User needs to "Always allow pop-ups from this site".
      
      // 1. Main Invoice
      window.open('/print/invoice', '_blank');
      
      // 2. Attachment (Operational Photos) - Only if photos exist
      if (linkedJO && Array.isArray(linkedJO.photos) && linkedJO.photos.length > 0) {
        window.open('/print/invoice-attachment', '_blank');
      }

      // 3. Receipt Draft
      window.open('/print/invoice-receipt', '_blank');

      // Update UI state
      setActiveTab('billing');
      setIsIssuedCollapsed(false);
      setIssuingInvoiceJoId(null); // Reset modal
      
      // Success Notification
      alert(`Invoice ${newInv.id} berhasil diterbitkan! Pastikan popup browser diizinkan untuk melihat semua dokumen.`);
      
    } catch (err) {
      console.error("Issue Invoice error:", err);
      alert("Error saat menerbitkan invoice: " + (err.message || "Unknown error"));
    }
  };

  const handleUploadReceivableProof = async (invId, photos) => {
    try {
      await updateInvoice(invId, { paymentProofPhoto: photos });
      setReceivableProofModal(null);
    } catch (err) {
      alert("Gagal upload bukti: " + err.message);
    }
  };

  const handleDownloadInvoice = (inv) => {
    const linkedJO = jobOrders.find(j => String(j.id) === String(inv.joId));
    const linkedQuo = linkedJO ? quotations.find(q => String(q.id) === String(linkedJO.quotationId)) : null;
    
    // Check if bank account info is needed (from existing logic if we can find it)
    // For now we just pass what we have
    localStorage.setItem('print_invoice_data', JSON.stringify({ 
      invoice: inv, 
      jo: linkedJO, 
      quotation: linkedQuo 
    }));

    // 1. Main Invoice
    window.open('/print/invoice', '_blank');
    
    // 2. Attachment (Operational Photos) - Only if photos exist
    if (linkedJO && Array.isArray(linkedJO.photos) && linkedJO.photos.length > 0) {
      window.open('/print/invoice-attachment', '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSettle = async (invId) => {
    try {
      await settleInvoice(invId);
      alert('Payment settled! Invoice moved to Lunas Records.');
    } catch (err) {
      alert('Gagal settle pembayaran: ' + err.message);
    }
  };

  const handleUndoInvoice = async (joId) => {
    const inv = invoices.find(i => i.joId === joId);
    if (!inv) {
      alert('Invoice tidak ditemukan.');
      return;
    }
    try {
      await deleteInvoice(inv.id);
    } catch (err) {
      alert('Gagal membatalkan invoice: ' + err.message);
    } finally {
      setUndoConfirmJoId(null);
    }
  };

  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoice) return;
    const extraChargesTotal = (editingInvoice.extra_charges || []).reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const subtotal = parseFloat(editingInvoice.subtotal || editingInvoice.amount);
    
    await updateInvoice(editingInvoice.id, {
      amount: subtotal + extraChargesTotal,
      subtotal: subtotal,
      tax: 0, // Reset old tax field if used
      extra_charges: editingInvoice.extra_charges || []
    });
    setEditingInvoice(null);
    alert('Invoice updated successfully!');
  };

  const handleCreatePOFromAccounting = (joId) => {
    setPoJoId(joId);
    setShowPOModal(true);
  };

  const toggleLedgerSelection = (id) => {
    const newSelected = new Set(selectedLedger);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedLedger(newSelected);
  };

  const toggleAllLedger = (items) => {
    if (selectedLedger.size === items.length) {
      setSelectedLedger(new Set());
    } else {
      setSelectedLedger(new Set(items.map(i => i.id)));
    }
  };

  const handleBatchPrint = () => {
    if (selectedLedger.size === 0) return;
    const selectedList = invoices.filter(inv => selectedLedger.has(inv.id));
    setBatchPrintInvoices(selectedList);
  };

  return (
    <div className="accounting-container">
      {/* Invoice Modal */}
      {selectedInvoice && (() => {
        const linkedJO = jobOrders.find(jo => jo.id === selectedInvoice.joId);
        const isPaid = selectedInvoice.status === 'paid';

        return (
          <div className="no-print" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px'
          }}>
            <style>{`
              @media print {
                #invoice-print { 
                  width: 210mm !important; 
                  height: 297mm !important; 
                  padding: 1.5cm !important; 
                  margin: 0 !important;
                  box-shadow: none !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>
            <div className="glass-card" style={{ 
              background: 'white', color: '#1e293b', width: '100%', maxWidth: '850px',
              padding: '0', borderRadius: '12px', position: 'relative',
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 50px rgba(0,0,0,0.5)'
            }}>
              <div className="no-print" style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '15px', zIndex: 10 }}>
                <button onClick={() => window.print()} className="btn btn-primary" style={{ height: '40px' }}><FileText size={18}/> Print / Save PDF</button>
                <button onClick={() => setSelectedInvoice(null)} className="btn" style={{ height: '40px', background: '#f1f5f9', color: '#64748b', border: 'none' }}><XCircle size={18}/> Close</button>
              </div>

              <div id="invoice-print" style={{ padding: '60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #065f46', paddingBottom: '30px', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <img src="/assets/logo.png" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                    <div>
                      <h2 style={{ color: '#065f46', background: 'none', webkitTextFillColor: 'initial', margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>ALP LOGISTICS</h2>
                      <p style={{ margin: 0, color: '#64748b', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase' }}>ALP LOGISTICS PRAKARSA</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h1 style={{ color: '#d4af37', background: 'none', webkitTextFillColor: 'initial', fontSize: '3.5rem', margin: 0, fontWeight: '950', letterSpacing: '-2px' }}>INVOICE</h1>
                    <p style={{ fontWeight: '800', margin: '5px 0 0 0', fontSize: '1.2rem', color: '#0f172a' }}>NO: {selectedInvoice.id}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '60px', marginBottom: '50px' }}>
                  <div>
                    <h4 style={{ color: '#065f46', marginBottom: '15px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px' }}>BILL TO:</h4>
                    <p style={{ fontWeight: '900', fontSize: '1.6rem', margin: '0 0 8px 0', color: '#0f172a' }}>{selectedInvoice.customerName}</p>
                    <p style={{ margin: 0, color: '#475569', fontWeight: '600' }}>{selectedInvoice.address || 'Batam, Indonesia'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '25px' }}>
                      <h4 style={{ color: '#065f46', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px' }}>INVOICE DETAILS:</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}><strong>Date:</strong> {formatDate(selectedInvoice.date)}</p>
                      <p style={{ margin: 0, fontSize: '1.1rem' }}><strong>Due Date:</strong> {new Date(new Date(selectedInvoice.date).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <h4 style={{ color: '#065f46', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px' }}>PAYMENT INFO:</h4>
                      <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700', lineHeight: '1.5' }}>
                        Bank Mandiri (IDR)<br />
                        Acc No: 164-00-0255502-3<br />
                        Acc Name: ALP Logistics Prakarsa
                      </div>
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '50px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '3px solid #065f46' }}>
                      <th style={{ padding: '15px', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>Service Description</th>
                      <th style={{ padding: '15px', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', width: '100px' }}>Qty</th>
                      <th style={{ padding: '15px', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', width: '220px' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '25px 15px' }}>
                        <div style={{ fontWeight: '900', fontSize: '1.3rem', color: '#0f172a' }}>Logistics Services - JO #{selectedInvoice.joId}</div>
                        <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px', fontWeight: '600' }}>Premium freight forwarding and handling fees</div>
                      </td>
                      <td style={{ padding: '25px 15px', textAlign: 'center', fontWeight: '800', fontSize: '1.2rem' }}>1</td>
                      <td style={{ padding: '25px 15px', textAlign: 'right', fontWeight: '950', fontSize: '1.4rem', color: '#0f172a' }}>Rp {parseFloat(selectedInvoice.amount).toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '40px', marginTop: '10px', padding: '35px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, color: '#64748b', textTransform: 'uppercase', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '1.5px' }}>GRAND TOTAL</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, fontSize: '3.8rem', fontWeight: '950', color: '#065f46', letterSpacing: '-2px' }}>Rp {parseFloat(selectedInvoice.amount).toLocaleString('id-ID')}</h2>
                  </div>
                </div>

                {isPaid && linkedJO && (
                  <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '50px', marginTop: '60px' }}>
                    <h4 style={{ color: '#065f46', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px' }}>
                      <CheckCircle size={20} /> Operational Execution Proof (POD)
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '40px', background: 'white', border: '1px solid #e2e8f0', padding: '25px', borderRadius: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Container No.</span>
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#0f172a' }}>{linkedJO.containerNo || 'N/A'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Vehicle No.</span>
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#0f172a' }}>{linkedJO.vehicleNo || 'N/A'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Final Activity Status</span>
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#10b981' }}>{linkedJO.activityStatus || 'DELIVERED'}</div>
                      </div>
                    </div>

                    {linkedJO.photos && linkedJO.photos.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                        {linkedJO.photos.map((photo, idx) => (
                          <div key={idx} style={{ height: '140px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #f1f5f9' }}>
                            <img src={photo} alt="Operation Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ maxWidth: '400px' }}>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700', marginBottom: '10px' }}>* Payment due within 14 days of invoice date.</p>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>* All business is subject to our standard terms and conditions.</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '250px' }}>
                    <p style={{ marginBottom: '80px', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '1px' }}>Authorized Signature</p>
                    <div style={{ borderBottom: '3px solid #0f172a', width: '100%', marginBottom: '15px' }}></div>
                    <p style={{ margin: 0, fontWeight: '950', color: '#065f46', fontSize: '1.2rem' }}>ALP LOGISTICS PRAKARSA</p>
                    <p style={{ margin: 0, color: '#64748b', fontWeight: '700', fontSize: '0.85rem' }}>Finance Department</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Print PO View */}
      {printPO && (
        <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 10000, padding: '40px', color: 'black', overflowY: 'auto' }}>
          <style>{`
            @media print {
              #po-print { 
                width: 210mm !important; 
                height: 297mm !important; 
                padding: 1.5cm !important; 
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>
          <div className="no-print" style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
            <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setPrintPO(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => window.print()}>Print PO</button>
          </div>
          
          <div id="po-print" style={{ maxWidth: '850px', margin: '0 auto', border: '1px solid #ddd', padding: '50px', background: 'white', boxShadow: '0 0 20px rgba(0,0,0,0.05)', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #333', paddingBottom: '25px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <img src="/assets/logo.png" alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#0f172a', fontWeight: '900', letterSpacing: '-1px' }}>PURCHASE ORDER</h1>
                  <div style={{ color: '#d97706', fontWeight: '800', fontSize: '1.1rem', marginTop: '2px' }}>Ref: {printPO.id}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '900', fontSize: '1.4rem', color: '#0f172a' }}>ALP LOGISTICS</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginTop: '5px' }}>
                  Green Sedayu Bizpark DM 11 No. 51<br />
                  Kalideres, Jakarta Barat<br />
                  Date: {printPO.date}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', marginBottom: '40px' }}>
              <div style={{ borderLeft: '5px solid #d97706', paddingLeft: '20px' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: '#64748b', fontWeight: '800', marginBottom: '10px', letterSpacing: '1px' }}>Vendor Information:</div>
                <div style={{ fontWeight: '900', fontSize: '1.4rem', color: '#0f172a' }}>{printPO.vendorName}</div>
                <div style={{ color: '#475569', fontWeight: '600', marginTop: '5px' }}>Trusted Logistics Partner</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: '#64748b', fontWeight: '800', marginBottom: '10px', letterSpacing: '1px' }}>Job Order Reference:</div>
                <div style={{ fontWeight: '900', fontSize: '1.4rem', color: '#0f172a' }}>{printPO.joId}</div>
                <div style={{ marginTop: '15px' }}>
                  <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b', fontWeight: '800' }}>Customer Reference:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#475569' }}>{printPO.customerName}</div>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '3px solid #333' }}>
                  <th style={{ padding: '15px', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>Service Description</th>
                  <th style={{ padding: '15px', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', width: '80px' }}>Qty</th>
                  <th style={{ padding: '15px', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', width: '180px' }}>Unit Price</th>
                  <th style={{ padding: '15px', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', width: '200px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(printPO.items || []).map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '20px 15px' }}>
                      <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>{it.serviceDescription}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '600', marginTop: '4px' }}>Premium Vendor Service</div>
                    </td>
                    <td style={{ padding: '20px 15px', textAlign: 'center', fontWeight: '800' }}>{it.qty}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'right', fontWeight: '700' }}>Rp {it.unitPrice.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '20px 15px', textAlign: 'right', fontWeight: '900', fontSize: '1.1rem', color: '#0f172a' }}>Rp {it.total.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan="3" style={{ padding: '25px 15px', textAlign: 'right', fontWeight: '900', fontSize: '1.2rem', color: '#64748b' }}>TOTAL AMOUNT PAYABLE</td>
                  <td style={{ padding: '25px 15px', textAlign: 'right', fontWeight: '950', fontSize: '1.8rem', color: '#d97706' }}>Rp {(printPO.grandTotal || 0).toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            </table>

            {printPO.notes && (
              <div style={{ marginBottom: '40px', padding: '15px', background: '#f8fafc', borderLeft: '4px solid #d97706', borderRadius: '4px' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b', fontWeight: '800', marginBottom: '5px', letterSpacing: '1px' }}>Notes / Special Instructions:</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', whiteSpace: 'pre-wrap' }}>{printPO.notes}</div>
              </div>
            )}

            <div style={{ marginTop: '80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '100px', textAlign: 'center' }}>
              <div>
                <div style={{ borderBottom: '2px solid #333', height: '100px', marginBottom: '15px' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>Vendor Signature</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>Authorized Stamp & Sign</div>
              </div>
              <div>
                <div style={{ borderBottom: '2px solid #333', height: '100px', marginBottom: '15px' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>Authorized Signature</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>ALP Logistics Prakarsa</div>
              </div>
            </div>

            <div style={{ marginTop: '60px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>* This Purchase Order is a legally binding document between ALP Logistics Prakarsa and the specified vendor.</p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '5px 0 0 0' }}>* Please acknowledge receipt of this PO within 24 hours.</p>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPOModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div className="glass-card" style={{width:'100%',maxWidth:'720px',padding:'40px',maxHeight:'90vh',overflowY:'auto',position:'relative'}}>
            <button onClick={resetPOForm} style={{position:'absolute',top:'15px',right:'15px',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={20}/></button>
            <h3 style={{color:'var(--secondary)',marginBottom:'25px',display:'flex',alignItems:'center',gap:'10px'}}><Receipt size={22}/> Buat Purchase Order</h3>
            <form onSubmit={e => e.preventDefault()}>
              <div className="input-group" style={{marginBottom:'20px'}}>
                <label style={{color:'var(--secondary)',fontWeight:'600'}}>1. Job Order</label>
                {poJoId ? (
                  <div style={{padding:'12px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'10px',color:'var(--secondary)',fontWeight:'700'}}>
                    {poJoId} — {jobOrders.find(j=>j.id===poJoId)?.customerName}
                  </div>
                ) : (
                  <select required value={poJoId} onChange={e=>setPoJoId(e.target.value)} style={{width:'100%',padding:'12px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'10px',color:'var(--secondary)',fontWeight:'700'}}>
                    <option value="">-- Pilih Job Order --</option>
                    {jobOrders.filter(jo => jo.status !== 'cancelled').map(jo => (
                      <option key={jo.id} value={jo.id} style={{color:'var(--text)', background:'var(--bg)'}}>
                        {jo.id} — {jo.customerName} ({jo.instruction})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="input-group" style={{marginBottom:'20px'}}>
                <label style={{color:'var(--secondary)',fontWeight:'600'}}>2. Pilih Vendor</label>
                <select required value={poVendorId} onChange={e=>{setPoVendorId(e.target.value);setPoItems([{serviceIdx:'',qty:1}]);}} style={{width:'100%',padding:'12px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'10px',color:'var(--secondary)',fontWeight:'700'}}>
                  <option value="" style={{color:'var(--text-muted)'}}>-- Pilih Vendor --</option>
                  {vendorList.map(v=><option key={v.id} value={v.id} style={{color:'var(--text)',background:'var(--bg)'}}>{v.name}</option>)}
                </select>
              </div>



              {poVendorId && (() => {
                const vendor = vendorList.find(v=>v.id===poVendorId);
                return (
                  <div style={{marginBottom:'20px'}}>
                    <label style={{color:'var(--secondary)',fontWeight:'600',display:'block',marginBottom:'10px'}}>3. Pilih Layanan Vendor</label>
                    {poItems.map((item,i)=>{
                      const svc = vendor?.services?.[parseInt(item.serviceIdx)];
                      const sub = svc ? parseFloat(svc.price||0)*parseFloat(item.qty||1) : 0;
                      return (
                        <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 140px 36px',gap:'8px',marginBottom:'10px',alignItems:'center'}}>
                          <select required value={item.serviceIdx} onChange={e=>updatePOItem(i,'serviceIdx',e.target.value)} style={{padding:'9px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--secondary)',fontWeight:'600',fontSize:'0.85rem'}}>
                            <option value="" style={{color:'var(--text-muted)'}}>-- Pilih Layanan --</option>
                            {vendor?.services?.map((s,si)=><option key={si} value={si} style={{color:'var(--text)', background:'var(--bg)'}}>{s.description} — Rp {parseFloat(s.price||0).toLocaleString('id-ID')}</option>)}
                          </select>
                          <input type="number" min="1" value={item.qty} onChange={e=>updatePOItem(i,'qty',e.target.value)} style={{padding:'9px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text)',fontSize:'0.85rem',textAlign:'center'}}/>
                          <div style={{padding:'9px',background:'rgba(255,255,255,0.03)',border:'1px solid var(--glass-border)',borderRadius:'8px',fontSize:'0.85rem',fontWeight:'700',color:'var(--secondary)',textAlign:'right'}}>{svc?`Rp ${sub.toLocaleString('id-ID')}`:'Rp 0'}</div>
                          <button type="button" onClick={()=>removePOItem(i)} disabled={poItems.length===1} style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'none',borderRadius:'8px',height:'36px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={13}/></button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={addPOItem} style={{width:'100%',padding:'8px',background:'rgba(212,175,55,0.08)',color:'var(--secondary)',border:'1px dashed var(--secondary)',borderRadius:'8px',cursor:'pointer',fontSize:'0.85rem',marginBottom:'15px'}}>+ Tambah Baris Layanan</button>
                    <div style={{textAlign:'right',padding:'12px 15px',background:'rgba(255,255,255,0.03)',borderRadius:'10px',border:'1px solid var(--glass-border)'}}>
                      <span style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>Grand Total PO: </span>
                      <span style={{color:'var(--secondary)',fontWeight:'800',fontSize:'1.1rem'}}>Rp {poItems.filter(it=>it.serviceIdx!=='').reduce((s,it)=>{const svc=vendor?.services?.[parseInt(it.serviceIdx)];return s+(svc?parseFloat(svc.price||0)*parseFloat(it.qty||1):0);},0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="input-group" style={{marginBottom:'20px'}}>
                <label style={{color:'var(--secondary)',fontWeight:'600'}}>4. Catatan (Notes)</label>
                <textarea 
                  value={poNotes} 
                  onChange={e => setPoNotes(e.target.value)} 
                  placeholder="Tambahkan instruksi khusus untuk vendor (opsional)..."
                  style={{width:'100%',padding:'12px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'10px',color:'var(--text)',minHeight:'80px',fontSize:'0.9rem'}}
                />
              </div>

              <div style={{display:'flex',gap:'12px',marginTop:'20px' }}>
                <button type="button" onClick={resetPOForm} className="btn" style={{flex:1,background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',color:'var(--text)'}}>Batal</button>
                <ButtonWithLoading type="button" onClick={handleSavePODraft} className="btn" style={{flex:1,background:'rgba(212,175,55,0.1)',color:'var(--secondary)',border:'1px solid var(--secondary)'}} disabled={!poVendorId}>💾 Simpan Draft</ButtonWithLoading>
                <ButtonWithLoading type="button" onClick={handleIssuePO} className="btn btn-gold" style={{flex:2}} disabled={!poVendorId}>🚀 Terbitkan PO</ButtonWithLoading>
              </div>
            </form>
          </div>
        </div>
      )}

      {batchPrintInvoices && (
        <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 10000, color: 'black', overflowY: 'auto', padding: '20px' }}>
          <style>{`
            @media print {
              .batch-inv-page { 
                width: 210mm !important; 
                height: 297mm !important; 
                padding: 1.5cm !important; 
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                page-break-after: always !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>
          <div className="no-print" style={{ position: 'sticky', top: '10px', right: '10px', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '8px', zIndex: 10001 }}>
            <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setBatchPrintInvoices(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => window.print()}><FileText size={18}/> Print All Selected Invoices</button>
          </div>
          
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            {batchPrintInvoices.map((inv, index) => {
              return (
                <div key={inv.id} className="batch-inv-page" style={{ background: 'white', padding: '50px', marginBottom: '50px', border: '1px solid #eee', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #0f172a', paddingBottom: '25px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <img src="/assets/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                      <div>
                        <h1 style={{ margin: 0, color: '#0f172a', fontSize: '2.5rem', letterSpacing: '-1px', fontWeight: '900' }}>INVOICE</h1>
                        <div style={{ color: '#64748b', fontWeight: '700', marginTop: '2px' }}>NO: {inv.id}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#0f172a' }}>ALP LOGISTICS PRAKARSA</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                        Green Sedayu Bizpark DM 11 No. 51<br />
                        Kalideres, Jakarta Barat<br />
                        T: +62 21 5000 8000
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '8px' }}>Billed To:</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{inv.customerName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '15px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '3px' }}>Invoice Date:</span>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{formatDate(inv.date)}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                        Bank Mandiri | 164-00-0255502-3<br />
                        ALP Logistics Prakarsa
                      </div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '800', fontSize: '0.8rem' }}>DESCRIPTION</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '800', fontSize: '0.8rem', width: '80px' }}>QTY</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '800', fontSize: '0.8rem', width: '180px' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '20px 12px' }}>
                          <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Freight & Logistics Services</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>JO Ref: {inv.joId}</div>
                        </td>
                        <td style={{ padding: '20px 12px', textAlign: 'center' }}>1</td>
                        <td style={{ padding: '20px 12px', textAlign: 'right', fontWeight: '900', fontSize: '1.2rem' }}>Rp {parseFloat(inv.amount).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '30px', background: '#f8fafc', padding: '20px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '800', color: '#64748b' }}>TOTAL DUE</div>
                    <div style={{ fontWeight: '950', fontSize: '2.2rem', color: '#065f46' }}>Rp {parseFloat(inv.amount).toLocaleString('id-ID')}</div>
                  </div>

                  <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      * Computer generated invoice, no signature required unless requested.
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '200px' }}>
                      <p style={{ marginBottom: '60px', fontSize: '0.85rem', fontWeight: '800' }}>AUTHORIZED BY</p>
                      <div style={{ borderBottom: '2px solid #0f172a', width: '100%', marginBottom: '10px' }}></div>
                      <p style={{ margin: 0, fontWeight: '900' }}>ALP LOGISTICS</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* JO Costing Modal */}
      {costModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%',maxWidth:'700px',padding:'35px',maxHeight:'90vh',overflowY:'auto',position:'relative' }}>
            <button onClick={() => { setCostModal(null); setCostLines([{vendorId:'',serviceIdx:'',qty:1}]); }} style={{ position:'absolute',top:'15px',right:'15px',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'var(--secondary)',marginBottom:'8px',fontSize:'1.3rem' }}>Input Biaya — {costModal.id}</h3>
            <p style={{ color:'var(--text-muted)',fontSize:'0.85rem',marginBottom:'25px' }}>Pelanggan: <strong style={{color:'var(--text)'}}>{costModal.customerName}</strong></p>

            {/* Existing costs */}
            {Array.isArray(costModal.costs) && costModal.costs.length > 0 && (
              <div style={{ marginBottom:'25px' }}>
                <div style={{ fontSize:'0.75rem',color:'var(--secondary)',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px' }}>Biaya Tercatat</div>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
                  <thead><tr style={{ borderBottom:'1px solid var(--glass-border)',color:'var(--text-muted)' }}><th style={{padding:'8px',textAlign:'left'}}>Vendor</th><th style={{padding:'8px',textAlign:'left'}}>Layanan</th><th style={{padding:'8px',textAlign:'center'}}>Qty</th><th style={{padding:'8px',textAlign:'right'}}>Total</th><th style={{padding:'8px'}}></th></tr></thead>
                  <tbody>
                    {costModal.costs.map((c, ci) => (
                      <tr key={ci} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{padding:'8px',color:'var(--text-muted)'}}>{c.vendorName}</td>
                        <td style={{padding:'8px'}}>{c.serviceDescription}</td>
                        <td style={{padding:'8px',textAlign:'center'}}>{c.qty}</td>
                        <td style={{padding:'8px',textAlign:'right',fontWeight:'700',color:'var(--secondary)'}}>Rp {(c.total||0).toLocaleString('id-ID')}</td>
                        <td style={{padding:'8px'}}><button className="btn btn-sm btn-danger" onClick={() => handleDeleteCost(costModal, ci)}>Hapus</button></td>
                      </tr>
                    ))}
                    <tr style={{ borderTop:'2px solid var(--glass-border)' }}>
                      <td colSpan="3" style={{padding:'10px 8px',fontWeight:'700',textAlign:'right'}}>Grand Total Biaya</td>
                      <td style={{padding:'10px 8px',textAlign:'right',fontWeight:'800',color:'#ef4444',fontSize:'1.1rem'}}>Rp {costModal.costs.reduce((s,c)=>s+(c.total||0),0).toLocaleString('id-ID')}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Add new cost lines */}
            <div style={{ fontSize:'0.75rem',color:'var(--secondary)',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'12px' }}>Tambah Biaya Baru</div>
            {vendorList.length === 0 ? (
              <p style={{ color:'#f59e0b',fontSize:'0.85rem',padding:'15px',background:'rgba(245,158,11,0.1)',borderRadius:'8px' }}>⚠️ Belum ada vendor terdaftar. Tambahkan vendor di halaman Procurement terlebih dahulu.</p>
            ) : (
              <>
                {costLines.map((line, i) => {
                  const selVendor = vendorList.find(v => v.id === line.vendorId);
                  const selSvc = selVendor?.services?.[parseInt(line.serviceIdx)];
                  const lineTotal = selSvc ? parseFloat(selSvc.price||0) * parseFloat(line.qty||1) : 0;
                  return (
                    <div key={i} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 80px 1fr 36px',gap:'10px',marginBottom:'12px',alignItems:'center' }}>
                       <select value={line.vendorId} onChange={e=>updateCostLine(i,'vendorId',e.target.value)} style={{ padding:'9px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--secondary)',fontWeight:'600',fontSize:'0.85rem' }}>
                        <option value="" style={{color:'var(--text-muted)'}}>-- Pilih Vendor --</option>
                        {vendorList.map(v=><option key={v.id} value={v.id} style={{color:'var(--text)', background:'var(--bg)'}}>{v.name}</option>)}
                      </select>
                      <select value={line.serviceIdx} onChange={e=>updateCostLine(i,'serviceIdx',e.target.value)} disabled={!selVendor} style={{ padding:'9px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--secondary)',fontWeight:'600',fontSize:'0.85rem' }}>
                        <option value="" style={{color:'var(--text-muted)'}}>-- Pilih Layanan --</option>
                        {(selVendor?.services||[]).map((s,si)=><option key={si} value={si} style={{color:'var(--text)', background:'var(--bg)'}}>{s.description}</option>)}
                      </select>
                      <input type="number" min="1" value={line.qty} onChange={e=>updateCostLine(i,'qty',e.target.value)} placeholder="Qty" style={{ padding:'9px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text)',fontSize:'0.85rem',textAlign:'center' }}/>
                      <div style={{ fontSize:'0.85rem',color:'var(--secondary)',fontWeight:'600',padding:'9px',background:'rgba(255,255,255,0.03)',borderRadius:'8px',border:'1px solid var(--glass-border)' }}>{selSvc ? `Rp ${lineTotal.toLocaleString('id-ID')}` : 'Rp 0'}</div>
                      <button onClick={()=>removeCostLine(i)} disabled={costLines.length===1} style={{ background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'none',borderRadius:'8px',height:'36px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={14}/></button>
                    </div>
                  );
                })}
                <button onClick={addCostLine} style={{ width:'100%',padding:'8px',background:'rgba(212,175,55,0.08)',color:'var(--secondary)',border:'1px dashed var(--secondary)',borderRadius:'8px',cursor:'pointer',fontSize:'0.85rem',marginBottom:'20px' }}>+ Tambah Baris Biaya</button>
                <div style={{ display:'flex',gap:'12px' }}>
                  <button onClick={()=>{ setCostModal(null); setCostLines([{vendorId:'',serviceIdx:'',qty:1}]); }} className="btn" style={{ flex:1,background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',color:'var(--text)' }}>Batal</button>
                  <ButtonWithLoading onClick={handleSaveCosts} className="btn btn-gold" style={{ flex: 2 }}><CheckCircle size={16}/> Simpan Biaya</ButtonWithLoading>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <h3 className="shimmer-text" style={{ fontSize: '1.8rem', marginBottom: '30px' }}>Financial Management Hub</h3>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap:'wrap' }}>
        <button
          onClick={() => setActiveTab('billing')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: activeTab === 'billing' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'billing' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'billing' ? '0 4px 15px rgba(59,130,246,0.4)' : 'none',
            border: activeTab === 'billing' ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          <Receipt size={17} /> Billing &amp; Invoices
        </button>

        <button
          onClick={() => setActiveTab('costing')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: activeTab === 'costing' ? 'linear-gradient(135deg, #d4af37, #a07d1c)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'costing' ? '#1a1200' : 'var(--text-muted)',
            boxShadow: activeTab === 'costing' ? '0 4px 15px rgba(212,175,55,0.4)' : 'none',
            border: activeTab === 'costing' ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          <DollarSign size={17} /> Profit and Loss
          {activeJOs.length > 0 && (
            <span style={{ background: activeTab === 'costing' ? 'rgba(0,0,0,0.2)' : 'rgba(212,175,55,0.2)', color: activeTab === 'costing' ? '#1a1200' : 'var(--secondary)', borderRadius: '20px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: '800' }}>
              {activeJOs.length}
            </span>
          )}
        </button>

          <button
            onClick={() => setActiveTab('piutang')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
              background: activeTab === 'piutang' ? 'linear-gradient(135deg, #10b981, #047857)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'piutang' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: activeTab === 'piutang' ? '0 4px 15px rgba(16,185,129,0.4)' : 'none',
              border: activeTab === 'piutang' ? 'none' : '1px solid var(--glass-border)'
            }}
          >
            <Wallet size={17} /> Piutang &amp; Receivable
        </button>

        <button
          onClick={() => setActiveTab('salary')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: activeTab === 'salary' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'salary' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'salary' ? '0 4px 15px rgba(139,92,246,0.4)' : 'none',
            border: activeTab === 'salary' ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          <User size={17} /> Biaya Gaji
        </button>

        <button
          onClick={() => setActiveTab('other_expenses')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: activeTab === 'other_expenses' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'other_expenses' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'other_expenses' ? '0 4px 15px rgba(236,72,153,0.4)' : 'none',
            border: activeTab === 'other_expenses' ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          <Briefcase size={17} /> Biaya Lain-lain
        </button>

        <button
          onClick={() => setActiveTab('hutang')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: activeTab === 'hutang' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'hutang' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'hutang' ? '0 4px 15px rgba(245,158,11,0.4)' : 'none',
            border: activeTab === 'hutang' ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          <Banknote size={17} /> Hutang &amp; Payable
        </button>

        <button
          onClick={() => setActiveTab('detail_report')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: activeTab === 'detail_report' ? 'linear-gradient(135deg, #6366f1, #4338ca)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'detail_report' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: activeTab === 'detail_report' ? '0 4px 15px rgba(99,102,241,0.4)' : 'none',
            border: activeTab === 'detail_report' ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          <FileText size={17} /> Detail Report
        </button>

        <button
          onClick={() => setShowBankSettings(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-muted)',
            border: '1px solid var(--glass-border)',
            marginLeft: 'auto'
          }}
        >
          <Settings size={17} /> Bank Accounts
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '20px 25px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', marginBottom: '30px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <input type="text" placeholder="Search Invoices, Customers, JOs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
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

      {activeTab === 'costing' ? (
        <div className="glass-card" style={{ padding:'25px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap', gap:'15px' }}>
            <div>
              <h4 style={{ margin:0, display:'flex', alignItems:'center', gap:'10px' }}><DollarSign size={20} style={{color:'var(--secondary)'}}/>Profit and Loss</h4>
              <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'5px', marginBottom:0 }}>Semua Job Order yang telah diterbitkan dari Admin Office. Biaya hanya dapat dipilih dari Vendor List tervalidasi.</p>
            </div>
            <div style={{ display:'flex', gap:'15px', flexShrink:0 }}>
              {[
                {label:'Total JO', val:activeJOs.length, color:'var(--secondary)'},
                {label:'Total Revenue', val:'Rp ' + plFinancials.revenue.toLocaleString('id-ID'), color:'#10b981'},
                {label:'Total Biaya', val:'Rp ' + plFinancials.cost.toLocaleString('id-ID'), color:'#ef4444'},
                {label:'Total Profit', val:'Rp ' + (plFinancials.revenue - plFinancials.cost).toLocaleString('id-ID'), color: (plFinancials.revenue - plFinancials.cost) >= 0 ? '#10b981' : '#ef4444'}
              ].map(stat=>(
                <div key={stat.label} style={{ textAlign:'center', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'10px', padding:'10px 16px', minWidth: '120px' }}>
                  <div style={{ fontSize:'1rem', fontWeight:'800', color:stat.color }}>{stat.val}</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          {activeJOs.length === 0 ? (
            <div style={{ textAlign:'center',padding:'60px',color:'var(--text-muted)' }}>
              <DollarSign size={48} style={{ opacity:0.2,display:'block',margin:'0 auto 15px' }}/>
              <p style={{ fontWeight:'600',marginBottom:'6px' }}>Belum ada Job Order diterbitkan</p>
              <p style={{ fontSize:'0.85rem' }}>Buat dan dispatch Job Order dari halaman Admin Office agar muncul di sini.</p>
            </div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse',minWidth:'900px' }}>
              <thead>
                <tr style={{ textAlign:'left', borderBottom:'2px solid var(--gold-metallic)' }}>
                   <th style={{padding:'12px'}}>JO Ref</th>
                   <th style={{padding:'12px'}}>Customer</th>
                   <th style={{padding:'12px'}}>Inv ID</th>
                   <th style={{padding:'12px'}}>Inv Date</th>
                   <th style={{padding:'12px'}}>Status</th>
                   <th style={{padding:'12px', textAlign:'right'}}>Revenue (Inv)</th>
                   <th style={{padding:'12px', textAlign:'right'}}>Total Biaya</th>
                   <th style={{padding:'12px', textAlign:'right'}}>Profit/Loss</th>
                   <th style={{padding:'12px', textAlign:'center'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedActiveJOs.map(jo => {
                  const manualCost = Array.isArray(jo.costs) ? jo.costs.reduce((s,c)=>s+parseFloat(c.total||0),0) : 0;
                  const poCost = (poMap[jo.id] || []).reduce((s,p)=>s+parseFloat(p.grandTotal||0),0);
                  const totalCost = manualCost + poCost;
                  
                  const invoice = invoiceMap[String(jo.id)];
                  const revenue = invoice ? parseFloat(invoice.subtotal || invoice.amount || 0) : 0;
                  const profitLoss = revenue - totalCost;

                  return (
                    <tr key={jo.id} style={{ borderBottom:'1px solid var(--glass-border)' }} className="table-row-hover">
                       <td style={{padding:'12px',fontWeight:'700',color:'var(--secondary)',fontSize:'0.85rem'}}>{jo.id}</td>
                       <td style={{padding:'12px',fontWeight:'600'}}>{jo.customerName}</td>
                       <td style={{padding:'12px',fontSize:'0.8rem',fontWeight:'700',color:'var(--secondary)'}}>
                         {invoice ? invoice.id : <span style={{color:'var(--text-muted)', fontWeight:'400'}}>Belum Ada</span>}
                       </td>
                       <td style={{padding:'12px',fontSize:'0.8rem',color:'var(--text-muted)'}}>
                         {invoice ? new Date(invoice.date).toLocaleDateString() : '—'}
                       </td>
                       <td style={{padding:'12px'}}><span className={`badge badge-${jo.status}`} style={{fontSize:'0.7rem'}}>{jo.status}</span></td>
                      <td style={{padding:'12px', textAlign:'right', fontWeight:'700', color: revenue > 0 ? '#10b981' : 'var(--text-muted)'}}>
                        {revenue > 0 ? `Rp ${revenue.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td style={{padding:'12px',textAlign:'right',fontWeight:'700',color: totalCost>0 ? '#ef4444' : 'var(--text-muted)'}}>
                        {totalCost>0 ? `Rp ${totalCost.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td style={{padding:'12px', textAlign:'right', fontWeight:'800', color: profitLoss > 0 ? '#10b981' : profitLoss < 0 ? '#ef4444' : 'var(--text-muted)'}}>
                        {revenue > 0 || totalCost > 0 ? `Rp ${profitLoss.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td style={{padding:'12px', textAlign:'center'}}>
                        <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                          <button className="btn" style={{padding:'7px 14px',fontSize:'0.8rem',gap:'6px', background:'rgba(212,175,55,0.1)', color:'var(--secondary)', border:'1px solid var(--secondary)'}} onClick={()=>{ setCostModal(jo); setCostLines([{vendorId:'',serviceIdx:'',qty:1}]); }}>
                            <Plus size={14}/> Costs
                          </button>
                          {!invoice && (
                            <ButtonWithLoading className="btn btn-gold" style={{padding:'7px 14px',fontSize:'0.8rem',gap:'6px'}} onClick={() => handleIssueInvoice(jo.id)}>
                              <Receipt size={14}/> Invoice
                            </ButtonWithLoading>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'billing' ? (
        <div className="billing-section">
          <div className="glass-card" style={{ padding: '25px', marginBottom: '40px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: isPendingCollapsed ? '0' : '20px', cursor:'pointer' }} onClick={() => setIsPendingCollapsed(!isPendingCollapsed)}>
              <h4 style={{ margin:0 }}>Pending Invoices (from Operations)</h4>
              <button style={{ background:'none', border:'none', color:'var(--secondary)', cursor:'pointer' }}>
                {isPendingCollapsed ? <ChevronDown /> : <ChevronUp />}
              </button>
            </div>
            
            {!isPendingCollapsed && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '15px' }}>JO Ref</th>
                  <th style={{ padding: '15px' }}>Customer</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Photos</th>
                  <th style={{ padding: '15px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {completedJOs.map(jo => {
                  const hasInvoice = invoices.some(inv => String(inv.joId) === String(jo.id));
                  return (
                    <tr key={jo.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '15px' }}>{jo.id}</td>
                      <td style={{ padding: '15px' }}>{jo.customerName}</td>
                      <td style={{ padding: '15px' }}>
                        <span className="badge badge-done">Completed</span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {jo.photos && jo.photos.length > 0 ? (
                          <button 
                            onClick={() => setPhotoViewer({ joId: jo.id, photos: jo.photos })}
                            style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--secondary)', borderRadius: '6px', padding: '5px 10px', color: 'var(--secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}
                          >
                            <Image size={14} /> {jo.photos.length} Photos
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Photos</span>
                        )}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {!hasInvoice ? (
                            <ButtonWithLoading className="btn btn-gold" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleIssueInvoice(jo.id)}>
                              Issue Invoice
                            </ButtonWithLoading>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              {undoConfirmJoId === jo.id ? (
                                // Inline confirmation — avoids window.confirm browser suppression
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '4px 10px' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>Batalkan invoice ini?</span>
                                  <button
                                    onClick={() => handleUndoInvoice(jo.id)}
                                    style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    Ya, Batalkan
                                  </button>
                                  <button
                                    onClick={() => setUndoConfirmJoId(null)}
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', borderRadius: '5px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer' }}
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: '600' }}>
                                    <CheckCircle size={16} /> Invoiced
                                  </span>
                                  <button
                                    onClick={() => setUndoConfirmJoId(jo.id)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 10px',
                                      borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', gap: '5px'
                                    }}
                                    title="Batalkan / Revoke Invoice"
                                  >
                                    <RotateCcw size={12} /> Undo
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          <button 
                            className="btn" 
                            style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--secondary)', border: '1px solid var(--secondary)' }} 
                            onClick={() => handleCreatePOFromAccounting(jo.id)}
                          >
                            + Purchase Order
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>

          <div className="glass-card" style={{ padding: '25px', overflowX: 'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: isIssuedCollapsed ? '0' : '20px', cursor:'pointer' }} onClick={() => setIsIssuedCollapsed(!isIssuedCollapsed)}>
              <h4 style={{ margin:0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={20} style={{ color: 'var(--secondary)' }} />
                Issued Invoices
              </h4>
              <button style={{ background:'none', border:'none', color:'var(--secondary)', cursor:'pointer' }}>
                {isIssuedCollapsed ? <ChevronDown /> : <ChevronUp />}
              </button>
            </div>

            {!isIssuedCollapsed && (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--secondary)' }}>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Inv ID / JO</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Revenue (INV)</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Total Cost</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Profit/Loss</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Signed Doc</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Delivery</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter(inv => filterByDate(inv.date))
                  .filter(inv => {
                    const id = inv.id || '';
                    const name = inv.customerName || '';
                    const term = searchTerm.toLowerCase();
                    return id.toLowerCase().includes(term) || name.toLowerCase().includes(term);
                  })
                  .map(inv => {
                    const linkedJO = jobOrders.find(j => String(j.id) === String(inv.joId));
                    return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover">
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: '800', color: 'var(--secondary)' }}>{inv.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JO: {inv.joId}</div>
                      </td>
                      <td style={{ padding: '15px', fontWeight: '600' }}>{inv.customerName}</td>
                      <td style={{ padding: '15px', fontSize: '0.85rem' }}>{new Date(inv.date).toLocaleDateString()}</td>
                      <td 
                        style={{ padding: '15px', textAlign: 'right', fontWeight: '700', color: '#10b981', fontSize: '1rem', cursor: 'pointer' }}
                        onClick={() => { setActiveTab('costing'); setSearchTerm(inv.joId); }}
                        title="Lihat Detail di JO Records"
                      >
                        Rp {(inv.subtotal || inv.amount).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>
                        {(() => {
                          const jo = jobOrders.find(j => j.id === inv.joId);
                          if (!jo) return '—';
                          const manualCost = Array.isArray(jo.costs) ? jo.costs.reduce((s,c)=>s+(c.total||0),0) : 0;
                          const poCost = (purchaseOrders || []).filter(po => po.joId === jo.id).reduce((s,p)=>s+(p.grandTotal||0),0);
                          const totalCost = manualCost + poCost;
                          return totalCost > 0 ? `Rp ${totalCost.toLocaleString('id-ID')}` : '—';
                        })()}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800' }}>
                        {(() => {
                          const jo = jobOrders.find(j => j.id === inv.joId);
                          if (!jo) return '—';
                          const manualCost = Array.isArray(jo.costs) ? jo.costs.reduce((s,c)=>s+(c.total||0),0) : 0;
                          const poCost = (purchaseOrders || []).filter(po => po.joId === jo.id).reduce((s,p)=>s+(p.grandTotal||0),0);
                          const totalCost = manualCost + poCost;
                          const revenue = inv.subtotal || inv.amount;
                          const profit = revenue - totalCost;
                          return (
                            <span style={{ color: profit > 0 ? '#10b981' : profit < 0 ? '#ef4444' : 'inherit' }}>
                              Rp {profit.toLocaleString('id-ID')}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                         <div style={{ display:'flex', flexDirection:'column', gap:'5px', alignItems:'center' }}>
                           <div style={{ display:'flex', gap:'8px' }}>
                             {inv.signedInvoicePhoto ? (
                               <button onClick={() => setPhotoViewer({ title: `Signed Invoice - ${inv.id}`, photos: [inv.signedInvoicePhoto] })} style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer' }} title="Signed Invoice Uploaded"><ShieldCheck size={18}/></button>
                             ) : (
                               <button onClick={() => setUploadSignedModal({ invId: inv.id, type: 'invoice' })} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }} title="Upload Signed Invoice"><Image size={18}/></button>
                             )}
                             {inv.signedReceiptPhoto ? (
                               <button onClick={() => setPhotoViewer({ title: `Signed Delivery Receipt - ${inv.id}`, photos: [inv.signedReceiptPhoto] })} style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer' }} title="Signed STT Uploaded"><ShieldCheck size={18}/></button>
                             ) : (
                               <button onClick={() => setUploadSignedModal({ invId: inv.id, type: 'receipt' })} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }} title="Upload Signed STT"><FileText size={18}/></button>
                             )}
                           </div>
                           <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>
                             {!inv.signedInvoicePhoto && !inv.signedReceiptPhoto ? 'Pending' : 'Partial/Complete'}
                           </span>
                         </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                         <select 
                           value={inv.deliveryStatus || 'not_sent'} 
                           onChange={(e) => updateInvoice(inv.id, { deliveryStatus: e.target.value })}
                           style={{ background:'var(--input-bg)', border:'1px solid var(--glass-border)', color:'var(--text)', fontSize:'0.7rem', padding:'4px', borderRadius:'4px' }}
                         >
                           <option value="not_sent">Belum Dikirim</option>
                           <option value="on_process">Proses Kirim</option>
                           <option value="delivered">Diterima</option>
                         </select>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span className={`badge badge-${inv.status}`} style={{ fontSize: '0.7rem' }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '5px' }} onClick={() => handleDownloadInvoice(inv)}>
                            <Download size={14} /> View (Inv + Att)
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '5px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }} 
                            onClick={() => {
                              const linkedJO = jobOrders.find(j => String(j.id) === String(inv.joId));
                              const linkedQuo = linkedJO ? quotations.find(q => String(q.id) === String(linkedJO.quotationId)) : null;
                              localStorage.setItem('print_invoice_data', JSON.stringify({ invoice: inv, jo: linkedJO, quotation: linkedQuo }));
                              window.open('/print/invoice-delivery', '_blank');
                            }}
                          >
                            <FileText size={14} /> STT
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '5px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--secondary)', border: '1px solid var(--secondary)' }} 
                            onClick={() => {
                              if (linkedJO && linkedJO.photos && linkedJO.photos.length > 0) {
                                setPhotoViewer({ title: `JO Photos - ${inv.joId}`, photos: linkedJO.photos });
                              } else {
                                alert("Tidak ada lampiran operasional.");
                              }
                            }}
                          >
                            <Image size={14} /> Ops
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </div>
      ) : activeTab === 'piutang' ? (
        <div className="piutang-section">
          {/* Sub-Navigation */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '10px', width: 'fit-content' }}>
            <button 
              onClick={() => setReceivableSubTab('outstanding')}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: receivableSubTab === 'outstanding' ? 'var(--secondary)' : 'transparent',
                color: receivableSubTab === 'outstanding' ? 'black' : 'var(--text-muted)',
                fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s'
              }}
            >
              Outstanding Receivables
            </button>
            <button 
              onClick={() => setReceivableSubTab('lunas')}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: receivableSubTab === 'lunas' ? '#10b981' : 'transparent',
                color: receivableSubTab === 'lunas' ? 'white' : 'var(--text-muted)',
                fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s'
              }}
            >
              Invoice Lunas (Paid)
            </button>
          </div>

          {receivableSubTab === 'outstanding' && (
            <div className="glass-card" style={{ padding:'25px', marginBottom:'25px', border:'1px solid var(--secondary)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <h4 style={{ margin:0, color:'var(--secondary)', display:'flex', alignItems:'center', gap:'10px' }}><Wallet size={20}/> Summary Piutang per Pelanggan</h4>
                <button 
                  onClick={() => { setActiveTab('outstanding_summary'); handleExport(); setActiveTab('piutang'); }} 
                  className="btn btn-gold" 
                  style={{ fontSize:'0.8rem', padding:'6px 15px' }}
                >
                  <Download size={14}/> Download Summary per Customer
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'15px' }}>
                {(() => {
                  const grouped = receivables.reduce((acc, r) => {
                    if (!acc[r.customerName]) acc[r.customerName] = { total: 0, count: 0 };
                    acc[r.customerName].total += (r.balance || r.amount);
                    acc[r.customerName].count += 1;
                    return acc;
                  }, {});
                  
                  return Object.entries(grouped).map(([name, data]) => (
                    <div key={name} style={{ background:'rgba(255,255,255,0.03)', padding:'15px', borderRadius:'10px', border:'1px solid var(--glass-border)' }}>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:'700', marginBottom:'5px' }}>{name}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                        <div style={{ fontSize:'1.2rem', fontWeight:'800', color:'var(--secondary)' }}>Rp {data.total.toLocaleString()}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{data.count} Inv</div>
                      </div>
                    </div>
                  ));
                })()}
                {receivables.length === 0 && <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>Tidak ada data piutang outstanding.</p>}
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '25px' }}>
            <h4 style={{ marginBottom: '20px', color: receivableSubTab === 'outstanding' ? 'var(--secondary)' : '#10b981' }}>
              {receivableSubTab === 'outstanding' ? 'Accounts Receivable Ledger' : 'Settled Invoices Archive'}
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '15px', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedLedger.size > 0 && selectedLedger.size === (receivableSubTab === 'outstanding' ? receivables : paidInvoices).filter(item => filterByDate(item.date)).filter(item => item.id.toLowerCase().includes(searchTerm.toLowerCase()) || item.customerName.toLowerCase().includes(searchTerm.toLowerCase())).length}
                      onChange={() => toggleAllLedger((receivableSubTab === 'outstanding' ? receivables : paidInvoices).filter(item => filterByDate(item.date)).filter(item => item.id.toLowerCase().includes(searchTerm.toLowerCase()) || item.customerName.toLowerCase().includes(searchTerm.toLowerCase())))}
                    />
                  </th>
                  <th style={{ padding: '15px' }}>Invoice</th>
                  <th style={{ padding: '15px' }}>Customer</th>
                  <th style={{ padding: '15px' }}>{receivableSubTab === 'outstanding' ? 'Outstanding Amount' : 'Amount Paid'}</th>
                  <th style={{ padding: '15px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredItems = (receivableSubTab === 'outstanding' ? receivables : paidInvoices)
                    .filter(item => filterByDate(item.date))
                    .filter(item => {
                      const id = item.id || '';
                      const name = item.customerName || '';
                      const term = searchTerm.toLowerCase();
                      return id.toLowerCase().includes(term) || name.toLowerCase().includes(term);
                    });
                  
                  return filteredItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '15px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedLedger.has(item.id)}
                          onChange={() => toggleLedgerSelection(item.id)}
                        />
                      </td>
                      <td style={{ padding: '15px', color: 'var(--secondary)', fontWeight: 'bold' }}>{item.id}</td>
                      <td style={{ padding: '15px' }}>{item.customerName}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>
                        Rp {(item.balance || item.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                            onClick={() => {
                              const jo = jobOrders.find(j => j.id === item.joId);
                              if (jo && jo.photos && jo.photos.length > 0) {
                                setPhotoViewer({ title: `Signed Document - ${item.id}`, photos: jo.photos });
                              } else {
                                alert("Dokumen tertanda belum diupload oleh operasional.");
                              }
                            }}
                          >
                            <ShieldCheck size={14} /> Doc
                          </button>
                          
                          {item.paymentProofPhoto ? (
                            <button 
                              className="btn" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                              onClick={() => setPhotoViewer({ title: `Bukti Pembayaran - ${item.id}`, photos: item.paymentProofPhoto })}
                            >
                              <Image size={14} /> Proof
                            </button>
                          ) : (
                            <button 
                              className="btn" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--secondary)', border: '1px solid var(--secondary)' }}
                              onClick={() => setReceivableProofModal(item)}
                            >
                              <Plus size={14} /> Upload
                            </button>
                          )}

                          {receivableSubTab === 'outstanding' ? (
                            <ButtonWithLoading className="btn btn-gold" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleSettle(item.id)}>
                              Mark as Settled
                            </ButtonWithLoading>
                          ) : (
                            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '5px' }} onClick={() => handleDownloadInvoice(item)}>
                              <Download size={14} /> History View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
                {((receivableSubTab === 'outstanding' ? receivables : paidInvoices).length === 0) && (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {selectedLedger.size > 0 && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(212,175,55,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--secondary)' }}>
                <span style={{ fontWeight: '600' }}>{selectedLedger.size} Invoices Selected</span>
                <button className="btn btn-gold" onClick={handleBatchPrint}>
                  <Download size={16} /> Download Selected Invoices (Batch)
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'salary' ? (
        <div className="salary-section">
          <div className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} /> Pengeluaran Biaya Gaji
              </h4>
              <button className="btn btn-primary" style={{ background: '#8b5cf6' }} onClick={() => setSalaryModal(true)}>
                <Plus size={16} /> Tambah Data Gaji
              </button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #8b5cf6' }}>
                  <th style={{ padding: '15px' }}>Nama / Jabatan</th>
                  <th style={{ padding: '15px' }}>Rekening</th>
                  <th style={{ padding: '15px' }}>Periode</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Gaji Pokok</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Potongan Pajak</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Total Bayar</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Bukti</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {salaries.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text)' }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.position} | NIK: {s.nik}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontSize: '0.85rem' }}>{s.bankName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: '600' }}>{s.bankAccount}</div>
                    </td>
                    <td style={{ padding: '15px' }}>{s.period}</td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '600' }}>Rp {parseFloat(s.baseSalary || 0).toLocaleString()}</td>
                    <td style={{ padding: '15px', textAlign: 'right', color: '#ef4444' }}>
                      - Rp {s.taxes.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800', color: '#10b981' }}>
                      Rp {parseFloat(s.totalToPay || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {s.proofPhoto ? (
                        <button onClick={() => setPhotoViewer({ title: `Bukti Gaji - ${s.name}`, photos: [s.proofPhoto] })} style={{ background:'none', border:'none', color:'var(--secondary)', cursor:'pointer' }}><Image size={18}/></button>
                      ) : <span style={{ color:'var(--text-muted)' }}>-</span>}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn btn-gold" style={{ padding: '5px 10px', fontSize: '0.75rem', gap: '5px' }} onClick={() => setSalarySlip(s)}>
                          <Download size={14} /> Slip
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteSalary(s.id)}>
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {salaries.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data gaji tercatat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'other_expenses' ? (
        <div className="other-expenses-section">
          <div className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={20} /> Pengeluaran Biaya Lain-lain
              </h4>
              <button className="btn btn-primary" style={{ background: '#ec4899' }} onClick={() => setOtherExpenseModal(true)}>
                <Plus size={16} /> Tambah Biaya Lain
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ec4899' }}>
                  <th style={{ padding: '15px' }}>Karyawan / Deskripsi</th>
                  <th style={{ padding: '15px' }}>Rekening</th>
                  <th style={{ padding: '15px' }}>Tanggal</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Nominal</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Potongan Pajak</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Total Bayar</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Bukti</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {otherExpenses.filter(e => (e.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text)' }}>{e.employeeName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.description}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontSize: '0.85rem' }}>{e.bankName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: '600' }}>{e.bankAccount}</div>
                    </td>
                    <td style={{ padding: '15px' }}>{new Date(e.expenseDate).toLocaleDateString()}</td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '600' }}>Rp {parseFloat(e.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '15px', textAlign: 'right', color: '#ef4444' }}>
                      - Rp {e.taxes.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800', color: '#10b981' }}>
                      Rp {parseFloat(e.totalAfterTax || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {e.proofPhoto ? (
                        <button onClick={() => setPhotoViewer({ title: `Bukti Biaya - ${e.employeeName}`, photos: [e.proofPhoto] })} style={{ background:'none', border:'none', color:'var(--secondary)', cursor:'pointer' }}><Image size={18}/></button>
                      ) : <span style={{ color:'var(--text-muted)' }}>-</span>}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteOtherExpense(e.id)}>
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {otherExpenses.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data biaya tercatat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'hutang' ? (
        <div className="hutang-section">
          {/* Sub-Navigation */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '10px', width: 'fit-content', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setPayableSubTab('outstanding')}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: payableSubTab === 'outstanding' ? '#f59e0b' : 'transparent',
                  color: payableSubTab === 'outstanding' ? 'black' : 'var(--text-muted)',
                  fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                Hutang Outstanding
              </button>
              <button 
                onClick={() => setPayableSubTab('lunas')}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: payableSubTab === 'lunas' ? '#10b981' : 'transparent',
                  color: payableSubTab === 'lunas' ? 'white' : 'var(--text-muted)',
                  fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                Hutang Lunas
              </button>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 5px' }}></div>
            <button 
              onClick={() => { setPoJoId(''); setPoVendorId(''); setShowPOModal(true); }}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--secondary)', color: 'black',
                fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Plus size={16}/> Tambah Hutang (PO)
            </button>
          </div>

          <div className="glass-card" style={{ padding: '25px' }}>
            <h4 style={{ marginBottom: '20px', color: payableSubTab === 'outstanding' ? '#f59e0b' : '#10b981' }}>
              {payableSubTab === 'outstanding' ? 'Outstanding Vendor Payables' : 'Settled Vendor Payables'}
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>
                  <th style={{ padding: '15px' }}>PO ID / JO</th>
                  <th style={{ padding: '15px' }}>Vendor Name</th>
                  <th style={{ padding: '15px' }}>Date</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Grand Total</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Inv Vendor</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Proof Pay</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredPOs = purchaseOrders
                    .filter(po => po.status === (payableSubTab === 'outstanding' ? 'issued' : 'paid'))
                    .filter(po => filterByDate(po.date))
                    .filter(po => {
                      const id = po.id || '';
                      const name = po.vendorName || '';
                      const term = searchTerm.toLowerCase();
                      return id.toLowerCase().includes(term) || name.toLowerCase().includes(term);
                    });
                  
                  return filteredPOs.map(po => (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover">
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--secondary)' }}>{po.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JO: {po.joId}</div>
                      </td>
                      <td style={{ padding: '15px', fontWeight: '600' }}>{po.vendorName}</td>
                      <td style={{ padding: '15px' }}>{new Date(po.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: '800', color: '#f59e0b' }}>
                        Rp {parseFloat(po.grandTotal || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {po.vendorInvoicePhoto && po.vendorInvoicePhoto.length > 0 ? (
                          <div style={{ display:'flex', gap:'5px', justifyContent:'center' }}>
                            <button onClick={() => setPhotoViewer({ title: `Invoice Vendor - ${po.vendorName}`, photos: po.vendorInvoicePhoto })} style={{ background:'none', border:'none', color:'var(--secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' }}>
                              <Image size={18}/> 
                              <span style={{ fontSize:'0.7rem', fontWeight:'700' }}>({po.vendorInvoicePhoto.length})</span>
                            </button>
                            <button onClick={() => { setModalPhotos(po.vendorInvoicePhoto); setVendorInvoiceModal(po); }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><Edit3 size={14}/></button>
                            <button onClick={() => { if(window.confirm('Hapus semua lampiran invoice vendor?')) handleUploadVendorInvoice(po.id, []); }} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}><Trash2 size={14}/></button>
                          </div>
                        ) : (
                          <button onClick={() => { setModalPhotos([]); setVendorInvoiceModal(po); }} style={{ background:'rgba(59,130,246,0.1)', color:'#3b82f6', border:'1px dashed #3b82f6', padding:'4px 8px', borderRadius:'6px', fontSize:'0.7rem', cursor:'pointer' }}>+ Upload</button>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {po.paymentProofPhoto && po.paymentProofPhoto.length > 0 ? (
                          <div style={{ display:'flex', gap:'5px', justifyContent:'center' }}>
                            <button onClick={() => setPhotoViewer({ title: `Bukti Bayar - ${po.vendorName}`, photos: po.paymentProofPhoto })} style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' }}>
                              <Image size={18}/>
                              <span style={{ fontSize:'0.7rem', fontWeight:'700' }}>({po.paymentProofPhoto.length})</span>
                            </button>
                            <button onClick={() => { setModalPhotos(po.paymentProofPhoto); setPaymentProofModal(po); }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><Edit3 size={14}/></button>
                            <button onClick={() => { if(window.confirm('Hapus semua bukti bayar?')) handleSettlePayable(po.id, []); }} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}><Trash2 size={14}/></button>
                          </div>
                        ) : payableSubTab === 'outstanding' ? (
                          <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Pending</span>
                        ) : (
                           <button onClick={() => { setModalPhotos([]); setPaymentProofModal(po); }} style={{ background:'rgba(16,185,129,0.1)', color:'#10b981', border:'1px dashed #10b981', padding:'4px 8px', borderRadius:'6px', fontSize:'0.7rem', cursor:'pointer' }}>+ Proof</button>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {payableSubTab === 'outstanding' ? (
                          <button 
                            className="btn btn-gold" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setPaymentProofModal(po)}
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <div style={{ color:'#10b981', fontWeight:'700', fontSize:'0.8rem' }}>Settled on {po.paidDate}</div>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
                {purchaseOrders.filter(po => po.status === (payableSubTab === 'outstanding' ? 'issued' : 'paid')).length === 0 && (
                   <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'detail_report' ? (
        <div className="report-section">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px' }}>
             <h3 style={{ margin:0, color:'var(--secondary)', display:'flex', alignItems:'center', gap:'10px' }}><FileSpreadsheet size={24}/> Financial Report Analysis</h3>
             <button 
                className="btn btn-gold" 
                style={{ padding:'10px 20px', display:'flex', alignItems:'center', gap:'8px', borderRadius:'12px', fontWeight:'700' }}
                onClick={() => {
                  const reportData = {
                    revenue: invoices.filter(inv => filterByDate(inv.date)).reduce((s, i) => s + parseFloat(i.amount || 0), 0),
                    opCosts: purchaseOrders.filter(po => filterByDate(po.date)).reduce((s, p) => s + parseFloat(p.grandTotal || 0), 0),
                    payroll: salaries.filter(s => filterByDate(s.expenseDate || s.date)).reduce((s, sa) => s + parseFloat(sa.totalToPay || 0), 0),
                    misc: otherExpenses.filter(e => filterByDate(e.expenseDate || e.date)).reduce((s, ex) => s + parseFloat(ex.totalAfterTax || 0), 0),
                    dateRange: startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'All Time'
                  };
                  setFinancialReport(reportData);
                }}
             >
                <Download size={18}/> Export Professional PDF
             </button>
          </div>

          {/* Summary Dashboard */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'20px', marginBottom:'30px' }}>
            {(() => {
              const reportData = {
                revenue: invoices.filter(inv => filterByDate(inv.date)).reduce((s, i) => s + parseFloat(i.amount || 0), 0),
                opCosts: purchaseOrders.filter(po => filterByDate(po.date)).reduce((s, p) => s + parseFloat(p.grandTotal || 0), 0),
                payroll: salaries.filter(s => filterByDate(s.expenseDate || s.date)).reduce((s, sa) => s + parseFloat(sa.totalToPay || 0), 0),
                misc: otherExpenses.filter(e => filterByDate(e.expenseDate || e.date)).reduce((s, ex) => s + parseFloat(ex.totalAfterTax || 0), 0)
              };
              const totalExpenses = reportData.opCosts + reportData.payroll + reportData.misc;
              const netProfit = reportData.revenue - totalExpenses;

              return [
                { label: 'Total Revenue', val: reportData.revenue, color: '#10b981', icon: <Receipt size={24}/> },
                { label: 'Total Expenses', val: totalExpenses, color: '#ef4444', icon: <Wallet size={24}/> },
                { label: 'Net Profit', val: netProfit, color: netProfit >= 0 ? '#10b981' : '#ef4444', icon: <DollarSign size={24}/>, highlight: true },
                { label: 'Operational (PO)', val: reportData.opCosts, color: '#f59e0b', icon: <Briefcase size={20}/>, small: true },
                { label: 'Payroll', val: reportData.payroll, color: '#8b5cf6', icon: <User size={20}/>, small: true },
                { label: 'Misc Expenses', val: reportData.misc, color: '#ec4899', icon: <CreditCard size={20}/>, small: true }
              ].map(stat => (
                <div key={stat.label} className="glass-card" style={{ padding:'25px', display:'flex', alignItems:'center', gap:'20px', border: stat.highlight ? `2px solid ${stat.color}` : '1px solid var(--glass-border)', background: stat.highlight ? `rgba(${stat.color === '#10b981' ? '16,185,129' : '239,68,68'}, 0.05)` : 'rgba(255,255,255,0.03)' }}>
                  <div style={{ padding:'12px', borderRadius:'12px', background: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
                  <div>
                    <div style={{ fontSize: stat.small ? '1.1rem' : '1.5rem', fontWeight:'800', color: stat.color }}>Rp {stat.val.toLocaleString()}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:'700', letterSpacing:'0.5px', marginTop:'2px' }}>{stat.label}</div>
                  </div>
                </div>
              ));
            })()}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'30px' }}>
            {/* Detailed Transaction Log */}
            <div className="glass-card" style={{ padding:'30px' }}>
              <h4 style={{ marginBottom:'25px', display:'flex', alignItems:'center', gap:'10px' }}><Calendar size={20} style={{color:'var(--secondary)'}}/> Transaction Detail Log</h4>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ textAlign:'left', borderBottom:'2px solid var(--glass-border)' }}>
                      <th style={{ padding:'12px', fontSize:'0.8rem', color:'var(--text-muted)' }}>Date</th>
                      <th style={{ padding:'12px', fontSize:'0.8rem', color:'var(--text-muted)' }}>Description</th>
                      <th style={{ padding:'12px', fontSize:'0.8rem', color:'var(--text-muted)' }}>Category</th>
                      <th style={{ padding:'12px', fontSize:'0.8rem', color:'var(--text-muted)', textAlign:'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const logs = [
                        ...invoices.filter(i => filterByDate(i.date)).map(i => ({ date: i.date, desc: `Invoice: ${i.id} (${i.customerName})`, cat: 'REVENUE', amt: i.amount, color: '#10b981' })),
                        ...purchaseOrders.filter(p => filterByDate(p.date)).map(p => ({ date: p.date, desc: `PO: ${p.id} (${p.vendorName})`, cat: 'OP COST', amt: -p.grandTotal, color: '#f59e0b' })),
                        ...salaries.filter(s => filterByDate(s.expenseDate || s.date)).map(s => ({ date: s.expenseDate || s.date, desc: `Payroll: ${s.name} (${s.period})`, cat: 'PAYROLL', amt: -s.totalToPay, color: '#8b5cf6' })),
                        ...otherExpenses.filter(e => filterByDate(e.expenseDate || e.date)).map(e => ({ date: e.expenseDate || e.date, desc: `Misc: ${e.description}`, cat: 'EXPENSE', amt: -e.totalAfterTax, color: '#ec4899' }))
                      ].sort((a, b) => new Date(b.date) - new Date(a.date));

                      return logs.length > 0 ? logs.map((log, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid var(--glass-border)' }}>
                          <td style={{ padding:'12px', fontSize:'0.85rem' }}>{new Date(log.date).toLocaleDateString()}</td>
                          <td style={{ padding:'12px', fontSize:'0.85rem', fontWeight:'600' }}>{log.desc}</td>
                          <td style={{ padding:'12px' }}>
                            <span style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:'10px', background: `${log.color}20`, color: log.color, fontWeight:'700' }}>{log.cat}</span>
                          </td>
                          <td style={{ padding:'12px', textAlign:'right', fontWeight:'700', color: log.amt >= 0 ? '#10b981' : '#ef4444' }}>
                            {log.amt >= 0 ? '+' : '-'} Rp {Math.abs(log.amt).toLocaleString()}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>No data in selected date range.</td></tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Distribution */}
            <div className="glass-card" style={{ padding:'30px' }}>
              <h4 style={{ marginBottom:'25px' }}>Expense Distribution</h4>
              {(() => {
                const op = purchaseOrders.filter(po => filterByDate(po.date)).reduce((s, p) => s + parseFloat(p.grandTotal || 0), 0);
                const pr = salaries.filter(s => filterByDate(s.expenseDate || s.date)).reduce((s, sa) => s + parseFloat(sa.totalToPay || 0), 0);
                const ms = otherExpenses.filter(e => filterByDate(e.expenseDate || e.date)).reduce((s, ex) => s + parseFloat(ex.totalAfterTax || 0), 0);
                const total = op + pr + ms || 1;

                return (
                  <div style={{ display:'grid', gap:'20px' }}>
                    {[
                      { label: 'Operational', val: op, color: '#f59e0b' },
                      { label: 'Payroll', val: pr, color: '#8b5cf6' },
                      { label: 'Misc', val: ms, color: '#ec4899' }
                    ].map(cat => (
                      <div key={cat.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.85rem' }}>
                          <span style={{ color:'var(--text-muted)', fontWeight:'600' }}>{cat.label}</span>
                          <span style={{ fontWeight:'700' }}>{((cat.val / total) * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ height:'8px', background:'rgba(255,255,255,0.05)', borderRadius:'4px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width: `${(cat.val / total) * 100}%`, background: cat.color }}></div>
                        </div>
                        <div style={{ fontSize:'0.75rem', marginTop:'5px', color:'var(--text-muted)' }}>Rp {cat.val.toLocaleString()}</div>
                      </div>
                    ))}
                    
                    <div style={{ marginTop:'20px', padding:'20px', background:'rgba(255,255,255,0.02)', borderRadius:'15px', border:'1px solid var(--glass-border)' }}>
                       <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'5px' }}>Efficiency Ratio</div>
                       <div style={{ fontSize:'1.2rem', fontWeight:'800', color: (op + pr + ms) < invoices.reduce((s,i)=>s+parseFloat(i.amount||0),0) ? '#10b981' : '#ef4444' }}>
                         {((op + pr + ms) / (invoices.reduce((s,i)=>s+parseFloat(i.amount||0),0) || 1) * 100).toFixed(1)}%
                       </div>
                       <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Cost as % of Revenue</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'500px', padding:'30px', position:'relative' }}>
            <button onClick={() => setEditingInvoice(null)} style={{ position:'absolute', top:'15px', right:'15px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'var(--secondary)', marginBottom:'5px' }}>Edit Invoice Details</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'25px' }}>Revision for <strong style={{color:'var(--text)'}}>{editingInvoice.id}</strong></p>
            
            <div style={{ display:'grid', gap:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Base Amount (Revenue)</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:'var(--secondary)', fontWeight:'700' }}>Rp</span>
                  <input 
                    type="number" 
                    value={editingInvoice.subtotal || editingInvoice.amount} 
                    onChange={e => setEditingInvoice({...editingInvoice, subtotal: e.target.value})}
                    style={{ width:'100%', padding:'12px 15px 12px 45px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'10px', color:'var(--text)', fontSize:'1.1rem', fontWeight:'700' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <label style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:'700' }}>Biaya Tambahan (Extra Charges)</label>
                  <button 
                    onClick={() => setEditingInvoice({...editingInvoice, extra_charges: [...(editingInvoice.extra_charges || []), { description: '', amount: 0 }]})}
                    style={{ background:'rgba(212,175,55,0.1)', color:'var(--secondary)', border:'1px solid var(--secondary)', borderRadius:'6px', padding:'4px 10px', fontSize:'0.7rem', cursor:'pointer' }}
                  >
                    + Tambah Biaya
                  </button>
                </div>
                
                <div style={{ display:'grid', gap:'10px', maxHeight:'200px', overflowY:'auto', paddingRight:'5px' }}>
                  {(editingInvoice.extra_charges || []).map((charge, idx) => (
                    <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 120px 32px', gap:'8px', alignItems:'center' }}>
                      <input 
                        type="text" 
                        placeholder="Deskripsi Biaya" 
                        value={charge.description} 
                        onChange={e => {
                          const n = [...editingInvoice.extra_charges];
                          n[idx].description = e.target.value;
                          setEditingInvoice({...editingInvoice, extra_charges: n});
                        }}
                        style={{ padding:'8px 12px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', fontSize:'0.85rem' }}
                      />
                      <input 
                        type="number" 
                        placeholder="Rp" 
                        value={charge.amount} 
                        onChange={e => {
                          const n = [...editingInvoice.extra_charges];
                          n[idx].amount = e.target.value;
                          setEditingInvoice({...editingInvoice, extra_charges: n});
                        }}
                        style={{ padding:'8px 12px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', fontSize:'0.85rem', fontWeight:'600' }}
                      />
                      <button 
                        onClick={() => {
                          const n = (editingInvoice.extra_charges || []).filter((_, i) => i !== idx);
                          setEditingInvoice({...editingInvoice, extra_charges: n});
                        }}
                        style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'none', borderRadius:'6px', height:'32px', cursor:'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(editingInvoice.extra_charges || []).length === 0 && (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem', padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px' }}>Tidak ada biaya tambahan</p>
                  )}
                </div>
              </div>

              <div style={{ marginTop:'10px', padding:'15px', background:'rgba(212,175,55,0.05)', borderRadius:'10px', border:'1px solid rgba(212,175,55,0.1)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'0.85rem' }}>
                  <span style={{ color:'var(--text-muted)' }}>Base Amount</span>
                  <span>Rp {parseFloat(editingInvoice.subtotal || editingInvoice.amount || 0).toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'0.85rem' }}>
                  <span style={{ color:'var(--text-muted)' }}>Extra Total</span>
                  <span>Rp {(editingInvoice.extra_charges || []).reduce((s, c) => s + parseFloat(c.amount || 0), 0).toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'700', color:'var(--secondary)', fontSize:'1.1rem', marginTop:'10px', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'10px' }}>
                  <span>Total Billing</span>
                  <span>Rp {(parseFloat(editingInvoice.subtotal || editingInvoice.amount || 0) + (editingInvoice.extra_charges || []).reduce((s, c) => s + parseFloat(c.amount || 0), 0)).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display:'flex', gap:'12px', marginTop:'10px' }}>
                <button onClick={() => setEditingInvoice(null)} className="btn" style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', color:'var(--text)' }}>Cancel</button>
                <ButtonWithLoading onClick={handleSaveInvoiceEdit} className="btn btn-gold" style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <Save size={18} /> Update Invoice
                </ButtonWithLoading>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {photoViewer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:20000, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px' }}>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--glass-border)', borderRadius:'15px', width:'100%', maxWidth:'1000px', maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative' }}>
            <button onClick={() => setPhotoViewer(null)} style={{ position:'absolute', top:'-40px', right:'0', background:'none', border:'none', color:'white', cursor:'pointer' }}><X size={30}/></button>
            <div style={{ padding:'20px', borderBottom:'1px solid var(--glass-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, color:'var(--secondary)' }}>{photoViewer.title || `Documentation Photos for ${photoViewer.joId || ''}`}</h3>
              <p style={{ margin:0, color:'var(--text-muted)', fontSize:'0.85rem' }}>{photoViewer.photos.length} Total Images</p>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px' }}>
              {photoViewer.photos.map((p, idx) => (
                <div key={idx} style={{ position:'relative', borderRadius:'10px', overflow:'hidden', border:'1px solid var(--glass-border)', background:'#000' }}>
                  <img src={p} alt={`JO Photo ${idx}`} style={{ width:'100%', height:'180px', objectFit:'cover' }} />
                  <a 
                    href={p} 
                    download={`Photo_${idx+1}.jpg`}
                    style={{ position:'absolute', bottom:'10px', right:'10px', background:'var(--secondary)', color:'white', width:'30px', height:'30px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.5)' }}
                    title="Download Photo"
                  >
                    <Download size={14} />
                  </a>
                </div>
              ))}
            </div>
            <div style={{ padding:'15px', borderTop:'1px solid var(--glass-border)', textAlign:'right' }}>
              <button onClick={() => setPhotoViewer(null)} className="btn btn-gold" style={{ padding:'10px 25px' }}>Done</button>
            </div>
          </div>
        </div>
      )}
      {/* Salary Modal */}
      {salaryModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'700px', padding:'35px', maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
            <button onClick={() => setSalaryModal(false)} style={{ position:'absolute', top:'15px', right:'15px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'#8b5cf6', marginBottom:'25px', display:'flex', alignItems:'center', gap:'10px' }}><User size={24}/> Tambah Data Gaji Karyawan</h3>
            
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Pilih Karyawan</label>
                <select 
                  value={salaryForm.employeeId || ''} 
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    if (emp) {
                      setSalaryForm({
                        ...salaryForm,
                        employeeId: emp.id,
                        name: emp.name,
                        position: emp.position,
                        bankAccount: emp.bankAccount || '',
                        bankName: emp.bankName || '',
                        nik: emp.nik || '',
                        npwp: emp.npwp || ''
                      });
                    }
                  }} 
                  style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }}
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Jabatan</label>
                <input type="text" readOnly value={salaryForm.position} style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Nomor Rekening</label>
                <input type="text" value={salaryForm.bankAccount} onChange={e => setSalaryForm({...salaryForm, bankAccount: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Nama Bank</label>
                <input type="text" value={salaryForm.bankName} onChange={e => setSalaryForm({...salaryForm, bankName: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Nominal Gaji Pokok</label>
                <input type="number" value={salaryForm.baseSalary} onChange={e => setSalaryForm({...salaryForm, baseSalary: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', fontWeight:'700' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Periode Bulan</label>
                <input type="text" placeholder="e.g. April 2024" value={salaryForm.period} onChange={e => setSalaryForm({...salaryForm, period: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>NIK</label>
                <input type="text" value={salaryForm.nik} onChange={e => setSalaryForm({...salaryForm, nik: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>NPWP</label>
                <input type="text" value={salaryForm.npwp} onChange={e => setSalaryForm({...salaryForm, npwp: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
            </div>

            <div style={{ marginBottom:'25px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <label style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:'700' }}>Potongan Pajak / Lainnya</label>
                <button onClick={() => setSalaryForm({...salaryForm, taxes: [...salaryForm.taxes, { name: '', amount: 0 }]})} style={{ background:'rgba(139,92,246,0.1)', color:'#8b5cf6', border:'1px solid #8b5cf6', borderRadius:'6px', padding:'4px 10px', fontSize:'0.7rem', cursor:'pointer' }}>+ Tambah Potongan</button>
              </div>
              {salaryForm.taxes.map((tax, idx) => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 120px 32px', gap:'10px', marginBottom:'8px' }}>
                  <input type="text" placeholder="Deskripsi (e.g. PPh21)" value={tax.name} onChange={e => { const n=[...salaryForm.taxes]; n[idx].name=e.target.value; setSalaryForm({...salaryForm, taxes:n}); }} style={{ padding:'8px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text)', fontSize:'0.85rem' }} />
                  <input type="number" placeholder="Amount" value={tax.amount} onChange={e => { const n=[...salaryForm.taxes]; n[idx].amount=e.target.value; setSalaryForm({...salaryForm, taxes:n}); }} style={{ padding:'8px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text)', fontSize:'0.85rem' }} />
                  <button onClick={() => setSalaryForm({...salaryForm, taxes: salaryForm.taxes.filter((_,i)=>i!==idx)})} style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'none', borderRadius:'6px', cursor:'pointer' }}><X size={14}/></button>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'30px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Bukti Transfer (Upload)</label>
                <input type="file" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSalaryForm({...salaryForm, proofPhoto: reader.result});
                    reader.readAsDataURL(file);
                  }
                }} style={{ width:'100%', fontSize:'0.8rem', color:'var(--text-muted)' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Tanggal Pembayaran</label>
                <input type="date" value={salaryForm.expenseDate} onChange={e => setSalaryForm({...salaryForm, expenseDate: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
            </div>

            <div style={{ background:'rgba(16,185,129,0.05)', padding:'20px', borderRadius:'15px', border:'1px solid #10b981', marginBottom:'30px', textAlign:'right' }}>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'5px' }}>Total Gaji yang Dibayarkan (Setelah Potongan)</div>
              <div style={{ fontSize:'1.8rem', fontWeight:'900', color:'#10b981' }}>
                Rp {(parseFloat(salaryForm.baseSalary || 0) - salaryForm.taxes.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0)).toLocaleString()}
              </div>
            </div>

            <ButtonWithLoading className="btn btn-primary" style={{ width:'100%', padding:'15px', background:'#8b5cf6' }} onClick={async () => {
               const totalTaxes = salaryForm.taxes.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
               const totalToPay = parseFloat(salaryForm.baseSalary || 0) - totalTaxes;
               await addSalary({ ...salaryForm, totalToPay });
               setSalaryModal(false);
               setSalaryForm({ name: '', position: '', bankAccount: '', bankName: '', baseSalary: '', period: '', nik: '', npwp: '', taxes: [], proofPhoto: '', expenseDate: '' });
            }}>
              🚀 Simpan & Terbitkan Gaji
            </ButtonWithLoading>
          </div>
        </div>
      )}

      {/* Other Expense Modal */}
      {otherExpenseModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'700px', padding:'35px', maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
            <button onClick={() => setOtherExpenseModal(false)} style={{ position:'absolute', top:'15px', right:'15px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'#ec4899', marginBottom:'25px', display:'flex', alignItems:'center', gap:'10px' }}><Briefcase size={24}/> Tambah Data Biaya Lain-lain</h3>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Pilih Karyawan</label>
                <select 
                  value={otherExpenseForm.employeeId || ''} 
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    if (emp) {
                      setOtherExpenseForm({
                        ...otherExpenseForm,
                        employeeId: emp.id,
                        employeeName: emp.name,
                        position: emp.position,
                        bankAccount: emp.bankAccount || '',
                        bankName: emp.bankName || ''
                      });
                    }
                  }} 
                  style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }}
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Jabatan</label>
                <input type="text" readOnly value={otherExpenseForm.position} style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Nomor Rekening</label>
                <input type="text" value={otherExpenseForm.bankAccount} onChange={e => setOtherExpenseForm({...otherExpenseForm, bankAccount: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Nama Bank</label>
                <input type="text" value={otherExpenseForm.bankName} onChange={e => setOtherExpenseForm({...otherExpenseForm, bankName: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
            </div>

            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Deskripsi Biaya</label>
              <textarea value={otherExpenseForm.description} onChange={e => setOtherExpenseForm({...otherExpenseForm, description: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', minHeight:'80px' }} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Nominal Biaya</label>
                <input type="number" value={otherExpenseForm.amount} onChange={e => setOtherExpenseForm({...otherExpenseForm, amount: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', fontWeight:'700' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Tanggal Pengeluaran</label>
                <input type="date" value={otherExpenseForm.expenseDate} onChange={e => setOtherExpenseForm({...otherExpenseForm, expenseDate: e.target.value})} style={{ width:'100%', padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
            </div>

            <div style={{ marginBottom:'25px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <label style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:'700' }}>Potongan Pajak / Lainnya</label>
                <button onClick={() => setOtherExpenseForm({...otherExpenseForm, taxes: [...otherExpenseForm.taxes, { name: '', amount: 0 }]})} style={{ background:'rgba(236,72,153,0.1)', color:'#ec4899', border:'1px solid #ec4899', borderRadius:'6px', padding:'4px 10px', fontSize:'0.7rem', cursor:'pointer' }}>+ Tambah Potongan</button>
              </div>
              {otherExpenseForm.taxes.map((tax, idx) => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 120px 32px', gap:'10px', marginBottom:'8px' }}>
                  <input type="text" placeholder="Deskripsi (e.g. Pajak Fasilitas)" value={tax.name} onChange={e => { const n=[...otherExpenseForm.taxes]; n[idx].name=e.target.value; setOtherExpenseForm({...otherExpenseForm, taxes:n}); }} style={{ padding:'8px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text)', fontSize:'0.85rem' }} />
                  <input type="number" placeholder="Amount" value={tax.amount} onChange={e => { const n=[...otherExpenseForm.taxes]; n[idx].amount=e.target.value; setOtherExpenseForm({...otherExpenseForm, taxes:n}); }} style={{ padding:'8px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text)', fontSize:'0.85rem' }} />
                  <button onClick={() => setOtherExpenseForm({...otherExpenseForm, taxes: otherExpenseForm.taxes.filter((_,i)=>i!==idx)})} style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'none', borderRadius:'6px', cursor:'pointer' }}><X size={14}/></button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom:'30px' }}>
              <label style={{ display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'8px', textTransform:'uppercase', fontWeight:'700' }}>Bukti Transfer / Nota (Upload)</label>
              <input type="file" onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setOtherExpenseForm({...otherExpenseForm, proofPhoto: reader.result});
                  reader.readAsDataURL(file);
                }
              }} style={{ width:'100%', fontSize:'0.8rem', color:'var(--text-muted)' }} />
            </div>

            <div style={{ background:'rgba(16,185,129,0.05)', padding:'20px', borderRadius:'15px', border:'1px solid #10b981', marginBottom:'30px', textAlign:'right' }}>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'5px' }}>Total Biaya yang Dikeluarkan (Setelah Pajak)</div>
              <div style={{ fontSize:'1.8rem', fontWeight:'900', color:'#10b981' }}>
                Rp {(parseFloat(otherExpenseForm.amount || 0) - otherExpenseForm.taxes.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0)).toLocaleString()}
              </div>
            </div>

            <ButtonWithLoading className="btn btn-primary" style={{ width:'100%', padding:'15px', background:'#ec4899' }} onClick={async () => {
               const totalTaxes = otherExpenseForm.taxes.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
               const totalAfterTax = parseFloat(otherExpenseForm.amount || 0) - totalTaxes;
               await addOtherExpense({ ...otherExpenseForm, totalAfterTax });
               setOtherExpenseModal(false);
               setOtherExpenseForm({ employeeName: '', position: '', bankAccount: '', bankName: '', amount: '', description: '', taxes: [], proofPhoto: '', expenseDate: '' });
            }}>
              💾 Simpan Biaya Lain-lain
            </ButtonWithLoading>
          </div>
        </div>
      )}


      {/* Salary Slip Print View */}
      {salarySlip && (
        <div style={{ position:'fixed', inset:0, background:'white', zIndex:30000, color:'black', padding:'40px', overflowY:'auto' }}>
          <div className="no-print" style={{ display:'flex', justifyContent:'space-between', marginBottom:'30px', background:'#f8fafc', padding:'15px', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
             <div style={{ display:'flex', alignItems:'center', gap:'10px', color:'#64748b' }}>
               <FileText size={20}/>
               <span style={{ fontWeight:'600' }}>Preview Slip Gaji: {salarySlip.name} - {salarySlip.period}</span>
             </div>
             <div style={{ display:'flex', gap:'10px' }}>
               <button className="btn" style={{ background:'white', border:'1px solid #cbd5e1', color:'#334155' }} onClick={() => setSalarySlip(null)}>Close Preview</button>
               <button className="btn btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
             </div>
          </div>

          <div style={{ maxWidth:'800px', margin:'0 auto', border:'2px solid #333', padding:'40px', background:'white' }}>
            <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'4px solid #333', paddingBottom:'20px', marginBottom:'30px' }}>
              <div>
                <h1 style={{ margin:0, fontSize:'1.8rem', letterSpacing:'1px' }}>SLIP GAJI KARYAWAN</h1>
                <div style={{ color:'#666', marginTop:'5px' }}>Nomor Ref: {salarySlip.id}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:'900', fontSize:'1.2rem' }}>ALP LOGISTICS PRAKARSA</div>
                <div style={{ fontSize:'0.85rem', color:'#444' }}>Logistics & Transportation Excellence</div>
                <div style={{ marginTop:'10px', fontWeight:'700' }}>Periode: {salarySlip.period}</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px', marginBottom:'40px', background:'#f9f9f9', padding:'20px', border:'1px solid #eee' }}>
               <div>
                 <div style={{ fontSize:'0.75rem', color:'#888', textTransform:'uppercase', marginBottom:'5px' }}>Informasi Karyawan:</div>
                 <div style={{ fontWeight:'800', fontSize:'1.2rem' }}>{salarySlip.name}</div>
                 <div style={{ fontSize:'1rem', color:'#333' }}>{salarySlip.position}</div>
                 <div style={{ marginTop:'10px', fontSize:'0.85rem' }}>NIK: {salarySlip.nik || '-'}</div>
                 <div style={{ fontSize:'0.85rem' }}>NPWP: {salarySlip.npwp || '-'}</div>
               </div>
               <div style={{ textAlign:'right' }}>
                 <div style={{ fontSize:'0.75rem', color:'#888', textTransform:'uppercase', marginBottom:'5px' }}>Informasi Pembayaran:</div>
                 <div style={{ fontWeight:'700' }}>{salarySlip.bankName}</div>
                 <div style={{ fontSize:'1.1rem', letterSpacing:'1px' }}>{salarySlip.bankAccount}</div>
                 <div style={{ marginTop:'10px', fontSize:'0.85rem' }}>Tanggal Bayar: {new Date(salarySlip.expenseDate).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</div>
               </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px' }}>
               {/* Earnings */}
               <div>
                 <h4 style={{ borderBottom:'2px solid #333', paddingBottom:'8px', marginBottom:'15px' }}>PENGHASILAN</h4>
                 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                   <span>Gaji Pokok</span>
                   <span style={{ fontWeight:'600' }}>Rp {parseFloat(salarySlip.baseSalary).toLocaleString()}</span>
                 </div>
                 <div style={{ borderTop:'1px solid #eee', paddingTop:'10px', marginTop:'20px', display:'flex', justifyContent:'space-between', fontWeight:'800' }}>
                   <span>Total Penghasilan</span>
                   <span>Rp {parseFloat(salarySlip.baseSalary).toLocaleString()}</span>
                 </div>
               </div>

               {/* Deductions */}
               <div>
                 <h4 style={{ borderBottom:'2px solid #ef4444', paddingBottom:'8px', marginBottom:'15px' }}>POTONGAN</h4>
                 {salarySlip.taxes.map((t, idx) => (
                   <div key={idx} style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                     <span>{t.name}</span>
                     <span style={{ color:'#ef4444' }}>- Rp {parseFloat(t.amount).toLocaleString()}</span>
                   </div>
                 ))}
                 {salarySlip.taxes.length === 0 && <div style={{ color:'#888', fontStyle:'italic', fontSize:'0.85rem' }}>Tidak ada potongan.</div>}
                 
                 <div style={{ borderTop:'1px solid #eee', paddingTop:'10px', marginTop:'20px', display:'flex', justifyContent:'space-between', fontWeight:'800' }}>
                   <span>Total Potongan</span>
                   <span style={{ color:'#ef4444' }}>Rp {salarySlip.taxes.reduce((acc, t) => acc + parseFloat(t.amount), 0).toLocaleString()}</span>
                 </div>
               </div>
            </div>

            <div style={{ marginTop:'50px', background:'#333', color:'white', padding:'25px', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'4px' }}>
               <div style={{ fontSize:'0.9rem', fontWeight:'600', textTransform:'uppercase' }}>Take Home Pay (Total Diterima)</div>
               <div style={{ fontSize:'2rem', fontWeight:'900', letterSpacing:'1px' }}>Rp {parseFloat(salarySlip.totalToPay).toLocaleString()}</div>
            </div>

            <div style={{ marginTop:'60px', display:'flex', justifyContent:'space-between' }}>
               <div style={{ textAlign:'center', width:'200px' }}>
                 <div style={{ fontSize:'0.85rem', marginBottom:'80px' }}>Dibuat Oleh,</div>
                 <div style={{ borderBottom:'1px solid #333', fontWeight:'700' }}>Bagian Keuangan</div>
                 <div style={{ fontSize:'0.75rem', color:'#666' }}>ALP Logistics System</div>
               </div>
               <div style={{ textAlign:'center', width:'200px' }}>
                 <div style={{ fontSize:'0.85rem', marginBottom:'80px' }}>Diterima Oleh,</div>
                 <div style={{ borderBottom:'1px solid #333', fontWeight:'700' }}>{salarySlip.name}</div>
                 <div style={{ fontSize:'0.75rem', color:'#666' }}>Karyawan</div>
               </div>
            </div>

            <div style={{ marginTop:'40px', fontSize:'0.7rem', color:'#999', textAlign:'center', borderTop:'1px dashed #ccc', paddingTop:'15px' }}>
              Dokumen ini diterbitkan secara elektronik melalui ALP System dan sah tanpa tanda tangan basah.
            </div>
          </div>
        </div>
      )}

      {/* Vendor Invoice Modal */}
      {vendorInvoiceModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'600px', padding:'35px', textAlign:'center', maxHeight:'90vh', overflowY:'auto' }}>
            <button onClick={() => { setVendorInvoiceModal(null); setModalPhotos([]); }} style={{ position:'absolute', top:'15px', right:'15px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'var(--secondary)', marginBottom:'20px' }}>Upload Invoice Vendor</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'25px' }}>PO: <strong>{vendorInvoiceModal.id}</strong> - {vendorInvoiceModal.vendorName}</p>
            
            {/* Preview Section */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:'10px', marginBottom:'25px' }}>
              {modalPhotos.map((p, i) => (
                <div key={i} style={{ position:'relative', height:'100px', borderRadius:'8px', overflow:'hidden', border:'1px solid var(--glass-border)' }}>
                  <img src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <button onClick={() => setModalPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position:'absolute', top:'5px', right:'5px', background:'rgba(239,68,68,0.8)', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={12}/></button>
                </div>
              ))}
              <label htmlFor="vendor-inv-upload" style={{ height:'100px', borderRadius:'8px', border:'2px dashed var(--glass-border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.borderColor='var(--secondary)'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--glass-border)'}>
                <Plus size={24}/>
                <span style={{ fontSize:'0.7rem', marginTop:'5px' }}>Add Photo</span>
              </label>
            </div>

            <input type="file" multiple onChange={e => {
              const files = Array.from(e.target.files);
              files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setModalPhotos(prev => [...prev, reader.result]);
                reader.readAsDataURL(file);
              });
            }} style={{ display:'none' }} id="vendor-inv-upload" />
            
            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
              <button onClick={() => { setVendorInvoiceModal(null); setModalPhotos([]); }} className="btn" style={{ background:'rgba(255,255,255,0.05)', color:'var(--text)' }}>Cancel</button>
              <ButtonWithLoading onClick={() => handleUploadVendorInvoice(vendorInvoiceModal.id, modalPhotos)} className="btn btn-gold" disabled={modalPhotos.length === 0}>Save {modalPhotos.length > 0 && `(${modalPhotos.length})`} Photos</ButtonWithLoading>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Modal */}
      {paymentProofModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'600px', padding:'35px', textAlign:'center', maxHeight:'90vh', overflowY:'auto' }}>
            <button onClick={() => { setPaymentProofModal(null); setModalPhotos([]); }} style={{ position:'absolute', top:'15px', right:'15px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'#10b981', marginBottom:'20px' }}>Settle Payment</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'25px' }}>Konfirmasi pembayaran untuk <strong>{paymentProofModal.vendorName}</strong> sejumlah <strong>Rp {paymentProofModal.grandTotal.toLocaleString()}</strong></p>
            
            {/* Preview Section */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:'10px', marginBottom:'25px' }}>
              {modalPhotos.map((p, i) => (
                <div key={i} style={{ position:'relative', height:'100px', borderRadius:'8px', overflow:'hidden', border:'1px solid var(--glass-border)' }}>
                  <img src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <button onClick={() => setModalPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position:'absolute', top:'5px', right:'5px', background:'rgba(239,68,68,0.8)', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={12}/></button>
                </div>
              ))}
              <label htmlFor="pay-proof-upload" style={{ height:'100px', borderRadius:'8px', border:'2px dashed var(--glass-border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.borderColor='#10b981'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--glass-border)'}>
                <Plus size={24}/>
                <span style={{ fontSize:'0.7rem', marginTop:'5px' }}>Add Photo</span>
              </label>
            </div>

            <input type="file" multiple onChange={e => {
              const files = Array.from(e.target.files);
              files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setModalPhotos(prev => [...prev, reader.result]);
                reader.readAsDataURL(file);
              });
            }} style={{ display:'none' }} id="pay-proof-upload" />

            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
              <button onClick={() => { setPaymentProofModal(null); setModalPhotos([]); }} className="btn" style={{ background:'rgba(255,255,255,0.05)', color:'var(--text)' }}>Cancel</button>
              <ButtonWithLoading onClick={() => handleSettlePayable(paymentProofModal.id, modalPhotos)} className="btn" style={{ background:'#10b981', color:'white' }} disabled={modalPhotos.length === 0}>Save &amp; Settle {modalPhotos.length > 0 && `(${modalPhotos.length})`} Photos</ButtonWithLoading>
            </div>
          </div>
        </div>
      )}
      {/* Financial Report PDF Preview */}
      {financialReport && (
        <div style={{ position:'fixed', inset:0, background:'white', zIndex:30000, color:'black', padding:'40px', overflowY:'auto' }}>
          <div className="no-print" style={{ display:'flex', justifyContent:'space-between', marginBottom:'30px', background:'#f8fafc', padding:'15px', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
             <div style={{ display:'flex', alignItems:'center', gap:'10px', color:'#64748b' }}>
               <FileText size={20}/>
               <span style={{ fontWeight:'600' }}>Professional Financial Report Preview</span>
             </div>
             <div style={{ display:'flex', gap:'10px' }}>
               <button className="btn" style={{ background:'white', border:'1px solid #cbd5e1', color:'#334155' }} onClick={() => setFinancialReport(null)}>Close</button>
               <button className="btn btn-primary" onClick={() => window.print()}>Download / Save PDF</button>
             </div>
          </div>

          <div style={{ maxWidth:'1000px', margin:'0 auto', border:'1px solid #333', padding:'50px', background:'white' }}>
            <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'4px solid #333', paddingBottom:'25px', marginBottom:'40px' }}>
              <div>
                <h1 style={{ margin:0, fontSize:'2.2rem', letterSpacing:'1px', fontWeight:'900' }}>FINANCIAL SUMMARY REPORT</h1>
                <div style={{ color:'#666', marginTop:'5px', fontSize:'1rem' }}>Periode: <strong>{financialReport.dateRange}</strong></div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:'900', fontSize:'1.4rem' }}>ALP LOGISTICS PRAKARSA</div>
                <div style={{ fontSize:'0.9rem', color:'#444' }}>Logistics & Transportation Excellence</div>
                <div style={{ marginTop:'10px', fontSize:'0.8rem', color:'#888' }}>Generated on: {new Date().toLocaleString('id-ID')}</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px', marginBottom:'40px' }}>
               <div style={{ background:'#f0fdf4', padding:'25px', borderRadius:'8px', border:'1px solid #bcf0da' }}>
                  <div style={{ fontSize:'0.8rem', color:'#065f46', textTransform:'uppercase', fontWeight:'700', marginBottom:'10px' }}>Total Revenue</div>
                  <div style={{ fontSize:'1.6rem', fontWeight:'900', color:'#059669' }}>Rp {financialReport.revenue.toLocaleString()}</div>
               </div>
               <div style={{ background:'#fef2f2', padding:'25px', borderRadius:'8px', border:'1px solid #fecaca' }}>
                  <div style={{ fontSize:'0.8rem', color:'#991b1b', textTransform:'uppercase', fontWeight:'700', marginBottom:'10px' }}>Total Expenses</div>
                  <div style={{ fontSize:'1.6rem', fontWeight:'900', color:'#dc2626' }}>Rp {(financialReport.opCosts + financialReport.payroll + financialReport.misc).toLocaleString()}</div>
               </div>
               <div style={{ background:'#fffbeb', padding:'25px', borderRadius:'8px', border:'2px solid #f59e0b' }}>
                  <div style={{ fontSize:'0.8rem', color:'#92400e', textTransform:'uppercase', fontWeight:'700', marginBottom:'10px' }}>Net Profit</div>
                  {(() => {
                    const net = financialReport.revenue - (financialReport.opCosts + financialReport.payroll + financialReport.misc);
                    return <div style={{ fontSize:'1.6rem', fontWeight:'900', color: net >= 0 ? '#059669' : '#dc2626' }}>Rp {net.toLocaleString()}</div>;
                  })()}
               </div>
            </div>

            <h3 style={{ borderBottom:'2px solid #333', paddingBottom:'10px', marginBottom:'20px', fontSize:'1.2rem' }}>Expense Breakdown</h3>
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'40px' }}>
               <thead>
                 <tr style={{ background:'#f8fafc', textAlign:'left' }}>
                   <th style={{ padding:'15px', border:'1px solid #e2e8f0' }}>Category</th>
                   <th style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>Amount</th>
                   <th style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>% of Revenue</th>
                 </tr>
               </thead>
               <tbody>
                 <tr>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', fontWeight:'600' }}>Operational (Purchase Orders)</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>Rp {financialReport.opCosts.toLocaleString()}</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>{((financialReport.opCosts / (financialReport.revenue || 1)) * 100).toFixed(2)}%</td>
                 </tr>
                 <tr>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', fontWeight:'600' }}>Payroll (Salaries)</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>Rp {financialReport.payroll.toLocaleString()}</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>{((financialReport.payroll / (financialReport.revenue || 1)) * 100).toFixed(2)}%</td>
                 </tr>
                 <tr>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', fontWeight:'600' }}>Miscellaneous Expenses</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>Rp {financialReport.misc.toLocaleString()}</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>{((financialReport.misc / (financialReport.revenue || 1)) * 100).toFixed(2)}%</td>
                 </tr>
               </tbody>
               <tfoot>
                 <tr style={{ background:'#f1f5f9', fontWeight:'800' }}>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0' }}>TOTAL EXPENSES</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>Rp {(financialReport.opCosts + financialReport.payroll + financialReport.misc).toLocaleString()}</td>
                   <td style={{ padding:'15px', border:'1px solid #e2e8f0', textAlign:'right' }}>{(((financialReport.opCosts + financialReport.payroll + financialReport.misc) / (financialReport.revenue || 1)) * 100).toFixed(2)}%</td>
                 </tr>
               </tfoot>
            </table>

            <h3 style={{ borderBottom:'2px solid #333', paddingBottom:'10px', marginBottom:'20px', fontSize:'1.2rem' }}>Detailed Transaction Logs</h3>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
               <thead>
                 <tr style={{ background:'#f8fafc', textAlign:'left' }}>
                   <th style={{ padding:'10px', border:'1px solid #e2e8f0' }}>Date</th>
                   <th style={{ padding:'10px', border:'1px solid #e2e8f0' }}>Description</th>
                   <th style={{ padding:'10px', border:'1px solid #e2e8f0' }}>Category</th>
                   <th style={{ padding:'10px', border:'1px solid #e2e8f0', textAlign:'right' }}>Amount</th>
                 </tr>
               </thead>
               <tbody>
                 {(() => {
                   const logs = [
                     ...invoices.filter(i => filterByDate(i.date)).map(i => ({ date: i.date, desc: `Invoice: ${i.id} (${i.customerName})`, cat: 'REVENUE', amt: parseFloat(i.amount||0) })),
                     ...purchaseOrders.filter(p => filterByDate(p.date)).map(p => ({ date: p.date, desc: `PO: ${p.id} (${p.vendorName})`, cat: 'OP COST', amt: -parseFloat(p.grandTotal||0) })),
                     ...salaries.filter(s => filterByDate(s.expenseDate || s.date)).map(s => ({ date: s.expenseDate || s.date, desc: `Payroll: ${s.name}`, cat: 'PAYROLL', amt: -parseFloat(s.totalToPay||0) })),
                     ...otherExpenses.filter(e => filterByDate(e.expenseDate || e.date)).map(e => ({ date: e.expenseDate || e.date, desc: `Misc: ${e.description}`, cat: 'EXPENSE', amt: -parseFloat(e.totalAfterTax||0) }))
                   ].sort((a, b) => new Date(b.date) - new Date(a.date));

                   return logs.length > 0 ? logs.slice(0, 50).map((log, idx) => (
                     <tr key={idx}>
                       <td style={{ padding:'10px', border:'1px solid #e2e8f0' }}>{new Date(log.date).toLocaleDateString()}</td>
                       <td style={{ padding:'10px', border:'1px solid #e2e8f0', fontWeight:'600' }}>{log.desc}</td>
                       <td style={{ padding:'10px', border:'1px solid #e2e8f0' }}>{log.cat}</td>
                       <td style={{ padding:'10px', border:'1px solid #e2e8f0', textAlign:'right', fontWeight:'700', color: log.amt >= 0 ? '#059669' : '#dc2626' }}>
                         {log.amt >= 0 ? '+' : '-'} Rp {Math.abs(log.amt).toLocaleString()}
                       </td>
                     </tr>
                   )) : <tr><td colSpan="4" style={{ padding:'20px', textAlign:'center' }}>No transactions found in this period.</td></tr>;
                 })()}
                 {/* Footer or Page Break indicator if many logs */}
               </tbody>
            </table>
            
            <div style={{ marginTop:'60px', display:'flex', justifyContent:'space-between' }}>
               <div style={{ textAlign:'center', width:'250px' }}>
                 <div style={{ fontSize:'0.9rem', marginBottom:'80px' }}>Financial Auditor,</div>
                 <div style={{ borderBottom:'2px solid #333', fontWeight:'800' }}>Finance Department</div>
                 <div style={{ fontSize:'0.75rem', color:'#666', marginTop:'5px' }}>ALP Logistics System</div>
               </div>
               <div style={{ textAlign:'center', width:'250px' }}>
                 <div style={{ fontSize:'0.9rem', marginBottom:'80px' }}>Approved By,</div>
                 <div style={{ borderBottom:'2px solid #333', fontWeight:'800' }}>Operations Manager</div>
                 <div style={{ fontSize:'0.75rem', color:'#666', marginTop:'5px' }}>ALP Logistics System</div>
               </div>
            </div>

            <div style={{ marginTop:'50px', borderTop:'1px dashed #ccc', paddingTop:'20px', textAlign:'center', color:'#999', fontSize:'0.7rem' }}>
               Confidential - For Internal Use Only. This document is electronically generated and verified by the ALP Integrated Logistics System.
            </div>
          </div>
        </div>
      )}
      {/* Receivable Proof Modal */}
      {receivableProofModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'600px', padding:'35px', textAlign:'center', maxHeight:'90vh', overflowY:'auto' }}>
            <button onClick={() => { setReceivableProofModal(null); setModalPhotos([]); }} style={{ position:'absolute', top:'15px', right:'15px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20}/></button>
            <h3 style={{ color:'#10b981', marginBottom:'20px' }}>Upload Bukti Pembayaran (Piutang)</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'25px' }}>Invoice: <strong>{receivableProofModal.id}</strong> - {receivableProofModal.customerName}</p>
            
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:'10px', marginBottom:'25px' }}>
              {modalPhotos.map((p, i) => (
                <div key={i} style={{ position:'relative', height:'100px', borderRadius:'8px', overflow:'hidden', border:'1px solid var(--glass-border)' }}>
                  <img src={p} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <button onClick={() => setModalPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position:'absolute', top:'5px', right:'5px', background:'rgba(239,68,68,0.8)', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={12}/></button>
                </div>
              ))}
              <label htmlFor="rec-proof-upload" style={{ height:'100px', borderRadius:'8px', border:'2px dashed var(--glass-border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
                <Plus size={24}/>
                <span style={{ fontSize:'0.7rem', marginTop:'5px' }}>Add Photo</span>
              </label>
            </div>
            <input type="file" multiple onChange={e => {
              const files = Array.from(e.target.files);
              files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setModalPhotos(prev => [...prev, reader.result]);
                reader.readAsDataURL(file);
              });
            }} style={{ display:'none' }} id="rec-proof-upload" />
            
            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
              <button onClick={() => { setReceivableProofModal(null); setModalPhotos([]); }} className="btn">Cancel</button>
              <ButtonWithLoading onClick={() => handleUploadReceivableProof(receivableProofModal.id, modalPhotos)} className="btn" style={{ background:'#10b981', color:'white' }}>Save Bukti</ButtonWithLoading>
            </div>
          </div>
        </div>
      )}

      {/* Bank Settings Modal */}
      {showBankSettings && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'800px', padding:'35px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' }}>
              <h3 style={{ color:'var(--secondary)', display:'flex', alignItems:'center', gap:'10px' }}><Settings size={22}/> Pengaturan Rekening Perusahaan</h3>
              <button onClick={() => setShowBankSettings(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={24}/></button>
            </div>

            <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:'12px', padding:'20px', border:'1px solid var(--glass-border)', marginBottom:'30px' }}>
              <h4 style={{ fontSize:'0.9rem', marginBottom:'20px', color:'var(--text-muted)' }}>Tambah / Edit Rekening</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px', marginBottom:'15px' }}>
                <input type="text" placeholder="Nama Bank (e.g. Mandiri IDR)" value={bankModal?.bankName || ''} onChange={e => setBankModal({...bankModal, bankName: e.target.value})} style={{ padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
                <input type="text" placeholder="Nomor Rekening" value={bankModal?.accountNo || ''} onChange={e => setBankModal({...bankModal, accountNo: e.target.value})} style={{ padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
                <input type="text" placeholder="Atas Nama" value={bankModal?.name || ''} onChange={e => setBankModal({...bankModal, name: e.target.value})} style={{ padding:'10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)' }} />
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width:'100%' }}
                onClick={async () => {
                  if (!bankModal?.bankName || !bankModal?.accountNo) return alert('Data tidak lengkap');
                  await updateCompanyBank({ ...bankModal, id: bankModal.id || `BANK-${Date.now()}` });
                  setBankModal(null);
                }}
              >
                <Save size={18}/> Simpan Rekening
              </button>
            </div>

            <div style={{ display:'grid', gap:'15px' }}>
              {companyBankAccounts.map(bank => (
                <div key={bank.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', background:'rgba(255,255,255,0.05)', borderRadius:'10px', border:'1px solid var(--glass-border)' }}>
                  <div>
                    <div style={{ fontWeight:'700', fontSize:'1rem' }}>{bank.bankName}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{bank.accountNo} - {bank.name}</div>
                  </div>
                  <div style={{ display:'flex', gap:'10px' }}>
                    <button className="btn" style={{ padding:'6px 12px', fontSize:'0.75rem', background:'rgba(59, 130, 246, 0.1)', color:'#3b82f6' }} onClick={() => setBankModal(bank)}><Edit3 size={14}/> Edit</button>
                  </div>
                </div>
              ))}
              {companyBankAccounts.length === 0 && <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px' }}>Belum ada rekening terdaftar.</div>}
            </div>
          </div>
        </div>
      )}
      {/* Upload Signed Document Modal */}
      {uploadSignedModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'450px', padding:'30px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px' }}>
              <h3 style={{ margin:0, color:'var(--secondary)' }}>Upload Dokumen Tertandatangan</h3>
              <button onClick={() => setUploadSignedModal(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={24}/></button>
            </div>

            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'20px' }}>
              Pilih foto atau scan dari <strong>{uploadSignedModal.type === 'invoice' ? 'Invoice' : 'Surat Tanda Terima (STT)'}</strong> yang sudah tertandatangan oleh customer.
            </p>

            <div style={{ marginBottom:'30px' }}>
              <div 
                style={{ height:'150px', border:'2px dashed var(--glass-border)', borderRadius:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', background:'rgba(255,255,255,0.02)', cursor:'pointer' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (readerEvent) => {
                        const base64 = readerEvent.target.result;
                        try {
                          const updateData = uploadSignedModal.type === 'invoice' 
                            ? { signedInvoicePhoto: base64 } 
                            : { signedReceiptPhoto: base64 };
                          
                          await updateInvoice(uploadSignedModal.invId, updateData);
                          setUploadSignedModal(null);
                          alert("Dokumen berhasil diupload!");
                        } catch (err) {
                          alert("Gagal upload dokumen: " + err.message);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                <div style={{ background:'var(--secondary-glass)', p:2, borderRadius:'50%' }}>
                  <Image size={32} style={{ color:'var(--secondary)' }}/>
                </div>
                <div style={{ fontWeight:'700', fontSize:'0.9rem' }}>Klik untuk Pilih Foto</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Format: JPG, PNG, WEBP</div>
              </div>
            </div>

            <button 
              onClick={() => setUploadSignedModal(null)} 
              className="btn" 
              style={{ width:'100%', padding:'12px' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Upload Signed Document Modal */}
      {uploadSignedModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'450px', padding:'30px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px' }}>
              <h3 style={{ margin:0, color:'var(--secondary)' }}>Upload Dokumen Tertandatangan</h3>
              <button onClick={() => setUploadSignedModal(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={24}/></button>
            </div>

            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'20px' }}>
              Pilih foto atau scan dari <strong>{uploadSignedModal.type === 'invoice' ? 'Invoice' : 'Surat Tanda Terima (STT)'}</strong> yang sudah tertandatangan oleh customer.
            </p>

            <div style={{ marginBottom:'30px' }}>
              <div 
                style={{ height:'150px', border:'2px dashed var(--glass-border)', borderRadius:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', background:'rgba(255,255,255,0.02)', cursor:'pointer' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (readerEvent) => {
                        const base64 = readerEvent.target.result;
                        try {
                          const updateData = uploadSignedModal.type === 'invoice' 
                            ? { signedInvoicePhoto: base64 } 
                            : { signedReceiptPhoto: base64 };
                          
                          await updateInvoice(uploadSignedModal.invId, updateData);
                          setUploadSignedModal(null);
                          alert("Dokumen berhasil diupload!");
                        } catch (err) {
                          alert("Gagal upload dokumen: " + err.message);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                <div style={{ background:'var(--secondary-glass)', p:2, borderRadius:'50%' }}>
                  <Image size={32} style={{ color:'var(--secondary)' }}/>
                </div>
                <div style={{ fontWeight:'700', fontSize:'0.9rem' }}>Klik untuk Pilih Foto</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Format: JPG, PNG, WEBP</div>
              </div>
            </div>

            <button 
              onClick={() => setUploadSignedModal(null)} 
              className="btn" 
              style={{ width:'100%', padding:'12px' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Bank Selection Modal for Invoice Issuance */}
      {issuingInvoiceJoId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div className="glass-card" style={{ width:'100%', maxWidth:'500px', padding:'35px', textAlign:'center' }}>
            <h3 style={{ color:'var(--secondary)', marginBottom:'20px' }}>Pilih Rekening untuk Invoice</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'25px' }}>
              Silakan pilih rekening bank yang akan dicantumkan pada Invoice untuk Job Order: <strong>{issuingInvoiceJoId}</strong>
            </p>
            
            <div style={{ marginBottom:'30px' }}>
              <select 
                value={selectedBankId} 
                onChange={(e) => setSelectedBankId(e.target.value)}
                style={{ width:'100%', padding:'12px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:'10px', color:'var(--text)', fontSize:'1rem' }}
              >
                {companyBankAccounts.map(bank => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bankName} - {bank.accountNo} ({bank.name})
                  </option>
                ))}
                {companyBankAccounts.length === 0 && <option value="">Belum ada rekening terdaftar</option>}
              </select>
              {companyBankAccounts.length === 0 && (
                <p style={{ color:'#ef4444', fontSize:'0.75rem', marginTop:'10px' }}>
                  Mohon tambahkan rekening perusahaan di menu Settings terlebih dahulu.
                </p>
              )}
            </div>

            <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
              <button 
                onClick={() => setIssuingInvoiceJoId(null)} 
                className="btn" 
                style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.05)', color:'var(--text)' }}
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  const bank = companyBankAccounts.find(b => b.id === selectedBankId);
                  if (bank) {
                    handleIssueInvoice(issuingInvoiceJoId, bank);
                  } else {
                    alert("Silakan pilih rekening bank yang valid.");
                  }
                }} 
                className="btn btn-gold" 
                style={{ flex:2, padding:'12px', fontWeight:'700' }}
                disabled={companyBankAccounts.length === 0}
              >
                Konfirmasi & Terbitkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
