import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ESTADOS_INCIDENTE = [
  "Todos",
  "Abierto",
  "En revisión WhatsApp",
  "Resuelto por WhatsApp",
  "Garantía en Diagnóstico",
  "Resuelto",
];

export default function GestionIncidentes() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [guardandoId, setGuardandoId] = useState(null);
  const [notasEditables, setNotasEditables] = useState({});

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
      data.forEach((item) => {
        notasIniciales[item.id] =
          item.notas_resolucion || item.resolucion || item.observacion || "";
      });
      setNotasEditables(notasIniciales);
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
      const payload = {
        estado: nuevoEstado,
        notas_resolucion: notaActual,
        ...extraPayload,
      };

      await axios.patch(`${API_URL}/api/incidentes/${incidente.id}`, payload, {
        headers: obtenerHeaders(),
      });

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
        `Incidente #${incidente.id} actualizado a "${nuevoEstado}".`
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

  // Paso 1: Intentar resolver de forma remota vía WhatsApp
  const resolverViaWhatsApp = async (incidente) => {
    const notaWhatsApp =
      (notasEditables[incidente.id] ?? "").trim() ||
      "Solucionado remotamente vía WhatsApp.";

    setNotasEditables((prev) => ({
      ...prev,
      [incidente.id]: notaWhatsApp,
    }));

    await actualizarIncidente(incidente, "Resuelto por WhatsApp", {
      resuelto_whatsapp: true,
      notas_resolucion: notaWhatsApp,
    });
  };

  // Paso 2: Si no se resuelve por WhatsApp, registrar como garantía en SERVICIOS y pasar a Diagnóstico
  const pasarAGarantiaYDiagnostico = async (incidente) => {
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

  const incidentesFiltrados = incidentes.filter((item) => {
    const estadoActual = item.estado || "Abierto";
    const coincideEstado =
      filtroEstado === "Todos" ||
      estadoActual.toLowerCase() === filtroEstado.toLowerCase();

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

    return coincideEstado && coincideTexto;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Gestión de Incidentes y Garantías
            </h1>
            <p className="text-sm text-slate-500">
              Primero evalúa si se resuelve vía WhatsApp; si no, registra como
              garantía sin costo en Servicios y pasa a Diagnóstico[cite: 2, 3, 4].
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={obtenerIncidentes}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition cursor-pointer"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition cursor-pointer"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex flex-wrap gap-2">
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
          </div>

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por OT, falla o categoría..."
            className="w-full md:w-72 px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {mensajeExito && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
            {mensajeExito}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
            Cargando incidentes...
          </div>
        ) : incidentesFiltrados.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
            No hay incidentes que coincidan con el filtro seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incidentesFiltrados.map((item) => {
              const estadoActual = item.estado || "Abierto";
              const prioridad = item.prioridad || "P1";

              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4"
                >
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
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                        Prioridad: {prioridad}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        Estado: {estadoActual}
                      </span>
                      {(item.es_garantia || item.costo_cero) && (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold">
                          Garantía Costo Cero
                        </span>
                      )}
                    </div>

                    {item.fecha_creacion && (
                      <span className="text-xs text-slate-400">
                        {new Date(item.fecha_creacion).toLocaleString()}
                      </span>
                    )}
                  </div>

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

                  <div className="space-y-3 pt-2">
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
                        placeholder="Indica qué se probó por WhatsApp o el motivo del pase a garantía..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Acciones principales del flujo */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={guardandoId === item.id}
                          onClick={() => resolverViaWhatsApp(item)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                        >
                          💬 Resuelto vía WhatsApp
                        </button>

                        <button
                          type="button"
                          disabled={guardandoId === item.id}
                          onClick={() => pasarAGarantiaYDiagnostico(item)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                        >
                          🛡️ No resuelto → Garantía en Servicios y Diagnóstico
                        </button>
                      </div>

                      {/* Ajuste manual de estado y guardado */}
                      <div className="flex items-center gap-2">
                        <select
                          value={estadoActual}
                          disabled={guardandoId === item.id}
                          onChange={(e) =>
                            actualizarIncidente(item, e.target.value)
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {ESTADOS_INCIDENTE.filter((e) => e !== "Todos").map(
                            (est) => (
                              <option key={est} value={est}>
                                {est}
                              </option>
                            )
                          )}
                        </select>

                        <button
                          type="button"
                          disabled={guardandoId === item.id}
                          onClick={() =>
                            actualizarIncidente(item, estadoActual)
                          }
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold transition cursor-pointer shrink-0"
                        >
                          {guardandoId === item.id ? "..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}