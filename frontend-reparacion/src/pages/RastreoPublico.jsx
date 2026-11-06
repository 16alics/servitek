import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Calendar, ShieldAlert, LogIn, Camera, X, Wrench } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function RastreoPublico() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    
    setLoading(true);
    setError('');
    setResultado(null);
    
    try {
      const res = await axios.get(`${API_URL}/api/servicios/rastreo/${codigo.trim().toUpperCase()}`);
      setResultado(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se encontró ninguna orden con ese código. Por favor verifique e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función al escanear con éxito el QR
  const onScanSuccess = (decodedText) => {
    setCodigo(decodedText);
    setShowScanner(false);
    // Opcional: puedes disparar la búsqueda de inmediato al escanear
  };

  const iniciarEscanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      }, false);
      scanner.render(onScanSuccess, (error) => {
        // Errores de escaneo en tiempo real (se pueden ignorar de forma silenciosa)
      });
    }, 150);
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
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
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
              Ingresa tu código de servicio o escanea el código QR para verificar el estado actual de tu equipo en tiempo real.
            </p>
          </div>

          {/* FORMULARIO DE BÚSQUEDA CON BOTÓN DE CÁMARA */}
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

            {/* Botón para abrir la cámara / lector QR */}
            <button 
              type="button"
              onClick={iniciarEscanner}
              className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-4 py-3.5 rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-2 font-semibold shadow-lg cursor-pointer"
              title="Escanear Código QR"
            >
              <Camera className="w-5 h-5" />
              <span className="sm:hidden text-xs">Escanear QR</span>
            </button>

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

          {/* MODAL DEL ESCÁNER QR */}
          {showScanner && (
            <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-md border border-slate-800 shadow-2xl relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-400" /> Escanear Código QR
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setShowScanner(false)}
                    className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4 text-center">
                  Apunta con la cámara de tu dispositivo hacia el código QR impreso en tu recibo.
                </p>
                {/* Contenedor donde renderiza la librería html5-qrcode */}
                <div id="reader" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"></div>
              </div>
            </div>
          )}

          {/* RESULTADO DE LA BÚSQUEDA */}
          {resultado && (
            <div className="border-t border-slate-800 pt-8 mt-6 animate-fade-in space-y-6">
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

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" /> Fecha de Ingreso
                  </div>
                  <p className="font-medium text-slate-300 text-sm">
                    {resultado.fecha_ingreso ? new Date(resultado.fecha_ingreso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Falla Reportada</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{resultado.descripcion_falla}</p>
                </div>
              </div>

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
                  type="button"
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 flex-shrink-0 shadow-lg shadow-blue-600/20 cursor-pointer"
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