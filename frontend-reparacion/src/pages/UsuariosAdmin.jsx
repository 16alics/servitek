import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header'; // O ajusta la ruta de tu Header
import axios from 'axios';

import { toast } from 'react-toastify';


export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    rol: '',
    especialidad: ''
  });
  // Estados para modales de edición/password
  const [modalPasswordOpen, setModalPasswordOpen] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
 
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
const handleResetAutomatico = async (idUsuario) => {
  try {
    const token = localStorage.getItem('token');
    
    // Llamada al endpoint backend que genera clave temporal + envía correo vía Brevo + marca primer_ingreso = True
    const response = await axios.post(
      `${API_URL}/api/usuarios/admin/reset-password-automatico/${idUsuario}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    toast.success(response.data.mensaje || "¡Clave temporal enviada al correo del usuario!");
    setModalPasswordOpen(false);
  } catch (err) {
    toast.error(err.response?.data?.detail || "Error al enviar la clave temporal");
  }
};
  // 1. Cargar usuarios del sistema
  const fetchUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/usuarios/`, { // Ajusta tu endpoint backend
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // 2. Cambiar Rol de Usuario
  const handleCambiarRol = async (id, nuevoRol) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}/rol`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rol: nuevoRol })
      });
      if (res.ok) fetchUsuarios();
    } catch (error) {
      console.error("Error al cambiar rol:", error);
    }
  };

  // 3. Activar / Inhabilitar Cuenta
  const handleToggleEstado = async (id, estadoActual) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}/estado`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ activo: !estadoActual })
      });
      if (res.ok) fetchUsuarios();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  // 4. Restablecer Contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${usuarioSeleccionado.id}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ password: nuevaPassword })
      });
      if (res.ok) {
        toast.success("Contraseña restablecida con éxito");
        setModalPasswordOpen(false);
        setNuevaPassword('');
        setUsuarioSeleccionado(null);
      }
    } catch (error) {
      console.error("Error al restablecer contraseña:", error);
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter(u => {
    const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;
    const coincideTexto = (u.nombre_completo || '').toLowerCase().includes(busqueda.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(busqueda.toLowerCase());
    return coincideRol && coincideTexto;
  });
const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 3. Función para enviar los datos al backend (la que faltaba)
  const handleRegistrarPersonal = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/usuarios/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al registrar el personal');
      }

      const data = await response.json();
      console.log('Personal registrado con éxito:', data);

      // Cerrar modal y limpiar formulario
      setIsModalOpen(false);
      setFormData({ nombre: '', correo: '', password: '', rol: '', especialidad: '' });
      
      // Si tienes una función para recargar la tabla de usuarios, ponla aquí
      // cargarUsuarios();

    } catch (error) {
      console.error('Error:', error);
      toast.error('Hubo un error al registrar el personal');
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
  <Header 
    userRole="admin" 
    customTitle="Gestión de Usuarios del Sistema" 
    onBack={() => navigate('/admin/dashboard')}
    logoutPath="/login-trabajador"
  />

  <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
    
    {/* Barra de Filtros, Búsqueda y Botón Agregar */}
    <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col md:flex-row justify-between gap-4 items-center">
      <input 
        type="text" 
        placeholder="Buscar por nombre o correo..." 
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="border border-gray-300 rounded-xl px-4 py-2.5 w-full md:w-80 focus:ring-2 focus:ring-blue-600 outline-none text-xs bg-white text-gray-900"
      />
      
      <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto">
        <div className="flex flex-wrap gap-1.5">
          {['todos', 'admin','recepcionista', 'tecnico', 'cliente'].map(rol => (
            <button
              key={rol}
              onClick={() => setFiltroRol(rol)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                filtroRol === rol 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {rol}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>+ Agregar Personal</span>
        </button>
      </div>
    </div>

    {/* Modal de Registro (Solo se muestra si isModalOpen es true) */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 relative">
          <h3 className="text-base font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">Registrar Nuevo Personal</h3>
          
          <form onSubmit={handleRegistrarPersonal} className="space-y-4">
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre Completo</label>
              <input 
                type="text" 
                name="nombre" 
                value={formData.nombre} 
                onChange={handleChange} 
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs bg-white text-gray-900"
                placeholder="Ej. Juan Pérez"
                required 
              />
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Correo Electrónico (Login)</label>
              <input 
                type="email" 
                name="correo" 
                value={formData.correo} 
                onChange={handleChange} 
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs bg-white text-gray-900"
                placeholder="correo@servitek.com"
                required 
              />
            </div>

            {/* Contraseña Provisoria */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Contraseña Provisoria</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs bg-white text-gray-900"
                placeholder="••••••"
                required 
              />
            </div>

            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Rol del Sistema</label>
              <select 
                name="rol" 
                value={formData.rol} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs bg-white text-gray-900 font-semibold"
                required
              >
                <option value="tecnico">Técnico</option>
                <option value="recepcionista">Recepcionista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Campo dinámico: Solo aparece si el rol seleccionado es 'tecnico' */}
            {formData.rol === 'tecnico' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Especialidad (Ej: Hardware, Mac, Software)</label>
                <input 
                  type="text" 
                  name="especialidad" 
                  value={formData.especialidad} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs bg-white text-gray-900"
                  placeholder="Hardware, Software..."
                />
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs transition shadow-xs cursor-pointer"
              >
                Guardar Personal
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Tabla de Usuarios */}
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 font-bold tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Usuario / Nombre</th>
              <th className="px-6 py-4">Correo</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {usuariosFiltrados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400 italic">No se encontraron usuarios.</td></tr>
            ) : (
              usuariosFiltrados.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{u.nombre_completo || 'Sin nombre'}</td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.rol}
                      onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                      className="bg-white border border-gray-300 text-gray-900 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-600 outline-none shadow-xs"
                    >
                      <option value="admin">Administrador</option>
                      <option value="recepcionista">Recepcionista</option>
                      <option value="tecnico">Técnico</option>
                      <option value="cliente">Cliente</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                      u.activo !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {u.activo !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button 
                      onClick={() => handleToggleEstado(u.id, u.activo !== false)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer ${
                        u.activo !== false ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {u.activo !== false ? 'Inhabilitar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => { setUsuarioSeleccionado(u); setModalPasswordOpen(true); }}
                      className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition shadow-xs cursor-pointer"
                    >
                      Clave
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Modal para Restablecer Contraseña */}
   {modalPasswordOpen && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-200 space-y-4">
      <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-3">
        Restablecer Credenciales
      </h3>
      
      <p className="text-xs text-gray-600 leading-relaxed">
        ¿Estás seguro de restablecer la clave para el usuario <span className="font-bold text-gray-900">{usuarioSeleccionado?.email}</span>?
      </p>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs leading-relaxed">
        🔑 Se generará una <b>clave temporal automática</b> y se enviará a su correo. El usuario deberá cambiarla obligatoriamente al iniciar sesión.
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button 
          type="button" 
          onClick={() => setModalPasswordOpen(false)}
          className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
        >
          Cancelar
        </button>
        <button 
          type="button"
          onClick={() => handleResetAutomatico(usuarioSeleccionado?.id)}
          className="px-4 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          📩 Generar y Enviar al Correo
        </button>
      </div>
    </div>
  </div>
)}
  </main>
</div>
  );
}