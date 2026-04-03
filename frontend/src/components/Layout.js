import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.rol === 'admin';

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>💅</span>
          <h1>POS Belleza</h1>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/ventas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>🛒</span> Nueva Venta
          </NavLink>
          {isAdmin && (
            <NavLink to="/productos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span>📦</span> Productos
            </NavLink>
          )}
          <NavLink to="/clientes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>👥</span> Clientes
          </NavLink>
          <NavLink to="/historial" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>🧾</span> Historial
          </NavLink>
          <NavLink to="/creditos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>💰</span> Créditos
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/ganancias" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span>📈</span> Ganancias
              </NavLink>
              <NavLink to="/usuarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span>👤</span> Usuarios
              </NavLink>
            </>
          )}
        </nav>

        <div className="user-info">
          <strong>{user?.nombre}</strong>
          <small>{user?.rol === 'admin' ? '👑 Administrador' : '🛒 Vendedor'}</small>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
