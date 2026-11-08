import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Wrench, Bell } from 'lucide-react';
import CentroNotificaciones from './CentroNotificaciones'; // Asegúrate de tener esta ruta correcta

export default function Header({ userId, userRole, userEmail, customTitle, onBack, logoutPath, children }) {
  const navigate = useNavigate();
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const getLogoutPath = () => {
    if (logoutPath) return logoutPath;
    if (userRole === 'cliente') {
      return '/login'; 
    } else {
      return '/login-trabajador'; 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate(getLogoutPath());
  };

  const roleNames = {
    'admin': 'Administrador',
    'cliente': 'Cliente',
    'tecnico': 'Técnico',
    'recepcion': 'Recepción'
  };

  const title = customTitle || `Panel ${roleNames[userRole] || ''}`;

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 text-slate-100 px-6 py-4 shadow-2xl backdrop-blur-xl flex flex-wrap justify-between items-center gap-4 print:hidden sticky top-0 z-50">
      
      {/* LADO IZQUIERDO: Volver y Logo */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl transition-all font-medium text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        )}

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/30 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SERVITEK
          </span>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700 ml-2 hidden sm:inline-block">
          {title}
        </span>
      </div>
      
      {/* LADO DERECHO: Email, Notificaciones y Botones */}
      <div className="flex items-center gap-4 sm:gap-6">
        {userEmail && (
          <span className="text-xs sm:text-sm font-medium bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 shadow-inner hidden md:inline-block">
            {userEmail}
          </span>
        )}
        
        <div className="flex items-center gap-3 relative">
          {/* 🔔 BOTÓN DE NOTIFICACIONES */}
          <div className="relative">
            <button 
              onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-xl transition-all relative focus:outline-none cursor-pointer shadow-sm flex items-center justify-center"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {/* Puntito indicador de alerta */}
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            </button>

            {/* MENÚ FLOTANTE DE NOTIFICACIONES */}
            {mostrarNotificaciones && (
              <div className="absolute right-0 mt-3 z-50 shadow-2xl">
                <CentroNotificaciones usuarioId={userId} rol={userRole} />
              </div>
            )}
          </div>

          {children}

          <button 
            onClick={handleLogout} 
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}