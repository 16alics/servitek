import React, { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import axios from 'axios';

import QRCode from 'react-qr-code';

import Header from '../components/Header';

import QRModal from '../components/QRModal';

import { toast } from 'react-toastify';

export default function Dashboard() {
const [listaFotos, setListaFotos] = useState([]);
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);

  const [tecnicos, setTecnicos] = useState([]);

  const [userRole, setUserRole] = useState('');

  const [userEmail, setUserEmail] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const [listaRepuestosDisponibles, setListaRepuestosDisponibles] = useState([]);

  const [showRepuestoModal, setShowRepuestoModal] = useState(false);

  const [repuestoForm, setRepuestoForm] = useState({ nombre: '', descripcion: '', costo: '', stock: '' });

  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState('');

  const [cantidadRepuesto, setCantidadRepuesto] = useState(1);

  const [listaRepuestos, setListaRepuestos] = useState([]);  

const [showStockModal, setShowStockModal] = useState(false);

const [repuestoParaStock, setRepuestoParaStock] = useState(null);

const [cantidadExtra, setCantidadExtra] = useState(1);

  // Estados para el Modal de Técnico

  const [showTechModal, setShowTechModal] = useState(false);

  const [techForm, setTechForm] = useState({

    nombre_completo: '', especialidad: '', email: '', password: ''

  });
 const API_URL = import.meta.env.VITE_API_URL;
 

const [listaRepuestosAsignados, setListaRepuestosAsignados] = useState([]);

const [costoEstimado, setCostoEstimado] = useState('');

const [repuestoId, setRepuestoId] = useState('');

  const [editingTechId, setEditingTechId] = useState(null);

  const [modalLoading, setModalLoading] = useState(false);

  const [modalError, setModalError] = useState('');

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, techId: null });

  const [cargando, setCargando] = useState(true);

  const [servicios, setServicios] = useState([]);

  const [selectedServicio, setSelectedServicio] = useState(null);



  // Estados para Modal de Servicio (Cliente)

  const [showServicioModal, setShowServicioModal] = useState(false);

  const [qrModalCode, setQrModalCode] = useState(null);

  const [servicioForm, setServicioForm] = useState({

    marca: '', modelo: '', numero_serie: '', accesorios: '', falla: ''

  });

  const [servicioLoading, setServicioLoading] = useState(false);

  // Editar repuestos

  const [editingRepuestoId, setEditingRepuestoId] = useState(null);

  const [repuestoEditForm, setrepuestoEditForm] = useState({ nombre: '', descripcion: '', costo: '' });

  const [showEditRepuestoModal, setShowEditRepuestoModal] = useState(false);



const [listaActividades, setListaActividades] = useState([]);

  const [nuevaActividadTexto, setNuevaActividadTexto] = useState('');

  const [nuevaActividadCosto, setNuevaActividadCosto] = useState('');

  const [fotosEvidencia, setFotosEvidencia] = useState(null);
// 1. Añade este estado junto a tus otros useState
const [filtroEstado, setFiltroEstado] = useState('TODOS');

const equiposFiltrados = servicios.filter((eq) => {
  if (filtroEstado === 'TODOS') return true;

  const normalizar = (texto) => 
    String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const estadoNorm = normalizar(eq.estado);
  const filtroNorm = normalizar(filtroEstado);

  // Filtro flexible para Recibido
  if (filtroNorm.includes('recibido')) {
    return estadoNorm.includes('recibid') || estadoNorm.includes('ingres');
  }

  // Filtro flexible para Diagnóstico
  if (filtroNorm.includes('diagnostico')) {
    return estadoNorm.includes('diagnost');
  }

  // Comparación para los demás estados
  return estadoNorm === filtroNorm;
});


 const estadoNormalizado = String(selectedServicio?.estado || "").toLowerCase().replace(/[\s_]+/g, "").trim()
// 1. Normalizamos eliminando tildes, espacios y guiones bajos
const estadoNorm = String(selectedServicio?.estado || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "") // 👈 Esto convierte la 'á' en 'a' y elimina cualquier tilde
  .replace(/[\s_]+/g, "");
  const esSoloLectura = [
  "enreparacion", 
  "esperandoaprobacion", 
  "reparado", 
  "listoparacarga", 
  "listoparaentrega", 
  "entregado"
].includes(estadoNorm);// Estados para Diagnostico (Técnico)

  const [diagForm, setDiagForm] = useState({

    falla_encontrada: '', actividades_realizadas: '', observaciones: ''

  });

  const [diagLoading, setDiagLoading] = useState(false);
const handleEliminarTecnico = async (id) => {
    if (!window.confirm("¿Estás seguro de inhabilitar a este técnico?")) return;

    try {
      await axios.delete(`${API_URL}/api/usuarios/tecnico/${id}`);
      // Aquí puedes llamar a tu función para recargar la lista, ej: cargarTecnicos();
      toast.success("Técnico inhabilitado correctamente");
    } catch (err) {
      console.error("Error al inhabilitar técnico:", err);
      toast.error(err.response?.data?.detail || "Error al inhabilitar el técnico");
    }
  };
// Asegúrate de tener estos estados definidos en tu componente:

const [costoBase, setCostoBase] = useState(0); // Aquí guardamos los 20 que vienen de la BD
const handleSaveEvidenciasYFinalizar = async () => {
  if (!selectedServicio || !selectedServicio.id) {
    toast.error("Selecciona un servicio primero.");
    return;
  }

  try {
    // 1. Subir fotos/evidencias adicionales (si el técnico seleccionó alguna)
    if (selectedFiles && selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        
        await axios.post(`${API_URL}/api/servicios/${selectedServicio.id}/fotos`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
    }

    // 2. Cambiar el estado del servicio a "Listo para entrega"
    const nuevoEstado = "Listo para entrega";
    await axios.put(`${API_URL}/api/servicios/${selectedServicio.id}/estado`, {
      estado: nuevoEstado
    });

    // 3. Actualizar el estado local en la lista y en la selección activa
    setServicios(prev => prev.map(s =>
      s.id === selectedServicio.id
        ? { ...s, estado: nuevoEstado }
        : s
    ));

    setSelectedServicio(prev => ({
      ...prev,
      estado: nuevoEstado
    }));

    // 🧹 Limpiamos los archivos temporales
    setSelectedFiles([]);

    // 🔄 Recargamos la galería de fotos oficiales si existe la función
    if (typeof cargarFotosServicio === "function") {
      cargarFotosServicio();
    }

    toast.success("¡Evidencias guardadas con éxito y equipo marcado como 'Listo para entrega'!");

  } catch (error) {
    console.error("Error al guardar evidencias:", error);
    toast.error(error.response?.data?.detail || "Error al actualizar el estado en el servidor.");
  }
};
const handleAgregarTecnico = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
     if (editingTechId) {
        // MODO EDICIÓN (PUT)
        await axios.put(`${API_URL}/api/usuarios/tecnico/${editingTechId}`, {
          nombre_completo: techForm.nombre_completo,
          especialidad: techForm.especialidad
        });
      
      } else {
        // MODO CREACIÓN (POST)
        const payload = {
          usuario: { 
            email: techForm.email, 
            password: techForm.password, 
            rol: 'tecnico' 
          },
          tecnico: { 
            nombre_completo: techForm.nombre_completo, 
            especialidad: techForm.especialidad 
          }
        };
        await axios.post(`${API_URL}/api/usuarios/tecnico`, payload);
      }

      setShowTechModal(false);
      // Aquí puedes llamar a la función que recarga tu lista de técnicos si la tienes, ej: cargarDatos();
    } catch (err) {
      console.error("Error al guardar técnico:", err);
      setModalError(err.response?.data?.detail || 'Error al guardar el técnico');
    } finally {
      setModalLoading(false);
    }
  };


