import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Visibility,
  Delete,
  PictureAsPdf,
  FilterList,
  ClearAll,
  Warning
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';


const HistorialVentas = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [mensaje, setMensaje] = useState({ type: '', text: '' });

  const cargarVentas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Construir query params
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      if (isAdmin && vendedorFiltro) params.append('vendedor_id', vendedorFiltro);
      
      const response = await fetch(`http://localhost:3001/api/ventas?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar ventas');
      
      const data = await response.json();
      setVentas(data);
    } catch (error) {
      console.error('Error:', error);
      setMensaje({ type: 'error', text: 'Error al cargar el historial de ventas' });
    } finally {
      setLoading(false);
    }
  };

  const cargarVendedores = async () => {
    if (!isAdmin) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendedores(data);
      }
    } catch (error) {
      console.error('Error al cargar vendedores:', error);
    }
  };

  useEffect(() => {
    cargarVentas();
    cargarVendedores();
  }, []);

  const handleBuscar = () => {
    cargarVentas();
  };

  const handleLimpiar = () => {
    setFechaInicio('');
    setFechaFin('');
    setVendedorFiltro('');
    setTimeout(cargarVentas, 100);
  };

  const verDetalle = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/ventas/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedVenta(data);
        setDetalleOpen(true);
      }
    } catch (error) {
      console.error('Error al obtener detalle:', error);
    }
  };

  const generarFactura = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/ventas/${id}/factura`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMensaje({ type: 'success', text: 'Factura generada correctamente' });
        // En una implementación real, aquí se descargaría el PDF
      }
    } catch (error) {
      console.error('Error al generar factura:', error);
    }
  };

  const handleEliminarHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/ventas/historial', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMensaje({ type: 'success', text: data.message });
        cargarVentas();
      } else {
        const error = await response.json();
        setMensaje({ type: 'error', text: error.error || 'Error al eliminar historial' });
      }
    } catch (error) {
      setMensaje({ type: 'error', text: 'Error al eliminar historial' });
    } finally {
      setDeleteAllOpen(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMetodoPagoColor = (metodo) => {
    switch (metodo) {
      case 'efectivo': return 'success';
      case 'tarjeta': return 'primary';
      case 'transferencia': return 'info';
      case 'credito': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Historial de Ventas
          </Typography>
          <Box>
            <Button
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ mr: 1 }}
            >
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
            {isAdmin && (
              <Button
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteAllOpen(true)}
              >
                Eliminar todo
              </Button>
            )}
          </Box>
        </Box>

        {mensaje.text && (
          <Alert severity={mensaje.type} sx={{ mb: 2 }} onClose={() => setMensaje({ type: '', text: '' })}>
            {mensaje.text}
          </Alert>
        )}

        {showFilters && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                label="Fecha inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                label="Fecha fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              {isAdmin && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Vendedor</InputLabel>
                  <Select
                    value={vendedorFiltro}
                    label="Vendedor"
                    onChange={(e) => setVendedorFiltro(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {vendedores.map((v) => (
                      <MenuItem key={v.id} value={v.id}>{v.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button variant="contained" onClick={handleBuscar}>
                Buscar
              </Button>
              <Button variant="outlined" onClick={handleLimpiar}>
                Limpiar
              </Button>
            </Box>
          </Paper>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Fecha</TableCell>
                {isAdmin && <TableCell>Vendedor</TableCell>}
                <TableCell>Cliente</TableCell>
                <TableCell>Método</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : ventas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                    No hay ventas registradas
                  </TableCell>
                </TableRow>
              ) : (
                ventas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell>#{venta.id.toString().padStart(6, '0')}</TableCell>
                    <TableCell>{formatearFecha(venta.creado_en)}</TableCell>
                    {isAdmin && <TableCell>{venta.vendedor_nombre || '-'}</TableCell>}
                    <TableCell>{venta.cliente_nombre || 'Consumidor Final'}</TableCell>
                    <TableCell>
                      <Chip
                        label={venta.metodo_pago?.toUpperCase() || 'EFECTIVO'}
                        color={getMetodoPagoColor(venta.metodo_pago)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">${venta.total?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => verDetalle(venta.id)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Generar factura">
                        <IconButton size="small" onClick={() => generarFactura(venta.id)}>
                          <PictureAsPdf />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Resumen */}
        {!loading && ventas.length > 0 && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resumen
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography color="text.secondary">Total ventas</Typography>
                <Typography variant="h5">{ventas.length}</Typography>
              </Box>
              <Box>
                <Typography color="text.secondary">Monto total</Typography>
                <Typography variant="h5">
                  ${ventas.reduce((acc, v) => acc + (v.total || 0), 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Dialog detalle de venta */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de Venta #{selectedVenta?.id?.toString().padStart(6, '0')}</DialogTitle>
        <DialogContent>
          {selectedVenta && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography><strong>Fecha:</strong> {formatearFecha(selectedVenta.creado_en)}</Typography>
                <Typography><strong>Vendedor:</strong> {selectedVenta.vendedor_nombre}</Typography>
                <Typography><strong>Cliente:</strong> {selectedVenta.cliente_nombre || 'Consumidor Final'}</Typography>
                <Typography><strong>Método de pago:</strong> {selectedVenta.metodo_pago?.toUpperCase()}</Typography>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom><strong>Productos:</strong></Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="right">P. Unitario</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedVenta.detalles?.map((detalle, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{detalle.producto_nombre}</TableCell>
                        <TableCell align="center">{detalle.cantidad}</TableCell>
                        <TableCell align="right">${detalle.precio_unitario?.toFixed(2)}</TableCell>
                        <TableCell align="right">${detalle.subtotal?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography>Subtotal: ${selectedVenta.subtotal?.toFixed(2)}</Typography>
                {selectedVenta.descuento > 0 && (
                  <Typography color="error">Descuento: -${selectedVenta.descuento?.toFixed(2)}</Typography>
                )}
                {selectedVenta.impuesto > 0 && (
                  <Typography>Impuesto: ${selectedVenta.impuesto?.toFixed(2)}</Typography>
                )}
                <Typography variant="h6"><strong>Total: ${selectedVenta.total?.toFixed(2)}</strong></Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar eliminar todo */}
      <Dialog open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" />
          Eliminar Todo el Historial
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar TODO el historial de ventas?
            Esta acción no se puede deshacer y eliminará:
            <br /><br />
            - Todas las ventas registradas<br />
            - Todos los detalles de venta<br />
            - Todos los créditos y abonos
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminarHistorial}>
            Eliminar Todo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HistorialVentas;
