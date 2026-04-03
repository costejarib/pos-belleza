import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Creditos() {
  const { getAuthHeaders } = useAuth();
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [creditoDetalle, setCreditoDetalle] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalAbono, setMostrarModalAbono] = useState(false);
  const [nuevoAbono, setNuevoAbono] = useState({ monto: '', metodo_pago: 'efectivo', notas: '' });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarCreditos();
  }, [filtroEstado]);

  const cargarCreditos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);

      const res = await fetch(`/api/creditos?${params}`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setCreditos(data);
      }
    } catch (error) {
      console.error('Error cargando créditos:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (creditoId) => {
    try {
      const res = await fetch(`/api/creditos/${creditoId}`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setCreditoDetalle(data);
        setMostrarModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const abrirModalAbono = () => {
    setNuevoAbono({ monto: '', metodo_pago: 'efectivo', notas: '' });
    setMostrarModalAbono(true);
  };

  const registrarAbono = async () => {
    if (!nuevoAbono.monto || parseFloat(nuevoAbono.monto) <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    setProcesando(true);
    try {
      const res = await fetch(`/api/creditos/${creditoDetalle.id}/abonos`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: parseFloat(nuevoAbono.monto),
          metodo_pago: nuevoAbono.metodo_pago,
          notas: nuevoAbono.notas
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Abono registrado. Saldo actual: $${data.saldo_actual.toFixed(2)}`);
        setMostrarModalAbono(false);
        cargarCreditos();
        verDetalle(creditoDetalle.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al registrar abono');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar abono');
    } finally {
      setProcesando(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calcularTotales = () => {
    return {
      total: creditos.reduce((sum, c) => sum + (c.monto_total || 0), 0),
      pendiente: creditos.reduce((sum, c) => sum + (c.saldo_pendiente || 0), 0),
      recuperado: creditos.reduce((sum, c) => sum + (c.total_abonado || 0), 0)
    };
  };

  const totales = calcularTotales();

  if (loading && creditos.length === 0) {
    return <div className="loading">Cargando cuentas por cobrar...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>💰 Cuentas por Cobrar</h2>
      </div>

      {/* Resumen */}
      <div className="cards-container" style={{ marginBottom: '1.5rem' }}>
        <div className="card card-stat">
          <div className="stat-icon" style={{ background: '#3b82f6' }}>💵</div>
          <div className="stat-info">
            <span className="stat-value">${totales.total.toFixed(2)}</span>
            <span className="stat-label">Total en Créditos</span>
          </div>
        </div>
        <div className="card card-stat">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>⏳</div>
          <div className="stat-info">
            <span className="stat-value">${totales.pendiente.toFixed(2)}</span>
            <span className="stat-label">Pendiente por Cobrar</span>
          </div>
        </div>
        <div className="card card-stat">
          <div className="stat-icon" style={{ background: '#10b981' }}>✅</div>
          <div className="stat-info">
            <span className="stat-value">${totales.recuperado.toFixed(2)}</span>
            <span className="stat-label">Total Recuperado</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-container" style={{ marginBottom: '1rem' }}>
        <div className="filtro-group">
          <label>Estado:</label>
          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
          </select>
        </div>
        <button className="btn" onClick={cargarCreditos}>
          🔄 Actualizar
        </button>
      </div>

      {/* Lista de créditos */}
      {creditos.length === 0 ? (
        <div className="empty-state">
          <p>No hay créditos {filtroEstado === 'pendiente' ? 'pendientes' : filtroEstado === 'pagado' ? 'pagados' : 'registrados'}</p>
        </div>
      ) : (
        <div className="tabla-container">
          <table className="table">
            <thead>
              <tr>
                <th># Crédito</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Monto Total</th>
                <th>Saldo Pendiente</th>
                <th>Abonado</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {creditos.map(credito => (
                <tr key={credito.id}>
                  <td><strong>#{credito.id}</strong></td>
                  <td>{credito.cliente_nombre}</td>
                  <td>{credito.cliente_telefono || '-'}</td>
                  <td>${credito.monto_total.toFixed(2)}</td>
                  <td style={{ color: credito.saldo_pendiente > 0 ? '#dc2626' : '#10b981', fontWeight: 'bold' }}>
                    ${credito.saldo_pendiente.toFixed(2)}
                  </td>
                  <td>${(credito.total_abonado || 0).toFixed(2)}</td>
                  <td>{formatearFecha(credito.creado_en)}</td>
                  <td>
                    <span className={`badge ${credito.estado === 'pagado' ? 'badge-success' : 'badge-warning'}`}>
                      {credito.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm"
                      onClick={() => verDetalle(credito.id)}
                    >
                      👁️ Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detalle */}
      {mostrarModal && creditoDetalle && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Crédito #{creditoDetalle.id}</h3>
              <button className="btn-close" onClick={() => setMostrarModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Info del cliente */}
              <div className="info-section" style={{ marginBottom: '1rem' }}>
                <h4>👤 Cliente</h4>
                <div className="info-grid">
                  <div><strong>Nombre:</strong> {creditoDetalle.cliente_nombre}</div>
                  <div><strong>Teléfono:</strong> {creditoDetalle.cliente_telefono || '-'}</div>
                  <div><strong>Documento:</strong> {creditoDetalle.cliente_documento || '-'}</div>
                  <div><strong>Dirección:</strong> {creditoDetalle.cliente_direccion || '-'}</div>
                </div>
              </div>

              {/* Info del crédito */}
              <div className="info-section" style={{ marginBottom: '1rem' }}>
                <h4>💰 Estado del Crédito</h4>
                <div className="resumen-grid">
                  <div className="resumen-item">
                    <span>Monto Original</span>
                    <strong>${creditoDetalle.monto_total.toFixed(2)}</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Total Abonado</span>
                    <strong style={{ color: '#10b981' }}>
                      ${(creditoDetalle.monto_total - creditoDetalle.saldo_pendiente).toFixed(2)}
                    </strong>
                  </div>
                  <div className="resumen-item highlight">
                    <span>Saldo Pendiente</span>
                    <strong style={{ color: '#dc2626' }}>
                      ${creditoDetalle.saldo_pendiente.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Productos de la venta */}
              {creditoDetalle.detalles && creditoDetalle.detalles.length > 0 && (
                <div className="info-section" style={{ marginBottom: '1rem' }}>
                  <h4>📦 Productos</h4>
                  <table className="table-mini">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>P. Unit.</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditoDetalle.detalles.map((det, idx) => (
                        <tr key={idx}>
                          <td>{det.producto_nombre}</td>
                          <td>{det.cantidad}</td>
                          <td>${det.precio_unitario.toFixed(2)}</td>
                          <td>${(det.cantidad * det.precio_unitario).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Historial de abonos */}
              <div className="info-section">
                <h4>📝 Historial de Abonos</h4>
                {creditoDetalle.abonos && creditoDetalle.abonos.length > 0 ? (
                  <table className="table-mini">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Método</th>
                        <th>Registrado por</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditoDetalle.abonos.map((abono, idx) => (
                        <tr key={idx}>
                          <td>{formatearFecha(abono.creado_en)}</td>
                          <td style={{ color: '#10b981', fontWeight: 'bold' }}>
                            ${abono.monto.toFixed(2)}
                          </td>
                          <td>{abono.metodo_pago}</td>
                          <td>{abono.usuario_nombre || '-'}</td>
                          <td>{abono.notas || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#6b7280' }}>No hay abonos registrados</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setMostrarModal(false)}>
                Cerrar
              </button>
              {creditoDetalle.estado === 'pendiente' && (
                <button 
                  className="btn btn-primary"
                  onClick={abrirModalAbono}
                >
                  💵 Registrar Abono
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {mostrarModalAbono && (
        <div className="modal-overlay" onClick={() => setMostrarModalAbono(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💵 Registrar Abono</h3>
              <button className="btn-close" onClick={() => setMostrarModalAbono(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Saldo Pendiente:</label>
                <input
                  type="text"
                  value={`$${creditoDetalle.saldo_pendiente.toFixed(2)}`}
                  disabled
                  className="input"
                  style={{ background: '#f3f4f6' }}
                />
              </div>

              <div className="form-group">
                <label>Monto del Abono: *</label>
                <input
                  type="number"
                  step="0.01"
                  max={creditoDetalle.saldo_pendiente}
                  value={nuevoAbono.monto}
                  onChange={(e) => setNuevoAbono({ ...nuevoAbono, monto: e.target.value })}
                  className="input"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Método de Pago:</label>
                <select
                  value={nuevoAbono.metodo_pago}
                  onChange={(e) => setNuevoAbono({ ...nuevoAbono, metodo_pago: e.target.value })}
                  className="input"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                  <option value="transferencia">🏦 Transferencia</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notas (opcional):</label>
                <textarea
                  value={nuevoAbono.notas}
                  onChange={(e) => setNuevoAbono({ ...nuevoAbono, notas: e.target.value })}
                  className="input"
                  placeholder="Ej: Pago parcial, abono semanal..."
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn" 
                onClick={() => setMostrarModalAbono(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={registrarAbono}
                disabled={procesando}
              >
                {procesando ? 'Registrando...' : '✅ Registrar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
