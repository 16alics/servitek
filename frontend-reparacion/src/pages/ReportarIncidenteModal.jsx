import React, { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, X, ShieldCheck } from 'lucide-react';

export default function ReportarIncidenteModal({ orden, onClose, onSuccess }) {
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Hardware');
  const [enviando, setEnviando] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setEnviando(true);

  // Define o recupera el token aquí mismo dentro de la función
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");

  try {
    const response = await fetch("https://servitek.onrender.com/incidentes/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // Aquí ya estará disponible
      },
      body: JSON.stringify({
        orden_id: orden.id,
        usuario_id: usuarioActual.id,
        descripcion: descripcion,
        categoria: categoria,
        canal_reporte: "Web",
        prioridad: "P1"
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Error al registrar el incidente");
    }

    alert("¡Incidente registrado con éxito!");
    onClose();
  } catch (error) {
    console.error(error);
    alert("No se pudo registrar el incidente: " + error.message);
  } finally {
    setEnviando(false);
  }
};
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <h3>Reportar Incidente / Garantía</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-emerald-950/50 border border-emerald-700/40 rounded-xl p-3 mb-4 flex items-center gap-2.5 text-xs text-emerald-300">
          <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
          {/* Usamos orden.codigo para que coincida con el backend */}
          <span>Orden <strong>{orden.codigo || orden.codigo_orden}</strong> cubierta por garantía sin costo (Prioridad P1 - Atención &lt; 1h).</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Categoría de la Falla</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="Hardware">Hardware / Componente Reparado</option>
              <option value="Software / Portal Web">Software / Sistema Operativo</option>
              <option value="Trazabilidad y QR">Trazabilidad y Código QR</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Describe el problema detectado</label>
            <textarea
              required
              rows="3"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: El equipo volvió a presentar reinicios inesperados después de la entrega..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-xl text-white cursor-pointer"
            >
              {enviando ? 'Registrando...' : 'Enviar Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}