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
  // Si es número de Perú de 9 dígitos sin código de país, antepone 51
  if (soloDigitos.length === 9 && soloDigitos.startsWith("9")) {
    return `51${soloDigitos}`;
  }
  return soloDigitos;
};

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

  // Estados editables por tarjeta
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

  // Paso 1: Resolver de forma remota vía WhatsApp
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

  // Abrir chat de WhatsApp con mensaje prellenado si hay teléfono disponible
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
      (incidente.servicio_id ? `Servicio #${incidente.servicio_id}` : `Incidente #${incidente.id}`);
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

  // Paso 2: Si no se resuelve por WhatsApp, registrar como garantía en SERVICIOS y pasar a Diagnóstico
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

  // Métricas rápidas para tarjetas interactivas
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
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Garantía en Diagnóstico":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resuelto":
        return "bg-slate-200 text-slate-800 border-slate-300";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Gestión de Incidentes y Garantías
            </h1>
            <p className="text-sm text-slate-500">
              Primero intenta resolver vía WhatsApp; si no procede, registra como
              garantía sin costo en Servicios y pasa a Diagnóstico.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={obtenerIncidentes}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition cursor-pointer"
            >
              ↻ Actualizar
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition cursor-pointer"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Tarjetas resumen interactivas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Todos");
              setSoloGarantia(false);
            }}
            className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
              filtroEstado === "Todos" && !soloGarantia
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="text-xs font-semibold opacity-75">Total Incidentes</p>
            <p className="text-2xl font-extrabold mt-1">{totalIncidentes}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Pendiente");
              setSoloGarantia(false);
            }}
            className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
              filtroEstado === "Pendiente"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
            }`}
          >
            <p className="text-xs font-semibold opacity-75">Por Revisar</p>
            <p className="text-2xl font-extrabold mt-1">{totalPendientes}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Resuelto por WhatsApp");
              setSoloGarantia(false);
            }}
            className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
              filtroEstado === "Resuelto por WhatsApp"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white text-slate-800 border-slate-200 hover:border-emerald-300"
            }`}
          >
            <p className="text-xs font-semibold opacity-75">Vía WhatsApp</p>
            <p className="text-2xl font-extrabold mt-1">{totalWhatsApp}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroEstado("Garantía en Diagnóstico");
              setSoloGarantia(false);
            }}
            className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
              filtroEstado === "Garantía en Diagnóstico"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-800 border-slate-200 hover:border-blue-300"
            }`}
          >
            <p className="text-xs font-semibold opacity-75">
              Garantía / Diagnóstico
            </p>
            <p className="text-2xl font-extrabold mt-1">{totalGarantia}</p>
          </button>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS_INCIDENTE.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(estado)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filtroEstado === estado
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {estado}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSoloGarantia((prev) => !prev)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                soloGarantia
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
              }`}
            >
              🛡️ Solo Garantía Costo Cero
            </button>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por OT, falla o categoría..."
              className="w-full lg:w-72 px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {(busqueda || filtroEstado !== "Todos" || soloGarantia) && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstado("Todos");
                  setSoloGarantia(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 cursor-pointer shrink-0"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Alertas de éxito o error */}
        {mensajeExito && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-2">
            <span>{mensajeExito}</span>
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-2">
            <span>{error}</span>
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
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
            Cargando incidentes...
          </div>
        ) : incidentesFiltrados.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-3">
            <p className="text-slate-600 font-medium">
              No hay incidentes que coincidan con el filtro actual.
            </p>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("Todos");
                setSoloGarantia(false);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
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
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition space-y-4"
                >
                  {/* Cabecera de la tarjeta */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-800">
                        Incidente #{item.id}
                      </span>

                      {(item.codigo_orden ||
                        item.orden_codigo ||
                        item.servicio_id) && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                          Servicio / Orden:{" "}
                          {item.codigo_orden ||
                            item.orden_codigo ||
                            `#${item.servicio_id}`}
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
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
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold">
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
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tipo / Categoría: {item.categoria || item.tipo}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      {item.descripcion ||
                        item.falla ||
                        item.motivo ||
                        "Sin descripción registrada."}
                    </p>
                  </div>

                  {/* Panel desplegable de metadatos extra */}
                  {verDetalles && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="font-bold text-slate-700">
                          ID Incidente:
                        </span>{" "}
                        {item.id}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">
                          ID Servicio / Orden:
                        </span>{" "}
                        {item.servicio_id || item.orden_id || "No vinculado"}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">
                          Garantía / Costo Cero:
                        </span>{" "}
                        {item.es_garantia || item.costo_cero ? "Sí" : "No"}
                      </div>
                    </div>
                  )}

                  {/* Notas de seguimiento */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Acciones interactivas */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppSoporte(item)}
                          className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer"
                        >
                          📱 Abrir WhatsApp
                        </button>

                        <button
                          type="button"
                          disabled={estaGuardando}
                          onClick={() => resolverViaWhatsApp(item)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                        >
                          ✓ Resuelto vía WhatsApp
                        </button>

                        <button
                          type="button"
                          disabled={estaGuardando}
                          onClick={() => setConfirmacionGarantia(item)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                        >
                          🛡️ No resuelto → Garantía en Servicios y Diagnóstico
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
                          className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold transition cursor-pointer shrink-0"
                        >
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

        {/* Modal de confirmación para registrar Garantía en SERVICIOS y pasar a Diagnóstico */}
        {confirmacionGarantia && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">
                Confirmar pase a Garantía y Diagnóstico
              </h2>
              <p className="text-sm text-slate-600">
                Al confirmar que no se resolvió por WhatsApp, el incidente{" "}
                <span className="font-bold">#{confirmacionGarantia.id}</span>{" "}
                se registrará como garantía sin costo (
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  es_garantia: true, costo_cero: true
                </code>
                ) y el servicio vinculado pasará a estado{" "}
                <span className="font-bold text-blue-700">Diagnóstico</span>[cite: 2, 3, 4].
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={guardandoId === confirmacionGarantia.id}
                  onClick={() => setConfirmacionGarantia(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={guardandoId === confirmacionGarantia.id}
                  onClick={() =>
                    ejecutarPaseAGarantiaYDiagnostico(confirmacionGarantia)
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
                >
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