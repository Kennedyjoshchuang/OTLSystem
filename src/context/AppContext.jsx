import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCustomers } from '../api/hooks/useCustomers';
import { apiRequest } from '../api/api';
import { translations } from '../translations/translations';

const AppContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('omega_lang') || 'en');
  const { customers, addCustomer: addCustomerHook, isLoading: customersLoading, error: customersError } = useCustomers();
  const [prospects, setProspects] = useState([]);
  const [prospectDrafts, setProspectDrafts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('omega_user') || 'null'));
  const [theme, setTheme] = useState(() => localStorage.getItem('omega_theme') || 'dark');
  const [loading, setLoading] = useState(true);

  // Translation function
  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'id' : 'en';
    setLanguage(newLang);
    localStorage.setItem('omega_lang', newLang);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('omega_theme', newTheme);
  };

  const login = (roleId, password) => {
    if (password !== '1234') return false;

    const rolesMap = {
      'owner': { name: 'Owner', role: 'owner' },
      'marketing': { name: 'Marketing', role: 'marketing' },
      'admin': { name: 'Admin Office', role: 'admin' },
      'executor': { name: 'Executor', role: 'executor' },
      'accounting': { name: 'Accounting', role: 'accounting' }
    };

    const userMatch = rolesMap[roleId];
    if (userMatch) {
      setUser(userMatch);
      localStorage.setItem('omega_user', JSON.stringify(userMatch));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('omega_user');
  };

  // Fetch all data from API (excluding customers, which are handled by useCustomers)
  const fetchData = async () => {
    try {
      const endpoints = [
        'prospects',
        'quotations',
        'job-orders',
        'invoices',
        'receivables',
        'vendors',
        'purchase-orders',
        'salaries',
        'other-expenses',
      ];
      const dataPromises = endpoints.map((endpoint) =>
        apiRequest(endpoint).catch((err) => {
          console.warn(`Fetch failed for ${endpoint}: ${err.message}`);
          return [];
        })
      );
      const [
        prosData,
        quoData,
        joData,
        invData,
        recData,
        venData,
        poData,
        salData,
        expData,
      ] = await Promise.all(dataPromises);
      setProspects(Array.isArray(prosData) ? prosData : []);
      setQuotations(Array.isArray(quoData) ? quoData : []);
      setJobOrders(Array.isArray(joData) ? joData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
      setReceivables(Array.isArray(recData) ? recData : []);
      setVendors(Array.isArray(venData) ? venData : []);
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setSalaries(Array.isArray(salData) ? salData : []);
      setOtherExpenses(Array.isArray(expData) ? expData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addCustomer = async (customer) => {
    const newCustomer = { ...customer, id: `CUST-${Date.now().toString().slice(-4)}` };
    // Use the mutation provided by useCustomers (optimistic update handled there)
    await addCustomerHook(newCustomer);
    return newCustomer;
  };

  const addProspect = async (prospectData) => {
    const newProspect = {
      ...prospectData,
      id: `PRP-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'followUp'
    };
    await fetch(`${API_URL}/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProspect)
    });
    setProspects(prev => [...prev, newProspect]);
    return newProspect;
  };

  const updateProspectStatus = async (id, status) => {
    await fetch(`${API_URL}/prospects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const convertProspectToCustomer = async (id) => {
    const prospect = prospects.find(p => p.id === id);
    if (prospect) {
      const customer = await addCustomer({
        name: prospect.name,
        phone: prospect.phone,
        email: prospect.email,
        address: prospect.address
      });
      await updateProspectStatus(id, 'deal');
      return customer;
    }
  };

  const createQuotation = async (quotationData) => {
    const newQuotation = {
      ...quotationData,
      id: `QUO-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      status: 'pending'
    };
    const response = await fetch(`${API_URL}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQuotation)
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const { id } = await response.json();
    const finalQuotation = { ...newQuotation, id };
    setQuotations(prev => [...prev, finalQuotation]);
    return finalQuotation;
  };

  const approveQuotation = async (quotationId) => {
    await fetch(`${API_URL}/quotations/${quotationId}/approve`, { method: 'PUT' });
    setQuotations(prev => prev.map(q => 
      q.id === quotationId ? { ...q, status: 'approved' } : q
    ));
  };

  const unapproveQuotation = async (quotationId) => {
    await fetch(`${API_URL}/quotations/${quotationId}/unapprove`, { method: 'PUT' });
    setQuotations(prev => prev.map(q =>
      q.id === quotationId ? { ...q, status: 'pending' } : q
    ));
  };

  const createJO = async (joData) => {
    const newJO = {
      ...joData,
      id: `JO-${Date.now().toString().slice(-6)}`,
      status: 'pending',
      containerNo: '',
      vehicleNo: '',
      driverName: '',
      activityStatus: '',
      photos: [],
      date: new Date().toISOString()
    };
    const response = await fetch(`${API_URL}/job-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joData)
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const { id } = await response.json();
    const finalJO = { ...newJO, id };
    setJobOrders(prev => [...prev, finalJO]);
    return finalJO;
  };

  const dispatchJO = async (joId, quantity) => {
    await updateJOStatus(joId, { status: 'dispatched', issueQuantity: quantity });
  };

  const updateJOStatus = async (joId, updates) => {
    const response = await fetch(`${API_URL}/job-orders/${joId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    setJobOrders(prev => prev.map(jo => 
      jo.id === joId ? { ...jo, ...updates } : jo
    ));
  };

  const completeJO = async (joId) => {
    await updateJOStatus(joId, { status: 'done' });
  };

  const createInvoice = async (joId) => {
    const jo = jobOrders.find(j => j.id === joId);
    if (!jo) return null;
    const quotation = quotations.find(q => q.id === jo.quotationId);
    if (!quotation || !quotation.items) {
      console.error("Quotation not found or has no items for JO:", joId);
      return null;
    }
    
    // Find rate for selected activity (using description as matched in AdminHub)
    const targetDesc = (jo.instruction || jo.jobDescription || "").trim().toLowerCase();
    const item = quotation.items.find(i => (i.description || "").trim().toLowerCase() === targetDesc);
    const rate = item ? parseFloat(item.rate || 0) : (parseFloat(jo.rate) || 0);

    const newInvoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      joId,
      customerName: jo.customerName,
      amount: rate * (jo.issueQuantity || jo.quantity || 1),
      subtotal: rate * (jo.issueQuantity || jo.quantity || 1),
      tax: 0,
      date: new Date().toISOString(),
      status: 'unpaid',
      extra_charges: []
    };
    
    try {
      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice)
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const { id } = await response.json();
      const finalInvoice = { ...newInvoice, id };
      
      setInvoices(prev => [...prev, finalInvoice]);
      setReceivables(prev => [...prev, { ...finalInvoice, balance: finalInvoice.amount }]);
      return finalInvoice;
    } catch (error) {
      console.error("Failed to create invoice:", error);
      throw error;
    }
  };

  const settleInvoice = async (invoiceId) => {
    await fetch(`${API_URL}/invoices/${invoiceId}/settle`, { method: 'PUT' });
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
    ));
    setReceivables(prev => prev.filter(r => r.id !== invoiceId && r.invoiceId !== invoiceId));
  };

  const settleReceivable = async (invoiceId) => {
    await settleInvoice(invoiceId);
  };

  const deleteCustomer = async (id) => {
    await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addVendor = async (data) => {
    const newVendor = { ...data, id: `VND-${Date.now().toString().slice(-6)}`, date: new Date().toISOString() };
    const response = await fetch(`${API_URL}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newVendor) });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const { id } = await response.json();
    const finalVendor = { ...newVendor, id };
    setVendors(prev => [...prev, finalVendor]);
    return finalVendor;
  };
  const updateVendor = async (id, data) => {
    await fetch(`${API_URL}/vendors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  };
  const deleteVendor = async (id) => {
    await fetch(`${API_URL}/vendors/${id}`, { method: 'DELETE' });
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  const createPurchaseOrder = async (poData) => {
    const newPO = {
      ...poData,
      id: `PO-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      status: poData.status || 'draft'
    };
    
    try {
      const response = await fetch(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poData)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const finalPO = await response.json();
      // Ensure items are parsed if server returns them as string
      if (typeof finalPO.items === 'string') finalPO.items = JSON.parse(finalPO.items);
      if (typeof finalPO.vendorInvoicePhoto === 'string') finalPO.vendorInvoicePhoto = JSON.parse(finalPO.vendorInvoicePhoto);
      if (typeof finalPO.paymentProofPhoto === 'string') finalPO.paymentProofPhoto = JSON.parse(finalPO.paymentProofPhoto);
      
      setPurchaseOrders(prev => [finalPO, ...prev]);
      return finalPO;
    } catch (error) {
      console.error("Failed to create PO:", error);
      throw error;
    }
  };

  const issuePurchaseOrder = async (poId) => {
    await fetch(`${API_URL}/purchase-orders/${poId}/issue`, { method: 'PUT' });
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'issued' } : p));
  };

  const deletePurchaseOrder = async (poId) => {
    await fetch(`${API_URL}/purchase-orders/${poId}`, { method: 'DELETE' });
    setPurchaseOrders(prev => prev.filter(p => p.id !== poId));
  };

  const updatePurchaseOrder = async (poId, data) => {
    await fetch(`${API_URL}/purchase-orders/${poId}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, ...data } : p));
  };
  const deleteProspect = async (id) => {
    
    try {
      const response = await fetch(`${API_URL}/prospects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProspects(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Gagal menghapus di Server. Kode Error: " + response.status);
      }
    } catch (error) {
      alert("Masalah Koneksi: Tidak bisa menghubungi server. " + error.message);
    }
  };
  const deleteJO = async (id) => {
    await fetch(`${API_URL}/job-orders/${id}`, { method: 'DELETE' });
    setJobOrders(prev => prev.filter(jo => jo.id !== id));
  };
  const deleteInvoice = async (id) => {
    await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE' });
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setReceivables(prev => prev.filter(r => r.invoiceId !== id));
  };
  const updateInvoice = async (id, updates) => {
    await fetch(`${API_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
    // Also update receivable if it exists
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, ...updates, balance: updates.amount ?? r.balance } : r));
  };
  const deleteQuotation = async (id) => {

    try {
      const response = await fetch(`${API_URL}/quotations/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setQuotations(prev => prev.filter(q => q.id !== id));
        // Also refresh other data since we implemented cascade delete on backend
        fetchData();
        console.log(`Berhasil menghapus penawaran: ${id}`);
      } else {
        alert("Gagal menghapus penawaran di server.");
      }
    } catch (error) {
      console.error("Gagal menghapus:", error);
      alert("Masalah koneksi saat mencoba menghapus.");
    }
  };

  const addSalary = async (salary) => {
    const newSalary = { 
      ...salary, 
      id: `SAL-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString()
    };
    await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSalary)
    });
    setSalaries(prev => [newSalary, ...prev]);
    return newSalary;
  };

  const deleteSalary = async (id) => {
    await fetch(`${API_URL}/salaries/${id}`, { method: 'DELETE' });
    setSalaries(prev => prev.filter(s => s.id !== id));
  };

  const addOtherExpense = async (expense) => {
    const newExpense = { 
      ...expense, 
      id: `EXP-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString()
    };
    await fetch(`${API_URL}/other-expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });
    setOtherExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  };

  const deleteOtherExpense = async (id) => {
    await fetch(`${API_URL}/other-expenses/${id}`, { method: 'DELETE' });
    setOtherExpenses(prev => prev.filter(e => e.id !== id));
  };

  const clearAllData = async () => {
    if (user?.role !== 'owner') return;
    await fetch(`${API_URL}/system/clear`, { method: 'POST' });
    setCustomers([]);
    setProspects([]);
    setProspectDrafts([]);
    setJobOrders([]);
    setInvoices([]);
    setReceivables([]);
  };

  const getSystemConfig = async () => {
    const res = await fetch(`${API_URL}/system/config`);
    return await res.json();
  };

  const updateSystemConfig = async (config) => {
    await fetch(`${API_URL}/system/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  };

  return (
    <AppContext.Provider value={{
      user, login, logout,
      language, toggleLanguage, t,
      theme, toggleTheme, loading,
      customers, addCustomer, deleteCustomer,
      vendors, addVendor, updateVendor, deleteVendor,
      purchaseOrders, createPurchaseOrder, issuePurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
      prospects, addProspect, updateProspectStatus, convertProspectToCustomer, deleteProspect,
      prospectDrafts,
      quotations, createQuotation, approveQuotation, unapproveQuotation, deleteQuotation,
      jobOrders, createJO, dispatchJO, updateJOStatus, completeJO, deleteJO,
      invoices, createInvoice, settleInvoice, deleteInvoice, updateInvoice,
      receivables, settleReceivable,
      salaries, addSalary, deleteSalary,
      otherExpenses, addOtherExpense, deleteOtherExpense,
      clearAllData,
      getSystemConfig, updateSystemConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
