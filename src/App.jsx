import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Marketing from './pages/Marketing';
import QuotationList from './pages/QuotationList';
import AdminHub from './pages/AdminHub';
import Executor from './pages/Executor';
import Accounting from './pages/Accounting';
import Procurement from './pages/Procurement';
import SystemControl from './pages/SystemControl';
import Login from './pages/Login';
import DashboardHome from './components/DashboardHome';
import SuratJalanDetail from './pages/SuratJalanDetail';
import PrintQuotation from './pages/PrintQuotation';
import PrintInvoice from './pages/PrintInvoice';
import PrintInvoiceAttachment from './pages/PrintInvoiceAttachment';

const ProtectedRoute = ({ children, allowedRoles, useLayout = true }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return useLayout ? <Layout>{children}</Layout> : children;
};

function AppRoutes() {
  const { user } = useApp();
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        {/* Automatic Redirection Root */}
        <Route path="/" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />

        {/* Module Routes */}
        <Route path="/marketing" element={<ProtectedRoute allowedRoles={['owner', 'marketing']}><Marketing /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><AdminHub /></ProtectedRoute>} />
        <Route path="/executor" element={<ProtectedRoute allowedRoles={['owner', 'executor']}><Executor /></ProtectedRoute>} />
        <Route path="/accounting" element={<ProtectedRoute allowedRoles={['owner', 'accounting']}><Accounting /></ProtectedRoute>} />
        <Route path="/procurement" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Procurement /></ProtectedRoute>} />
        <Route path="/system-control" element={<ProtectedRoute allowedRoles={['owner']}><SystemControl /></ProtectedRoute>} />
        
        {/* Standalone Pages (No Sidebar) */}
        <Route path="/executor/surat-jalan/:id" element={<ProtectedRoute allowedRoles={['owner', 'executor']} useLayout={false}><SuratJalanDetail /></ProtectedRoute>} />
        <Route path="/print/quotation" element={<ProtectedRoute useLayout={false}><PrintQuotation /></ProtectedRoute>} />
        <Route path="/print/invoice" element={<ProtectedRoute useLayout={false}><PrintInvoice /></ProtectedRoute>} />
        <Route path="/print/invoice-attachment" element={<ProtectedRoute useLayout={false}><PrintInvoiceAttachment /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
