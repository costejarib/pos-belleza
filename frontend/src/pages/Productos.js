import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Productos() {
  const { getAuthHeaders, user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    precio_compra: '',
    precio_venta: '',
    stock: '',
    stock_minimo: '5',
    marca: ''
  });

  const esAdmin = user?.rol === 'admin';

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await fetch('/api/productos', { headers: getAuthHeaders() });
      if (res.ok) setProductos(await res.json());
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const res = await fetch('/api/productos/categorias/list', { headers: getAuthHeaders() });
      if (res.ok) setCategorias(await res.json());
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(busqueda.toLowerCase())) ||
      (p.marca && p.marca.toLowerCase().includes(busqueda.toLowerCase()));
    const coincideCategoria = !categoriaFiltro || p.categoria_id === parseInt(categoriaFiltro);
    return coincideBusqueda && coincideCategoria;
  });

  const abrirModalNuevo = () => {
    setProductoEditando(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria_id: '',
      precio_compra: '',
      precio_venta: '',
      stock: '',
      stock_minimo: '5',
      marca: ''
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (producto) => {
    setProductoEditando(producto);
    setFormData({
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria_id: producto.categoria_id || '',
      precio_compra: producto.precio_compra?.toString() || '',
      precio_venta: producto.precio_venta?.toString() || '',
      stock: producto.stock?.toString() || '0',
      stock_minimo: producto.stock_minimo?.toString() || '5',
      marca: producto.marca || ''
    });
    setMostrarModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      categoria_id: formData.categoria_id || null,
      precio_compra: parseFloat(formData.precio_compra) || 0,
      precio_venta: parseFloat(formData.precio_venta) || 0,
      stock: parseInt(formData.stock) || 0,
      stock_minimo: parseInt(formData.stock_minimo) || 5
    };

    try {
      const url = productoEditando 
        ? `/api/productos/${productoEditando.id}`
        : '/api/productos';
      const method = productoEditando ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setMostrarModal(false);
        cargarProductos();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar producto');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const eliminarProducto = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        cargarProductos();
      } else {
        alert('Error al eliminar producto');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Productos</h2>
        <p>Gestión de inventario</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
            <select
              className="form-control"
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              style={{ maxWidth: '200px' }}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          {esAdmin && (
            <button className="btn btn-primary" onClick={abrirModalNuevo}>
              + Nuevo Producto
            </button>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Marca</th>
                <th>Precio Compra</th>
                <th>Precio Venta</th>
                <th>Stock</th>
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} style={{ textAlign: 'center', color: '#6b7280' }}>
                    No hay productos
                  </td>
                </tr>
              ) : (
                productosFiltrados.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.codigo || '-'}</code></td>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{p.categoria_nombre || '-'}</td>
                    <td>{p.marca || '-'}</td>
                    <td>${(p.precio_compra || 0).toFixed(2)}</td>
                    <td><strong>${(p.precio_venta || 0).toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge ${p.stock <= p.stock_minimo ? 'badge-danger' : 'badge-success'}`}>
                        {p.stock}
                      </span>
                    </td>
                    {esAdmin && (
                      <td>
                        <button className="btn btn-sm" onClick={() => abrirModalEditar(p)}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => eliminarProducto(p.id)}>🗑️</button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{productoEditando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button className="btn-close" onClick={() => setMostrarModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Código</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.codigo}
                      onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoría</label>
                    <select
                      className="form-control"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    className="form-control"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Marca</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.marca}
                      onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Precio Compra</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.precio_compra}
                      onChange={(e) => setFormData({...formData, precio_compra: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Precio Venta *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock Mínimo</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