const [selectedFiles, setSelectedFiles] = useState([]);
const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
};

const [repuestosSeleccionados, setRepuestosSeleccionados] = useState([]);

  // Nuevos estados para las funciones del cliente

  const [selectedServicioModal, setSelectedServicioModal] = useState(null);

  const [showPerfilModal, setShowPerfilModal] = useState(false);

  const [perfilForm, setPerfilForm] = useState({ nombre_completo: '', telefono: '', direccion: '' });

  const [perfilLoading, setPerfilLoading] = useState(false);

 const handleAgregarActividad = async () => {

  // Validar que los estados tengan datos

  if (!nuevaActividadTexto || !nuevaActividadCosto) {

    atoast.errorlert("Por favor completa la descripción y el costo de la actividad.");

    return;

  }



  if (!selectedServicio || !selectedServicio.id) {

    toast.error("Por favor selecciona un servicio primero.");

    return;

  }



  try {

    // Guardar en el backend de FastAPI

    const response = await axios.post(

      `${API_URL}/api/servicios/${selectedServicio.id}/actividades`,

      {

        descripcion: nuevaActividadTexto,

        costo: parseFloat(nuevaActividadCosto)

      }

    );

   

    // 2. Actualizar el estado local correctamente con response.data

    setListaActividades([...listaActividades, response.data]);



    // 3. Limpiar los inputs del formulario

    setNuevaActividadTexto('');

    setNuevaActividadCosto('');



    toast.success("¡Actividad agregada con éxito!");



  } catch (error) {

    console.error("Error al registrar actividad:", error);

    toast.error("Hubo un error al registrar la actividad en el servidor.");

  }

};

useEffect(() => {

  const token = localStorage.getItem('token');

  if (!token) {

    navigate('/login-trabajador'); // O tu ruta de login habitual

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

   // 👇 CARGAR EL INVENTARIO GENERAL PARA TODOS LOS ROLES (Tabla Admin y Select Técnico)
    const cargarInventarioGeneral = async () => {
      try {
        const resRepuestos = await axios.get(`${API_URL}/api/repuestos/`);
        setListaRepuestos(resRepuestos.data);
      } catch (error) {
        console.error("Error al cargar el inventario general:", error);
      }
    };
    cargarInventarioGeneral();

    if (decoded.rol === 'admin') {

      fetchAdminData();

    } else if (decoded.rol === 'recepcionista') {

      fetchRecepcionistaData(decoded.sub);

    } else if (decoded.rol === 'tecnico') {

      fetchTechData(decoded.sub);

    } else {

      localStorage.removeItem('token');

      navigate('/login-trabajador');

    }

  } catch (e) {

    console.error("Token inválido", e);

    localStorage.removeItem('token');

    navigate('/login-trabajador');

  }

}, [navigate]);



const handleQuitarActividad = async (index, actividadId) => {

  try {

    // Si la actividad tiene ID de base de datos, la eliminamos en el backend

    if (actividadId) {

      await axios.delete(`${API_URL}/api/servicios/actividades/${actividadId}`);

    }

   

    // Actualizamos el estado local para quitarla de la vista

    setListaActividades(listaActividades.filter((_, i) => i !== index));

  } catch (error) {

    console.error("Error al eliminar la actividad", error);

    toast.error("Hubo un error al eliminar la actividad de la base de datos.");

  }

};

const handleToggleEstadoTecnico = async (t) => {
  try {
    const endpoint = t.activo 
      ? `${API_URL}/api/usuarios/tecnico/${t.id}/inhabilitar`
      : `${API_URL}/api/usuarios/tecnico/${t.id}/activar`;

    await axios.put(endpoint);
    
    // Actualiza el arreglo local en React al instante
    setTecnicos(prevTecnicos => 
      prevTecnicos.map(item => 
        item.id === t.id ? { ...item, activo: !t.activo } : item
      )
    );
    toast.success(t.activo ? "Técnico inhabilitado correctamente" : "Técnico activado correctamente");
  } catch (err) {
    console.error("Error al cambiar el estado del técnico:", err);
    toast.error("Error al actualizar el estado");
  }
};



 

  // 🧮 Función que calcula el costo total sumando: Base (20) + Actividades + Repuestos
const calcularCostoTotal = () => {
  // 1. Costo Base editable (por defecto 20)
  const base = parseFloat(costoBase) || 20;
  
  // 2. Suma de Actividades / Mano de obra
  const totalActividades = (listaActividades || []).reduce((acc, a) => {
    return acc + (parseFloat(a?.costo || a?.precio || 0));
  }, 0);
  
  // 3. Suma de Repuestos Asignados (Revisando todas las variantes posibles de nombre de propiedad)
  const totalRepuestos = (listaRepuestosAsignados || []).reduce((acc, r) => {
    const precio = parseFloat(r?.costo || r?.precio_unitario || r?.precio || r?.subtotal || 0);
    const cantidad = parseInt(r?.cantidad || 1);
    return acc + (precio * cantidad);
  }, 0);

  // 4. Retornamos la suma total de los tres componentes
  const totalGeneral = base + totalActividades + totalRepuestos;
  return totalGeneral.toFixed(2);
};

// Al hacer clic en la tarjeta de la izquierda (para cargar el servicio OT-0604):

const seleccionarServicio = (s) => {
  setSelectedServicio(s);

  // 1. Calculamos los repuestos y actividades que ya trae este servicio guardados
  const repuestosTotales = (s.repuestos || []).reduce((acc, r) => acc + (Number(r.costo || r.precio || 0) * Number(r.cantidad || 1)), 0);
  const actividadesTotales = (s.actividades || []).reduce((acc, a) => acc + (parseFloat(a?.costo) || 0), 0);

  // 2. Aislemos el costo base real restando lo anterior al costo total guardado
  const costoTotalGuardado = parseFloat(s.costo_estimado) || 20;
  const costoBasePuro = Math.max(0, costoTotalGuardado - repuestosTotales - actividadesTotales);

  // 3. Asignamos el costo base puro al input editable
  setCostoBase(costoBasePuro);

  setDiagForm({
    falla_encontrada: s.falla_encontrada || s.diagnostico?.falla_encontrada || s.descripcion_falla || '',
    observaciones: s.observaciones || s.diagnostico?.observaciones || ''
  });

  // Opcional: Si el servicio ya tiene actividades guardadas en la BD, cárgalas aquí para que no empiecen vacías:
  setListaActividades(s.actividades || []);
};

