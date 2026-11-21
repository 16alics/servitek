import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ESTADOS_INCIDENTE = [
  "Todos",
  "Pendiente",
  "Resuelto por WhatsApp",
  "Garantía en Diagnóstico",
  "Resuelto",
];

const OPCIONES_ESTADO = ESTADOS_INCIDENTE.filter((e) => e !== "Todos");

const normalizarEstado = (estado) => {
  if (!estado || estado.toLowerCase() === "abierto") return "Pendiente";
  return estado;
};

const limpiarTelefono = (tel) => {
  if (!tel) return "";
  const soloDigitos = String(tel).replace(/\D/g, "");
  if (!soloDigitos) return "";
  if (soloDigitos.length === 9 && soloDigitos.startsWith("9")) {
    return `51${soloDigitos}`;
  }
  return soloDigitos;
};

/* Iconos SVG estilizados */
const IconShieldAlert = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconWhatsApp = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IconCheckCircle = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
    <path d="M22 4 12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconWrenchShield = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m14.5 9.5-5 5" strokeLinecap="round" />
    <path d="M9.5 9.5h5v5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRefresh = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" />
    <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" strokeLinecap="round" />
    <path d="M16 16h5v5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconArrowLeft = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 19-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 12H5" strokeLinecap="round" />
  </svg>
);

const IconSearch = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
  </svg>
);

const IconSave = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const IconInbox = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IconClock = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" strokeLinecap="round" />
  </svg>
);

