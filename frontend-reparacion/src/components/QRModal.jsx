import React from 'react';
import QRCode from 'react-qr-code';

export default function QRModal({ code, onClose }) {
  if (!code) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Código de Servicio</h3>
        <p className="text-brand text-xl font-mono font-bold bg-brand-light/20 py-2 rounded-lg mb-6 tracking-widest">{code}</p>
        <div className="bg-white p-4 inline-block rounded-xl shadow-inner border border-gray-100">
          <QRCode value={code} size={200} />
        </div>
        <p className="text-gray-500 text-sm mt-6 mb-6">Muestra este código al técnico en la sucursal o escanea para seguimiento.</p>
        <button 
          onClick={onClose}
          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-lg transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
