import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Wrench, Calendar, AlertCircle, LogIn, ShieldAlert } from 'lucide-react';

export default function RastreoPublico() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    
    setLoading(true);
    setError('');
    setResultado(null);
    
    try {
      const res = await axios.get(`http://localhost:8000/api/servicios/rastreo/${codigo.trim().toUpperCase()}`);
      setResultado(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se encontró ninguna orden con ese código. Por favor verifique e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (estado) => {
    switch(estado) {
      case 'Entregado': 
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Listo para entrega': 
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Reparado': 
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'En reparación': 
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'En diagnóstico': 
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default: 
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      
      {/* HEADER */}
      <header className="w-full py-5 px-6 md:px-12 flex justify-between items-center border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/30">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SERVITEK
          </span>
        </div>

        <button 
          onClick={() => navigate('/login-trabajador')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
        >
          Acceso Personal
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-white">Consulta tu Reparación</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Ingresa tu código de servicio para verificar el estado actual de tu equipo en tiempo real.
            </p>
          </div>

          {/* FORMULARIO DE BÚSQUEDA */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Ej. OT-8884"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-base rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block px-4 py-3.5 font-mono font-bold uppercase tracking-wider transition-all"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/30 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Buscando...
                </>
              ) : (
                'Rastrear'
              )}
            </button>
          </form>

          {/* MENSAJE DE ERROR */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-center text-sm flex items-center justify-center gap-2 mb-6 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* RESULTADO DE LA BÚSQUEDA */}
          {resultado && (
            <div className="border-t border-slate-800 pt-8 mt-6 animate-fade-in space-y-6">
              
              {/* Encabezado con Código y Estado */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Código de Servicio</span>
                  <span className="font-mono font-bold text-lg text-white">{resultado.codigo_servicio}</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Estado Actual</span>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${getStatusStyle(resultado.estado)}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                    {resultado.estado}
                  </span>
                </div>
              </div>

              {/* Detalles Informativos (Sin cliente, ocupando todo el ancho la fecha) */}
              <div className="grid grid-cols-1 gap-4">
                
                {/* Fecha de Ingreso */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" /> Fecha de Ingreso
                  </div>
                  <p className="font-medium text-slate-300 text-sm">
                    {resultado.fecha_ingreso ? new Date(resultado.fecha_ingreso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>

                {/* Descripción de la Falla */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Falla Reportada</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{resultado.descripcion_falla}</p>
                </div>

              </div>

              {/* BANNER INFORMATIVO PARA INICIAR SESIÓN */}
              <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">¿Necesitas más información o detalles de tu pedido?</h4>
                    <p className="text-slate-400 text-xs mt-0.5">Accede a tu cuenta para ver historiales, costos y reportes completos.</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 flex-shrink-0 shadow-lg shadow-blue-600/20"
                >
                  <LogIn className="w-4 h-4" /> Iniciar Sesión
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-800 bg-slate-950">
        <p>&copy; {new Date().getFullYear()} Servitek. Consulta pública respaldada por el sistema de gestión.</p>
      </footer>

    </div>
  );
}