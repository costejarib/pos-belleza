const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Ganancias del día
router.get('/hoy', authMiddleware, (req, res) => {
  const db = getDb();
  
  const ganancia = db.prepare(`
    SELECT 
      COUNT(DISTINCT v.id) as total_ventas,
      SUM(vd.cantidad * vd.precio_unitario) as ingresos,
      SUM(vd.cantidad * COALESCE(p.precio_compra, 0)) as costo,
      SUM(vd.cantidad * (vd.precio_unitario - COALESCE(p.precio_compra, 0))) as ganancia
    FROM venta_detalles vd
    JOIN ventas v ON vd.venta_id = v.id
    JOIN productos p ON vd.producto_id = p.id
    WHERE DATE(v.creado_en, 'localtime') = DATE('now', 'localtime')
  `).get();

  res.json({
    total_ventas: ganancia.total_ventas || 0,
    ingresos: ganancia.ingresos || 0,
    costo: ganancia.costo || 0,
    ganancia: ganancia.ganancia || 0
  });
});

// Ganancias del mes
router.get('/mes', authMiddleware, (req, res) => {
  const db = getDb();
  
  const ganancia = db.prepare(`
    SELECT 
      COUNT(DISTINCT v.id) as total_ventas,
      SUM(vd.cantidad * vd.precio_unitario) as ingresos,
      SUM(vd.cantidad * COALESCE(p.precio_compra, 0)) as costo,
      SUM(vd.cantidad * (vd.precio_unitario - COALESCE(p.precio_compra, 0))) as ganancia
    FROM venta_detalles vd
    JOIN ventas v ON vd.venta_id = v.id
    JOIN productos p ON vd.producto_id = p.id
    WHERE strftime('%Y-%m', v.creado_en, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `).get();

  res.json({
    total_ventas: ganancia.total_ventas || 0,
    ingresos: ganancia.ingresos || 0,
    costo: ganancia.costo || 0,
    ganancia: ganancia.ganancia || 0
  });
});

// Ganancias por rango de fechas
router.get('/rango', authMiddleware, (req, res) => {
  const db = getDb();
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Se requieren las fechas desde y hasta' });
  }

  const ganancia = db.prepare(`
    SELECT 
      COUNT(DISTINCT v.id) as total_ventas,
      SUM(vd.cantidad * vd.precio_unitario) as ingresos,
      SUM(vd.cantidad * COALESCE(p.precio_compra, 0)) as costo,
      SUM(vd.cantidad * (vd.precio_unitario - COALESCE(p.precio_compra, 0))) as ganancia
    FROM venta_detalles vd
    JOIN ventas v ON vd.venta_id = v.id
    JOIN productos p ON vd.producto_id = p.id
    WHERE DATE(v.creado_en) >= ? AND DATE(v.creado_en) <= ?
  `).get(desde, hasta);

  res.json({
    desde,
    hasta,
    total_ventas: ganancia.total_ventas || 0,
    ingresos: ganancia.ingresos || 0,
    costo: ganancia.costo || 0,
    ganancia: ganancia.ganancia || 0
  });
});

// Productos más rentables
router.get('/productos-top', authMiddleware, (req, res) => {
  const db = getDb();
  const { limite = 10 } = req.query;

  const productos = db.prepare(`
    SELECT 
      p.id,
      p.nombre,
      p.codigo,
      SUM(vd.cantidad) as cantidad_vendida,
      SUM(vd.cantidad * vd.precio_unitario) as ingresos,
      SUM(vd.cantidad * COALESCE(p.precio_compra, 0)) as costo,
      SUM(vd.cantidad * (vd.precio_unitario - COALESCE(p.precio_compra, 0))) as ganancia,
      (vd.precio_unitario - COALESCE(p.precio_compra, 0)) as margen_unitario,
      CASE 
        WHEN vd.precio_unitario > 0 THEN 
          ROUND(((vd.precio_unitario - COALESCE(p.precio_compra, 0)) / vd.precio_unitario) * 100, 1)
        ELSE 0 
      END as margen_porcentaje
    FROM venta_detalles vd
    JOIN productos p ON vd.producto_id = p.id
    JOIN ventas v ON vd.venta_id = v.id
    GROUP BY p.id, vd.precio_unitario
    ORDER BY ganancia DESC
    LIMIT ?
  `).all(parseInt(limite));

  res.json(productos);
});

// Ganancias por día del mes actual (para gráfica)
router.get('/grafica/mes', authMiddleware, (req, res) => {
  const db = getDb();

  const datos = db.prepare(`
    SELECT 
      strftime('%d', v.creado_en, 'localtime') as dia,
      COUNT(DISTINCT v.id) as total_ventas,
      SUM(vd.cantidad * vd.precio_unitario) as ingresos,
      SUM(vd.cantidad * COALESCE(p.precio_compra, 0)) as costo,
      SUM(vd.cantidad * (vd.precio_unitario - COALESCE(p.precio_compra, 0))) as ganancia
    FROM venta_detalles vd
    JOIN ventas v ON vd.venta_id = v.id
    JOIN productos p ON vd.producto_id = p.id
    WHERE strftime('%Y-%m', v.creado_en, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
    GROUP BY dia
    ORDER BY dia ASC
  `).all();

  res.json(datos);
});

module.exports = router;
