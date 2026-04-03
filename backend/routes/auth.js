const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateToken } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generateToken(user);

  res.json({
    message: 'Login exitoso',
    user: {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol
    },
    token
  });
});

// Verificar token actual
router.get('/verify', require('../middleware/auth').authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, nombre, rol FROM usuarios WHERE id = ?').get(req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({ user });
});

module.exports = router;
