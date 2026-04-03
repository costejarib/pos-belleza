const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Listar usuarios
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const usuarios = db.prepare('SELECT id, username, nombre, rol, activo, creado_en FROM usuarios ORDER BY nombre ASC').all();
  res.json(usuarios);
});

// Crear usuario
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { username, password, nombre, rol } = req.body;

  if (!username || !password || !nombre) {
    return res.status(400).json({ error: 'Usuario, contraseña y nombre son requeridos' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(`
      INSERT INTO usuarios (username, password, nombre, rol)
      VALUES (?, ?, ?, ?)
    `).run(username, hashedPassword, nombre, rol || 'vendedor');

    res.status(201).json({ message: 'Usuario creado correctamente', id: result.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Actualizar usuario
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { nombre, rol, activo, password } = req.body;

  let query = 'UPDATE usuarios SET nombre = ?, rol = ?, activo = ?';
  const params = [nombre, rol, activo !== undefined ? activo : 1];

  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    query += ', password = ?';
    params.push(hashedPassword);
  }

  query += ' WHERE id = ?';
  params.push(req.params.id);

  try {
    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  
  // No permitir eliminar el usuario admin principal
  if (req.params.id === '1') {
    return res.status(400).json({ error: 'No se puede eliminar el usuario administrador principal' });
  }

  const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({ message: 'Usuario eliminado correctamente' });
});

module.exports = router;