useEffect(() => {
    if (!selectedServicio?.id) return;

    const cargarDetallesServicio = async () => {
      try {
        // 1. Consultar el diagnóstico y datos del servicio
        const resDiagnostico = await axios.get(`${API_URL}/api/servicios/${selectedServicio.id}/diagnostico`);
        if (resDiagnostico.data) {
          setDiagForm({
            falla_encontrada: resDiagnostico.data.falla_encontrada || '',
            observaciones: resDiagnostico.data.observaciones || ''
          });

          // 2. Consultamos las actividades
          const resActividades = await axios.get(`${API_URL}/api/servicios/${selectedServicio.id}/actividades`);
          const listaAct = resActividades.data || [];
          const costoBaseRegistrado = parseFloat(resDiagnostico.data.costo_base ?? resDiagnostico.data.costo_estimado) || 20;
        setCostoEstimado(costoBaseRegistrado);
          // Si tu backend devuelve todo en actividades (incluyendo repuestos como "bateria"),
          // podemos filtrarlos o asignarlos según su tipo, o cargarlos desde su propia ruta:
          setListaActividades(listaAct);

          // 3. Consultar los repuestos (si tu API tiene la ruta de repuestos separada)
          try {
            const resRepuestos = await axios.get(`${API_URL}/api/servicios/${selectedServicio.id}/repuestos`);
            setListaRepuestosAsignados(resRepuestos.data || []);
          } catch (errRep) {
            // Si la ruta de repuestos no existe o falla, dejamos la lista vacía o limpia
            setListaRepuestosAsignados([]);
          }

 
        }
      } catch (error) {
        console.error("Error al cargar los detalles del servicio:", error);
        setDiagForm({ falla_encontrada: '', observaciones: '' });
      }
    };

    cargarDetallesServicio();
  }, [selectedServicio?.id]);


  const handleQuitarRepuesto = (indexParaQuitar) => {

  // Filtramos la lista eliminando el elemento según su posición (índice)

  const nuevaLista = listaRepuestosAsignados.filter((_, index) => index !== indexParaQuitar);

  setListaRepuestosAsignados(nuevaLista);

};

const cargarRepuestosGlobal = async () => {

    try {

      const res = await axios.get(`${API_URL}/api/repuestos/`);

      setListaRepuestosDisponibles(res.data);

      setListaRepuestos(res.data);

    } catch (error) {

      console.error("Error al cargar repuestos:", error);

    }

  };







// --- 2. FUNCIÓN PARA SUBIR LA FOTO DE EVIDENCIA ---

const handleSubirFoto = async (e) => {
  const files = Array.from(e.target.files); // 👈 Convertimos la lista de archivos seleccionados en un array
  if (files.length === 0) return;

  if (!selectedServicio || !selectedServicio.id) {
    toast.error("Por favor selecciona un servicio primero.");
    return;
  }

  try {
    // Recorremos y subimos cada foto seleccionada una por una
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file); // Debe coincidir con UploadFile en FastAPI

      await axios.post(
        `${API_URL}/api/servicios/${selectedServicio.id}/fotos`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
    }

    toast.success("¡Fotos de evidencia subidas con éxito!");
    
    // Opcional: Recargar la lista de fotos del servicio actual si tienes una función para ello
    // cargarFotos(selectedServicio.id);

    // Limpiar el input file
    e.target.value = "";
  } catch (error) {
    console.error("Error al subir las fotos:", error);
    toast.error("Hubo un error al subir algunas de las fotos.");
  }
};

const handleAgregarRepuesto = async () => {

  try {

    const idServicio = selectedServicio?.id;



    if (!idServicio) {

      toast.error("Por favor selecciona un servicio de la lista.");

      return;

    }



    if (!repuestoSeleccionado) {

      toast.error("Por favor selecciona un repuesto del inventario.");

      return;

    }



    // Buscamos el repuesto en el inventario local para validar stock antes de agregarlo visualmente

    const repObj = listaRepuestos?.find(r => r.id === parseInt(repuestoSeleccionado));

    const cantidadNum = parseInt(cantidadRepuesto) || 1;



    if (repObj && repObj.stock !== undefined && cantidadNum > repObj.stock) {

      toast.error("La cantidad seleccionada supera el stock disponible en el inventario.");

      return;

    }



    //Buscamos el repuesto en el inventario local
    // const repObj = listaRepuestos?.find(r => r.id === parseInt(repuestoSeleccionado)); // (Ya declarado arriba)

    // const cantidadNum = parseInt(cantidadRepuesto) || 1;



    if (repObj) {

      const precioUnitario = parseFloat(

        repObj.precio ||

        repObj.costo ||

        repObj.valor ||

        repObj.precio_venta ||

        repObj.precio_unitario ||

        0

      );



      const nuevoItemAsignado = {

        id: repObj.id,

        nombre: repObj.nombre,

        cantidad: cantidadNum,

        costo: precioUnitario

      };



      const nuevaListaAsignados = [...(listaRepuestosAsignados || []), nuevoItemAsignado];

      setListaRepuestosAsignados(nuevaListaAsignados);



      // 3. Calculamos el nuevo total

      const costoBaseNum = parseFloat(selectedServicio?.costo_base || costoBase || 20);

      const sumaRepuestos = nuevaListaAsignados.reduce((acc, item) => acc + (item.costo * item.cantidad), 0);

      const nuevoTotal = costoBaseNum + sumaRepuestos;



      // 4. Actualizamos el servicio seleccionado

      setSelectedServicio(prev => ({

        ...prev,

        costo_estimado: nuevoTotal

      }));

    }



    // 6. Limpiamos campos

    setRepuestoSeleccionado("");

    setCantidadRepuesto(1);



    toast.success("Repuesto agregado a la lista temporal. Se descontará al guardar el diagnóstico.");

  } catch (error) {

    console.error("Error al añadir repuesto:", error);

    const mensajeError = error.response?.data?.detail || "Error al añadir el repuesto";

    toast.error(mensajeError);

  }

};

const handleUpdateService = async (nuevoEstado) => {

  try {

    await axios.put(`${API_URL}/api/servicios/${selectedServicio.id}/estado`, {

      estado: nuevoEstado

    });

   

    // Actualizar el estado en la interfaz

    setSelectedServicio(prev => ({ ...prev, estado: nuevoEstado }));

    setServicios(prev => prev.map(s => s.id === selectedServicio.id ? { ...s, estado: nuevoEstado } : s));

   

    toast.success(`Estado actualizado a "${nuevoEstado}" con éxito.`);

  } catch (error) {

    console.error("Error al actualizar el estado:", error);

    toast.error("No se pudo actualizar el estado del servicio.");

  }

};

  const fetchTechData = async (email) => {

    try {

      const [resUsuarios, resServicios] = await Promise.all([

        axios.get(`${API_URL}/api/usuarios/`),

        axios.get(`${API_URL}/api/servicios/`)

      ]);



      const tecnicoAuth = resUsuarios.data.find(

        t => t.email && t.email.toLowerCase() === email.toLowerCase()

      );



      if (tecnicoAuth) {

        const misServicios = resServicios.data.filter(

          s => String(s.tecnico_id) === String(tecnicoAuth.id)

        );

        setServicios(misServicios);

      } else {

        setServicios([]);

      }

    } catch (error) {

      console.error("Error al cargar los datos:", error);

    } finally {

      setCargando(false);

    }

  };



  const fetchClientData = async (email) => {

    try {

      const res = await axios.get(`${API_URL}/api/servicios/cliente/${email}`);

      setServicios(res.data);

    } catch (error) {

      console.error(error);

    }

  };



  const fetchAdminData = async () => {

    try {

      // CORREGIDO: Rutas apuntando correctamente a /api/usuarios/...

      const resClientes = await axios.get(`${API_URL}/api/usuarios/clientes`);

      setClientes(resClientes.data);

     

      const resTecnicos = await axios.get(`${API_URL}/api/usuarios/tecnicos`);

      setTecnicos(resTecnicos.data);



      const resServicios = await axios.get(`${API_URL}/api/servicios/`);

      setServicios(resServicios.data);

    } catch (error) {

      console.error("Error cargando datos de administrador", error);

    } finally {

      setCargando(false);

    }

  };
