import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'react-qr-code';
import Header from '../components/Header';
import QRModal from '../components/QRModal';

import { toast } from 'react-toastify';
import { NotificacionesCampana } from '../components/NotificacionesCampana';
export default function Dashboard() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
const [errorMessage, setErrorMessage] = useState(''); 
  // Estados para el Modal de Técnico
  const [showTechModal, setShowTechModal] = useState(false);
  const [techForm, setTechForm] = useState({
    nombre_completo: '', especialidad: '', email: '', password: ''
  });
  const [editingTechId, setEditingTechId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, techId: null });
 const API_URL = import.meta.env.VITE_API_URL;
 const [userId, setUserId] = useState(null); // 👈 Añade este estado si no lo tienes
  const [servicios, setServicios] = useState([]);
  const [selectedServicio, setSelectedServicio] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState("Listo para entrega");
  const [busqueda, setBusqueda] = useState("");
  // Estados para Modal de Servicio (Cliente)
  const [showServicioModal, setShowServicioModal] = useState(false);
  const [qrModalCode, setQrModalCode] = useState(null);
  const [servicioForm, setServicioForm] = useState({
    marca: '', modelo: '', numero_serie: '', accesorios: '', falla: ''
  });
  const [servicioLoading, setServicioLoading] = useState(false);

  // Estados para Diagnostico (Técnico)
  const [diagForm, setDiagForm] = useState({
    falla_encontrada: '', actividades_realizadas: '', observaciones: ''
  });
  const [diagLoading, setDiagLoading] = useState(false);
