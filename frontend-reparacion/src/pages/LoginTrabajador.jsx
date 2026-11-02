import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Wrench, Mail, Lock, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';

// Función helper para decodificar el payload del token JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function LoginTrabajador() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [view, setView] = useState('login'); // Control de vista: 'login' o 'primer_ingreso'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  // Manejador de Inicio de Sesión
  const handleLoginTrabajador = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post('${API_URL}/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.access_token) {
        const token = response.data.access_token;
        const decodedToken = parseJwt(token);
        const rolUsuario = decodedToken?.rol;
        
        // Evaluamos primer_ingreso desde la respuesta o el token
        const primerIngreso = response.data.primer_ingreso ?? decodedToken?.primer_ingreso;

        // Candado: Denegar acceso a clientes en esta ruta
        if (rolUsuario && rolUsuario.toLowerCase() === 'cliente') {
          setError('Acceso denegado. Esta sección es exclusiva para personal autorizado.');
          setIsLoading(false);
          return;
        }

        localStorage.setItem('token', token);
        localStorage.setItem('rol', rolUsuario);
        localStorage.setItem('tempEmail', username);

        // 🔒 Candado de primer ingreso: Cambiamos la vista aquí mismo sin usar navigate
        if (primerIngreso) {
          setView('primer_ingreso');
          setIsLoading(false);
          return;
        }

        // Redirecciones seguras por rol (si ya no es primer ingreso)
        if (rolUsuario && (rolUsuario.toLowerCase() === 'administrador' || rolUsuario.toLowerCase() === 'admin')) {
          navigate('/admin/dashboard'); 
        } else if (rolUsuario && rolUsuario.toLowerCase() === 'tecnico') {
          navigate('/taller/dashboard'); 
        } else {
          navigate('/admin/recepcion'); 
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales de trabajador incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejador para Actualizar Contraseña de Primer Ingreso
  const handleCambiarClaveTemporal = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const emailUsuario = localStorage.getItem('tempEmail') || username;

      await axios.post('${API_URL}/auth/cambiar-clave-primer-ingreso', {
        email: emailUsuario,
        nueva_password: newPassword
      });

      toast.success('¡Contraseña actualizada con éxito! Por favor, inicia sesión con tu nueva clave.');
      localStorage.removeItem('tempEmail');
      setView('login');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat w-full relative overflow-hidden"
      style={{ backgroundImage: "url('/tecnico.jpg')" }}
    >
      {/* Botón flotante para Volver al Inicio (Landing Page) */}
  <button 
    onClick={() => navigate('/')} // O window.location.href = '/' si usas navegación nativa
    className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-white/80 hover:text-white bg-slate-900/60 hover:bg-slate-900/80 border border-white/15 px-4 py-2.5 rounded-2xl backdrop-blur-md transition-all shadow-lg shadow-black/20 cursor-pointer z-20 group"
  >
    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
    </svg>
    <span>Volver al Inicio</span>
  </button>
      {/* Capa de superposición oscura profesional con gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/85 to-blue-950/70 backdrop-blur-sm"></div>

      {/* Tarjeta Glassmorphism de Alta Gama */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center mx-4">
        
        {/* LOGO SERVITEK ESTILIZADO */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-600/30 flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-wider text-white">
            SERVITEK
          </span>
        </div>

        <div className="w-full">
          {view === 'login' ? (
            /* --- VISTA 1: FORMULARIO DE LOGIN NORMAL --- */
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Acceso al Personal</h2>
                <p className="text-slate-300 text-xs sm:text-sm font-medium">Panel exclusivo para trabajadores y administradores</p>
              </div>

              <form onSubmit={handleLoginTrabajador} className="space-y-5">
                
                {error && (
                  <div className="bg-red-500/15 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs sm:text-sm text-center flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Correo Institucional</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="ejemplo@servitek.com" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/15 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                      required
                      autoComplete="nope" 
                      name="trabajador_usuario_aleatorio"
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Contraseña</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      name="trabajador_password_aleatorio"
                      placeholder="••••••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/15 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                      required
                      autoComplete="new-password"
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 mt-2 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">Verificando...</span>
                  ) : (
                    <>
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* --- VISTA 2: FORMULARIO PRIMER INGRESO (INTERNO) --- */
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Seguridad Requerida</h2>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200/90 p-4 rounded-2xl text-xs text-left mb-6 leading-relaxed shadow-inner">
                Por medidas de seguridad institucionales, <b>es obligatorio cambiar la contraseña temporal</b> proporcionada en tu primer inicio de sesión.
              </div>

              <form onSubmit={handleCambiarClaveTemporal} className="space-y-5">
                
                {error && (
                  <div className="bg-red-500/15 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs sm:text-sm text-center flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      placeholder="Escribe tu nueva contraseña segura" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/15 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                      required
                    />
                    <div className="absolute left-3.5 top-3.5 text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-amber-600/30 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 pt-4 border-t border-white/10 text-center text-xs text-slate-400 font-medium">
            Servitek — Módulo Interno de Personal
          </div>
        </div>

      </div>
    </div>
  );
}