const cambiarEstadoRapido = async (nuevoEstado) => {
  if (!selectedServicio || !selectedServicio.id) {
    toast.error("Selecciona un servicio primero.");
    return;
  }

  try {
    await axios.put(`${API_URL}/api/servicios/${selectedServicio.id}/estado`, {
      estado: nuevoEstado
    });

    // Actualizar la lista de la izquierda
    setServicios(prev => prev.map(s => 
      s.id === selectedServicio.id ? { ...s, estado: nuevoEstado } : s
    ));

    // Actualizar el servicio seleccionado actualmente
    setSelectedServicio(prev => ({
      ...prev,
      estado: nuevoEstado
    }));

    toast.success(`¡Estado actualizado a "${nuevoEstado}" con éxito!`);
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    toast.error(error.response?.data?.detail || "No se pudo actualizar el estado en el servidor.");
  }
};
const handleSaveDiagnostico = async () => {
  if (!selectedServicio || !selectedServicio.id) {
    toast.success("Selecciona un servicio primero.");
    return;
  }

  try {
    // 🧮 Forzamos a que tome el costo total calculado actual
    const costoTotalReal = parseFloat(calcularCostoTotal()) || 0;
    const costoBaseReal = parseFloat(costoEstimado) || 20; // 🎯 Nos aseguramos de que si está vacío tome el estándar de 20

    // 📦 Empaquetamos el diagnóstico (permitiendo campos opcionales sin bloqueos)
    const datosAEnviar = {
      falla_encontrada: diagForm.falla_encontrada || "",
      actividades_realizadas: JSON.stringify(listaActividades || []),
      observaciones: diagForm.observaciones || "",
      costo_estimado: costoTotalReal,
      costo_base: costoBaseReal, // Mandamos el costo base independiente y limpio (ej. 20)
      repuestos: (listaRepuestosAsignados || []).map(item => ({
        id: Number(item.id),
        cantidad: Number(item.cantidad),
        costo: Number(item.costo || item.precio_unitario || 0)
      }))
    };

    // Guardamos el diagnóstico en el backend
    await axios.put(`${API_URL}/api/servicios/${selectedServicio.id}/diagnostico`, datosAEnviar);

    // 2. Subir fotos pendientes a Cloudinary (si el usuario adjuntó alguna de forma opcional)
    if (selectedFiles && selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        
        await axios.post(`${API_URL}/api/servicios/${selectedServicio.id}/fotos`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
    }

    const nuevoEstado = "Esperando aprobacion";

    // 3. Actualizamos el estado local
    setServicios(prev => prev.map(s =>
      s.id === selectedServicio.id
        ? { ...s, estado: nuevoEstado, costo_estimado: costoTotalReal, costo_base: costoBaseReal }
        : s
    ));

    setSelectedServicio(prev => ({
      ...prev,
      estado: nuevoEstado,
      costo_estimado: costoTotalReal,
      costo_base: costoBaseReal
    }));

    // 🧹 Limpiamos los archivos seleccionados temporalmente
    setSelectedFiles([]);

    // 🔄 Recargamos la lista de fotos oficiales
    if (typeof cargarFotosServicio === "function") {
      cargarFotosServicio();
    }

    toast.success("¡Diagnóstico guardado con éxito y estado actualizado a 'Esperando aprobación'!");

  } catch (error) {
    console.error("Error al guardar diagnóstico:", error);
    toast.error(error.response?.data?.detail || "Error al guardar el diagnóstico en el servidor.");
  }
};

const cargarDatosDashboard = async () => {

  try {

    // Ajusta las URLs según tus endpoints reales de FastAPI

    const resClientes = await axios.get(`${API_URL}/api/clientes/`);

    setListaClientes(resClientes.data);



    const resTecnicos = await axios.get(`${API_URL}/api/tecnicos/`); // o /api/usuarios/tecnicos

    setListaTecnicos(resTecnicos.data);



    const resRepuestos = await axios.get(`${API_URL}/repuestos/`);

    setListaRepuestos(resRepuestos.data);

  } catch (error) {

    console.error("Error al cargar los datos del dashboard:", error);

  }

};
if (userRole === 'recepcionista') {
    return <Navigate to="/admin/recepcion" replace />;
  }
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative print:bg-white">
  <Header userRole={userRole} userEmail={userEmail} logoutPath="/login-trabajador" />
  
  <main className="flex-1 p-8 print:p-0">
    <div className="max-w-6xl mx-auto space-y-8 print:space-y-0">
      
      {userRole === 'admin' && (
        <div className="flex flex-wrap justify-end gap-3 print:hidden">
          <button 
            onClick={() => navigate('/admin/usuarios')}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl font-semibold transition-all shadow-sm hover:shadow flex items-center gap-2 text-xs cursor-pointer active:scale-95"
          >
            👥 Gestión de Usuarios
          </button>
          
          <button 
            onClick={() => navigate('/admin/reportes')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            📊 Reportes y Auditoría
          </button>
          
          <button 
            onClick={() => navigate('/admin/recepcion')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            + Módulo de Recepción
          </button>
          
          <button 
            onClick={() => setShowRepuestoModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            + Gestionar Repuestos
          </button>
        </div>
      )}
         {userRole === 'admin' && (
   <>
  {/* Métricas / Contadores superiores */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 print:hidden">
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200 text-center">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clientes</h3>
      <p className="text-3xl font-black text-blue-600 mt-2">{clientes.length}</p>
    </div>
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200 text-center">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Técnicos</h3>
      <p className="text-3xl font-black text-blue-600 mt-2">{tecnicos.length}</p>
    </div>
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200 text-center">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Equipos en Taller</h3>
      <p className="text-3xl font-black text-blue-600 mt-2">
       {servicios.filter(s => {
      const est = String(s.estado || "").toLowerCase().trim();
      return est.includes('reparacion') || est.includes('diagnostico') || est.includes('esperando');
    }).length}
      </p>
    </div>
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200 text-center">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reparados (Mes)</h3>
      <p className="text-3xl font-black text-blue-600 mt-2">
        {servicios.filter(s => {
      const est = String(s.estado || "").toLowerCase().trim();
      return est.includes('listo') || est.includes('entregado');
    }).length}
      </p>
    </div>
  </div>

  {/* Listas de Clientes y Técnicos */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden mt-6">
    
    {/* Lista de Clientes */}
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center">
        <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Clientes Registrados</h2>
      </div>
      <ul className="divide-y divide-gray-100 p-5 flex-1">
        {clientes.length === 0 ? (
          <p className="text-gray-400 text-xs py-6 text-center italic">No hay clientes aún.</p>
        ) : (
          <>
            {clientes.slice(0, 3).map((c) => (
              <li key={c.id} className="py-3.5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{c.nombre_completo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.telefono || 'Sin teléfono'}</p>
                </div>
              </li>
            ))}
            <div className="pt-4 mt-2 border-t border-gray-100 text-center">
              <button 
                onClick={() => navigate('/admin/clientes')}
                className="text-blue-600 hover:text-blue-700 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Ver Directorio de Clientes Completo →
              </button>
            </div>
          </>
        )}
      </ul>
    </div>
      
    {/* Lista de Técnicos */}
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center">
        <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Técnicos</h2>
        <button 
          onClick={() => {
            setTechForm({ nombre_completo: '', especialidad: '', email: '', password: '' });
            setEditingTechId(null);
            setShowTechModal(true);
          }}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl transition shadow-sm font-bold cursor-pointer"
        >
          + Nuevo Técnico
        </button>
      </div>
      <ul className="divide-y divide-gray-100 p-5 flex-1">
        {tecnicos.length === 0 ? (
          <p className="text-gray-400 text-xs py-6 text-center italic">No hay técnicos aún.</p>
        ) : (
          tecnicos.map((t) => (
            <li key={`tecnico-${t.id}`} className="py-3.5 flex justify-between items-center group">
              <div>
                <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  {t.nombre_completo || t.nombre || t.email}
                  {!t.activo && <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 font-bold uppercase rounded-md">Inactivo</span>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{t.especialidad || 'General'}</p>
              </div>
              <div className="flex gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setTechForm({ nombre_completo: t.nombre_completo || t.nombre || '', especialidad: t.especialidad || '', email: t.email || '', password: '' });
                    setEditingTechId(t.id);
                    setShowTechModal(true);
                  }}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition cursor-pointer" title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>

                <button 
                  onClick={() => handleToggleEstadoTecnico(t)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    t.activo 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`} 
                  title={t.activo ? "Inhabilitar" : "Activar"}
                >
                  {t.activo ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  </div>

  {/* Sección de Inventario de Repuestos */}
  <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200 mt-6 print:hidden">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Inventario de Repuestos</h3>
      <button 
        onClick={() => setShowRepuestoModal(true)}
        className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
      >
        + Nuevo Repuesto
      </button>
    </div>
    
    <div className="overflow-x-auto border border-gray-200 rounded-2xl">
      <table className="w-full text-left text-xs text-gray-600">
        <thead className="bg-gray-50 uppercase text-gray-700 font-bold tracking-wider">
          <tr>
            <th className="p-3.5">Nombre</th>
            <th className="p-3.5">Descripción</th>
            <th className="p-3.5">Costo (S/.)</th>
            <th className="p-3.5">Stock</th>
            <th className="p-3.5 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {listaRepuestos.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center py-6 text-gray-400 italic">No hay repuestos registrados en el inventario.</td>
            </tr>
          ) : (
            listaRepuestos.map((rep) => (
              <tr key={`rep-${rep.id}`} className="hover:bg-gray-50/50 transition">
                <td className="p-3.5 font-bold text-gray-900">{rep.nombre}</td>
                <td className="p-3.5 text-gray-500">{rep.descripcion || '-'}</td>
                <td className="p-3.5 font-semibold text-gray-700">S/. {rep.costo}</td>
                <td className="p-3.5 font-bold text-emerald-600">{rep.stock} unids.</td>
                <td className="p-3.5 text-center flex justify-center gap-2">
                  <button 
                    onClick={() => {
                      setRepuestoParaStock(rep);
                      setCantidadExtra(1);
                      setShowStockModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                  >
                    + Stock
                  </button>
                  <button 
                    onClick={() => {
                      setEditingRepuestoId(rep.id);
                      setrepuestoEditForm({
                        nombre: rep.nombre,
                        descripcion: rep.descripcion || '',
                        costo: rep.costo
                      });
                      setShowEditRepuestoModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-xs cursor-pointer"
                  >
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* ✏️ MODAL PARA EDITAR REPUESTO */}
  {showEditRepuestoModal && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200">
        <h3 className="text-base font-bold text-gray-900 mb-4">Editar Repuesto</h3>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await axios.put(`${API_URL}/api/repuestos/${editingRepuestoId}`, {
              nombre: repuestoEditForm.nombre,
              descripcion: repuestoEditForm.descripcion,
              costo: parseFloat(repuestoEditForm.costo)
            });
            toast.success("¡Repuesto actualizado con éxito!");
            setShowEditRepuestoModal(false);
            setEditingRepuestoId(null);
            window.location.reload();
          } catch (error) {
            console.error("Error al actualizar repuesto:", error);
            toast.error("Error al actualizar el repuesto");
          }
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre del Repuesto</label>
            <input 
              type="text" 
              required
              value={repuestoEditForm.nombre}
              onChange={(e) => setrepuestoEditForm({...repuestoEditForm, nombre: e.target.value})}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descripción</label>
            <textarea 
              value={repuestoEditForm.descripcion}
              onChange={(e) => setrepuestoEditForm({...repuestoEditForm, descripcion: e.target.value})}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
              rows="2"
            ></textarea>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Costo (S/.)</label>
            <input 
              type="number" 
              step="0.01"
              required
              value={repuestoEditForm.costo}
              onChange={(e) => setrepuestoEditForm({...repuestoEditForm, costo: e.target.value})}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button"
              onClick={() => setShowEditRepuestoModal(false)}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Reporte General de Reparaciones */}
  <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden mt-8 print:shadow-none print:border-none print:mt-0">
    <div className="p-5 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center print:bg-white print:border-b-2 print:border-black print:mb-4 print:p-0 print:pb-2">
      <h2 className="font-bold text-gray-900 text-xl print:text-black">Reporte General de Reparaciones</h2>
      <button onClick={() => window.print()} className="text-xs bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition shadow-xs print:hidden font-bold cursor-pointer">
        Imprimir Reporte
      </button>
    </div>
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-xs text-left text-gray-600 print:text-black">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 font-bold tracking-wider print:bg-white print:text-black print:border-b print:border-gray-400">
          <tr>
            <th className="px-5 py-3.5">Fecha</th>
            <th className="px-5 py-3.5">Código</th>
            <th className="px-5 py-3.5">Equipo</th>
            <th className="px-5 py-3.5">Cliente</th>
            <th className="px-5 py-3.5">Técnico Asignado</th>
            <th className="px-5 py-3.5">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {servicios.length === 0 ? (
            <tr><td colSpan="6" className="text-center py-6 text-gray-400 italic">No hay servicios registrados.</td></tr>
          ) : (
            servicios.map(s => {
              const date = new Date(s.fecha_ingreso);
              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
              const assignedTechName = tecnicos.find(t => t.id === s.tecnico_id)?.nombre_completo || 'Sin Asignar';
              return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5 text-gray-500">{formattedDate}</td>
                  <td className="px-5 py-3.5 font-bold font-mono text-gray-900">{s.codigo}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{s.equipo.marca} {s.equipo.modelo}</td>
                  <td className="px-5 py-3.5 text-gray-700">{s.equipo.cliente_nombre}</td>
                  <td className="px-5 py-3.5">
                    <select 
                      value={s.tecnico_id || ''}
                      onChange={(e) => handleAssignTech(s.id, e.target.value)}
                      className="bg-white border border-gray-300 text-gray-900 text-xs rounded-xl focus:ring-2 focus:ring-blue-600 block w-full p-2 font-semibold shadow-xs outline-none print:hidden"
                    >
                      <option value="">Sin Asignar</option>
                      {tecnicos.filter(t => t.activo || t.id === s.tecnico_id).map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre_completo} {!t.activo ? '(Inactivo)' : ''}</option>
                      ))}
                    </select>
                    <span className="hidden print:inline">{assignedTechName}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-200 print:border-none print:bg-transparent print:text-black print:px-0">
                      {s.estado}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
</>
  )}
       
         {userRole === 'tecnico' && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    {/* Lista de Trabajos (Izquierda) */}
    <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[800px]">
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
        <h2 className="font-bold text-base tracking-tight">Equipos Asignados</h2>
        <span className="bg-white/10 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-200">
          {servicios.length} Total
        </span>
      </div>

      {/* 🔍 BOTONES DE FILTRADO POR ESTADO */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-1.5">
        {['TODOS', 'Diagnostico', 'Esperando aprobación', 'En Reparación', 'Listo para entrega', 'Entregado'].map((estado) => {
          const activo = filtroEstado === estado;
          return (
            <button
              key={estado}
              onClick={() => {
                setFiltroEstado(estado);
                setSelectedServicio(null); 
                setListaActividades([]);       
                setListaRepuestosAsignados([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activo
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {estado}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {servicios
          .filter((s) => {
            if (filtroEstado === 'TODOS') return true;
            return s.estado?.toLowerCase().trim() === filtroEstado.toLowerCase().trim();
          })
          .map((s) => (
            <div 
              key={s.id} 
              onClick={async () => {
                setSelectedServicio(s);

                // Cargar diagnóstico existente
                try {
                  const resDiag = await axios.get(`${API_URL}/api/servicios/${s.id}/diagnostico`);
                  setDiagForm({
                    falla_encontrada: resDiag.data?.falla_encontrada || s.descripcion_falla || '',
                    observaciones: resDiag.data?.observaciones || ''
                  });
                } catch (error) {
                  setDiagForm({
                    falla_encontrada: s.descripcion_falla || '',
                    observaciones: ''
                  });
                }

                setCostoEstimado(s.costo_base ?? s.costo_estimado ?? 0);
                
                // CARGAR LA LISTA DE FOTOS
                try {
                  const resFotos = await axios.get(`${API_URL}/api/servicios/${s.id}/fotos`);
                  setListaFotos(resFotos.data);
                } catch (error) {
                  setListaFotos([]);
                }       

                const estadoNorm = String(s.estado || "").toLowerCase().replace(/[\s_]+/g, "");

                if (["enreparacion", "esperandoaprobacion", "reparado", "listoparacarega", "entregado"].includes(estadoNorm)) {
                  try {
                    const resAct = await axios.get(`${API_URL}/api/servicios/${s.id}/actividades`);
                    setListaActividades(resAct.data);

                    const resRep = await axios.get(`${API_URL}/api/servicios/${s.id}/repuestos`);
                    setListaRepuestosAsignados(resRep.data);
                  } catch (error) {
                    console.error("Error al cargar datos guardados:", error);
                  }
                } else {
                  setListaActividades([]);
                  setListaRepuestosAsignados([]);
                }
              }}
              className={`bg-white p-4 rounded-xl border cursor-pointer transition-all shadow-xs relative overflow-hidden ${
                selectedServicio?.id === s.id ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="absolute top-0 left-0 w-1.5 bottom-0 bg-blue-600"></div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold text-gray-500">{s.codigo}</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">{s.estado}</span>
              </div>
              
              <h3 className="font-bold text-gray-900 text-sm">
                {s.equipo?.marca || 'Sin marca'} {s.equipo?.modelo || ''}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-1">
                Cliente: <strong className="text-gray-700">{s.equipo?.cliente_nombre || s.cliente_nombre || 'N/A'}</strong>
              </p>
            </div>
          ))}
      </div>
    </div>

    {/* Detalle de Trabajo (Derecha) */}
    <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[800px]">
      {!selectedServicio ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
          <p className="text-sm">Selecciona un servicio de la lista para ver los detalles y gestionar el taller.</p>
        </div>
      ) : (
        <>
          {/* Cabecera del Detalle */}
          <div className="p-6 border-b border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedServicio.equipo?.marca} {selectedServicio.equipo?.modelo}</h2>
              <p className="text-xs text-gray-500 font-mono mt-0.5">Código de Orden: <span className="text-blue-600 font-bold">{selectedServicio.codigo}</span></p>
            </div>
            
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado Actual</label>
              <select 
                value={selectedServicio.estado} 
                onChange={(e) => handleUpdateService(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-xs rounded-xl focus:ring-2 focus:ring-blue-600 block w-full sm:w-48 p-2.5 font-bold shadow-xs outline-none"
              >
                <option value="Recibido">Recibido</option>
                <option value="Diagnostico">Diagnóstico</option>
                <option value="Esperando aprobación">Esperando aprobación</option>
                <option value="En reparación">En reparación</option>
                <option value="Listo para entrega">Listo para entrega</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>
          </div>

          {/* Banner de alerta (solo si está en Recibido) */}
          {selectedServicio?.estado === "Recibido" && (
            <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Equipo en recepción pendiente de revisión</h4>
                  <p className="text-xs text-amber-700 mt-0.5">Inicia el diagnóstico técnico para habilitar las siguientes etapas.</p>
                </div>
              </div>
              <button
                onClick={() => cambiarEstadoRapido("Diagnostico")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer shrink-0"
              >
                Pasar a Diagnóstico
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <section>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Problema reportado por el cliente
              </h3>
              <div className="bg-red-50/60 text-red-900 p-4 rounded-2xl text-xs border border-red-200 leading-relaxed">
                {selectedServicio.descripcion_falla}
              </div>
            </section>
            
            {/* --- SECCIÓN DE DIAGNÓSTICO Y ACTIVIDADES --- */}
            <section className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {esSoloLectura ? "📋 Resumen de Actividades (Solo Lectura)" : "Registro de Diagnóstico y Actividades"}
              </h3>

              {/* Falla encontrada */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Falla Encontrada</label>
                <textarea 
                  value={diagForm.falla_encontrada}
                  onChange={(e) => setDiagForm({...diagForm, falla_encontrada: e.target.value})}
                  rows="2" 
                  disabled={esSoloLectura}
                  className={`w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-600 outline-none text-gray-900 ${esSoloLectura ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} 
                  placeholder="Describa el diagnóstico técnico..."
                ></textarea>
              </div>

              {/* --- ACTIVIDADES MÚLTIPLES --- */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">Actividades Realizadas y Costos de Mano de Obra</label>
                
                {!esSoloLectura && (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    <input 
                      type="text" 
                      placeholder="Ej. Mantenimiento y limpieza de tarjeta madre" 
                      value={nuevaActividadTexto}
                      onChange={(e) => setNuevaActividadTexto(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <input 
                      type="number" 
                      placeholder="Costo S/." 
                      value={nuevaActividadCosto}
                      onChange={(e) => setNuevaActividadCosto(e.target.value)}
                      className="w-full sm:w-28 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button 
                      type="button"
                      onClick={handleAgregarActividad}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                )}

                {Array.isArray(listaActividades) && listaActividades.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {listaActividades.map((act, index) => (
                      <div key={`actividad-${act?.id || 'sin-id'}-${index}`} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 text-xs shadow-xs">
                        <span className="text-gray-800 font-medium">🔹 {act?.descripcion || "Sin descripción"}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">
                            S/. {isNaN(parseFloat(act?.costo)) ? "0.00" : parseFloat(act?.costo).toFixed(2)}
                          </span>
                          {!esSoloLectura && (
                            <button 
                              type="button" 
                              onClick={() => handleQuitarActividad(index)} 
                              className="text-red-600 hover:text-red-800 font-bold text-xs cursor-pointer"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No hay actividades registradas.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Observaciones Internas</label>
                <textarea 
                  value={diagForm.observaciones}
                  onChange={(e) => setDiagForm({...diagForm, observaciones: e.target.value})}
                  rows="2" 
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900" 
                  placeholder="Notas internas sobre el estado del equipo..."
                />
              </div>

              {/* Input para adjuntar fotos */}
              <div className="flex items-center gap-3 bg-gray-50 p-4 border border-dashed border-gray-300 rounded-2xl">
                <div className="p-2.5 bg-white text-gray-600 rounded-xl border border-gray-200 shadow-xs">
                  📸
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-800">Adjuntar fotos adicionales del proceso</label>
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="text-xs mt-1 text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                </div>
              </div>

              {/* Galería de Evidencia Fotográfica */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Galería de Evidencias</label>
                {Array.isArray(listaFotos) && listaFotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {listaFotos.map((foto, index) => (
                      <div key={`foto-oficial-${foto?.id || 'sin-id'}-${index}`} className="relative border border-gray-200 rounded-xl overflow-hidden bg-white p-1 shadow-xs">
                        <img 
                          src={foto.url_foto} 
                          alt="Evidencia del servicio" 
                          className="w-full h-24 object-cover rounded-lg hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No hay fotos adjuntas en este servicio.</p>
                )}

                {/* Previsualización local */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">Fotos listas para enviar (se guardarán al presionar Guardar):</p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="relative border border-amber-300 rounded-xl overflow-hidden bg-amber-50/60 p-1 shadow-xs">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="Vista previa local" 
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">Pendiente</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* --- SECCIÓN DE REPUESTOS --- */}
            <section className="pt-4 border-t border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {esSoloLectura ? "📋 Repuestos Asignados (Solo Lectura)" : "Asignar Repuestos al Servicio"}
              </h3>
              
              {!esSoloLectura && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Seleccionar Repuesto</label>
                    <select 
                      value={repuestoSeleccionado} 
                      onChange={(e) => setRepuestoSeleccionado(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
                    >
                      <option value="">-- Seleccione un repuesto del inventario --</option>
                      {listaRepuestos?.map((rep) => (
                        <option key={`opt-repuesto-${rep.id}`} value={rep.id}>
                          {rep.nombre} (Stock: {rep.stock}) - S/. {rep.costo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Cantidad</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={cantidadRepuesto}
                        onChange={(e) => setCantidadRepuesto(e.target.value)}
                        className="w-20 px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none text-center font-bold text-gray-900 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarRepuesto}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {Array.isArray(listaRepuestosAsignados) && listaRepuestosAsignados.length > 0 ? (
                <div className="mt-3 overflow-x-auto border border-gray-200 rounded-2xl shadow-xs">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Repuesto</th>
                        <th className="px-4 py-3 text-center">Cant.</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                        {!esSoloLectura && <th className="px-4 py-3 text-center">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {listaRepuestosAsignados.map((item, index) => (
                        <tr key={`repuesto-${item?.id || 'sin-id'}-${index}`}>
                          <td className="px-4 py-3 text-gray-900 font-medium">{item.nombre}</td>
                          <td className="px-4 py-3 text-center text-gray-600 font-semibold">{item.cantidad}</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-bold">
                            S/. {isNaN(parseFloat(item?.precio_unitario || item?.costo || item?.precio)) 
                              ? "0.00" 
                              : (parseFloat(item?.precio_unitario || item?.costo || item?.precio) * (item?.cantidad || 1)).toFixed(2)}
                          </td>
                          {!esSoloLectura && (
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleQuitarRepuesto(index)}
                                className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                              >
                                Quitar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No hay repuestos asignados a este servicio.</p>
              )}
            </section>

          </div>

        {/* Pie de página con costos y botones de guardado */}
  <div className="p-6 border-t border-gray-200 bg-gray-50/80 space-y-4">
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Costo base */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between shadow-xs">
        <div>
          <label className="text-xs font-bold text-gray-800 block uppercase tracking-wider">Costo base (S/.)</label>
          <span className="text-[11px] text-gray-500">Presupuesto inicial</span>
        </div>
        <input
          type="number"
          value={costoEstimado}
          onChange={(e) => setCostoEstimado(e.target.value)}
          placeholder="0.00"
          className="w-32 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-right outline-none focus:ring-2 focus:ring-blue-600 text-gray-900"
        />
      </div>

      {/* Costo Estimado Total */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between shadow-xs">
        <div>
          <label className="text-xs font-bold text-gray-800 block uppercase tracking-wider">
            Total Estimado (S/.)
          </label>
          <span className="text-[11px] text-gray-500">Incluye mano de obra y repuestos</span>
        </div>
        <input 
          type="text"
          readOnly
          value={`S/. ${calcularCostoTotal()}`}
          className="w-32 px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-sm font-bold text-right text-gray-900 outline-none"
        />
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-2">
      {(() => {
        const estadoNorm = String(selectedServicio?.estado || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const estaEsperandoAprobacion = estadoNorm.includes('esperando');
        
        if (estadoNorm.includes('listo') || estadoNorm.includes('entregado')) {
          return (
            <button 
              onClick={() => { setSelectedServicio(null); }}
              className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
            >
              Cerrar Vista
            </button>
          );
        }

        return (
          <div>
            {selectedServicio?.estado === "En reparación" ? (
              <button 
                onClick={handleSaveEvidenciasYFinalizar}
                disabled={diagLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {diagLoading ? 'Guardando...' : 'Guardar Evidencias y Pasar a Listo para Entrega'}
              </button>
            ) : (
              <button 
                onClick={handleSaveDiagnostico}
                disabled={diagLoading || estaEsperandoAprobacion}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition ${
                  estaEsperandoAprobacion 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer'
                } disabled:opacity-50`}
              >
                {estaEsperandoAprobacion 
                  ? '⏳ Esperando Aprobación del Cliente' 
                  : (diagLoading ? 'Guardando...' : 'Guardar Diagnóstico')}
              </button>
            )}
          </div>
        );
        
      })()}
    </div>

  </div>
        </>
      )}
    </div>
  </div>
)}

        </div>
      </main>
       
      {/* MODAL DETALLES DEL EQUIPO/SERVICIO (CLIENTE) */}
{selectedServicioModal && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200">
      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
        <h3 className="text-base font-bold text-gray-900">
          Orden: {selectedServicioModal.codigo}
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
          {selectedServicioModal.estado}
        </span>
      </div>

      <div className="space-y-3 text-xs text-gray-600">
        <p><strong className="text-gray-900 font-semibold">Equipo:</strong> {selectedServicioModal.equipo}</p>
        <p><strong className="text-gray-900 font-semibold">N° de Serie:</strong> {selectedServicioModal.numero_serie || 'No especificado'}</p>
        <p><strong className="text-gray-900 font-semibold">Accesorios:</strong> {selectedServicioModal.accesorios || 'Ninguno'}</p>
        <p><strong className="text-gray-900 font-semibold">Falla Reportada:</strong> {selectedServicioModal.descripcion_falla}</p>
        
        {selectedServicioModal.diagnostico?.falla_encontrada && (
          <div className="bg-blue-50/80 p-3.5 rounded-xl text-blue-900 border border-blue-100 mt-2">
            <strong className="block text-[10px] uppercase tracking-wider text-blue-700 font-bold mb-1">Diagnóstico Técnico:</strong>
            {selectedServicioModal.diagnostico.falla_encontrada}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <button 
          onClick={() => setSelectedServicioModal(null)}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL EDITAR PERFIL CLIENTE */}
{showPerfilModal && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200">
      <h2 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">Editar Datos Personales</h2>
      
      <form onSubmit={handleUpdatePerfil} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre Completo</label>
          <input 
            type="text" required
            value={perfilForm.nombre_completo}
            onChange={e => setPerfilForm({...perfilForm, nombre_completo: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Teléfono</label>
          <input 
            type="text" required
            value={perfilForm.telefono}
            onChange={e => setPerfilForm({...perfilForm, telefono: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Dirección</label>
          <input 
            type="text"
            value={perfilForm.direccion}
            onChange={e => setPerfilForm({...perfilForm, direccion: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={() => setShowPerfilModal(false)}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={perfilLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-xs font-bold text-xs disabled:opacity-50 cursor-pointer"
          >
            {perfilLoading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* MODAL NUEVO/EDITAR TÉCNICO */}
{showTechModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200">
      <h2 className="text-base font-bold text-gray-900 mb-4">{editingTechId ? 'Editar Técnico' : 'Agregar Nuevo Técnico'}</h2>
      
      {modalError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-xs font-medium border border-red-200">
          {modalError}
        </div>
      )}

      <form onSubmit={handleAgregarTecnico} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre Completo</label>
          <input 
            type="text" required
            value={techForm.nombre_completo}
            onChange={e => setTechForm({...techForm, nombre_completo: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Especialidad (Ej: Hardware, Mac, Software)</label>
          <input 
            type="text"
            value={techForm.especialidad}
            onChange={e => setTechForm({...techForm, especialidad: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
          />
        </div>

        {!editingTechId && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Correo Electrónico (Login)</label>
              <input 
                type="email" required
                value={techForm.email}
                onChange={e => setTechForm({...techForm, email: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Contraseña Provisoria</label>
              <input 
                type="password" required
                value={techForm.password}
                onChange={e => setTechForm({...techForm, password: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={() => setShowTechModal(false)}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={modalLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 font-bold text-xs cursor-pointer"
          >
            {modalLoading ? 'Guardando...' : (editingTechId ? 'Guardar Cambios' : 'Guardar Técnico')}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* 📦 MODAL PARA AGREGAR STOCK */}
{showStockModal && repuestoParaStock && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200">
      <h3 className="text-base font-bold text-gray-900 mb-2">Agregar Stock</h3>
      <p className="text-xs text-gray-600 mb-4">
        Repuesto: <strong className="text-gray-900">{repuestoParaStock.nombre}</strong> <br/>
        <span className="text-[11px] text-gray-500">Stock actual: {repuestoParaStock.stock} unidades</span>
      </p>

      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          await axios.put(`${API_URL}/api/repuestos/${repuestoParaStock.id}/agregar-stock`, {
            cantidad: parseInt(cantidadExtra)
          });
          toast.success("¡Stock actualizado con éxito!");
          setShowStockModal(false);
          setRepuestoParaStock(null);
          window.location.reload();
        } catch (error) {
          console.error("Error al sumar stock:", error);
          toast.error("Error al actualizar el stock");
        }
      }} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Cantidad a Añadir</label>
          <input 
            type="number" 
            min="1"
            required
            value={cantidadExtra}
            onChange={(e) => setCantidadExtra(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button 
            type="button"
            onClick={() => setShowStockModal(false)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* ✅ VENTANA MODAL PARA REGISTRAR NUEVO REPUESTO */}
{showRepuestoModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200">
      <h3 className="text-base font-bold text-gray-900 mb-4">Registrar Nuevo Repuesto</h3>
      
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          await axios.post(`${API_URL}/api/repuestos/`, {
            nombre: repuestoForm.nombre,
            descripcion: repuestoForm.descripcion,
            costo: parseFloat(repuestoForm.costo),
            stock: parseInt(repuestoForm.stock)
          });
          toast.success("Repuesto registrado con éxito");
          setShowRepuestoModal(false);
          setRepuestoForm({ nombre: '', descripcion: '', costo: '', stock: '' });
          window.location.reload();
        } catch (error) {
          console.error("Error al registrar repuesto:", error);
          toast.error("Error al registrar el repuesto");
        }
      }} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre del Repuesto</label>
          <input 
            type="text" 
            required
            value={repuestoForm.nombre}
            onChange={(e) => setRepuestoForm({...repuestoForm, nombre: e.target.value})}
            className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
            placeholder="Ej. Pantalla LED 15.6'"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descripción</label>
          <textarea 
            value={repuestoForm.descripcion}
            onChange={(e) => setRepuestoForm({...repuestoForm, descripcion: e.target.value})}
            className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
            placeholder="Detalles adicionales..."
            rows="2"
          ></textarea>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Costo (S/.)</label>
            <input 
              type="number" 
              step="0.01"
              required
              value={repuestoForm.costo}
              onChange={(e) => setRepuestoForm({...repuestoForm, costo: e.target.value})}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Stock Inicial</label>
            <input 
              type="number" 
              required
              value={repuestoForm.stock}
              onChange={(e) => setRepuestoForm({...repuestoForm, stock: e.target.value})}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
              placeholder="10"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button 
            type="button"
            onClick={() => setShowRepuestoModal(false)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer"
          >
            Guardar Repuesto
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* MODAL SOLICITAR SERVICIO (CLIENTE) */}
{showServicioModal && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-8 border border-gray-200">
      <h2 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">Registrar Laptop</h2>
      
      <form onSubmit={handleSolicitarServicio} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Marca</label>
            <input 
              type="text" required placeholder="Ej: HP"
              value={servicioForm.marca}
              onChange={e => setServicioForm({...servicioForm, marca: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Modelo</label>
            <input 
              type="text" required placeholder="Ej: Pavilion 15"
              value={servicioForm.modelo}
              onChange={e => setServicioForm({...servicioForm, modelo: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N° de Serie (Opcional)</label>
            <input 
              type="text"
              value={servicioForm.numero_serie}
              onChange={e => setServicioForm({...servicioForm, numero_serie: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Accesorios</label>
            <input 
              type="text" placeholder="Ej: Cargador original"
              value={servicioForm.accesorios}
              onChange={e => setServicioForm({...servicioForm, accesorios: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descripción de la falla</label>
          <textarea 
            required rows="3"
            value={servicioForm.falla}
            onChange={e => setServicioForm({...servicioForm, falla: e.target.value})}
            placeholder="Describe qué problema presenta tu equipo..."
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none bg-white text-gray-900"
          ></textarea>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={() => setShowServicioModal(false)}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={servicioLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-xs font-bold text-xs disabled:opacity-50 cursor-pointer"
          >
            {servicioLoading ? 'Registrando...' : 'Solicitar Reparación'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    
{/* Custom Confirm Modal for Inhabilitar Técnico */}
{confirmModal.isOpen && (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-gray-200">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-2">
        Inhabilitar Técnico
      </h3>
      <div className="mt-2 text-xs text-gray-500 mb-6 leading-relaxed">
        <p>¿Estás seguro de que deseas inhabilitar a este técnico? Perderá el acceso al sistema, pero se conservará su historial de reparaciones para las auditorías.</p>
      </div>
      <div className="flex justify-center gap-2">
        <button 
          onClick={() => setConfirmModal({ isOpen: false, techId: null })}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-bold text-xs cursor-pointer"
        >
          Cancelar
        </button>
        <button 
          onClick={confirmEliminarTecnico}
          className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs transition font-bold text-xs cursor-pointer"
        >
          Sí, inhabilitar
        </button>
      </div>
    </div>
  </div>
)}

<QRModal code={qrModalCode} onClose={() => setQrModalCode(null)} />

</div>
  );
}