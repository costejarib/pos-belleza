const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'pos.db');
let db;

function init() {
  // Crear directorio data si no existe
  const fs = require('fs');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Crear tablas
  db.exec(`
    -- Usuarios
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT DEFAULT 'vendedor',
      activo INTEGER DEFAULT 1,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Categorías
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT
    );

    -- Productos
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER,
      precio_compra REAL DEFAULT 0,
      precio_venta REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 5,
      marca TEXT,
      activo INTEGER DEFAULT 1,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );

    -- Clientes
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      documento TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ventas
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      usuario_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      impuesto REAL DEFAULT 0,
      descuento REAL DEFAULT 0,
      total REAL NOT NULL,
      metodo_pago TEXT DEFAULT 'efectivo',
      estado TEXT DEFAULT 'completada',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- Detalle de ventas
    CREATE TABLE IF NOT EXISTS venta_detalles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );

    -- Créditos (ventas a crédito)
    CREATE TABLE IF NOT EXISTS creditos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL,
      monto_total REAL NOT NULL,
      saldo_pendiente REAL NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      fecha_limite DATE,
      notas TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    -- Abonos a créditos
    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credito_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      metodo_pago TEXT DEFAULT 'efectivo',
      notas TEXT,
      usuario_id INTEGER,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (credito_id) REFERENCES creditos(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  // Insertar usuario admin por defecto si no existe
  const adminExists = db.prepare('SELECT id FROM usuarios WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO usuarios (username, password, nombre, rol)
      VALUES (?, ?, ?, ?)
    `).run('admin', hashedPassword, 'Administrador', 'admin');
    console.log('✅ Usuario admin creado (password: admin123)');
  }

  // Insertar categorías por defecto
  const categoriasExistentes = db.prepare('SELECT COUNT(*) as count FROM categorias').get();
  if (categoriasExistentes.count === 0) {
    const categorias = [
      ['Maquillaje', 'Productos de maquillaje facial, labial, ocular'],
      ['Skincare', 'Cuidado de la piel: limpiadores, cremas, serums'],
      ['Cabello', 'Productos capilares: shampoos, acondicionadores, tratamientos'],
      ['Fragancias', 'Perfumes y colonias'],
      ['Uñas', 'Esmaltes, tratamientos para uñas'],
      ['Accesorios', 'Brochas, espejos, organizadores']
    ];
    const insertCategoria = db.prepare('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)');
    categorias.forEach(cat => insertCategoria.run(cat[0], cat[1]));
    console.log('✅ Categorías por defecto creadas');
  }

  console.log('✅ Base de datos inicializada');
}

function getDb() {
  if (!db) {
    init();
  }
  return db;
}

module.exports = { init, getDb };
