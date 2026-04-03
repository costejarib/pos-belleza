const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

// Listar clientes
router.get('/', (req, res) => {
  const { busqueda } = req.query;
  const db = getDb();
  
  let query = `
    SELECT id, nombre, documento, telefono, email, direccion, notas, creado_en
    FROM clientes
  `;
  let params = [];
  
  if (busqueda) {
    query += ` WHERE nombre LIKE ? OR documento LIKE ? OR telefono LIKE ?`;
    params = [`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`];
  }
  
  query += ` ORDER BY nombre`;
  
  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando clientes:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Obtener cliente por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  try {
    const row = db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(id);
    if (!row) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(row);
  } catch (err) {
    console.error('Error obteniendo cliente:', err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// Crear cliente
router.post('/', (req, res) => {
  const { nombre, documento, telefono, email, direccion, notas } = req.body;
  const db = getDb();
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO clientes (nombre, documento, telefono, email, direccion, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, documento, telefono, email, direccion, notas);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      nombre,
      documento,
      telefono,
      email,
      direccion,
      notas
    });
  } catch (err) {
    console.error('Error creando cliente:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, documento, telefono, email, direccion, notas } = req.body;
  const db = getDb();
  
  try {
    const result = db.prepare(`
      UPDATE clientes 
      SET nombre = COALESCE(?, nombre),
          documento = COALESCE(?, documento),
          telefono = COALESCE(?, telefono),
          email = COALESCE(?, email),
          direccion = COALESCE(?, direccion),
          notas = COALESCE(?, notas)
      WHERE id = ?
    `).run(nombre, documento, telefono, email, direccion, notas, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    console.error('Error actualizando cliente:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  try {
    const result = db.prepare(`DELETE FROM clientes WHERE id = ?`).run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error('Error eliminando cliente:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
