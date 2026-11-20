import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ModalReportarIncidente({
  isOpen,
  orden,
  usuarioActual,
  onClose,
  onSuccess,
}) {
  const [categoria, setCategoria] = useState("Hardware / Componente Reparado");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!isOpen || !orden) return null;

  const handleEnviarIncidente = async (e) => {
    e.preventDefault();

    if (!descripcion.trim()) {
      alert("Por favor, describe el problema detectado.");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        servicio_id: orden.id,
        orden_id: orden.id,
        usuario_id: usuarioActual?.id ?? 1,
        categoria,
        descripcion: descripcion.trim(),
        canal_reporte: "Web",
      };

      const res = await fetch(`${API_URL}/api/incidentes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "No se pudo registrar el incidente.");
      }

      const alerta =
        res.headers.get("X-Alerta") ||
        data?.alerta ||
        "Se registró el incidente correctamente.";

      setDescripcion("");
      onClose();
      if (onSuccess) onSuccess(alerta);
    } catch (err) {
      alert(err.message || "Error al registrar el incidente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0b132b] text-white border border-slate-700/70 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            ⚠️ Reportar Incidente / Garantía
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3 text-xs text-emerald-300 flex items-center gap-2">
          <span>🛡️</span>
          <span>
            Orden <strong>{orden.codigo || `OT-${orden.id}`}</strong> — Validación
            de garantía activa / Prioridad P1 (Atención &lt; 1h).
          </span>
        </div>

        <form onSubmit={handleEnviarIncidente} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Categoría de la Falla
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Hardware / Componente Reparado">
                Hardware / Componente Reparado
              </option>
              <option value="Software / Sistema Operativo">
                Software / Sistema Operativo
              </option>
              <option value="Falla Recidivante">Falla Recidivante</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Describe el problema detectado
            </label>
            <textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: El equipo volvió a presentar reinicios inesperados después de la entrega..."
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white cursor-pointer disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar Reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}