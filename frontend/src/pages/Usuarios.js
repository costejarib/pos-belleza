import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Usuarios() {
  const { user, getAuthHeaders } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    rol: 'vendedor'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (err) {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';
      
      const body = { ...formData };
      if (editingUser && !body.password) {
        delete body.password;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar usuario');
      }

      setSuccess(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      setDialogOpen(false);
      resetForm();
      fetchUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      username: usuario.username,
      password: '',
      nombre: usuario.nombre,
      rol: usuario.rol
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (usuario) => {
    const nuevoEstado = usuario.activo ? 0 : 1;
    const accion = usuario.activo ? 'desactivar' : 'activar';
    
    if (!window.confirm(`¿Seguro que deseas ${accion} al usuario "${usuario.nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          nombre: usuario.nombre, 
          rol: usuario.rol, 
          activo: nuevoEstado 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar usuario');
      }

      setSuccess(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
      fetchUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Seguro que deseas ELIMINAR al usuario "${usuario.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      setSuccess('Usuario eliminado correctamente');
      fetchUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', nombre: '', rol: 'vendedor' });
    setEditingUser(null);
    setError('');
  };

  if (loading) return <div className="loading">Cargando usuarios...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
        <button 
          className="btn btn-primary"
          onClick={() => { resetForm(); setDialogOpen(true); }}
        >
          + Nuevo Usuario
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id} className={!usuario.activo ? 'row-inactive' : ''}>
                <td><strong>{usuario.nombre}</strong></td>
                <td>{usuario.username}</td>
                <td>
                  <span className={`badge ${usuario.rol === 'admin' ? 'badge-admin' : 'badge-vendedor'}`}>
                    {usuario.rol === 'admin' ? '👑 Admin' : '🛒 Vendedor'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${usuario.activo ? 'status-active' : 'status-inactive'}`}>
                    {usuario.activo ? '✅ Activo' : '❌ Inactivo'}
                  </span>
                </td>
                <td>{new Date(usuario.creado_en).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(usuario)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      className={`btn btn-sm ${usuario.activo ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleActive(usuario)}
                      title={usuario.activo ? 'Desactivar' : 'Activar'}
                      disabled={usuario.id === user?.id}
                    >
                      {usuario.activo ? '⛔' : '✅'}
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(usuario)}
                      title="Eliminar"
                      disabled={usuario.id === 1 || usuario.id === user?.id}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal/Dialog */}
      {dialogOpen && (
        <div className="modal-overlay" onClick={() => setDialogOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="modal-close" onClick={() => setDialogOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña {editingUser && <small>(dejar vacío para mantener actual)</small>}</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    className="form-control"
                    value={formData.rol}
                    onChange={e => setFormData({...formData, rol: e.target.value})}
                  >
                    <option value="vendedor">🛒 Vendedor</option>
                    <option value="admin">👑 Administrador</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .badge-admin {
          background: #fff3cd;
          color: #856404;
        }
        .badge-vendedor {
          background: #d1ecf1;
          color: #0c5460;
        }
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .status-active {
          background: #d4edda;
          color: #155724;
        }
        .status-inactive {
          background: #f8d7da;
          color: #721c24;
        }
        .row-inactive {
          opacity: 0.6;
          background: #f8f9fa;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #eee;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #eee;
        }
        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.85rem;
        }
        .btn-warning {
          background: #ffc107;
          color: #212529;
        }
        .btn-danger {
          background: #dc3545;
          color: white;
        }
        .btn-success {
          background: #28a745;
          color: white;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
