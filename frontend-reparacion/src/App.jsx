import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LoginTrabajador from './pages/LoginTrabajador';
import Dashboard from './pages/Dashboard';
import ClientesAdmin from './pages/ClientesAdmin';
import RastreoPublico from './pages/RastreoPublico';
import RecepcionAdmin from './pages/RecepcionAdmin';
import ReportesAdmin from './pages/ReportesAdmin';
import AdminDashboard from './pages/AdminDashboard';
import UsuariosAdmin from './pages/UsuariosAdmin'; 
import TecnicosAdmin from './pages/TecnicosAdmin';
import LandingServitek from './pages/LandingServitek';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        limit={3}
        newestOnTop={true}
        closeOnClick
      />
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<LandingServitek />} />
        <Route path="/rastreo" element={<RastreoPublico />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-trabajador" element={<LoginTrabajador />} />

        {/* Panel Administrativo y de Taller */}
        <Route path="/taller/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/clientes" element={<ClientesAdmin />} />
        <Route path="/ClientesAdmin" element={<ClientesAdmin />} />
        <Route path="/admin/recepcion" element={<RecepcionAdmin />} />
        <Route path="/admin/reportes" element={<ReportesAdmin />} />
        <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
        <Route path="/admin/tecnicos" element={<TecnicosAdmin />} />

        {/* Dashboard General */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Ruta por defecto (Fallback) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;