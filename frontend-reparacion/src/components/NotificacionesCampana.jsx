import React, { useState } from 'react';

export function NotificacionesCampana({ servicios }) {
  const [abierto, setAbierto] = useState(false);

  const listaNotificaciones = Array.isArray(servicios) ? servicios.map((s) => {
    const fecha = s.fecha_ingreso ? new Date(s.fecha_ingreso).toLocaleDateString() : 'Reciente';
    
    // Extracción robusta del nombre del equipo (sea texto plano u objeto)
    let equipoNombre = 'Equipo en taller';
    if (typeof s.equipo === 'object' && s.equipo !== null) {
      equipoNombre = `${s.equipo.marca || ''} ${s.equipo.modelo || ''}`.trim() || 'Equipo en taller';
    } else if (typeof s.equipo === 'string') {
      equipoNombre = s.equipo;
    } else if (s.marca) {
      equipoNombre = `${s.marca} ${s.modelo || ''}`.trim();
    }

    return {
      id: s.id || s._id,
      titulo: `Orden OT-${s.id} (${s.estado || 'Proceso'})`,
      mensaje: `Equipo: ${equipoNombre}. Falla: ${s.falla || 'Sin detalle'}.`,
      fecha: fecha
    };
  }) : [];

  const totalNotificaciones = listaNotificaciones.length;

  return (
    <div className="relative">
      <button 
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer flex items-center justify-center shadow-sm"
        title="Ver Notificaciones"
      >
        <span className="text-base">🔔</span>
        {totalNotificaciones > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow animate-pulse">
            {totalNotificaciones}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-gray-800">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h4 className="font-bold text-sm text-gray-800">Centro de Notificaciones</h4>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
              {totalNotificaciones} avisos activos
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 p-2 text-left">
            {totalNotificaciones === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No hay notificaciones pendientes.</p>
            ) : (
              listaNotificaciones.map((n, index) => (
                <div key={`notif-${n.id || index}`} className="p-3 hover:bg-gray-50 rounded-xl transition">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-gray-800">{n.titulo}</span>
                    <span className="text-[10px] text-gray-400">{n.fecha}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{n.mensaje}</p>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-50 px-4 py-2 border-t text-center">
            <span className="text-[10px] text-gray-400">Actualizado en tiempo real desde tus órdenes</span>
          </div>
        </div>
      )}
    </div>
  );
}