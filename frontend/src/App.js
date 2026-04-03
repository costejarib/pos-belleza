import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Ventas from './pages/Ventas';
import HistorialVentas from './pages/HistorialVentas';
import Creditos from './pages/Creditos';
import Ganancias from './pages/Ganancias';
import Usuarios from './pages/Usuarios';
import Layout from './components/Layout';

// Componente para rutas solo de admin
function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.rol === 'admin' ? children : <Navigate to="/" />;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Cargando...
    </div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout><Dashboard /></Layout>
        </PrivateRoute>
      } />
      <Route path="/productos" element={
        <PrivateRoute>
          <AdminRoute>
            <Layout><Productos /></Layout>
          </AdminRoute>
        </PrivateRoute>
      } />
      <Route path="/clientes" element={
        <PrivateRoute>
          <Layout><Clientes /></Layout>
        </PrivateRoute>
      } />
      <Route path="/ventas" element={
        <PrivateRoute>
          <Layout><Ventas /></Layout>
        </PrivateRoute>
      } />
      <Route path="/historial" element={
        <PrivateRoute>
          <Layout><HistorialVentas /></Layout>
        </PrivateRoute>
      } />
      <Route path="/creditos" element={
        <PrivateRoute>
          <Layout><Creditos /></Layout>
        </PrivateRoute>
      } />
      <Route path="/ganancias" element={
        <PrivateRoute>
          <AdminRoute>
            <Layout><Ganancias /></Layout>
          </AdminRoute>
        </PrivateRoute>
      } />
      <Route path="/usuarios" element={
        <PrivateRoute>
          <AdminRoute>
            <Layout><Usuarios /></Layout>
          </AdminRoute>
        </PrivateRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
