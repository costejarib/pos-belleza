const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Obtener todas las cuentas por cobrar
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { estado, cliente_id } = req.query;

  try {
    let query = `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.telefono as cliente_telefono,
        v.creado_en as venta_fecha,
        (c.monto_total - c.saldo_pendiente) as total_abonado
      FROM creditos c
      JOIN clientes cl ON c.cliente_id = cl.id
      JOIN ventas v ON c.venta_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND c.estado = ?';
      params.push(estado);
    }

    if (cliente_id) {
      query += ' AND c.cliente_id = ?';
      params.push(cliente_id);
    }

    query += ' ORDER BY c.creado_en DESC';

    const creditos = db.prepare(query).all(...params);
    res.json(creditos);
  } catch (error) {
    console.error('Error obteniendo créditos:', error);
    res.status(500).json({ error: 'Error al obtener créditos' });
  }
});

// Obtener un crédito específico con sus abonos
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();

  try {
    const credito = db.prepare(`
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.telefono as cliente_telefono,
        cl.documento as cliente_documento,
        cl.direccion as cliente_direccion,
        v.creado_en as venta_fecha
      FROM creditos c
      JOIN clientes cl ON c.cliente_id = cl.id
      JOIN ventas v ON c.venta_id = v.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!credito) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    // Obtener abonos
    const abonos = db.prepare(`
      SELECT 
        a.*,
        u.nombre as usuario_nombre
      FROM abonos a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.credito_id = ?
      ORDER BY a.creado_en DESC
    `).all(req.params.id);

    // Obtener detalles de la venta
    const detalles = db.prepare(`
      SELECT 
        vd.*,
        p.nombre as producto_nombre
      FROM venta_detalles vd
      JOIN productos p ON vd.producto_id = p.id
      WHERE vd.venta_id = ?
    `).all(credito.venta_id);

    res.json({
      ...credito,
      abonos,
      detalles
    });
  } catch (error) {
    console.error('Error obteniendo crédito:', error);
    res.status(500).json({ error: 'Error al obtener crédito' });
  }
});

// Registrar un abono
router.post('/:id/abonos', authMiddleware, (req, res) => {
  const db = getDb();
  const { monto, metodo_pago, notas } = req.body;
  const credito_id = req.params.id;
  const usuario_id = req.user?.id || 1;

  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }

  try {
    db.prepare('BEGIN').run();

    // Obtener crédito actual
    const credito = db.prepare('SELECT * FROM creditos WHERE id = ?').get(credito_id);
    
    if (!credito) {
      db.prepare('ROLLBACK').run();
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    if (credito.estado === 'pagado') {
      db.prepare('ROLLBACK').run();
      return res.status(400).json({ error: 'Este crédito ya está pagado' });
    }

    if (monto > credito.saldo_pendiente) {
      db.prepare('ROLLBACK').run();
      return res.status(400).json({ 
        error: `El monto excede el saldo pendiente ($${credito.saldo_pendiente.toFixed(2)})` 
      });
    }

    // Registrar abono
    db.prepare(`
      INSERT INTO abonos (credito_id, monto, metodo_pago, notas, usuario_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(credito_id, monto, metodo_pago || 'efectivo', notas, usuario_id);

    // Actualizar saldo
    const nuevoSaldo = credito.saldo_pendiente - monto;
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'pendiente';

    db.prepare(`
      UPDATE creditos 
      SET saldo_pendiente = ?, estado = ?
      WHERE id = ?
    `).run(nuevoSaldo, nuevoEstado, credito_id);

    db.prepare('COMMIT').run();

    res.json({
      message: 'Abono registrado correctamente',
      saldo_anterior: credito.saldo_pendiente,
      abono: monto,
      saldo_actual: nuevoSaldo,
      estado: nuevoEstado
    });
  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('Error registrando abono:', error);
    res.status(500).json({ error: 'Error al registrar abono' });
  }
});

// Resumen de créditos
router.get('/resumen/general', authMiddleware, (req, res) => {
  const db = getDb();

  try {
    const resumen = db.prepare(`
      SELECT 
        COUNT(*) as total_creditos,
        SUM(monto_total) as monto_total,
        SUM(saldo_pendiente) as saldo_pendiente,
        SUM(monto_total - saldo_pendiente) as total_recuperado
      FROM creditos
    `).get();

    const porEstado = db.prepare(`
      SELECT 
        estado,
        COUNT(*) as cantidad,
        SUM(saldo_pendiente) as saldo
      FROM creditos
      GROUP BY estado
    `).all();

    res.json({
      ...resumen,
      por_estado: porEstado
    });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// Obtener créditos de un cliente específico
router.get('/cliente/:cliente_id', authMiddleware, (req, res) => {
  const db = getDb();

  try {
    const creditos = db.prepare(`
      SELECT 
        c.*,
        v.creado_en as venta_fecha
      FROM creditos c
      JOIN ventas v ON c.venta_id = v.id
      WHERE c.cliente_id = ? AND c.estado = 'pendiente'
      ORDER BY c.creado_en DESC
    `).all(req.params.cliente_id);

    res.json(creditos);
  } catch (error) {
    console.error('Error obteniendo créditos del cliente:', error);
    res.status(500).json({ error: 'Error al obtener créditos' });
  }
});

module.exports = router;
