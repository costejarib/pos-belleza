import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function HistorialVentas() {
  const { getAuthHeaders, user } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    cargarVentas();
    if (isAdmin) {
      cargarVendedores();
    }
  }, [isAdmin]);

  const cargarVentas = async () => {
    setLoading(true);
    try {
      let url = '/api/ventas?';
      if (fechaInicio) url += `fecha_inicio=${fechaInicio}&`;
      if (fechaFin) url += `fecha_fin=${fechaFin}&`;
      if (metodoFiltro) url += `metodo_pago=${metodoFiltro}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) setVentas(await res.json());
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (ventaId) => {
    try {
      const res = await fetch(`/api/ventas/${ventaId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVentaDetalle(data);
        setMostrarModal(true);
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calcularTotalVentas = () => {
    return ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  };

  const calcularVentasPorMetodo = () => {
    const metodos = {};
    ventas.forEach(v => {
      const metodo = v.metodo_pago || 'efectivo';
      metodos[metodo] = (metodos[metodo] || 0) + (v.total || 0);
    });
    return metodos;
  };

  const ventasPorMetodo = calcularVentasPorMetodo();

  const eliminarHistorial = async () => {
    setEliminando(true);
    try {
      const response = await fetch('/api/ventas/historial', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setVentas([]);
        setMostrarConfirmacion(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar el historial');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el historial');
    } finally {
      setEliminando(false);
    }
  };

  if (loading && ventas.length === 0) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Historial de Ventas</h2>
        {isAdmin && (
          <button
            className="btn btn-danger"
            onClick={() => setMostrarConfirmacion(true)}
            disabled={ventas.length === 0}
          >
            🗑️ Eliminar Todo
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{ventas.length}</div>
          <div className="stat-label">Ventas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${calcularTotalVentas().toFixed(2)}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${(ventasPorMetodo['efectivo'] || 0).toFixed(2)}</div>
          <div className="stat-label">💵 Efectivo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${(ventasPorMetodo['tarjeta'] || 0).toFixed(2)}</div>
          <div className="stat-label">💳 Tarjeta</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-header">
          <h3>Filtros</h3>
          <button className="btn btn-primary" onClick={cargarVentas}>
            Aplicar
          </button>
        </div>
        <div className="card-body filtros-row">
          <div className="form-group">
            <label>Desde</label>
            <input
              type="date"
              className="form-control"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input
              type="date"
              className="form-control"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Método</label>
            <select
              className="form-control"
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Desc.</th>
                <th>Imp.</th>
                <th>Total</th>
                <th>Método</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#6b7280' }}>
                    No hay ventas registradas
                  </td>
                </tr>
              ) : (
                ventas.map(v => (
                  <tr key={v.id}>
                    <td><strong>#{v.id}</strong></td>
                    <td>{formatearFecha(v.creado_en)}</td>
                    <td>{v.cliente_nombre || 'Cliente general'}</td>
                    <td>{v.cantidad_items || v.items_count || '-'}</td>
                    <td>${(v.subtotal || 0).toFixed(2)}</td>
                    <td>${(v.descuento || 0).toFixed(2)}</td>
                    <td>${(v.impuesto || 0).toFixed(2)}</td>
                    <td><strong>${(v.total || 0).toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge badge-${v.metodo_pago === 'efectivo' ? 'success' : v.metodo_pago === 'tarjeta' ? 'info' : 'warning'}`}>
                        {v.metodo_pago || 'efectivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => verDetalle(v.id)}>
                        👁️ Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle */}
      {mostrarModal && ventaDetalle && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle de Venta #{ventaDetalle.id}</h3>
              <button className="btn-close" onClick={() => setMostrarModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detalle-info">
                <p><strong>Fecha:</strong> {formatearFecha(ventaDetalle.creado_en)}</p>
                <p><strong>Cliente:</strong> {ventaDetalle.cliente_nombre || 'Cliente general'}</p>
                <p><strong>Vendedor:</strong> {ventaDetalle.usuario_nombre || '-'}</p>
                <p><strong>Método de pago:</strong> {ventaDetalle.metodo_pago}</p>
              </div>

              <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Productos</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>P. Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventaDetalle.items || ventaDetalle.detalles || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.producto_nombre || item.nombre}</td>
                      <td>{item.cantidad}</td>
                      <td>${(item.precio_unitario || 0).toFixed(2)}</td>
                      <td>${((item.cantidad || 0) * (item.precio_unitario || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="detalle-totales">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${(ventaDetalle.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Descuento:</span>
                  <span>-${(ventaDetalle.descuento || 0).toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Impuesto:</span>
                  <span>+${(ventaDetalle.impuesto || 0).toFixed(2)}</span>
                </div>
                <div className="total-row total-final">
                  <span><strong>TOTAL:</strong></span>
                  <span><strong>${(ventaDetalle.total || 0).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setMostrarModal(false)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar */}
      {mostrarConfirmacion && (
        <div className="modal-overlay" onClick={() => setMostrarConfirmacion(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Confirmar Eliminación</h3>
              <button className="btn-close" onClick={() => setMostrarConfirmacion(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1rem', color: '#dc2626', fontWeight: 'bold' }}>
                ¿Estás seguro de eliminar TODO el historial de ventas?
              </p>
              <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                Esta acción eliminará <strong>{ventas.length} ventas</strong> y no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setMostrarConfirmacion(false)} disabled={eliminando}>
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={eliminarHistorial}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : '🗑️ Sí, Eliminar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
