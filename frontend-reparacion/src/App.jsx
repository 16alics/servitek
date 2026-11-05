import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LoginTrabajador from './pages/LoginTrabajador';
import Dashboard from './pages/Dashboard'; // <--- Tu componente dashboard actual
import ClientesAdmin from './pages/ClientesAdmin';
import RastreoPublico from './pages/RastreoPublico';
import RecepcionAdmin from './pages/RecepcionAdmin';
import ReportesAdmin from './pages/ReportesAdmin';
import AdminDashboard from './pages/AdminDashboard'; // 👈 Asegúrate de que la ruta coincida con la ubicación de tu archivo
import UsuariosAdmin from './pages/UsuariosAdmin'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingServitek from './pages/LandingServitek';
// o si está en la misma carpeta: import UsuariosAdmin from './UsuariosAdmin';
function App() {
  return (
    <Router>
      <ToastContainer 
  position="top-right" 
  autoClose={3000} 
  limit={3} // 👈 Esto limita a que solo se muestren máximo 3 a la vez
  newestOnTop={true}
  closeOnClick
/>
      <Routes>
        <Route path="/" element={<LandingServitek />} />
<Route path="/rastreo" element={<RastreoPublico />} />
<Route path="/login-trabajador" element={<LoginTrabajador />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-trabajador" element={<LoginTrabajador />} />
        
        {/* RUTA CLAVE: Aquí es a donde redirige el login de trabajador para el admin */}
        <Route path="/taller/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/ClientesAdmin" element={<ClientesAdmin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/clientes" element={<ClientesAdmin />} />
        <Route path="/admin/recepcion" element={<RecepcionAdmin />} />
        <Route path="/admin/reportes" element={<ReportesAdmin />} />
        <Route path="/rastreo" element={<RastreoPublico />} />
        <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
        <Route path="/admin/tecnicos" element={<TecnicosAdmin />} />
       
      </Routes>
    </Router>
  );
}

export default App;