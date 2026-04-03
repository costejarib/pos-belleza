const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

// Inicializar base de datos
db.init();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/facturas', express.static(path.join(__dirname, 'facturas')));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/creditos', require('./routes/creditos'));
app.use('/api/ganancias', require('./routes/ganancias'));

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
