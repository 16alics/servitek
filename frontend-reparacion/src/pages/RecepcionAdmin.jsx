import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from "../components/Header";
import { 
  Search, 
  UserPlus, 
  Laptop, 
  CheckCircle, 
  UserCheck, 
  AlertCircle, 
  ArrowLeft, 
  Wrench, 
  Shield, 
  PackageCheck,
  ShieldCheck,
  CheckSquare 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function Recepcion() {
  const navigate = useNavigate();
  const [dniBusqueda, setDniBusqueda] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [serviciosListos, setServiciosListos] = useState([]);
  const [selectedServicio, setSelectedServicio] = useState(null);
  
  // Estados para la gestión de impresión y datos temporales del ticket
  const [tipoTicketImpresion, setTipoTicketImpresion] = useState('INGRESO'); // 'INGRESO' o 'SALIDA'
  const [datosTicketImpresion, setDatosTicketImpresion] = useState(null);

  // Estados para Validar Laptop (Pre-registro Web)
  const [showModalValidarWeb, setShowModalValidarWeb] = useState(false);
  const [dniValidarWeb, setDniValidarWeb] = useState('');

  // Estados para la paginación y filtrado de pendientes
  const [equiposPendientes, setEquiposPendientes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Lista de técnicos y estados de clientes/modales
  const [tecnicos, setTecnicos] = useState([]);
  
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    dni: '',
    telefono: '',
    email: ''
  });
  
  const [showModalNuevoCliente, setShowModalNuevoCliente] = useState(false);


  // Función para abrir WhatsApp Web con mensaje prearmado sin costo
  const enviarWhatsAppGratis = (telefono, mensaje) => {
    if (!telefono) {
      console.log("El cliente no tiene teléfono registrado para WhatsApp.");
      return;
    }
    const telefonoLimpios = telefono.replace(/\D/g, '');
    const numeroConCodigo = telefonoLimpios.startsWith('51') ? telefonoLimpios : `51${telefonoLimpios}`;
    
    const url = `https://wa.me/${numeroConCodigo}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // Función global para disparar la impresión del ticket térmico
  const dispararImpresionTicket = (tipo, datos) => {
    setTipoTicketImpresion(tipo);
    setDatosTicketImpresion(datos);
    
    // Damos un pequeño respiro para que React actualice el DOM antes de imprimir
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Formulario para nuevo ticket principal
  const [formDataTicket, setFormDataTicket] = useState({
    id: null,
    tipoEquipo: 'Laptop',
    marcaModelo: '',
    numeroSerie: '',
    fallaReportada: '',
    tecnicoId: '',
    prioridad: 'Media'
  });

  // Mensajes de éxito/error
  const [mensaje, setMensaje] = useState(null);

  // Cargar técnicos reales y servicios listos al montar el componente
  useEffect(() => {
    const obtenerTecnicos = async () => {
      try {
        const response = await axios.get('https://servitek.vercel.app/api/usuarios/');
        const tecnicosFiltrados = response.data.filter(
          u => u.rol && u.rol.toLowerCase() === 'tecnico'
        );
        setTecnicos(tecnicosFiltrados);
      } catch (error) {
        console.error("Error al obtener los técnicos:", error);
      }
    };
    obtenerTecnicos();
    cargarServiciosListos();
  }, []);

  const cargarServiciosListos = async () => {
    try {
      const response = await axios.get('https://servitek.vercel.app/api/servicios/?estado=listo para entrega');
      
      const serviciosMapeados = response.data.map(serv => {
        // Extraemos de forma segura tanto si viene plano como si viene dentro de 'equipo'
        const marcaVal = serv.marca || serv.equipo?.marca || "";
        const modeloVal = serv.modelo || serv.equipo?.modelo || "";
        
        return {
          id: serv.id || serv.orden_id,
          codigo: serv.codigo || serv.codigo_servicio || `OT-${serv.id || serv.orden_id}`,
          estado: serv.estado,
          tipo_equipo: serv.tipo_equipo || serv.equipo?.tipo_equipo || "Equipo",
          marca_modelo: `${marcaVal} ${modeloVal}`.trim() || "Sin modelo",
          descripcion_falla: serv.descripcion_falla || serv.diagnostico?.descripcion_falla || "Sin especificar",
          
          // Leemos el nombre de donde lo está mandando actualmente el JSON
          cliente_nombre: serv.cliente_nombre || serv.cliente?.nombre_completo || serv.equipo?.cliente_nombre || "Sin nombre",
          cliente_dni: serv.cliente_dni || serv.cliente?.documento_identidad || serv.equipo?.cliente_dni || "",
          
          cliente_correo: serv.cliente_correo || serv.cliente?.usuario?.cliente_correo || serv.cliente?.cliente_correo || serv.equipo?.cliente_correo || "correo@gmail.com",
          
          costo_final: serv.costo_final !== undefined ? serv.costo_final : (serv.diagnostico?.costo_final || null)
        };
      });

      const soloListos = serviciosMapeados.filter(serv => {
        const est = serv.estado ? String(serv.estado).toLowerCase().trim() : '';
        return est.includes('listo') || est === 'listo para entrega';
      });

      setServiciosListos(soloListos);
    } catch (error) {
      console.error("Error al cargar servicios listos:", error);
    }
  };

  const handleCerrarYEntregar = async () => {
    if (!selectedServicio) return;

    try {
      const response = await axios.put(`https://servitek.vercel.app/api/servicios/${selectedServicio.id}/estado`, {
        estado: "Entregado"
      });

      console.log("🔍 Datos devueltos por FastAPI:", response.data);
      console.log("🔍 selectedServicio en frontend:", selectedServicio);

      const dataServicio = response.data.servicio || {};

      // Unificamos la falla buscando en todas las fuentes y nombres posibles
      const fallaUnificada = dataServicio.falla || dataServicio.descripcion_falla || dataServicio.falla_reportada || selectedServicio.falla || selectedServicio.descripcion_falla || selectedServicio.falla_reportada || selectedServicio.equipo?.falla || 'No especificada';
      
      // Unificamos el costo buscando en todas las fuentes posibles
      const costoUnificado = dataServicio.costo_final ?? dataServicio.costo_total ?? dataServicio.costo_estimado ?? selectedServicio.costo_final ?? selectedServicio.costo_total ?? selectedServicio.costo_estimado ?? 0.00;

      // Fusionamos y duplicamos las propiedades para que el ticket las lea sí o sí
      const servicioParaImprimir = {
        ...selectedServicio,
        ...dataServicio,
        falla: fallaUnificada,
        descripcion_falla: fallaUnificada,
        falla_reportada: fallaUnificada,
        costo_final: costoUnificado,
        costo_total: costoUnificado,
        costo_estimado: costoUnificado
      };

      dispararImpresionTicket('SALIDA', servicioParaImprimir);

      const nombreCliente = selectedServicio.cliente_nombre || dataServicio.cliente_nombre || "Cliente";
      const telefonoCliente = selectedServicio.cliente_telefono || dataServicio.cliente_telefono || "";
      
      const mensajeWp = `Hola ${nombreCliente}! Te escribimos de Servitek. Tu equipo ha sido entregado con éxito. ¡Gracias por confiar en nosotros! 🛠️✨`;
      enviarWhatsAppGratis(telefonoCliente, mensajeWp);

      toast.success(`¡Orden #${selectedServicio.id} finalizada y entregada con éxito!`);
      setSelectedServicio(null);
      cargarServiciosListos();
    } catch (error) {
      console.error("Error al cerrar la orden:", error);
      toast.error("Hubo un error al cerrar y entregar la orden.");
    }
  };

  // Función para buscar los equipos pendientes por DNI en el backend
  const handleBuscarPendientesWeb = async (e) => {
    e.preventDefault();
    if (!dniValidarWeb.trim()) return;

    try {
      setCargando(true);
      const response = await axios.get(`https://servitek.vercel.app/api/servicios/recepcion/pendientes/${dniValidarWeb.trim()}`);
      
      if (response.data.length === 0) {
        toast.success("No se encontraron solicitudes pendientes para este DNI.");
        setEquiposPendientes([]);
        return;
      }

      setEquiposPendientes(response.data);
      setCurrentIndex(0);
      setShowModalValidarWeb(true);

    } catch (error) {
      console.error(error);
      toast.error("Error al buscar las solicitudes pendientes.");
    } finally {
      setCargando(false);
    }
  };

  const handleCargarAlFormulario = (equipoSeleccionado) => {
    setFormDataTicket(prev => ({
      ...prev,
      id: equipoSeleccionado.id || equipoSeleccionado.servicio_id,
      tipoEquipo: 'Laptop',
      marcaModelo: `${equipoSeleccionado.marca} ${equipoSeleccionado.modelo}`,
      numeroSerie: equipoSeleccionado.numero_serie || '',
      fallaReportada: equipoSeleccionado.descripcion_falla || ''
    }));

    setClienteEncontrado(equipoSeleccionado.cliente || { id: equipoSeleccionado.cliente_id }); 
    setShowModalValidarWeb(false);
    setDniValidarWeb('');
  };

  const handleBuscarCliente = async (e) => {
    e.preventDefault();
    if (!dniBusqueda.trim()) return;

    setCargando(true);
    setBusquedaRealizada(true);
    setMensaje(null);

    try {
      const response = await axios.get(`https://servitek.vercel.app/api/servicios/clientes/buscar/${dniBusqueda.trim()}`);
      setClienteEncontrado(response.data);
    } catch (error) {
      setClienteEncontrado(null);
    } finally {
      setCargando(false);
    }
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.dni || cargando) return;

    setCargando(true);
    try {
      const response = await axios.post('https://servitek.vercel.app/api/usuarios/cliente', {
        usuario: {
          email: nuevoCliente.email,
          password: ""
        },
        cliente: {
          nombre_completo: nuevoCliente.nombre,
          documento_identidad: nuevoCliente.dni,
          telefono: nuevoCliente.telefono,
          direccion: "Sin dirección"
        }
      });

      setClienteEncontrado(response.data);
      setShowModalNuevoCliente(false);
      setMensaje({ tipo: 'exito', texto: '¡Cliente registrado con éxito en la base de datos!' });
      setNuevoCliente({ nombre: '', dni: '', telefono: '', email: '' });
    } catch (error) {
      console.error("Error al registrar cliente:", error);
      
      const detalleBackend = error.response?.data?.detail;
      let mensajeAmigable = 'Hubo un error al registrar el cliente en el servidor.';

      if (detalleBackend === "Email ya registrado" || detalleBackend?.includes("Email")) {
        mensajeAmigable = "El correo electrónico ya está registrado. Por favor, usa otro.";
      } else if (detalleBackend) {
        mensajeAmigable = detalleBackend;
      }

      setMensaje({ tipo: 'error', texto: mensajeAmigable });
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarAsignacion = async (e) => {
    e.preventDefault();
    try {
      const servicioId = formDataTicket.id; 
      const tecnicoId = formDataTicket.tecnicoId; 

      await axios.put(`https://servitek.vercel.app/api/servicios/${servicioId}/asignar-tecnico`, {
        tecnico_id: parseInt(tecnicoId)
      });

      toast.success("¡Servicio validado y pasado a Diagnóstico con éxito!");
      setFormDataTicket({});
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al asignar el técnico y actualizar el estado.");
    }
  };

  const handleGuardarTicket = async (e) => {
    e.preventDefault();
    if (!clienteEncontrado) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar o registrar un cliente antes de emitir la orden.' });
      return;
    }
    if (!formDataTicket.tecnicoId) {
      setMensaje({ tipo: 'error', texto: 'Por favor asigna un técnico responsable para esta orden.' });
      return;
    }

    try {
      const tecnicoAsignado = tecnicos.find(t => t.id === parseInt(formDataTicket.tecnicoId));
      let codigoGenerado = "OT-NUEVA";
      let resultadoData = null;

      if (formDataTicket.id !== null && formDataTicket.id !== undefined && formDataTicket.id !== '') {
        const res = await axios.put(`https://servitek.vercel.app/api/servicios/${formDataTicket.id}/asignar`, {
          tecnico_id: parseInt(formDataTicket.tecnicoId),
          estado: "Recibido",
          marca: formDataTicket.marcaModelo,
          numero_serie: formDataTicket.numeroSerie,
          descripcion_falla: formDataTicket.fallaReportada,
          prioridad: formDataTicket.prioridad
        });
        
        resultadoData = res.data;
        console.log("🔍 RESPUESTA PUT:", resultadoData);
        
        codigoGenerado = 
          resultadoData?.servicio?.codigo_servicio || 
          resultadoData?.codigo_servicio || 
          resultadoData?.codigo || 
          `OT-${formDataTicket.id}`;

        setMensaje({ 
          tipo: 'exito', 
          texto: `¡Orden asignada correctamente al técnico ${tecnicoAsignado?.nombre_completo || 'asignado'}!` 
        });

      } else {
        const res = await axios.post(`https://servitek.vercel.app/api/servicios/directo`, {
          cliente_id: clienteEncontrado.id,
          marca: formDataTicket.marcaModelo,
          modelo: "General", 
          numero_serie: formDataTicket.numeroSerie,
          accesorios: "",
          descripcion_falla: formDataTicket.fallaReportada,
          tecnico_id: parseInt(formDataTicket.tecnicoId),
          costo_estimado: 20.0
        });
        
        resultadoData = res.data;
        console.log("🔍 RESPUESTA POST DIRECTO:", resultadoData);
        
        codigoGenerado = 
          resultadoData?.servicio?.codigo_servicio || 
          resultadoData?.codigo_servicio || 
          resultadoData?.codigo || 
          (resultadoData?.servicio?.id ? `OT-${resultadoData.servicio.id}` : null) ||
          (resultadoData?.id ? `OT-${resultadoData.id}` : null) ||
          'OT-ERROR';

        setMensaje({ 
          tipo: 'exito', 
          texto: `¡Servicio directo registrado con código ${codigoGenerado}!` 
        });
      }

      dispararImpresionTicket('INGRESO', {
        codigo: codigoGenerado,
        cliente_nombre: clienteEncontrado.nombre_completo || clienteEncontrado.nombre,
        cliente_dni: clienteEncontrado.documento_identidad || clienteEncontrado.dni,
        marca_modelo: formDataTicket.marcaModelo,
        falla_reportada: formDataTicket.fallaReportada
      });

      setFormDataTicket({
        id: null,
        tipoEquipo: 'Laptop',
        marcaModelo: '',
        numeroSerie: '',
        fallaReportada: '',
        tecnicoId: '',
        prioridad: 'Media'
      });
      setClienteEncontrado(null);
      setBusquedaRealizada(false);
      setDniBusqueda('');

    } catch (error) {
      console.error("Error al guardar la orden:", error);
      setMensaje({ tipo: 'error', texto: 'Hubo un error al procesar la orden en el servidor.' });
    }
  };

 
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header Claro */}
      <Header userRole="recepcion" userEmail="recepcion@servitek.com" customTitle="Recepción y Taller">
        <form onSubmit={handleBuscarPendientesWeb} className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-xs">
          <input 
            type="text" 
            placeholder="DNI para validar web..." 
            value={dniValidarWeb}
            onChange={(e) => setDniValidarWeb(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 text-gray-800"
          />
          <button 
            type="submit" 
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition cursor-pointer"
          >
            <CheckSquare size={14} />
            Validar Web
          </button>
        </form>
      </Header>

      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {mensaje && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs ${
              mensaje.tipo === 'exito' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {mensaje.tipo === 'exito' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
              <span className="text-sm font-medium">{mensaje.texto}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMNA IZQUIERDA: Búsqueda de Clientes & Órdenes Listas */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Tarjeta de Búsqueda de Clientes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Search size={18} />
                  </div>
                  Búsqueda Rápida de Cliente
                </h2>

                <form onSubmit={handleBuscarCliente} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      N° DNI / Documento
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dniBusqueda}
                        onChange={(e) => setDniBusqueda(e.target.value)}
                        placeholder="Ingrese DNI o RUC..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm outline-none transition text-gray-900"
                      />
                      <button
                        type="submit"
                        disabled={cargando}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-600/20 cursor-pointer"
                      >
                        {cargando ? '...' : 'Buscar'}
                      </button>
                    </div>
                  </div>
                </form>

                {busquedaRealizada && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    {clienteEncontrado ? (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-1 rounded-lg">
                            Cliente Encontrado
                          </span>
                          <UserCheck size={18} className="text-emerald-700" />
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{clienteEncontrado?.nombre_completo || clienteEncontrado?.nombre}</p>
                        <p className="text-xs text-gray-600 mt-1">DNI/RUC: {clienteEncontrado?.documento_identidad || clienteEncontrado?.dni}</p>
                        <p className="text-xs text-gray-600">Teléfono: {clienteEncontrado?.telefono || 'No registrado'}</p>
                      </div>
                    ) : (
                      <div className="text-center py-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4">
                        <p className="text-xs text-gray-600 mb-3">No se encontró ningún cliente registrado con ese documento.</p>
                        <button
                          onClick={() => {
                            setNuevoCliente(prev => ({ ...prev, dni: dniBusqueda }));
                            setShowModalNuevoCliente(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
                        >
                          <UserPlus size={15} />
                          Registrar Nuevo Cliente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta de Equipos Listos para Entrega */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <PackageCheck size={18} />
                  </div>
                  Órdenes Pendientes de Entrega
                </h3>

                {serviciosListos.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-xl text-center border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No hay equipos listos para entrega en este momento.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {serviciosListos.map((serv) => (
                      <div 
                        key={serv.id} 
                        onClick={() => setSelectedServicio(serv)}
                        className={`p-4 border rounded-xl cursor-pointer transition text-left relative overflow-hidden ${
                          selectedServicio?.id === serv.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-mono font-bold text-blue-600">#{serv.codigo}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{serv.estado}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 mb-1">Equipo: {serv.tipo_equipo} {serv.marca_modelo}</p>
                        <p className="text-xs text-gray-600"><strong>Cliente:</strong> {serv.cliente_nombre}</p>
                        <p className="text-xs text-gray-600"><strong>Falla:</strong> {serv.descripcion_falla}</p>
                        <p className="text-xs font-semibold text-emerald-600 mt-1">Total: S/. {serv.costo_final || 0}.00</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedServicio && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
                    <p className="text-xs text-gray-600">Orden seleccionada: <strong className="font-mono text-gray-900">#{selectedServicio.codigo}</strong></p>
                    <button
                      onClick={handleCerrarYEntregar}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition text-xs cursor-pointer"
                    >
                      Cerrar y Finalizar Orden
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* COLUMNA DERECHA: Formulario de Registro / Asignación */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-200 pb-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Laptop size={20} />
                  </div>
                  Datos del Equipo y Asignación
                </h2>

                <form onSubmit={formDataTicket.id ? handleGuardarAsignacion : handleGuardarTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tipo de Equipo</label>
                      <select
                        value={formDataTicket.tipoEquipo}
                        onChange={(e) => setFormDataTicket({ ...formDataTicket, tipoEquipo: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-gray-900"
                      >
                        <option value="Laptop">Laptop</option>
                        <option value="Desktop">Computadora de Escritorio</option>
                        <option value="All-in-One">All-in-One</option>
                        <option value="Impresora">Impresora / Periférico</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Marca / Modelo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Lenovo ThinkPad X1"
                        value={formDataTicket.marcaModelo}
                        onChange={(e) => setFormDataTicket({ ...formDataTicket, marcaModelo: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">N° de Serie / ID Equipo</label>
                      <input
                        type="text"
                        placeholder="Ej. SN-8839210-X"
                        value={formDataTicket.numeroSerie}
                        onChange={(e) => setFormDataTicket({ ...formDataTicket, numeroSerie: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Costo Base de Revisión (S/.)</label>
                      <input 
                        type="number" 
                        value="20.00" 
                        disabled 
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl font-bold text-gray-600 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Falla / Motivo de Ingreso *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describa los síntomas reportados por el cliente..."
                      value={formDataTicket.fallaReportada}
                      onChange={(e) => setFormDataTicket({ ...formDataTicket, fallaReportada: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-gray-900"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Asignar Técnico Disponible *
                    </label>
                    <select
                      required
                      value={formDataTicket.tecnicoId}
                      onChange={(e) => setFormDataTicket({ ...formDataTicket, tecnicoId: e.target.value })}
                      className="w-full px-4 py-3 bg-blue-50/50 border border-blue-200 text-gray-900 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="">-- Seleccione un Técnico del Taller --</option>
                      {tecnicos.map((tec) => (
                        <option key={tec.id} value={tec.id} disabled={tec.activo === false}>
                          {tec.nombre_completo || tec.email || `Técnico ID: ${tec.id}`} {tec.activo === false ? '(Ocupado/Inactivo)' : '(Disponible)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 flex flex-col gap-2">
                    <button
                      type="submit"
                      className={`w-full py-3.5 text-xs text-white font-bold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                        formDataTicket.id ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                      }`}
                    >
                      <CheckCircle size={16} />
                      {formDataTicket.id ? "Asignar Técnico y Pasar a Diagnóstico" : "Registrar Orden Directa (Mostrador)"}
                    </button>

                    {formDataTicket.id && (
                      <button
                        type="button"
                        onClick={() => setFormDataTicket({ id: null, tipoEquipo: 'Laptop', marcaModelo: '', numeroSerie: '', fallaReportada: '', tecnicoId: '', prioridad: 'Media' })}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Cancelar selección web
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* --- MODAL DE VALIDACIÓN WEB --- */}
      {showModalValidarWeb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-xl font-bold text-gray-900">Validar Laptop desde Web</h3>
              {equiposPendientes.length > 0 && (
                <span className="text-xs px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold">
                  Pendiente {currentIndex + 1} de {equiposPendientes.length}
                </span>
              )}
            </div>

            {equiposPendientes.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No hay equipos pendientes para este DNI.
              </div>
            ) : (
              <div>
                <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-5 mb-5 shadow-xs space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                      {equiposPendientes[currentIndex].estado}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">Código: {equiposPendientes[currentIndex].codigo_servicio || equiposPendientes[currentIndex].codigo}</span>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    Equipo: {equiposPendientes[currentIndex].marca} {equiposPendientes[currentIndex].modelo}
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>N° de Serie:</strong> {equiposPendientes[currentIndex].numero_serie || 'No especificado'}
                  </p>



                  <p className="text-xs text-gray-600">
                    <strong>Accesorios:</strong> {equiposPendientes[currentIndex].accesorios || 'Ninguno'}
                  </p>
                  <p className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-blue-100 mt-2">
                    <strong>Falla:</strong> {equiposPendientes[currentIndex].descripcion_falla}
                  </p>
                </div>

                <div className="flex justify-between items-center mb-6 px-1">
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
                    disabled={currentIndex === 0}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold disabled:opacity-30 transition cursor-pointer border border-gray-200"
                  >
                    ← Anterior
                  </button>
                  <span className="text-[11px] text-gray-500 italic">Use las flechas para revisar cada equipo</span>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(prev + 1, equiposPendientes.length - 1))}
                    disabled={currentIndex === equiposPendientes.length - 1}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold disabled:opacity-30 transition cursor-pointer border border-gray-200"
                  >
                    Siguiente →
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => { setShowModalValidarWeb(false); setEquiposPendientes([]); }}
                    className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200 rounded-xl text-sm transition cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  {equiposPendientes.length > 0 && (
                    <button 
                      onClick={() => handleCargarAlFormulario(equiposPendientes[currentIndex])}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-600/20 transition cursor-pointer"
                    >
                      Cargar Datos al Formulario ✓
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL NUEVO CLIENTE --- */}
      {showModalNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">Registrar Nuevo Cliente</h3>
            <form onSubmit={handleCrearCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                  placeholder="Nombre completo *"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">DNI / RUC *</label>
                <input
                  type="text"
                  name="dni"
                  value={nuevoCliente.dni}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, dni: e.target.value })}
                  placeholder="DNI / RUC *"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                  placeholder="Teléfono"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  value={nuevoCliente.email}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                  placeholder="Correo electrónico"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModalNuevoCliente(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer transition"
                >
                  {cargando ? "Guardando..." : "Guardar en Base de Datos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- COMPONENTE OCULTO PARA IMPRESIÓN DE TICKETS TÉRMICOS (80mm) --- */}
      <div id="ticket-impresion" className="hidden print:block p-3 max-w-[280px] text-xs font-mono bg-white text-black leading-tight">
        <div className="text-center font-bold text-sm mb-1">SERVITEK TALLER</div>
        <div className="text-center text-[10px] mb-2">RUC: 20600000001 - Lima/Chiclayo</div>
        <p className="text-center">----------------------------------------</p>
        <p className="text-center font-bold uppercase">{tipoTicketImpresion === 'INGRESO' ? '*** TICKET DE INGRESO ***' : '*** CONSTANCIA DE SALIDA ***'}</p>
        <p className="text-center">----------------------------------------</p>
        <p><strong>N° Orden:</strong> {datosTicketImpresion?.codigo || selectedServicio?.codigo || 'OT-000'}</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleString()}</p>
        <p className="text-center">----------------------------------------</p>
        <p><strong>Cliente:</strong> {datosTicketImpresion?.cliente_nombre || selectedServicio?.cliente_nombre}</p>
        <p><strong>DNI/RUC:</strong> {datosTicketImpresion?.cliente_dni || selectedServicio?.cliente_dni}</p>
        <p><strong>Equipo:</strong> {datosTicketImpresion?.marca_modelo || selectedServicio?.marca_modelo}</p>
        <p><strong>Falla:</strong> {datosTicketImpresion?.falla_reportada || selectedServicio?.descripcion_falla || selectedServicio?.falla || 'No especificada'}</p>
        <p className="text-center">----------------------------------------</p>
        <p><strong>Costo Revisión Base:</strong> S/. 20.00</p>
        {tipoTicketImpresion === 'SALIDA' && (
          <>
            <p><strong>Costo Final Reparación:</strong> S/. {datosTicketImpresion?.costo_final ?? datosTicketImpresion?.costo_total ?? datosTicketImpresion?.costo_estimado ?? selectedServicio?.costo_final ?? selectedServicio?.costo_total ?? selectedServicio?.costo_estimado ?? '0.00'}</p>
            <p className="text-center mt-2 font-bold">¡EQUIPO ENTREGADO CON ÉXITO!</p> 
          </>
        )}
        <p className="text-center mt-3">----------------------------------------</p>
        <p className="text-center text-[10px] mt-1">¡Gracias por confiar en Servitek!</p>
        <p className="text-center text-[10px]">Conserve este comprobante.</p>
      </div>
    </div>
  );
}