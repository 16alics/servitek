import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function TecnicosAdmin() {
  const navigate = useNavigate();
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales y formularios
  const [showTechModal, setShowTechModal] = useState(false);
  const [editingTechId, setEditingTechId] = useState(null);
  const [techForm, setTechForm] = useState({
    nombre_completo: '',
    especialidad: '',
    email: '',
    password: ''
  });

const API_URL = import.meta.env.VITE_API_URL;
 

  // Cargar lista de técnicos
  const fetchTecnicos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tecnicos`);
      setTecnicos(response.data);
    } catch (error) {
      console.error("Error al cargar técnicos:", error);
      toast.error("No se pudo cargar la lista de técnicos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTecnicos();
  }, []);

  // Guardar o Actualizar Técnico
  const handleSaveTech = async (e) => {
    e.preventDefault();
    try {
      if (editingTechId) {
        // Actualizar
        await axios.put(`${API_URL}/api/tecnicos/${editingTechId}`, techForm);
        toast.success("¡Técnico actualizado con éxito!");
      } else {
        // Crear nuevo
        await axios.post(`${API_URL}/api/tecnicos`, techForm);
        toast.success("¡Técnico registrado con éxito!");
      }
      setShowTechModal(false);
      setEditingTechId(null);
      setTechForm({ nombre_completo: '', especialidad: '', email: '', password: '' });
      fetchTecnicos();
    } catch (error) {
      console.error("Error al guardar técnico:", error);
      toast.error("Error al procesar la operación");
    }
  };

  // Cambiar Estado (Activo / Inactivo)
  const handleToggleEstadoTecnico = async (t) => {
    try {
      await axios.put(`${API_URL}/api/tecnicos/${t.id}/estado`, { activo: !t.activo });
      toast.success(`Técnico ${t.activo ? 'inhabilitado' : 'activado'} correctamente`);
      fetchTecnicos();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast.error("No se pudo cambiar el estado");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold mb-2 inline-block cursor-pointer"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-2xl font-black text-gray-900">Directorio de Técnicos</h1>
        </div>
        <button 
          onClick={() => {
            setTechForm({ nombre_completo: '', especialidad: '', email: '', password: '' });
            setEditingTechId(null);
            setShowTechModal(true);
          }}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition shadow-sm font-bold cursor-pointer"
        >
          + Nuevo Técnico
        </button>
      </div>

      {/* Tabla de Técnicos */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-gray-600">
            <thead className="bg-gray-50 uppercase text-gray-700 font-bold tracking-wider">
              <tr>
                <th className="p-4">Nombre / Correo</th>
                <th className="p-4">Especialidad</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-6 text-gray-400 italic">Cargando técnicos...</td></tr>
              ) : tecnicos.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-6 text-gray-400 italic">No hay técnicos registrados.</td></tr>
              ) : (
                tecnicos.map((t) => (
                  <tr key={`tec-${t.id}`} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 text-sm">{t.nombre_completo || t.nombre}</p>
                      <p className="text-xs text-gray-500">{t.email}</p>
                    </td>
                    <td className="p-4 font-medium text-gray-800">{t.especialidad || 'General'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${t.activo !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {t.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button 
                        onClick={() => {
                          setTechForm({ 
                            nombre_completo: t.nombre_completo || t.nombre || '', 
                            especialidad: t.especialidad || '', 
                            email: t.email || '', 
                            password: '' 
                          });
                          setEditingTechId(t.id);
                          setShowTechModal(true);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition cursor-pointer"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleToggleEstadoTecnico(t)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${t.activo !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      >
                        {t.activo !== false ? 'Inhabilitar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR TÉCNICO */}
      {showTechModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingTechId ? 'Editar Técnico' : 'Registrar Nuevo Técnico'}
            </h3>
            
            <form onSubmit={handleSaveTech} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={techForm.nombre_completo}
                  onChange={(e) => setTechForm({...techForm, nombre_completo: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Especialidad</label>
                <input 
                  type="text" 
                  value={techForm.especialidad}
                  onChange={(e) => setTechForm({...techForm, especialidad: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                  placeholder="Ej. Software, Hardware, Mac..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required
                  value={techForm.email}
                  onChange={(e) => setTechForm({...techForm, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {editingTechId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                </label>
                <input 
                  type="password" 
                  {...(!editingTechId ? { required: true } : {})}
                  value={techForm.password}
                  onChange={(e) => setTechForm({...techForm, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
                >
                  {editingTechId ? 'Guardar Cambios' : 'Registrar Técnico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}