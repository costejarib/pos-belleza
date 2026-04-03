import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [productosBajoStock, setProductosBajoStock] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [statsRes, stockRes, ventasRes] = await Promise.all([
        fetch('/api/ventas/resumen/hoy', { headers: getAuthHeaders() }),
        fetch('/api/productos?bajoStock=true', { headers: getAuthHeaders() }),
        fetch('/api/ventas?fechaInicio=' + new Date().toISOString().split('T')[0], { headers: getAuthHeaders() })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (stockRes.ok) setProductosBajoStock(await stockRes.json());
      if (ventasRes.ok) setVentasRecientes((await ventasRes.json()).slice(0, 5));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Resumen de ventas del día</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card pink">
          <h3>Ventas Hoy</h3>
          <div className="value">{stats?.total_ventas || 0}</div>
        </div>
        <div className="stat-card green">
          <h3>Total Vendido</h3>
          <div className="value">${(stats?.monto_total || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card purple">
          <h3>Efectivo</h3>
          <div className="value">${(stats?.efectivo || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card orange">
          <h3>Tarjeta</h3>
          <div className="value">${(stats?.tarjeta || 0).toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚠️ Productos con Bajo Stock</h3>
          </div>
          {productosBajoStock.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No hay productos con stock bajo</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {productosBajoStock.slice(0, 5).map(p => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td><span className="badge badge-danger">{p.stock}</span></td>
                      <td>{p.stock_minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🧾 Ventas Recientes</h3>
          </div>
          {ventasRecientes.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No hay ventas hoy</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Hora</th>
                    <th>Total</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasRecientes.map(v => (
                    <tr key={v.id}>
                      <td>#{v.id.toString().padStart(6, '0')}</td>
                      <td>{new Date(v.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                      <td><strong>${v.total.toFixed(2)}</strong></td>
                      <td><span className="badge badge-success">{v.metodo_pago}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
