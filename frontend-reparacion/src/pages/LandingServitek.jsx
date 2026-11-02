import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Search, ShieldCheck, Clock, Cpu, CheckCircle2, UserCheck, ArrowRight, User } from 'lucide-react';
export default function LandingServitek() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      
      {/* 1. HEADER / NAVBAR */}
      <header className="w-full py-5 px-6 md:px-12 flex justify-between items-center border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/30">
            <Wrench className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SERVITEK
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/rastreo')} 
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors"
          >
            <Search className="w-4 h-4" /> Rastrear Equipo
          </button>
          <button
      onClick={() => navigate('/login')}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all shadow-sm cursor-pointer"
    >
      <User className="w-4 h-4 text-blue-400" />
      <span>Acceso Cliente</span>
    </button>
          <button 
            onClick={() => navigate('/login-trabajador')}
            className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" /> Acceso Personal
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION (PRINCIPAL) */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 tracking-wide uppercase">
          <ShieldCheck className="w-4 h-4" /> Taller Especializado en Reparación de Laptops y Equipos
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight max-w-4xl">
          Expertos en devolverle la vida a tus <span className="text-blue-500">equipos tecnológicos</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Diagnóstico profesional, mantenimiento preventivo y reparaciones avanzadas con garantía. Monitorea el estado de tu servicio en tiempo real.
        </p>

        {/* Botones de Acción Principal (CTA) */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <button 
            onClick={() => navigate('/rastreo')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-3 group text-base"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Rastrear mi Equipo
          </button>
          
          <a 
            href="#servicios"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 text-base"
          >
            Conocer Servicios
          </a>
        </div>
      </section>

      {/* 3. SECCIÓN DE SERVICIOS (LO QUE HACE LA EMPRESA) */}
      <section id="servicios" className="bg-slate-950/50 py-20 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">¿A qué nos dedicamos?</h2>
            <p className="text-slate-400">Brindamos soluciones técnicas integrales diseñadas para particulares y empresas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Servicio 1 */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Reparación de Laptops</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Solución de fallas en placas base, cambios de pantallas, teclados, conectores de carga y optimización general de hardware.
              </p>
            </div>

            {/* Servicio 2 */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Mantenimiento Preventivo</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Limpieza profunda de componentes, cambio de pasta térmica de alta gama y revisión de temperaturas para alargar la vida útil de tu equipo.
              </p>
            </div>

            {/* Servicio 3 */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Seguimiento en Línea</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sistema transparente donde puedes consultar el estado exacto de tu orden de servicio, costos y avances en tiempo real desde cualquier lugar.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SECCIÓN DE VENTAJAS / POR QUÉ ELEGIRNOS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Transparencia y profesionalismo en cada reparación</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              En Servitek combinamos experiencia técnica con herramientas de gestión modernas para ofrecerte diagnósticos precisos y tiempos de entrega rápidos.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Técnicos certificados en soporte y sistemas.</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Repuestos de alta calidad y garantía asegurada.</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Tickets digitales e impresión de comprobantes detallados.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-slate-800 border border-slate-700 p-8 rounded-3xl flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold mb-3">¿Eres parte del equipo?</h3>
            <p className="text-slate-400 text-sm mb-8">
              Ingresa al panel administrativo para gestionar recepciones, técnicos, repuestos y órdenes de taller.
            </p>
            <button 
              onClick={() => navigate('/login-trabajador')}
              className="bg-slate-900 hover:bg-slate-950 text-white font-semibold py-3 px-6 rounded-xl border border-slate-700 transition-all flex items-center gap-2 w-full justify-center"
            >
              Iniciar Sesión en Taller <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="w-full py-8 text-center text-xs text-slate-500 border-t border-slate-800 bg-slate-950">
        <p>&copy; {new Date().getFullYear()} Servitek. Todos los derechos reservados. | Sistema de Gestión de Talleres</p>
      </footer>

    </div>
  );
}