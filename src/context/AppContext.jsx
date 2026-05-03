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
  const [employees, setEmployees] = useState([]);
  const [employeeAccounts, setEmployeeAccounts] = useState([]);
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('omega_user') || 'null'));
  const [theme, setTheme] = useState(() => localStorage.getItem('omega_theme') || 'dark');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
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

  const login = (username, password) => {
    // 1. Check hardcoded/admin accounts
    const rolesMap = {
      'owner': { name: 'Owner', role: 'owner', key: '1234' },
      'marketing': { name: 'Marketing', role: 'marketing', key: '1234' },
      'admin': { name: 'Admin Office', role: 'admin', key: '1234' },
      'executor': { name: 'Executor', role: 'executor', key: '1234' },
      'accounting': { name: 'Accounting', role: 'accounting', key: '1234' }
    };

    const userMatch = rolesMap[username];
    if (userMatch && password === userMatch.key) {
      const userData = { name: userMatch.name, role: userMatch.role };
      setUser(userData);
      localStorage.setItem('omega_user', JSON.stringify(userData));
      return true;
    }

    // 2. Check custom employee accounts
    const empAccount = employeeAccounts.find(acc => acc.username === username && acc.password === password);
    if (empAccount) {
      const employee = employees.find(e => e.id === empAccount.id);
      const userData = { 
        name: employee?.name || empAccount.username, 
        role: empAccount.role,
        employeeId: empAccount.id 
      };
      setUser(userData);
      localStorage.setItem('omega_user', JSON.stringify(userData));
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
        'employees',
        'employee-accounts',
        'company-bank-accounts'
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
        empData,
        accData,
        bankData
      ] = await Promise.all(dataPromises);

      const safeParse = (data, keys) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => {
          const newItem = { ...item };
          keys.forEach(key => {
            if (newItem[key] && typeof newItem[key] === 'string') {
              try {
                newItem[key] = JSON.parse(newItem[key]);
              } catch (e) {
                console.warn(`Failed to parse ${key} for item ${newItem.id}:`, e.message);
              }
            }
            // Ensure array type for common list columns if they are null/undefined
            if (['items', 'photos', 'costs', 'containerNo', 'vehicleNo', 'driverName', 'extra_charges', 'services', 'assets', 'taxes'].includes(key)) {
              if (!Array.isArray(newItem[key])) newItem[key] = [];
            }
          });
          return newItem;
        });
      };

      setProspects(Array.isArray(prosData) ? prosData : []);
      setQuotations(safeParse(quoData, ['items']));
      setJobOrders(safeParse(joData, ['photos', 'costs', 'containerNo', 'vehicleNo', 'driverName']));
      setInvoices(safeParse(invData, ['extra_charges', 'tax_deduction_proof', 'taxes_deducted']));
      setReceivables(safeParse(recData, ['extra_charges', 'tax_deduction_proof', 'taxes_deducted']));
      setVendors(safeParse(venData, ['services', 'assets']));
      setPurchaseOrders(safeParse(poData, ['items', 'vendorInvoicePhoto', 'paymentProofPhoto']));
      setSalaries(safeParse(salData, ['taxes']));
      setOtherExpenses(safeParse(expData, ['taxes']));
      setEmployees(Array.isArray(empData) ? empData : []);
      setEmployeeAccounts(Array.isArray(accData) ? accData : []);
      setCompanyBankAccounts(Array.isArray(bankData) ? bankData : []);
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

  const cleanNumber = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    // Handle Indonesian format: dot as thousands separator, comma as decimal
    // First, check if it's already a clean string number
    if (/^\d+(\.\d+)?$/.test(String(val))) return parseFloat(val);
    
    // Otherwise, strip everything except digits, comma and dot
    let str = String(val).replace(/[^\d.,-]/g, '');
    
    // If it has both dot and comma, or just comma, it's likely Indonesian format (1.000,00)
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else if (str.includes(',')) {
      str = str.replace(/,/g, '.');
    }
    
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const createInvoice = async (joId) => {
    console.log("Starting createInvoice for JO ID:", joId);
    const jo = jobOrders.find(j => String(j.id) === String(joId));
    if (!jo) {
      console.error("Job Order not found in local state for ID:", joId);
      return null;
    }
    
    const quotation = jo.quotationId 
      ? quotations.find(q => String(q.id) === String(jo.quotationId))
      : null;
    
    // Defensive parsing for quotation items
    let items = [];
    if (quotation && quotation.items) {
      try {
        items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items;
      } catch (e) {
        console.error("Failed to parse quotation items:", e);
        items = [];
      }
    }

    if (!Array.isArray(items)) items = [];
    
    // Find rate for selected activity (using description as matched in AdminHub)
    const targetDesc = (jo.instruction || jo.jobDescription || "").trim().toLowerCase();
    const item = items.find(i => (i.description || "").trim().toLowerCase() === targetDesc);
    
    // Ensure rate is a valid number using cleanNumber
    let rate = 0;
    if (item && item.rate) {
      rate = cleanNumber(item.rate);
    } else {
      rate = cleanNumber(jo.rate);
    }

    const qty = cleanNumber(jo.issueQuantity || jo.quantity || 1);
    const amount = rate * qty;
    
    console.log(`Calculated amount: ${amount} (Rate: ${rate}, Qty: ${qty})`);
    
    if (isNaN(amount)) {
      console.error("Calculated amount is NaN. Rate:", rate, "Qty:", qty);
      throw new Error("Gagal menghitung nominal invoice (Data tidak valid).");
    }

    const newInvoice = {
      // Use more robust ID generation
      id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      joId,
      customerName: jo.customerName || 'Pelanggan',
      amount: amount,
      subtotal: amount,
      tax: 0,
      date: new Date().toISOString(),
      status: 'unpaid',
      extra_charges: [],
      signedReceiptPhoto: null,
      signedInvoicePhoto: null,
      deliveryStatus: 'not_sent'
    };
    
    try {
      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice)
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }
      
      const { id } = data;
      const finalInvoice = { ...newInvoice, id: id || newInvoice.id };
      
      // Update local state
      setInvoices(prev => [...prev, finalInvoice]);
      setReceivables(prev => [...prev, { ...finalInvoice, balance: finalInvoice.amount }]);
      setJobOrders(prev => prev.map(j => String(j.id) === String(joId) ? { ...j, status: 'invoiced' } : j));
      
      return finalInvoice;
    } catch (error) {
      console.error("Failed to create invoice:", error);
      throw error;
    }
  };

  const settleInvoice = async (invoiceId, paymentProofPhoto, taxesDeducted, taxDeductionProof) => {
    const totalTax = Array.isArray(taxesDeducted) ? taxesDeducted.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0) : 0;
    
    await fetch(`${API_URL}/invoices/${invoiceId}/settle`, { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentProofPhoto, taxesDeducted, taxDeductionProof })
    });
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId ? { 
        ...inv, 
        status: 'paid', 
        tax_deduction: totalTax, 
        taxes_deducted: taxesDeducted,
        tax_deduction_proof: taxDeductionProof 
      } : inv
    ));
    setReceivables(prev => prev.map(r => 
      r.id === invoiceId || r.invoiceId === invoiceId ? { 
        ...r, 
        status: 'paid', 
        balance: 0, 
        paymentProofPhoto, 
        tax_deduction: totalTax, 
        taxes_deducted: taxesDeducted,
        tax_deduction_proof: taxDeductionProof 
      } : r
    ));
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

  const updateSalary = async (id, updates) => {
    await fetch(`${API_URL}/salaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setSalaries(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
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

  const updateOtherExpense = async (id, updates) => {
    await fetch(`${API_URL}/other-expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setOtherExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
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

  // --- EMPLOYEE METHODS ---
  const addEmployee = async (employee) => {
    const newEmployee = { ...employee, id: `EMP-${Date.now().toString().slice(-6)}` };
    await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee)
    });
    setEmployees(prev => [...prev, newEmployee]);
    return newEmployee;
  };

  const updateEmployee = async (id, updates) => {
    await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEmployee = async (id) => {
    await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
    setEmployees(prev => prev.filter(e => e.id !== id));
    setEmployeeAccounts(prev => prev.filter(a => a.id !== id));
  };

  const addEmployeeAccount = async (account) => {
    await fetch(`${API_URL}/employee-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    setEmployeeAccounts(prev => [...prev, account]);
  };
  
  const updateEmployeeAccount = async (id, updates) => {
    await fetch(`${API_URL}/employee-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setEmployeeAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };
  
  const deleteEmployeeAccount = async (id) => {
    await fetch(`${API_URL}/employee-accounts/${id}`, { method: 'DELETE' });
    setEmployeeAccounts(prev => prev.filter(a => a.id !== id));
  };

  const updateCompanyBank = async (account) => {
    await fetch(`${API_URL}/company-bank-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    setCompanyBankAccounts(prev => {
      const idx = prev.findIndex(a => a.id === account.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = account;
        return next;
      }
      return [...prev, account];
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
      salaries, addSalary, deleteSalary, updateSalary,
      otherExpenses, addOtherExpense, deleteOtherExpense, updateOtherExpense,
      employees, addEmployee, updateEmployee, deleteEmployee,
      employeeAccounts, addEmployeeAccount, updateEmployeeAccount, deleteEmployeeAccount,
      companyBankAccounts, updateCompanyBank,
      maintenanceMode, setMaintenanceMode,
      clearAllData,
      getSystemConfig, updateSystemConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

