import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Header from '../components/Header';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import { toast } from 'react-toastify';
const ClientesAdmin = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

useEffect(() => {
    const fetchClientesDetallados = async () => {
      try {
        setLoading(true);
        // Asegúrate de que esta ruta devuelva el JSON con clientes, equipos y servicios anidados
        const response = await axios.get('${API_URL}/api/usuarios/clientes/detallado'); 
        
        // Si tu endpoint es /api/usuarios/clientes y lo modificaste para que traiga los equipos:
        setClientes(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error al cargar el directorio detallado de clientes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientesDetallados();
  }, []);
 return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative print:bg-white">
  <Header 
    customTitle="Gestión Detallada de Clientes"
    onBack={() => navigate('/admin/dashboard')}
  />

  <main className="flex-1 p-8 print:p-0">
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-end mb-6 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition border border-transparent cursor-pointer active:scale-95"
        >
          Imprimir Directorio
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 text-xs italic mt-20">Cargando clientes...</p>
      ) : clientes?.length === 0 ? (
        <p className="text-center text-gray-400 text-xs italic mt-20">No hay clientes registrados.</p>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 print:block print:space-y-6">
          {clientes.map(cliente => (
            <div 
              key={cliente.id} 
              className="break-inside-avoid bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between print:shadow-none print:border-b-2 print:border-black print:rounded-none print:page-break-inside-avoid"
            >
              <div>
                {/* Cabecera del Cliente */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h2 className="text-sm font-bold text-gray-900 truncate">{cliente.nombre_completo}</h2>
                  <p className="text-blue-600 font-bold text-xs truncate mt-0.5">{cliente.email}</p>
                  
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <p><span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Identidad:</span> <span className="font-medium text-gray-800">{cliente.documento_identidad || 'No registrado'}</span></p>
                    <p><span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Teléfono:</span> <span className="font-medium text-gray-800">{cliente.telefono || 'No registrado'}</span></p>
                    <p><span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Dirección:</span> <span className="font-medium text-gray-800">{cliente.direccion || 'No registrado'}</span></p>
                  </div>
                </div>

                {/* Sección de Equipos y Servicios en formato Acordeón */}
                <div className="mt-4 pt-2">
                  <details className="group">
                    <summary className="flex justify-between items-center font-bold cursor-pointer list-none text-xs text-gray-700 hover:text-blue-600 transition uppercase tracking-wider">
                      <span>Equipos y Servicios ({cliente.equipos?.length || 0})</span>
                      <span className="transition group-open:rotate-180 text-gray-400 text-[10px]">
                        ▼
                      </span>
                    </summary>
                    
                    <div className="mt-3 space-y-3">
                      {(!cliente.equipos || cliente.equipos.length === 0) ? (
                        <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl text-center border border-gray-200">Sin equipos registrados</p>
                      ) : (
                        cliente.equipos.map((eq, i) => (
                          <div key={i} className="bg-gray-50/80 rounded-xl border border-gray-200 p-3.5 print:bg-white print:border-gray-400">
                            <p className="font-bold text-xs text-gray-900 mb-2 border-b border-gray-200 pb-1.5 flex items-center justify-between">
                              <span>{eq.marca} {eq.modelo}</span>
                            </p>
                            
                            {(!eq.servicios || eq.servicios.length === 0) ? (
                              <p className="text-xs text-gray-400 italic">Sin servicios activos</p>
                            ) : (
                              <div className="space-y-2">
                                {eq.servicios.map((s, j) => (
                                  <div key={j} className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-xs border border-gray-200">
                                    <div>
                                      <p className="text-xs font-mono font-bold text-gray-900 mb-1">{s.codigo}</p>
                                      <span className="text-[10px] px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold uppercase tracking-wider rounded-full border border-blue-200 inline-block">
                                        {s.estado}
                                      </span>
                                    </div>
                                    <div>
                                      {s.codigo && <QRCode value={s.codigo} size={48} />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </main>
</div>
  );
};

export default ClientesAdmin;
