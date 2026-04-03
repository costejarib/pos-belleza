const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Listar productos
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { categoria, busqueda, bajoStock } = req.query;

  let query = `
    SELECT p.*, c.nombre as categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.activo = 1
  `;
  const params = [];

  if (categoria) {
    query += ' AND p.categoria_id = ?';
    params.push(categoria);
  }

  if (busqueda) {
    query += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.marca LIKE ?)';
    const searchTerm = `%${busqueda}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (bajoStock === 'true') {
    query += ' AND p.stock <= p.stock_minimo';
  }

  query += ' ORDER BY p.nombre ASC';

  const productos = db.prepare(query).all(...params);
  res.json(productos);
});

// Obtener producto por ID
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const producto = db.prepare(`
    SELECT p.*, c.nombre as categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  res.json(producto);
});

// Crear producto
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, marca } = req.body;

  if (!nombre || !precio_venta) {
    return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, marca)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(codigo || null, nombre, descripcion, categoria_id, precio_compra || 0, precio_venta, stock || 0, stock_minimo || 5, marca);

    res.status(201).json({ 
      message: 'Producto creado correctamente',
      id: result.lastInsertRowid 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El código de producto ya existe' });
    }
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Actualizar producto
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, marca, activo } = req.body;

  try {
    const result = db.prepare(`
      UPDATE productos 
      SET codigo = ?, nombre = ?, descripcion = ?, categoria_id = ?, 
          precio_compra = ?, precio_venta = ?, stock = ?, stock_minimo = ?, 
          marca = ?, activo = ?
      WHERE id = ?
    `).run(codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, marca, activo !== undefined ? activo : 1, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El código de producto ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar producto (soft delete)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  res.json({ message: 'Producto eliminado correctamente' });
});

// Listar categorías
router.get('/categorias/list', authMiddleware, (req, res) => {
  const db = getDb();
  const categorias = db.prepare('SELECT * FROM categorias ORDER BY nombre ASC').all();
  res.json(categorias);
});

module.exports = router;
