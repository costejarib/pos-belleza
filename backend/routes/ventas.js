const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Crear nueva venta
router.post('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { cliente_id, items, metodo_pago, descuento, impuesto } = req.body;
  const usuario_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  // Validar que ventas a crédito tengan cliente
  if (metodo_pago === 'credito' && !cliente_id) {
    return res.status(400).json({ error: 'Las ventas a crédito requieren un cliente' });
  }

  // Calcular totales
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.precio_unitario * item.cantidad;
  }

  const descuentoFinal = descuento || 0;
  const impuestoFinal = impuesto || 0;
  const total = subtotal - descuentoFinal + impuestoFinal;

  try {
    db.prepare('BEGIN').run();

    const ventaResult = db.prepare(`
      INSERT INTO ventas (cliente_id, usuario_id, subtotal, impuesto, descuento, total, metodo_pago)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(cliente_id || null, usuario_id, subtotal, impuestoFinal, descuentoFinal, total, metodo_pago || 'efectivo');

    const venta_id = ventaResult.lastInsertRowid;

    const insertDetalle = db.prepare(`
      INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');

    for (const item of items) {
      const itemSubtotal = item.precio_unitario * item.cantidad;
      insertDetalle.run(venta_id, item.producto_id, item.cantidad, item.precio_unitario, itemSubtotal);
      updateStock.run(item.cantidad, item.producto_id);
    }

    // Si es venta a crédito, crear registro en la tabla creditos
    if (metodo_pago === 'credito' && cliente_id) {
      db.prepare(`
        INSERT INTO creditos (venta_id, cliente_id, monto_total, saldo_pendiente, estado)
        VALUES (?, ?, ?, ?, 'pendiente')
      `).run(venta_id, cliente_id, total, total);
    }

    db.prepare('COMMIT').run();

    res.status(201).json({
      message: metodo_pago === 'credito' ? 'Venta a crédito registrada correctamente' : 'Venta registrada correctamente',
      venta_id,
      total,
      es_credito: metodo_pago === 'credito'
    });
  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('Error en venta:', error);
    res.status(500).json({ error: 'Error al procesar la venta' });
  }
});

// Resumen de ventas del día (DEBE IR ANTES de /:id)
router.get('/resumen/hoy', authMiddleware, (req, res) => {
  const db = getDb();
  
  // Convertir UTC a hora local para comparar correctamente
  const resumen = db.prepare(`
    SELECT 
      COUNT(*) as total_ventas,
      SUM(total) as monto_total,
      SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as efectivo,
      SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as tarjeta,
      SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as transferencia
    FROM ventas
    WHERE DATE(creado_en, 'localtime') = DATE('now', 'localtime')
  `).get();

  res.json(resumen || { total_ventas: 0, monto_total: 0, efectivo: 0, tarjeta: 0, transferencia: 0 });
});