// Nuevos estados para las funciones del cliente
const [selectedServicioModal, setSelectedServicioModal] = useState(null); // Ver detalles de la orden
const [showPerfilModal, setShowPerfilModal] = useState(false); // Editar perfil
const [perfilForm, setPerfilForm] = useState({ nombre_completo: '', telefono: '', direccion: '' });
const [perfilLoading, setPerfilLoading] = useState(false);
const [listaFotos, setListaFotos] = useState([]);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      setUserRole(decoded.rol || '');
      setUserEmail(decoded.sub || '');
      
      if (decoded.rol === 'admin') {
        fetchAdminData();
      } else if (decoded.rol === 'cliente') {
        fetchClientData(decoded.sub);
      } else if (decoded.rol === 'tecnico') {
        fetchTechData(decoded.sub);
      }
    } catch (e) {
      console.error("Token invalido", e);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const fetchTechData = async (email) => {
    try {
      const resUsuarios = await axios.get(`${API_URL}/usuarios/tecnicos`);
      const tecnicoAuth = resUsuarios.data.find(t => t.usuario?.email === email);
      
      const resServicios = await axios.get(`${API_URL}/servicios`);
      if (tecnicoAuth) {
        const misServicios = resServicios.data.filter(s => s.tecnico_id === tecnicoAuth.id);
        setServicios(misServicios);
      } else {
        setServicios(resServicios.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClientData = async (email) => {
  try {
    // Asegúrate de que la ruta coincida con tu backend (ej. /servicios/cliente/... o con prefijo si lo lleva)
    const response = await axios.get(`${API_URL}/api/servicios/cliente/${email}`);
    setServicios(response.data); // O el estado donde guardes los equipos/servicios
  } catch (err) {
    console.error("Error al cargar los servicios del cliente:", err);
  }
};
const fetchPerfilCliente = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/usuarios/perfil/${userEmail}`);
    setPerfilForm({
      nombre_completo: res.data.nombre_completo || '',
      telefono: res.data.telefono || '',
      direccion: res.data.direccion || ''
    });
    setShowPerfilModal(true);
  } catch (error) {
    console.error(error);
    toast.error("Error al obtener datos del perfil");
  }
};
const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setPerfilLoading(true);
    try {
      await axios.put(`${API_URL}/api/usuarios/perfil/${userEmail}`, perfilForm);
      toast.success("Perfil actualizado correctamente");
      setShowPerfilModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setPerfilLoading(false);
    }
  };
  const handleUpdateService = async (estadoStr) => {
    if (!selectedServicio) return;
    try {
      await axios.put(`${API_URL}/api/servicios/${selectedServicio.id}?estado=${estadoStr}`);
      setSelectedServicio({...selectedServicio, estado: estadoStr});
      setServicios(servicios.map(s => s.id === selectedServicio.id ? {...s, estado: estadoStr} : s));
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar estado");
    }
  };

 const handleSolicitarServicio = async (e) => {
  e.preventDefault();

  if (servicioLoading) return;
  setServicioLoading(true);
  setErrorMessage(''); // Limpiamos errores anteriores al intentar de nuevo

  try {
   const payload = {
      email: userEmail,
      falla: servicioForm.falla,  // <--- Coincide con SolicitudServicio.falla
      equipo: { 
        marca: servicioForm.marca, 
        modelo: servicioForm.modelo, 
        numero_serie: servicioForm.numero_serie, 
        accesorios: servicioForm.accesorios 
      }
       };
    
    await axios.post(`${API_URL}/api/servicios/solicitar`, payload);
    setShowServicioModal(false);
    setServicioForm({ marca: '', modelo: '', numero_serie: '', accesorios: '', falla: '' });
    fetchClientData(userEmail); 
window.location.reload();
  } catch (error) {
    console.error("Detalle del error del backend:", error.response?.data);
    
    if (error.response && error.response.status === 400) {
      // Esto mostrará el mensaje exacto de Pydantic en pantalla o consola
      const detalle = error.response.data.detail;
      setErrorMessage(typeof detalle === 'object' ? JSON.stringify(detalle) : detalle); 
    } else {
      setErrorMessage("Ocurrió un error inesperado al solicitar el servicio.");
    }} finally {
    setServicioLoading(false);
  }
};
  const handleSaveDiagnostico = async () => {
    if (!selectedServicio) return;
    setDiagLoading(true);
    try {
      await axios.post(`${API_URL}/servicios/${selectedServicio.id}/diagnostico`, diagForm);
      toast.success("Diagnóstico guardado exitosamente");
      setSelectedServicio(prev => ({
        ...prev,
        diagnostico: { ...diagForm }
      }));
      setServicios(prev => prev.map(s => 
        s.id === selectedServicio.id 
          ? { ...s, diagnostico: { ...diagForm } } 
          : s
      ));
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar diagnóstico");
    } finally {
      setDiagLoading(false);
    }
  };
  const handleCancelTicket = async (servicioId) => {
    if (!window.confirm("¿Está seguro que desea anular este ticket? Esta acción no se puede deshacer.")) return;
    try {
      await axios.put(`${API_URL}/api/servicios/${servicioId}/cancelar`);
      toast.success("Servicio cancelado exitosamente");
      fetchClientData(userEmail);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Error al cancelar el ticket");
    }
  };

  const fetchAdminData = async () => {
    try {
      const resClientes = await axios.get(`${API_URL}/usuarios/clientes`);
      setClientes(resClientes.data);
      
      const resTecnicos = await axios.get(`${API_URL}/usuarios/tecnicos`);
      setTecnicos(resTecnicos.data);

      const resServicios = await axios.get(`${API_URL}/servicios`);
      setServicios(resServicios.data);
    } catch (error) {
      console.error("Error cargando datos", error);
    }
  };

  const handleAssignTech = async (servicioId, techId) => {
    try {
      await axios.put(`${API_URL}/servicios/${servicioId}/asignar`, { tecnico_id: techId === '' ? null : parseInt(techId) });
      fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Error al asignar técnico");
    }
  };

  const handleAgregarTecnico = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      if (editingTechId) {
        await axios.put(`${API_URL}/usuarios/tecnico/${editingTechId}`, {
          nombre_completo: techForm.nombre_completo,
          especialidad: techForm.especialidad
        });
      } else {
        await axios.post(`${API_URL}/usuarios/tecnico`, {
          usuario: { email: techForm.email, password: techForm.password, rol: 'tecnico' },
          tecnico: { nombre_completo: techForm.nombre_completo, especialidad: techForm.especialidad }
        });
      }
      
      setShowTechModal(false);
      setTechForm({ nombre_completo: '', especialidad: '', email: '', password: '' });
      setEditingTechId(null);
      fetchAdminData();
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail;
      let errorMsg = 'Error al guardar técnico';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map(d => `${d.loc[d.loc.length-1]}: ${d.msg}`).join(', ');
      }
      setModalError(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleEliminarTecnico = (id) => {
    setConfirmModal({ isOpen: true, techId: id });
  };

  const confirmEliminarTecnico = async () => {
    try {
      await axios.delete(`${API_URL}/usuarios/tecnico/${confirmModal.techId}`);
      fetchAdminData();
      setConfirmModal({ isOpen: false, techId: null });
    } catch (error) {
      console.error(error);
      toast.error('Error al inhabilitar técnico');
    }
  };
  
const handleReset = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.post(`${API_URL}/auth/reset-clave`, {
      email: username,          // Asegúrate de que esta variable tenga el correo del usuario
      codigo: parseInt(codigo), // El código de 6 dígitos de la consola
      nueva_password: nuevaPassword // La nueva contraseña escrita
    });
    
    toast.success("¡Contraseña actualizada con éxito!");
    setView('login'); // Regresar al login
  } catch (err) {
    setError(err.response?.data?.detail || 'Error al restablecer la clave');
  }
};


// 🔍 2. LÓGICA DE FILTRADO (Colócala justo antes del return)
  const serviciosFiltrados = servicios.filter(s => {
    const textoBusqueda = busqueda.toLowerCase();
    const marcaModelo = typeof s.equipo === 'object' 
      ? `${s.equipo?.marca || ''} ${s.equipo?.modelo || ''}`.toLowerCase() 
      : String(s.equipo || '').toLowerCase();

    const coincideBusqueda = 
      s.codigo?.toLowerCase().includes(textoBusqueda) ||
      marcaModelo.includes(textoBusqueda) ||
      s.descripcion_falla?.toLowerCase().includes(textoBusqueda);

    const coincideEstado = filtroEstado === "TODOS" || s.estado?.toLowerCase() === filtroEstado.toLowerCase();

    return coincideBusqueda && coincideEstado;
  });
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative print:bg-white selection:bg-blue-600 selection:text-white">
      <Header 
  userId={userData.id}   // 👈 Asegúrate de que esto tenga el ID numérico del usuario logueado
  userRole="cliente" 
  userEmail={userEmail} 
/>

      <main className="flex-1 p-8 print:p-0">
        <div className="max-w-6xl mx-auto space-y-8 print:space-y-0">
          
          {userRole === 'cliente' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Bienvenido a tu Panel de Cliente</h2>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
                Aquí podrás registrar tu laptop para reparación y hacer seguimiento del estado del servicio en tiempo real.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3">
                <button 
                  onClick={() => setShowServicioModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  + Solicitar Nuevo Servicio
                </button>
                <button 
                  onClick={fetchPerfilCliente}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-5 py-3 rounded-xl font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-2"
                >
                  👤 Editar Datos
                </button>
              </div>

              <div className="mt-12 text-left">
                <h3 className="text-xl font-bold border-b border-gray-200 pb-3 mb-6 text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Tus Equipos y Servicios
                </h3>
                
                {/* 🔍 BARRA DE BÚSQUEDA Y FILTROS INTERACTIVOS */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/80 p-4 rounded-xl shadow-inner border border-gray-200">
                    
                    <div className="w-full md:w-1/3 relative">
                      <input 
                        type="text"
                        placeholder="Buscar por código (ej. OT-4737) o equipo..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full bg-white pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                      />
                      <span className="absolute left-3.5 top-3 text-gray-400">🔍</span>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                      {["TODOS", "Esperando aprobación", "Pendiente", "En reparación", "Listo para entrega", "Entregado"].map((estado) => {
                        const count = estado === "TODOS" 
                          ? servicios.length 
                          : servicios.filter(s => s.estado?.toLowerCase() === estado.toLowerCase()).length;

                        return (
                          <button
                            key={estado}
                            onClick={() => setFiltroEstado(estado)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                              filtroEstado === estado
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-700"
                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            <span>{estado}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${filtroEstado === estado ? "bg-blue-700 text-white" : "bg-gray-200 text-gray-800"}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {servicios.length === 0 ? (
                  <div className="bg-gray-50 p-8 rounded-xl text-center text-gray-500 border border-dashed border-gray-300">
                    Aún no tienes ningún equipo registrado. ¡Solicita tu primer servicio!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviciosFiltrados.length > 0 ? (
                      serviciosFiltrados.map(s => (
                        <div 
                          key={s.id} 
                          onClick={async () => {
                            setSelectedServicioModal(s);
                            try {
                              const resFotos = await axios.get(`${API_URL}/api/servicios/${s.id}/fotos`);
                              setListaFotos(resFotos.data);
                            } catch (error) {
                              setListaFotos([]);
                            }
                          }}
                          className="border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden bg-white hover:shadow-md transition cursor-pointer group"
                        >
                          <div className="absolute top-0 left-0 w-1.5 bottom-0 bg-blue-600 group-hover:bg-blue-700 transition"></div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-xs font-bold text-gray-500 block mb-1 font-mono">{s.codigo}</span>
                              <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold">{s.estado}</span>
                            </div>
                            <div 
                              className="bg-gray-50 p-1.5 rounded-xl cursor-pointer hover:bg-gray-100 transition border border-gray-200" 
                              title="Ampliar Código QR"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQrModalCode(s.codigo);
                              }}
                            >
                              <QRCode value={s.codigo} size={40} />
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-gray-900 text-lg mb-1.5 mt-2">
                            {typeof s.equipo === 'object' ? `${s.equipo?.marca || ''} ${s.equipo?.modelo || ''}` : s.equipo}
                          </h4>
                          
                          <p className="text-sm text-gray-600 line-clamp-2">Falla: {s.descripcion_falla}</p>
                          
                          {s.estado === 'Pendiente' && (
                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelTicket(s.id);
                                }}
                                className="text-red-600 text-xs font-bold hover:text-red-800 transition cursor-pointer flex items-center gap-1"
                              >
                                Anular Ticket
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm">No se encontraron equipos o servicios que coincidan con la búsqueda.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DETALLES DEL EQUIPO/SERVICIO (CLIENTE) */}
      {selectedServicioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto border border-gray-200">
            
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Orden: <span className="font-mono text-blue-600">{selectedServicioModal.codigo}</span>
              </h3>
              <span className="text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold">
                {selectedServicioModal.estado}
              </span>
            </div>

            {/* SECCIÓN DE EVIDENCIAS Y OBSERVACIONES TÉCNICAS */}
            {(selectedServicioModal.estado === 'Listo para entrega' || selectedServicioModal.estado === 'Entregado' || selectedServicioModal.observaciones_tecnicas || listaFotos.length > 0) && (
              <div className="mt-4 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3 text-left">
                <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span>✅</span> Cierre Técnico y Evidencias de Reparación
                </h4>

                <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1 shadow-xs">
                  <span className="block text-[11px] font-bold text-gray-600 uppercase">Observaciones del taller:</span>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {selectedServicioModal.observaciones_tecnicas || 
                     selectedServicioModal.observacion || 
                     "El equipo ha sido reparado con éxito y se encuentra verificado en banco de trabajo."}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-gray-600 uppercase mb-2">Evidencia Fotográfica del Taller:</span>
                  {Array.isArray(listaFotos) && listaFotos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {listaFotos.map((foto, index) => {
                        const rutaFoto = typeof foto === 'string' ? foto : (foto.url_foto || foto.url || foto.ruta || foto.imagen);
                        const urlCompleta = rutaFoto && rutaFoto.startsWith('http') 
                          ? rutaFoto 
                          : `${API_URL}/${rutaFoto ? rutaFoto.replace(/^\/+/, '') : ''}`;

                        return (
                          <div key={index} className="overflow-hidden rounded-xl border border-emerald-200 bg-white p-1 shadow-sm">
                            <img 
                              src={urlCompleta} 
                              alt={`Evidencia ${index + 1}`} 
                              className="w-full h-36 object-cover rounded-lg hover:scale-105 transition duration-300"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                      <p className="text-xs text-gray-400 italic">No hay archivos fotográficos adjuntos para esta orden.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Datos generales */}
            <div className="space-y-3 text-sm text-gray-600 text-left mt-4">
              <p>
                <strong className="text-gray-900">Equipo:</strong>{' '}
                {typeof selectedServicioModal.equipo === 'object' 
                  ? `${selectedServicioModal.equipo?.marca || ''} ${selectedServicioModal.equipo?.modelo || ''}` 
                  : (selectedServicioModal.equipo || selectedServicioModal.marca || 'No especificado')}
              </p>
              <p>
                <strong className="text-gray-900">N° de Serie:</strong>{' '}
                {selectedServicioModal.equipo?.numero_serie || selectedServicioModal.numero_serie || selectedServicioModal.n_serie || selectedServicioModal.serial || 'No especificado'}
              </p>
              <p>
                <strong className="text-gray-900">Accesorios:</strong>{' '}
                {selectedServicioModal.equipo?.accesorios || selectedServicioModal.accesorios || 'Ninguno'}
              </p>
              <p>
                <strong className="text-gray-900">Falla Reportada:</strong>{' '}
                {selectedServicioModal.descripcion_falla || selectedServicioModal.falla}
              </p>

              {/* Actividades */}
              <div className="mt-3">
                <span className="text-xs uppercase font-bold text-gray-700 block mb-1">Actividades a Realizar:</span>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
                  {Array.isArray(selectedServicioModal?.actividades) && selectedServicioModal.actividades.length > 0 ? (
                    selectedServicioModal.actividades.map((act, index) => (
                      <div key={index} className="flex justify-between border-b border-gray-200 pb-1 mb-1 last:border-0">
                        <span>{act.descripcion}</span>
                        <span className="font-semibold text-gray-900">S/. {act.costo || 0}.00</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic">No hay actividades registradas.</p>
                  )}
                </div>
              </div>

              {/* Repuestos */}
              <div className="mt-3">
                <span className="text-xs uppercase font-bold text-gray-700 block mb-1">Repuestos Requeridos:</span>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
                  {Array.isArray(selectedServicioModal?.repuestos) && selectedServicioModal.repuestos.length > 0 ? (
                    selectedServicioModal.repuestos.map((rep, index) => (
                      <div key={index} className="flex justify-between border-b border-gray-200 pb-1 mb-1 last:border-0">
                        <span>{rep.descripcion} (Cant: {rep.cantidad})</span>
                        <span className="font-semibold text-gray-900">S/. {rep.costo || 0}.00</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic">No hay repuestos requeridos.</p>
                  )}
                </div>
              </div>

              {/* Diagnóstico técnico */}
              {(selectedServicioModal.falla_encontrada || selectedServicioModal.diagnostico?.falla_encontrada) && (
                <div className="bg-blue-50 p-3 rounded-xl text-blue-900 border border-blue-200 mt-3">
                  <strong className="block text-xs uppercase text-blue-700 font-bold mb-1">Diagnóstico Técnico:</strong>
                  {selectedServicioModal.falla_encontrada || selectedServicioModal.diagnostico.falla_encontrada}
                </div>
              )}

              {/* Desglose de Costos */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-5 space-y-2">
                <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-2 text-xs uppercase tracking-wide">Desglose de Presupuesto</h4>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Costo Base / Revisión:</span>
                  <span>S/. 20.00</span>
                </div>
                <div className="flex justify-between text-gray-900 font-bold text-base pt-2 border-t border-gray-200">
                  <span>Costo Estimado Total:</span>
                  <span className="text-blue-600">
                    S/. {selectedServicioModal.costo_estimado > 0 ? selectedServicioModal.costo_estimado : 70}.00
                  </span>
                </div>
              </div>
            </div>

            {/* Pie del Modal: Botones de Acción */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2 justify-between items-center">
              <button 
                onClick={() => setSelectedServicioModal(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition cursor-pointer border border-gray-200"
              >
                Cerrar
              </button>

              {selectedServicioModal.estado === "Esperando aprobación" && (
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (window.confirm("¿Estás seguro de rechazar la cotización? Se aplicará el cobro de la tarifa de revisión de S/. 20.00.")) {
                        try {
                          await axios.put(`${API_URL}/api/servicios/${selectedServicioModal.id}/rechazar`);
                          toast.success("Cotización rechazada. Se aplicó el cobro de revisión de S/. 20.00.");
                          setSelectedServicioModal(null);
                          fetchServicios();
                        } catch (err) {
                          toast.error(err.response?.data?.detail || "Error al rechazar el servicio.");
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-xl text-sm transition cursor-pointer"
                  >
                    Rechazar (S/. 20)
                  </button>

                  <button 
                    onClick={async () => {
                      try {
                        await axios.put(`${API_URL}/api/servicios/${selectedServicioModal.id}/estado`, {
                          estado: "En reparación"
                        });
                        toast.success("¡Presupuesto aceptado con éxito!");
                        setSelectedServicioModal(null);
                        fetchServicios();
                      } catch (err) {
                        toast.error(err.response?.data?.detail || "Error al aceptar el servicio.");
                      }
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    Aceptar Presupuesto
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL EDITAR PERFIL CLIENTE */}
      {showPerfilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">Editar Datos Personales</h2>
            
            <form onSubmit={handleUpdatePerfil} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input 
                  type="text" required
                  value={perfilForm.nombre_completo}
                  onChange={e => setPerfilForm({...perfilForm, nombre_completo: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Teléfono</label>
                <input 
                  type="text" required
                  value={perfilForm.telefono}
                  onChange={e => setPerfilForm({...perfilForm, telefono: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Dirección</label>
                <input 
                  type="text"
                  value={perfilForm.direccion}
                  onChange={e => setPerfilForm({...perfilForm, direccion: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setShowPerfilModal(false)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={perfilLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-600/20 font-bold disabled:opacity-50 cursor-pointer"
                >
                  {perfilLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR SERVICIO (CLIENTE) */}
      {showServicioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 my-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">Registrar Laptop</h2>
            
            <form onSubmit={handleSolicitarServicio} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Marca</label>
                  <input 
                    type="text" required placeholder="Ej: HP"
                    value={servicioForm.marca}
                    onChange={e => setServicioForm({...servicioForm, marca: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Modelo</label>
                  <input 
                    type="text" required placeholder="Ej: Pavilion 15"
                    value={servicioForm.modelo}
                    onChange={e => setServicioForm({...servicioForm, modelo: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">N° de Serie (Opcional)</label>
                  <input 
                    type="text"
                    value={servicioForm.numero_serie}
                    onChange={e => setServicioForm({...servicioForm, numero_serie: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Accesorios</label>
                  <input 
                    type="text" placeholder="Ej: Cargador original"
                    value={servicioForm.accesorios}
                    onChange={e => setServicioForm({...servicioForm, accesorios: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Descripción de la falla</label>
                <textarea 
                  required rows="3"
                  value={servicioForm.falla}
                  onChange={e => setServicioForm({...servicioForm, falla: e.target.value})}
                  placeholder="Describe qué problema presenta tu equipo..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition"
                ></textarea>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold text-teal-900">Tarifa Base de Revisión</p>
                  <p className="text-xs text-teal-700">Se pagará al acercarse a dejar el equipo en el establecimiento</p>
                </div>
                <span className="text-lg font-extrabold text-teal-800">S/. 20.00</span>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs text-center">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setShowServicioModal(false)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={servicioLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition shadow-md shadow-blue-600/20 font-bold disabled:opacity-50 cursor-pointer"
                >
                  {servicioLoading ? 'Registrando...' : 'Solicitar Reparación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QRModal code={qrModalCode} onClose={() => setQrModalCode(null)} />
    </div>
  );
}