export default function GestionIncidentes() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [soloGarantia, setSoloGarantia] = useState(false);
  const [guardandoId, setGuardandoId] = useState(null);

  const [notasEditables, setNotasEditables] = useState({});
  const [estadosEditables, setEstadosEditables] = useState({});
  const [incidenteExpandido, setIncidenteExpandido] = useState({});
  const [confirmacionGarantia, setConfirmacionGarantia] = useState(null);

  const obtenerHeaders = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const obtenerIncidentes = async () => {
    setLoading(true);
    setError("");
    setMensajeExito("");
    try {
      const res = await axios.get(`${API_URL}/api/incidentes/`, {
        headers: obtenerHeaders(),
      });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setIncidentes(data);

      const notasIniciales = {};
      const estadosIniciales = {};
      data.forEach((item) => {
        notasIniciales[item.id] =
          item.notas_resolucion || item.resolucion || item.observacion || "";
        estadosIniciales[item.id] = normalizarEstado(item.estado);
      });
      setNotasEditables(notasIniciales);
      setEstadosEditables(estadosIniciales);
    } catch (err) {
      console.error("Error al obtener incidentes:", err);
      setError(
        err?.response?.data?.detail ||
          "No se pudieron cargar los incidentes desde el servidor."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerIncidentes();
  }, []);

  const actualizarIncidente = async (
    incidente,
    nuevoEstado,
    extraPayload = {}
  ) => {
    setGuardandoId(incidente.id);
    setError("");
    setMensajeExito("");
    try {
      const notaActual = notasEditables[incidente.id] ?? "";
      const estadoLimpio = normalizarEstado(nuevoEstado);
      const payload = {
        estado: estadoLimpio,
        notas_resolucion: notaActual,
        ...extraPayload,
      };

      await axios.patch(`${API_URL}/api/incidentes/${incidente.id}`, payload, {
        headers: obtenerHeaders(),
      });

      setEstadosEditables((prev) => ({
        ...prev,
        [incidente.id]: estadoLimpio,
      }));

      setIncidentes((prev) =>
        prev.map((item) =>
          item.id === incidente.id
            ? {
                ...item,
                ...payload,
              }
            : item
        )
      );

      setMensajeExito(
        `Incidente #${incidente.id} actualizado a "${estadoLimpio}".`
      );
    } catch (err) {
      console.error("Error al actualizar incidente:", err);
      setError(
        err?.response?.data?.detail ||
          "No se pudo actualizar el estado del incidente."
      );
    } finally {
      setGuardandoId(null);
    }
  };

  const resolverViaWhatsApp = async (incidente) => {
    const notaWhatsApp =
      (notasEditables[incidente.id] ?? "").trim() ||
      "Solucionado remotamente vía WhatsApp (soporte inicial).";

    setNotasEditables((prev) => ({
      ...prev,
      [incidente.id]: notaWhatsApp,
    }));

    await actualizarIncidente(incidente, "Resuelto por WhatsApp", {
      resuelto_whatsapp: true,
      notas_resolucion: notaWhatsApp,
    });
  };

  const abrirWhatsAppSoporte = (incidente) => {
    const telefono = limpiarTelefono(
      incidente.telefono ||
        incidente.celular ||
        incidente.cliente_telefono ||
        incidente.whatsapp
    );
    const ordenRef =
      incidente.codigo_orden ||
      incidente.orden_codigo ||
      (incidente.servicio_id
        ? `Servicio #${incidente.servicio_id}`
        : `Incidente #${incidente.id}`);
    const texto = encodeURIComponent(
      `Hola, te contactamos de Servitek sobre tu reporte (${ordenRef}) respecto a: ${
        incidente.descripcion || incidente.falla || "incidente reportado"
      }. ¿Podemos ayudarte con una revisión rápida por aquí?`
    );

    const url = telefono
      ? `https://wa.me/${telefono}?text=${texto}`
      : `https://wa.me/?text=${texto}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const ejecutarPaseAGarantiaYDiagnostico = async (incidente) => {
    setGuardandoId(incidente.id);
    setError("");
    setMensajeExito("");
    try {
      const headers = obtenerHeaders();
      const notaGarantia =
        (notasEditables[incidente.id] ?? "").trim() ||
        "No resuelto por WhatsApp; registrado como garantía en Servicios y enviado a Diagnóstico.";

      const payloadIncidente = {
        estado: "Garantía en Diagnóstico",
        es_garantia: true,
        costo_cero: true,
        notas_resolucion: notaGarantia,
      };

      await axios.patch(
        `${API_URL}/api/incidentes/${incidente.id}`,
        payloadIncidente,
        { headers }
      );

      const servicioId = incidente.servicio_id || incidente.orden_id;
      if (servicioId) {
        await axios.patch(
          `${API_URL}/api/servicios/${servicioId}`,
          {
            estado: "Diagnóstico",
            es_garantia: true,
            costo_cero: true,
            motivo_garantia: notaGarantia,
          },
          { headers }
        );
      }

      setNotasEditables((prev) => ({
        ...prev,
        [incidente.id]: notaGarantia,
      }));
      setEstadosEditables((prev) => ({
        ...prev,
        [incidente.id]: "Garantía en Diagnóstico",
      }));

      setIncidentes((prev) =>
        prev.map((item) =>
          item.id === incidente.id
            ? {
                ...item,
                ...payloadIncidente,
              }
            : item
        )
      );

      setConfirmacionGarantia(null);
      setMensajeExito(
        servicioId
          ? `Incidente #${incidente.id} registrado como garantía en el servicio #${servicioId} y enviado a Diagnóstico.`
          : `Incidente #${incidente.id} marcado como garantía en Diagnóstico.`
      );
    } catch (err) {
      console.error("Error al registrar garantía y pasar a diagnóstico:", err);
      setError(
        err?.response?.data?.detail ||
          "No se pudo registrar como garantía en Servicios ni pasar a Diagnóstico."
      );
    } finally {
      setGuardandoId(null);
    }
  };

  const toggleDetalles = (id) => {
    setIncidenteExpandido((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalIncidentes = incidentes.length;
  const totalPendientes = incidentes.filter(
    (i) => normalizarEstado(i.estado) === "Pendiente"
  ).length;
  const totalWhatsApp = incidentes.filter(
    (i) => normalizarEstado(i.estado) === "Resuelto por WhatsApp"
  ).length;
  const totalGarantia = incidentes.filter(
    (i) =>
      normalizarEstado(i.estado) === "Garantía en Diagnóstico" ||
      Boolean(i.es_garantia)
  ).length;

  const incidentesFiltrados = incidentes.filter((item) => {
    const estadoActual = normalizarEstado(item.estado);
    const coincideEstado =
      filtroEstado === "Todos" ||
      estadoActual.toLowerCase() === filtroEstado.toLowerCase();

    const coincideGarantia =
      !soloGarantia || Boolean(item.es_garantia || item.costo_cero);

    const texto = busqueda.trim().toLowerCase();
    const codigoOrden = String(
      item.codigo_orden || item.orden_codigo || item.servicio_id || ""
    ).toLowerCase();
    const descripcion = String(
      item.descripcion || item.falla || item.motivo || ""
    ).toLowerCase();
    const categoria = String(item.categoria || item.tipo || "").toLowerCase();

    const coincideTexto =
      !texto ||
      codigoOrden.includes(texto) ||
      descripcion.includes(texto) ||
      categoria.includes(texto);

    return coincideEstado && coincideGarantia && coincideTexto;
  });

  const badgeEstadoEstilo = (estado) => {
    switch (estado) {
      case "Resuelto por WhatsApp":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10";
      case "Garantía en Diagnóstico":
        return "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-600/10";
      case "Resuelto":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-600/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-amber-50/30 p-5 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado estilizado */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-sm border border-slate-200/80 p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <IconShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
                  Gestión de Incidentes y Garantías
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  Servitek ITSM
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Evalúa primero soporte remoto vía WhatsApp; si no se resuelve,
                registra como garantía sin costo en Servicios y pasa a Diagnóstico[cite: 3, 4].
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={obtenerIncidentes}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-95"
            >
              <IconRefresh className="w-4 h-4" />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer active:scale-95"
            >
              <IconArrowLeft className="w-4 h-4" />
              Volver
            </button>
          </div>
        </div>

        {/* Tarjetas resumen con iconos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Todos");
              setSoloGarantia(false);
            }}
            className={`group text-left p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
              filtroEstado === "Todos" && !soloGarantia
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-75">
                Total Incidentes
              </span>
              <span
                className={`p-2 rounded-xl ${
                  filtroEstado === "Todos" && !soloGarantia
                    ? "bg-white/10 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <IconInbox className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold mt-2">
              {totalIncidentes}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Pendiente");
              setSoloGarantia(false);
            }}
            className={`group text-left p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
              filtroEstado === "Pendiente"
                ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-amber-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-80">
                Por Revisar
              </span>
              <span
                className={`p-2 rounded-xl ${
                  filtroEstado === "Pendiente"
                    ? "bg-white/15 text-white"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                <IconClock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold mt-2">
              {totalPendientes}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Resuelto por WhatsApp");
              setSoloGarantia(false);
            }}
            className={`group text-left p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
              filtroEstado === "Resuelto por WhatsApp"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-emerald-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-80">
                Vía WhatsApp
              </span>
              <span
                className={`p-2 rounded-xl ${
                  filtroEstado === "Resuelto por WhatsApp"
                    ? "bg-white/15 text-white"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <IconWhatsApp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold mt-2">
              {totalWhatsApp}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Garantía en Diagnóstico");
              setSoloGarantia(false);
            }}
            className={`group text-left p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${
              filtroEstado === "Garantía en Diagnóstico"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-blue-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-80">
                Garantía / Diagnóstico
              </span>
              <span
                className={`p-2 rounded-xl ${
                  filtroEstado === "Garantía en Diagnóstico"
                    ? "bg-white/15 text-white"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <IconWrenchShield className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold mt-2">
              {totalGarantia}
            </p>
          </button>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS_INCIDENTE.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(estado)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filtroEstado === estado
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {estado}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSoloGarantia((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                soloGarantia
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
              }`}
            >
              <IconWrenchShield className="w-3.5 h-3.5" />
              Solo Garantía Costo Cero
            </button>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full lg:w-72">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por OT, falla o categoría..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
            {(busqueda || filtroEstado !== "Todos" || soloGarantia) && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstado("Todos");
                  setSoloGarantia(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 cursor-pointer shrink-0 transition"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Alertas */}
        {mensajeExito && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
            <button
              type="button"
              onClick={() => setMensajeExito("")}
              className="text-xs font-bold underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl text-sm flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <IconShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-xs font-bold underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Listado */}
        {loading ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200/80 text-center text-slate-500 text-sm">
            Cargando incidentes...
          </div>
        ) : incidentesFiltrados.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <IconInbox className="w-6 h-6" />
            </div>
            <p className="text-slate-700 font-semibold">
              No hay incidentes que coincidan con el filtro actual.
            </p>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("Todos");
                setSoloGarantia(false);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition"
            >
              Ver todos los incidentes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incidentesFiltrados.map((item) => {
              const estadoActual = normalizarEstado(item.estado);
              const estadoSeleccionado =
                estadosEditables[item.id] ?? estadoActual;
              const prioridad = item.prioridad || "P1";
              const estaGuardando = guardandoId === item.id;
              const verDetalles = Boolean(incidenteExpandido[item.id]);

              return (
                <div
                  key={item.id}
                  className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition space-y-4"
                >
                  {/* Cabecera */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900">
                        Incidente #{item.id}
                      </span>

                      {(item.codigo_orden ||
                        item.orden_codigo ||
                        item.servicio_id) && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 text-xs font-semibold">
                          Servicio / Orden:{" "}
                          {item.codigo_orden ||
                            item.orden_codigo ||
                            `#${item.servicio_id}`}
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold">
                        Prioridad: {prioridad}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeEstadoEstilo(
                          estadoActual
                        )}`}
                      >
                        {estadoActual}
                      </span>

                      {(item.es_garantia || item.costo_cero) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold">
                          <IconWrenchShield className="w-3.5 h-3.5" />
                          Garantía Costo Cero
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {item.fecha_creacion && (
                        <span className="text-xs text-slate-400">
                          {new Date(item.fecha_creacion).toLocaleString()}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleDetalles(item.id)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        {verDetalles ? "Ocultar detalles" : "Ver detalles"}
                      </button>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1">
                    {(item.categoria || item.tipo) && (
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tipo / Categoría: {item.categoria || item.tipo}
                      </p>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {item.descripcion ||
                        item.falla ||
                        item.motivo ||
                        "Sin descripción registrada."}
                    </p>
                  </div>

                  {/* Detalles expandibles */}
                  {verDetalles && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="font-bold text-slate-800">
                          ID Incidente:
                        </span>{" "}
                        {item.id}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">
                          ID Servicio / Orden:
                        </span>{" "}
                        {item.servicio_id || item.orden_id || "No vinculado"}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">
                          Garantía / Costo Cero:
                        </span>{" "}
                        {item.es_garantia || item.costo_cero ? "Sí" : "No"}
                      </div>
                    </div>
                  )}

                  {/* Notas y acciones */}
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Notas de atención WhatsApp / Garantía / Diagnóstico
                      </label>
                      <input
                        type="text"
                        value={notasEditables[item.id] ?? ""}
                        onChange={(e) =>
                          setNotasEditables((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Anota lo probado por WhatsApp o el motivo del pase a garantía en Servicios..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppSoporte(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer active:scale-95"
                        >
                          <IconWhatsApp className="w-4 h-4" />
                          Abrir WhatsApp
                        </button>

                        <button
                          type="button"
                          disabled={estaGuardando}
                          onClick={() => resolverViaWhatsApp(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
                        >
                          <IconCheckCircle className="w-4 h-4" />
                          Resuelto vía WhatsApp
                        </button>

                        <button
                          type="button"
                          disabled={estaGuardando}
                          onClick={() => setConfirmacionGarantia(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
                        >
                          <IconWrenchShield className="w-4 h-4" />
                          No resuelto → Garantía en Servicios y Diagnóstico
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={estadoSeleccionado}
                          disabled={estaGuardando}
                          onChange={(e) =>
                            setEstadosEditables((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          {OPCIONES_ESTADO.map((est) => (
                            <option key={est} value={est}>
                              {est}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={estaGuardando}
                          onClick={() =>
                            actualizarIncidente(item, estadoSeleccionado)
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition cursor-pointer shrink-0 active:scale-95"
                        >
                          <IconSave className="w-4 h-4" />
                          {estaGuardando ? "..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de confirmación */}
        {confirmacionGarantia && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <IconWrenchShield className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Confirmar pase a Garantía y Diagnóstico
                </h2>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Al confirmar que no se resolvió por WhatsApp, el incidente{" "}
                <span className="font-bold text-slate-900">
                  #{confirmacionGarantia.id}
                </span>{" "}
                se registrará como garantía sin costo (
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                  es_garantia: true, costo_cero: true
                </code>
                ) y el servicio vinculado pasará a estado{" "}
                <span className="font-bold text-blue-700">Diagnóstico</span>[cite: 3, 4].
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={guardandoId === confirmacionGarantia.id}
                  onClick={() => setConfirmacionGarantia(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={guardandoId === confirmacionGarantia.id}
                  onClick={() =>
                    ejecutarPaseAGarantiaYDiagnostico(confirmacionGarantia)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer transition"
                >
                  <IconWrenchShield className="w-4 h-4" />
                  {guardandoId === confirmacionGarantia.id
                    ? "Procesando..."
                    : "Confirmar y pasar a Diagnóstico"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}