import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { toast } from 'react-toastify';
export default function ReportesAdmin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  const pdfRef = useRef();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('https://servitek.vercel.app/api/servicios/estadisticas/admin');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    
    // Dynamically load jsPDF and autoTable if not present
    if (!window.jspdf) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });
      await new Promise((resolve) => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
        script2.onload = resolve;
        document.body.appendChild(script2);
      });
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Add Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Auditoria y Trazabilidad', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 27);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 50, 50); // Red color for Confidencial
      doc.text('CONFIDENCIAL', 150, 20);

      // Table data
      const tableColumn = ["Fecha", "Código", "Cliente", "Técnico", "Estado", "Costo (S/)"];
      const tableRows = [];

      if (stats && stats.trazabilidad) {
        stats.trazabilidad.forEach(t => {
          const rowData = [
            t.fecha,
            t.codigo,
            t.cliente,
            t.tecnico,
            t.estado,
            `S/ ${t.costo > 0 ? t.costo.toFixed(2) : '0.00'}`
          ];
          tableRows.push(rowData);
        });
      }

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold', textColor: [39, 174, 96] }
        }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          'Documento Oficial de Auditoría - Generado automáticamente por el Sistema',
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      doc.save('Reporte_Auditoria_Trazabilidad.pdf');
    } catch (err) {
      console.error("PDF Error:", err);
      toast.error("Error al crear el PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando reportes...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Error al cargar estadísticas</div>;

  const totalServicios = Object.values(stats.servicios_por_estado).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full print:p-0 print:max-w-full">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-3xl font-extrabold text-gray-800">Reportería y Auditoría</h1>
          <div className="flex gap-4">
            <button 
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded shadow transition font-medium print:hidden disabled:opacity-50"
            >
              {isExporting ? 'Generando PDF...' : '🖨️ Descargar PDF'}
            </button>
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="text-gray-500 hover:text-gray-800 transition font-medium print:hidden"
            >
              ← Volver
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-brand">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Servicios Historicos</h3>
            <p className="text-4xl font-extrabold text-gray-800">{totalServicios}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Ingresos Generados</h3>
            <p className="text-4xl font-extrabold text-green-600">S/ {stats.ingresos_totales.toFixed(2)}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Técnicos Activos</h3>
            <p className="text-4xl font-extrabold text-blue-600">{Object.keys(stats.productividad_tecnicos).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:hidden">
          {/* Reporte 1: Estados */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Distribución por Estados</h2>
            <div className="space-y-4">
              {Object.entries(stats.servicios_por_estado).map(([estado, count]) => {
                const percentage = totalServicios === 0 ? 0 : Math.round((count / totalServicios) * 100);
                return (
                  <div key={estado}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-700">{estado}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-brand h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reporte 2: Productividad */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Productividad por Técnico</h2>
            <div className="space-y-6">
              {Object.entries(stats.productividad_tecnicos).map(([tecnico, data]) => {
                const completionRate = data.asignados === 0 ? 0 : Math.round((data.completados / data.asignados) * 100);
                return (
                  <div key={tecnico} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800">{tecnico}</span>
                      <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                        {data.completados} / {data.asignados} Completados
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${completionRate > 80 ? 'bg-green-500' : completionRate > 40 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${completionRate}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reporte 4: Trazabilidad (ESTO ES LO QUE SE EXPORTA A PDF) */}
        <div ref={pdfRef} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:border-none print:shadow-none">
          {/* Print Only Header (Visible during export) */}
          <div className={`${isExporting ? 'flex' : 'hidden print:flex'} justify-between items-center border-b-2 border-black pb-4 mb-6`}>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black">Reporte de Auditoría y Trazabilidad</h1>
              <p className="text-sm text-gray-600">Generado el: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>
            <h2 className="text-3xl font-black text-gray-300">CONFIDENCIAL</h2>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-4 print:text-lg print:mb-2">Trazabilidad de Equipos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 print:text-xs print:text-black">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 print:bg-white print:border-b print:border-black">
                <tr>
                  <th className="px-4 py-3 print:px-1 print:py-1">Fecha</th>
                  <th className="px-4 py-3 print:px-1 print:py-1">Código</th>
                  <th className="px-4 py-3 print:px-1 print:py-1">Cliente</th>
                  <th className="px-4 py-3 print:px-1 print:py-1">Técnico</th>
                  <th className="px-4 py-3 print:px-1 print:py-1">Estado</th>
                  <th className="px-4 py-3 print:px-1 print:py-1 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {stats.trazabilidad?.map((t, idx) => (
                  <tr key={idx} className="border-b print:border-gray-300">
                    <td className="px-4 py-3 print:px-1 print:py-1">{t.fecha}</td>
                    <td className="px-4 py-3 print:px-1 print:py-1 font-medium text-gray-900 print:text-black">{t.codigo}</td>
                    <td className="px-4 py-3 print:px-1 print:py-1 font-bold">{t.cliente}</td>
                    <td className="px-4 py-3 print:px-1 print:py-1">{t.tecnico}</td>
                    <td className="px-4 py-3 print:px-1 print:py-1">{t.estado}</td>
                    <td className="px-4 py-3 print:px-1 print:py-1 text-right font-bold text-green-600 print:text-black">
                      S/ {t.costo > 0 ? t.costo.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer inside PDF */}
          <footer className={`${isExporting ? 'block' : 'hidden print:block'} mt-12 text-center text-gray-400 text-sm`}>
            <p>Documento Oficial de Auditoría - Generado automáticamente por el Sistema</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
