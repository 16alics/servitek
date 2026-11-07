import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Eye, EyeOff } from 'lucide-react';
export default function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login', 'recover', 'reset', 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const [recoverCode, setRecoverCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
const irARecuperacion = () => {
    setResetEmail('');
    setRecoverCode('');  
    setNewPassword('');
    setView('reset');
  };
  
const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // 🔒 Petición al endpoint exclusivo de clientes en FastAPI
      const response = await axios.post(`${API_URL}/auth/login-cliente`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const rol = response.data.rol; 
      const primerIngreso = response.data.primer_ingreso; 

      if (response.data.access_token) {
        // Guardamos las credenciales y datos temporales
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('userRole', rol);
        localStorage.setItem('tempEmail', username);

        // 🔍 Evaluamos si es su primer ingreso
        if (primerIngreso) {
          setView('primer_ingreso'); 
        } else {
          navigate('/Dashboard');
        }
      }

    } catch (err) {
      // 🎯 Aquí es donde se atrapa el mensaje que manda FastAPI (Ej: "Acceso denegado. Esta sección es única para clientes.")
      const mensajeBackend = err.response?.data?.detail || 'Error al iniciar sesión';
      setError(mensajeBackend);
    } finally {
      setIsLoading(false);
    }
  };

const handlePrimerIngreso = async (e) => {
  e.preventDefault();
  setError('');

  // 1. Validar que la nueva contraseña y su confirmación coincidan
  if (newPassword !== confirmNewPassword) {
    setError('Las nuevas contraseñas no coinciden.');
    return;
  }

  setIsLoading(true);

  try {
    // Obtenemos el correo guardado temporalmente
    const emailUsuario = localStorage.getItem('tempEmail') || username; 

    await axios.post(`${API_URL}/auth/cambiar-clave-primer-ingreso`, {
      email: emailUsuario,
      nueva_password: newPassword
    });

    // Mensaje de éxito y limpieza de datos temporales
    toast.success('Contraseña actualizada correctamente. Por favor inicia sesión de nuevo.');
    localStorage.removeItem('tempEmail');
    
    // Limpiamos los campos de texto
    setPassword('');
    setNewPassword('');
    if (typeof setConfirmNewPassword === 'function') {
      setConfirmNewPassword('');
    }

    // Cambiamos el estado de la vista para regresar al formulario de login
    setView('login'); 

  } catch (err) {
    setError(err.response?.data?.detail || 'Error al actualizar la contraseña');
  } finally {
    setIsLoading(false);
  }
};
  const handleRecover = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/recuperar-clave`, { email: username });
      setView('reset');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al solicitar recuperación');
    } finally {
      setIsLoading(false);
    }
  };

const handleReset = async (e) => {
  e.preventDefault();
  setError('');

  // 1. Validar que la nueva contraseña y su confirmación coincidan
  if (newPassword !== confirmNewPassword) {
    setError('Las nuevas contraseñas no coinciden.');
    return;
  }

  setIsLoading(true);

  // Payload exacto que espera FastAPI según tu esquema ResetRequest
  const datosAEnviar = {
    email: username.trim(),
    codigo: parseInt(recoverCode, 10),
    nueva_password: newPassword
  };

  console.log("Enviando a /reset-clave:", datosAEnviar);

  try {
    await axios.post(`${API_URL}/auth/reset-clave`, datosAEnviar);

    toast.success("¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión.");
    setView('login');
    setPassword('');
    setNewPassword('');
    setConfirmNewPassword(''); // Limpiamos también el campo de confirmación
    setRecoverCode('');
  } catch (err) {
    console.error("Error detallado del backend:", err.response?.data);
    setError(err.response?.data?.detail || 'Código inválido o expirado');
  } finally {
    setIsLoading(false);
  }
};
const handleRegister = async (e) => {
  e.preventDefault();
  setError('');

  // Validación de doble contraseña
  if (password !== confirmPassword) {
    setError('Las contraseñas no coinciden.');
    return;
  }

  setIsLoading(true);
  try {
    const payload = {
      usuario: { 
        email: username, 
        password: password, 
        rol: 'cliente' 
      },
      cliente: {
        nombre_completo: nombre,
        documento_identidad: documento,
        telefono: telefono,
        direccion: ''
      }
    };

    // 1. Petición de registro en el backend
    await axios.post(`${API_URL}/api/clientes/registro`, payload);

    // 2. Auto-login después de un registro exitoso
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const loginResponse = await axios.post(`${API_URL}/auth/login-cliente`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (loginResponse.data.access_token) {
      localStorage.setItem('token', loginResponse.data.access_token);
      toast.success('¡Cuenta creada e iniciada con éxito!');
      navigate('/dashboard');
    }

  } catch (err) {
    const detail = err.response?.data?.detail;
    let errorMsg = 'Error al registrar el usuario';

    // Parseo inteligente de errores (maneja strings y arreglos de validación de Pydantic)
    if (typeof detail === 'string') {
      errorMsg = detail;
    } else if (Array.isArray(detail)) {
      errorMsg = detail.map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join(', ');
    }

    setError(errorMsg);
  } finally {
    setIsLoading(false);
  }
};
  return (
   <div 
  className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat w-full bg-black/60 bg-blend-overlay px-4 relative"
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

  {/* Glassmorphism Card con diseño mejorado y sutil resplandor */}
  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/15 p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 flex flex-col items-center ring-1 ring-white/10 shadow-blue-900/20">
    
    {/* Logo */}
    <img src="/servicio tecnico.png" alt="Servicio Técnico Logo" className="w-56 h-auto object-contain mb-6 drop-shadow-md" />

    {view === 'login' && (
      <div className="w-full">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 text-center tracking-tight">Iniciar sesión</h2>
        <p className="text-slate-300 text-xs sm:text-sm mb-6 text-center font-medium">Bienvenido de nuevo, por favor ingresa a tu cuenta</p>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs sm:text-sm text-center backdrop-blur-md animate-fade-in">
              {error}
            </div>
          )}

          <div className="relative">
            <input 
              type="text" 
              name="input_usuario_aleatorio_123"
              placeholder="Nombre de usuario" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
              required
              autoComplete="off"
            />
            <div className="absolute right-4 top-3.5 text-white/50 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>

          {/* Campo de contraseña estético con botón interactivo */}
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              name="input_password_aleatorio_456"
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
              required
              autoComplete="new-password"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-white/60 hover:text-white transition-colors cursor-pointer focus:outline-none"
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm pt-1">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-slate-950/50 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer accent-blue-600"
              />
              <label htmlFor="remember" className="ml-2 text-slate-300 cursor-pointer select-none font-medium">
                Recuérdame
              </label>
            </div>
            <button type="button" onClick={() => setView('recover')} className="text-slate-300 hover:text-white transition-colors text-left sm:text-right font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 mt-2 border border-blue-400/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs sm:text-sm text-slate-300">
          ¿No tienes una cuenta? <button type="button" onClick={() => setView('register')} className="font-bold text-white hover:underline transition-colors ml-1">Regístrate</button>
        </div>
        
        <div className="mt-5 text-center text-[11px] text-white/40 tracking-wider uppercase font-medium">
          Creado por el equipo 4 integrador II
        </div>
      </div>
    )}

    {view === 'primer_ingreso' && (
      <div className="w-full">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 text-center">¡Bienvenido!</h2>
        <div className="bg-orange-500/20 border border-orange-500/40 text-orange-200 p-4 rounded-xl text-xs sm:text-sm text-center mb-6 backdrop-blur-md leading-relaxed">
          Por medidas de seguridad institucionales, <b className="text-white">es obligatorio cambiar la contraseña temporal</b> que se te ha proporcionado en tu primer inicio de sesión.
        </div>

        <form onSubmit={handlePrimerIngreso} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs sm:text-sm text-center">
              {error}
            </div>
          )}

          <div className="relative">
            <input 
              type="password" 
              placeholder="Escribe tu nueva contraseña" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-orange-400 transition-all shadow-inner"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-600/30 mt-2 border border-orange-400/30 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>
      </div>
    )}

    {view === 'recover' && (
      <div className="w-full">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 text-center">Recuperar</h2>
        <p className="text-slate-300 text-xs sm:text-sm mb-6 text-center">Ingresa tu usuario o correo para enviarte un código</p>

        <form onSubmit={handleRecover} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs sm:text-sm text-center">
              {error}
            </div>
          )}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Usuario o Correo" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 border border-blue-400/20 cursor-pointer"
          >
            Enviar Código
          </button>
          
          <button 
            type="button" 
            onClick={() => setView('login')}
            className="w-full text-slate-300 hover:text-white text-xs sm:text-sm py-2 transition-colors font-medium cursor-pointer"
          >
            Volver al Login
          </button>
        </form>
      </div>
    )}

    {view === 'reset' && (
      <div className="w-full">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 text-center">Nueva clave</h2>
        <p className="text-slate-300 text-xs sm:text-sm mb-6 text-center">Ingresa tu correo, el código recibido y tu nueva contraseña</p>

        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs sm:text-sm text-center">
              {error}
            </div>
          )}

          <div className="relative">
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="text" 
              name="codigo_recuperacion_aleatorio_123"
              placeholder="Código de recuperación" 
              value={recoverCode}
              onChange={(e) => setRecoverCode(e.target.value)}
              autoComplete="one-time-code"
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all tracking-widest text-center shadow-inner font-mono font-bold"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="password" 
              placeholder="Nueva contraseña" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="off"
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 border border-blue-400/20 cursor-pointer"
          >
            Cambiar Contraseña
          </button>
          
          <button 
            type="button" 
            onClick={() => setView('login')}
            className="w-full text-slate-300 hover:text-white text-xs sm:text-sm py-2 transition-colors font-medium cursor-pointer"
          >
            Volver al Login
          </button>
        </form>
      </div>
    )}

    {view === 'register' && (
      <div className="w-full">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 text-center">Registro de Cliente</h2>
        <p className="text-slate-300 text-xs sm:text-sm mb-6 text-center">Crea tu cuenta para registrar equipos y solicitar servicios</p>

        <form onSubmit={handleRegister} className="space-y-3.5">
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs sm:text-sm text-center">
              <div>{error}</div>
              {error.toLowerCase().includes('registrado') && (
                <button 
                  type="button"
                  onClick={() => setView('recover')}
                  className="mt-2 text-white font-bold underline hover:text-blue-300 block w-full text-center transition-colors cursor-pointer"
                >
                  ¿Ya tienes cuenta y olvidaste tu clave? Recupérala aquí
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <input 
              type="text" 
              placeholder="Nombre completo" 
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Documento de Identidad (DNI/Cédula)" 
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Teléfono" 
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>

          <div className="relative">
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 transition-all shadow-inner"
              required
            />
          </div>
<div>
  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirmar Contraseña</label>
  <input 
    type="password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    placeholder="••••••••"
    className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3.5 py-3 rounded-xl focus:outline-none focus:border-blue-500"
    required
  />
</div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 mt-2 border border-blue-400/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
          
          <button 
            type="button" 
            onClick={() => setView('login')}
            className="w-full text-slate-300 hover:text-white text-xs sm:text-sm py-2 transition-colors font-medium cursor-pointer"
          >
            ¿Ya tienes una cuenta? Iniciar sesión
          </button>
        </form>
      </div>
    )}

  </div>
</div>
  );
}