// Listar ventas
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { fechaInicio, fechaFin, vendedor_id } = req.query;

  let query = `
    SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Si es vendedor, solo ver sus propias ventas
  if (req.user.rol === 'vendedor') {
    query += ' AND v.usuario_id = ?';
    params.push(req.user.id);
  } else if (vendedor_id) {
    // Admin puede filtrar por vendedor
    query += ' AND v.usuario_id = ?';
    params.push(vendedor_id);
  }

  if (fechaInicio) {
    query += ' AND DATE(v.creado_en) >= ?';
    params.push(fechaInicio);
  }

  if (fechaFin) {
    query += ' AND DATE(v.creado_en) <= ?';
    params.push(fechaFin);
  }

  query += ' ORDER BY v.creado_en DESC';

  const ventas = db.prepare(query).all(...params);
  res.json(ventas);
});

// Eliminar todo el historial de ventas (DEBE IR ANTES de /:id)
router.delete('/historial', authMiddleware, (req, res) => {
  const db = getDb();

  try {
    db.prepare('BEGIN').run();

    // Eliminar en orden correcto por las foreign keys
    db.prepare('DELETE FROM abonos').run();
    db.prepare('DELETE FROM creditos').run();
    db.prepare('DELETE FROM venta_detalles').run();
    const result = db.prepare('DELETE FROM ventas').run();

    db.prepare('COMMIT').run();

    res.json({
      message: 'Historial eliminado correctamente',
      ventas_eliminadas: result.changes
    });
  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('Error eliminando historial:', error);
    res.status(500).json({ error: 'Error al eliminar el historial' });
  }
});

// Obtener venta por ID con detalles
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  
  const venta = db.prepare(`
    SELECT v.*, c.nombre as cliente_nombre, c.documento, c.telefono, u.nombre as vendedor_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE v.id = ?
  `).get(req.params.id);

  if (!venta) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }

  const detalles = db.prepare(`
    SELECT vd.*, p.nombre as producto_nombre, p.codigo
    FROM venta_detalles vd
    JOIN productos p ON vd.producto_id = p.id
    WHERE vd.venta_id = ?
  `).all(req.params.id);

  res.json({ ...venta, detalles });
});

// Generar factura PDF
router.get('/:id/factura', authMiddleware, (req, res) => {
  const db = getDb();
  
  const venta = db.prepare(`
    SELECT v.*, c.nombre as cliente_nombre, c.documento, c.telefono, c.direccion, u.nombre as vendedor_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE v.id = ?
  `).get(req.params.id);

  if (!venta) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }

  const detalles = db.prepare(`
    SELECT vd.*, p.nombre as producto_nombre, p.codigo
    FROM venta_detalles vd
    JOIN productos p ON vd.producto_id = p.id
    WHERE vd.venta_id = ?
  `).all(req.params.id);

  // Crear PDF
  const doc = new PDFDocument({ margin: 50 });
  const facturasDir = path.join(__dirname, '..', 'facturas');
  
  if (!fs.existsSync(facturasDir)) {
    fs.mkdirSync(facturasDir, { recursive: true });
  }

  const filename = `factura-${venta.id}.pdf`;
  const filepath = path.join(facturasDir, filename);
  
  doc.pipe(fs.createWriteStream(filepath));

  // Encabezado
  doc.fontSize(24).font('Helvetica-Bold').text('FACTURA', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).font('Helvetica');
  doc.text(`No. ${venta.id.toString().padStart(6, '0')}`, { align: 'center' });
  doc.text(`Fecha: ${new Date(venta.creado_en).toLocaleString('es-ES')}`, { align: 'center' });
  doc.moveDown(2);

  // Línea separadora
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Información del cliente
  doc.fontSize(11).font('Helvetica-Bold').text('DATOS DEL CLIENTE');
  doc.font('Helvetica');
  if (venta.cliente_nombre) {
    doc.text(`Nombre: ${venta.cliente_nombre}`);
    if (venta.documento) doc.text(`Documento: ${venta.documento}`);
    if (venta.telefono) doc.text(`Teléfono: ${venta.telefono}`);
    if (venta.direccion) doc.text(`Dirección: ${venta.direccion}`);
  } else {
    doc.text('Cliente: Consumidor Final');
  }
  doc.moveDown();
  doc.text(`Vendedor: ${venta.vendedor_nombre}`);
  doc.moveDown();

  // Línea separadora
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Tabla de productos
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('PRODUCTOS', { underline: true });
  doc.moveDown(0.5);

  // Encabezados de tabla
  const tableTop = doc.y;
  const colWidths = [50, 200, 80, 80, 100];
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Cant.', 50, tableTop, { width: colWidths[0], align: 'center' });
  doc.text('Producto', 100, tableTop, { width: colWidths[1] });
  doc.text('P. Unit.', 300, tableTop, { width: colWidths[2], align: 'right' });
  doc.text('Subtotal', 450, tableTop, { width: colWidths[4], align: 'right' });

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  doc.moveDown();

  // Productos
  doc.font('Helvetica').fontSize(9);
  detalles.forEach(item => {
    const y = doc.y;
    doc.text(item.cantidad.toString(), 50, y, { width: colWidths[0], align: 'center' });
    doc.text(item.producto_nombre, 100, y, { width: colWidths[1] });
    doc.text(`$${item.precio_unitario.toFixed(2)}`, 300, y, { width: colWidths[2], align: 'right' });
    doc.text(`$${item.subtotal.toFixed(2)}`, 450, y, { width: colWidths[4], align: 'right' });
    doc.moveDown(0.5);
  });

  doc.moveDown();

  // Línea separadora
  doc.moveTo(350, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Totales
  doc.fontSize(10);
  doc.text(`Subtotal:`, 350, doc.y, { width: 100, align: 'right' });
  doc.text(`$${venta.subtotal.toFixed(2)}`, 450, doc.y, { width: 100, align: 'right' });
  
  if (venta.descuento > 0) {
    doc.text(`Descuento:`, 350, doc.y + 15, { width: 100, align: 'right' });
    doc.text(`-$${venta.descuento.toFixed(2)}`, 450, doc.y, { width: 100, align: 'right' });
  }
  
  if (venta.impuesto > 0) {
    doc.text(`Impuesto:`, 350, doc.y + 15, { width: 100, align: 'right' });
    doc.text(`$${venta.impuesto.toFixed(2)}`, 450, doc.y, { width: 100, align: 'right' });
  }

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text(`TOTAL:`, 350, doc.y + 20, { width: 100, align: 'right' });
  doc.text(`$${venta.total.toFixed(2)}`, 450, doc.y, { width: 100, align: 'right' });

  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Método de pago: ${venta.metodo_pago.toUpperCase()}`, { align: 'left' });

  // Pie de página
  doc.moveDown(3);
  doc.fontSize(9).font('Helvetica-Oblique');
  doc.text('¡Gracias por su compra!', { align: 'center' });

  doc.end();

  res.json({ 
    message: 'Factura generada',
    url: `/facturas/${filename}`
  });
});

module.exports = router;
