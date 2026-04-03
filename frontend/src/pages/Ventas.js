import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Ventas() {
  const { getAuthHeaders, user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [impuesto, setImpuesto] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const busquedaRef = useRef(null);

  useEffect(() => {
    cargarProductos();
    cargarClientes();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await fetch('/api/productos', { headers: getAuthHeaders() });
      if (res.ok) setProductos(await res.json());
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const cargarClientes = async () => {
    try {
      const res = await fetch('/api/clientes', { headers: getAuthHeaders() });
      if (res.ok) setClientes(await res.json());
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const termino = busquedaProducto.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(termino) ||
      (p.codigo && p.codigo.toLowerCase().includes(termino)) ||
      (p.marca && p.marca.toLowerCase().includes(termino))
    ) && p.stock > 0;
  }).slice(0, 10);

  const clientesFiltrados = clientes.filter(c => {
    const termino = busquedaCliente.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(termino) ||
      (c.documento && c.documento.includes(termino))
    );
  });

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item.id === producto.id);
    
    if (existe) {
      if (existe.cantidad >= producto.stock) {
        setMensaje({ tipo: 'error', texto: 'No hay suficiente stock' });
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 2000);
        return;
      }
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        precio_unitario: producto.precio_venta,
        stock: producto.stock,
        cantidad: 1
      }]);
    }
    setBusquedaProducto('');
    busquedaRef.current?.focus();
  };

  const actualizarCantidad = (productoId, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(item => item.id !== productoId));
    } else {
      setCarrito(carrito.map(item =>
        item.id === productoId ? { ...item, cantidad } : item
      ));
    }
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.id !== productoId));
  };

  const calcularSubtotal = () => {
    return carrito.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    return subtotal - parseFloat(descuento || 0) + parseFloat(impuesto || 0);
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      setMensaje({ tipo: 'error', texto: 'El carrito está vacío' });
      return;
    }

    // Validar crédito
    if (metodoPago === 'credito' && !clienteSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Las ventas a crédito requieren un cliente' });
      return;
    }

    setProcesando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteSeleccionado?.id || null,
          items: carrito.map(item => ({
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario
          })),
          metodo_pago: metodoPago,
          descuento: parseFloat(descuento) || 0,
          impuesto: parseFloat(impuesto) || 0
        })
      });

      if (res.ok) {
        const data = await res.json();
        const mensajeExito = data.es_credito 
          ? `Venta a crédito #${data.venta_id} registrada para ${clienteSeleccionado.nombre}. Total: $${data.total.toFixed(2)}`
          : `Venta #${data.venta_id} registrada. Total: $${data.total.toFixed(2)}`;
        setMensaje({ tipo: 'success', texto: mensajeExito });
        setCarrito([]);
        setClienteSeleccionado(null);
        setDescuento(0);
        setImpuesto(0);
        setMetodoPago('efectivo');
        cargarProductos();
        
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
      } else {
        const err = await res.json();
        setMensaje({ tipo: 'error', texto: err.error || 'Error al procesar venta' });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="ventas-container">
      <div className="ventas-productos">
        <div className="card">
          <div className="card-header">
            <h3>Productos</h3>
          </div>
          <div className="card-body">
            <input
              ref={busquedaRef}
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, código o marca..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
            />

            {busquedaProducto && productosFiltrados.length > 0 && (
              <div className="productos-lista">
                {productosFiltrados.map(p => (
                  <div
                    key={p.id}
                    className="producto-item"
                    onClick={() => agregarAlCarrito(p)}
                  >
                    <div className="producto-info">
                      <strong>{p.nombre}</strong>
                      {p.marca && <span className="producto-marca">{p.marca}</span>}
                      {p.codigo && <code>{p.codigo}</code>}
                    </div>
                    <div className="producto-precio">
                      <span className="precio">${(p.precio_venta || 0).toFixed(2)}</span>
                      <span className="stock">Stock: {p.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <h3>Cliente</h3>
          </div>
          <div className="card-body">
            {clienteSeleccionado ? (
              <div className="cliente-seleccionado">
                <span><strong>{clienteSeleccionado.nombre}</strong></span>
                {clienteSeleccionado.documento && <span> - {clienteSeleccionado.documento}</span>}
                <button
                  className="btn btn-sm"
                  onClick={() => setClienteSeleccionado(null)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar cliente..."
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarClientes(true);
                  }}
                  onFocus={() => setMostrarClientes(true)}
                />
                {mostrarClientes && busquedaCliente && clientesFiltrados.length > 0 && (
                  <div className="clientes-lista">
                    {clientesFiltrados.slice(0, 5).map(c => (
                      <div
                        key={c.id}
                        className="cliente-item"
                        onClick={() => {
                          setClienteSeleccionado(c);
                          setBusquedaCliente('');
                          setMostrarClientes(false);
                        }}
                      >
                        <strong>{c.nombre}</strong>
                        {c.documento && <span> - {c.documento}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ventas-carrito">
        <div className="card">
          <div className="card-header">
            <h3>Carrito</h3>
            {carrito.length > 0 && (
              <span className="badge badge-primary">{carrito.length}</span>
            )}
          </div>
          <div className="card-body carrito-body">
            {carrito.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>
                Busca productos para agregarlos
              </p>
            ) : (
              <div className="carrito-items">
                {carrito.map(item => (
                  <div key={item.id} className="carrito-item">
                    <div className="carrito-item-info">
                      <strong>{item.nombre}</strong>
                      <span className="precio">${item.precio_unitario.toFixed(2)}</span>
                    </div>
                    <div className="carrito-item-cantidad">
                      <button
                        className="btn-cantidad"
                        onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(item.id, parseInt(e.target.value) || 0)}
                        min="0"
                        max={item.stock}
                      />
                      <button
                        className="btn-cantidad"
                        onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                        disabled={item.cantidad >= item.stock}
                      >
                        +
                      </button>
                      <button
                        className="btn-eliminar"
                        onClick={() => eliminarDelCarrito(item.id)}
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="carrito-item-subtotal">
                      ${(item.precio_unitario * item.cantidad).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-footer">
            <div className="totales">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>${calcularSubtotal().toFixed(2)}</span>
              </div>

              <div className="total-row descuento">
                <span>Descuento:</span>
                <input
                  type="number"
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  min="0"
                />
              </div>

              <div className="total-row impuesto">
                <span>Impuesto:</span>
                <input
                  type="number"
                  step="0.01"
                  value={impuesto}
                  onChange={(e) => setImpuesto(e.target.value)}
                  min="0"
                />
              </div>

              <div className="total-row total-final">
                <span>TOTAL:</span>
                <span className="monto">${calcularTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="metodo-pago">
              <label>Método de pago:</label>
              <div className="pago-opciones">
                <button
                  className={`btn ${metodoPago === 'efectivo' ? 'btn-primary' : ''}`}
                  onClick={() => setMetodoPago('efectivo')}
                >
                  💵 Efectivo
                </button>
                <button
                  className={`btn ${metodoPago === 'tarjeta' ? 'btn-primary' : ''}`}
                  onClick={() => setMetodoPago('tarjeta')}
                >
                  💳 Tarjeta
                </button>
                <button
                  className={`btn ${metodoPago === 'transferencia' ? 'btn-primary' : ''}`}
                  onClick={() => setMetodoPago('transferencia')}
                >
                  🏦 Transferencia
                </button>
                <button
                  className={`btn ${metodoPago === 'credito' ? 'btn-warning' : ''}`}
                  onClick={() => setMetodoPago('credito')}
                  style={metodoPago === 'credito' ? { backgroundColor: '#f59e0b', color: 'white' } : {}}
                >
                  📝 Crédito
                </button>
              </div>
              {metodoPago === 'credito' && !clienteSeleccionado && (
                <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  ⚠️ Las ventas a crédito requieren seleccionar un cliente
                </p>
              )}
            </div>

            {mensaje.texto && (
              <div className={`alert alert-${mensaje.tipo === 'error' ? 'error' : 'success'}`}>
                {mensaje.texto}
              </div>
            )}

            <button
              className="btn btn-success btn-lg"
              onClick={procesarVenta}
              disabled={procesando || carrito.length === 0}
            >
              {procesando ? 'Procesando...' : '✓ Procesar Venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
