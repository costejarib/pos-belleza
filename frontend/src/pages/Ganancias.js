import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Ganancias() {
  const { getAuthHeaders } = useAuth();
  const [gananciaHoy, setGananciaHoy] = useState(null);
  const [gananciaMes, setGananciaMes] = useState(null);
  const [productosTop, setProductosTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState({
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0]
  });
  const [gananciaRango, setGananciaRango] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [hoyRes, mesRes, topRes] = await Promise.all([
        fetch('/api/ganancias/hoy', { headers: getAuthHeaders() }),
        fetch('/api/ganancias/mes', { headers: getAuthHeaders() }),
        fetch('/api/ganancias/productos-top?limite=10', { headers: getAuthHeaders() })
      ]);

      if (hoyRes.ok) setGananciaHoy(await hoyRes.json());
      if (mesRes.ok) setGananciaMes(await mesRes.json());
      if (topRes.ok) setProductosTop(await topRes.json());
    } catch (error) {
      console.error('Error cargando ganancias:', error);
    } finally {
      setLoading(false);
    }
  };

  const consultarRango = async () => {
    try {
      const res = await fetch(
        `/api/ganancias/rango?desde=${filtroFecha.desde}&hasta=${filtroFecha.hasta}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        setGananciaRango(await res.json());
      }
    } catch (error) {
      console.error('Error consultando rango:', error);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>💰 Ganancias</h2>
        <p>Análisis de rentabilidad</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="stats-grid">
        <div className="stat-card green">
          <h3>Ganancia Hoy</h3>
          <div className="value">${(gananciaHoy?.ganancia || 0).toFixed(2)}</div>
          <small style={{ color: '#6b7280' }}>
            {gananciaHoy?.total_ventas || 0} ventas
          </small>
        </div>
        <div className="stat-card purple">
          <h3>Ganancia Mes</h3>
          <div className="value">${(gananciaMes?.ganancia || 0).toFixed(2)}</div>
          <small style={{ color: '#6b7280' }}>
            {gananciaMes?.total_ventas || 0} ventas
          </small>
        </div>
        <div className="stat-card pink">
          <h3>Ingresos Hoy</h3>
          <div className="value">${(gananciaHoy?.ingresos || 0).toFixed(2)}</div>
          <small style={{ color: '#6b7280' }}>
            Costo: ${(gananciaHoy?.costo || 0).toFixed(2)}
          </small>
        </div>
        <div className="stat-card orange">
          <h3>Ingresos Mes</h3>
          <div className="value">${(gananciaMes?.ingresos || 0).toFixed(2)}</div>
          <small style={{ color: '#6b7280' }}>
            Costo: ${(gananciaMes?.costo || 0).toFixed(2)}
          </small>
        </div>
      </div>

      {/* Consulta por rango */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">📊 Consultar por Rango de Fechas</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280' }}>Desde</label>
            <input
              type="date"
              value={filtroFecha.desde}
              onChange={(e) => setFiltroFecha({ ...filtroFecha, desde: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280' }}>Hasta</label>
            <input
              type="date"
              value={filtroFecha.hasta}
              onChange={(e) => setFiltroFecha({ ...filtroFecha, hasta: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            />
          </div>
          <button
            onClick={consultarRango}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem' }}
          >
            Consultar
          </button>
        </div>

        {gananciaRango && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
              <small style={{ color: '#6b7280' }}>Ventas</small>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{gananciaRango.total_ventas}</div>
            </div>
            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
              <small style={{ color: '#6b7280' }}>Ingresos</small>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                ${gananciaRango.ingresos.toFixed(2)}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '0.5rem' }}>
              <small style={{ color: '#6b7280' }}>Costo</small>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                ${gananciaRango.costo.toFixed(2)}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
              <small style={{ color: '#6b7280' }}>Ganancia</small>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                ${gananciaRango.ganancia.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Productos más rentables */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">🏆 Productos Más Rentables</h3>
        </div>
        {productosTop.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No hay datos de ganancias aún</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th>Cant. Vendida</th>
                  <th>Ganancia Unit.</th>
                  <th>Margin %</th>
                  <th>Ganancia Total</th>
                </tr>
              </thead>
              <tbody>
                {productosTop.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td><strong>{p.nombre}</strong></td>
                    <td style={{ color: '#6b7280' }}>{p.codigo}</td>
                    <td>{p.cantidad_vendida}</td>
                    <td>${(p.margen_unitario || 0).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.margen_porcentaje > 30 ? 'badge-success' : 'badge-warning'}`}>
                        {p.margen_porcentaje}%
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#059669' }}>
                      ${(p.ganancia || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
