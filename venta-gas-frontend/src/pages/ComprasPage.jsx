import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Paper,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, IconButton, Tooltip, Stack,
    Dialog, DialogActions, DialogContent, DialogTitle,
    TextField, FormControl, InputLabel, Select, MenuItem, Divider, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    AddCircleOutline as AddCircleOutlineIcon,
    Refresh as RefreshIcon,
    RemoveCircleOutline as RemoveCircleOutlineIcon,
    ShoppingCart as ShoppingCartIcon,
    Business as BusinessIcon,
    Event as EventIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/Layout';
import compraService from '../services/compraService';
import proveedorService from '../services/api';
import api from '../services/api'; // Usamos api para productos por simplicidad

const ComprasPage = () => {
    const theme = useTheme();
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);

    // Estados para el formulario
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [proveedorId, setProveedorId] = useState('');
    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [detalles, setDetalles] = useState([{ productoId: '', cantidad: '', precioUnitario: '' }]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [comprasRes, proveedoresRes, productosRes] = await Promise.all([
                compraService.getAllCompras(),
                proveedorService.get(`/proveedores`),
                api.get('/productos')
            ]);
            setCompras(comprasRes.data);
            setProveedores(proveedoresRes.data.filter(p => p.activo));
            setProductos(productosRes.data);
        } catch (err) {
            setError('No se pudieron cargar los datos iniciales.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleOpenDialog = () => {
        setProveedorId('');
        setFecha(format(new Date(), 'yyyy-MM-dd'));
        setDetalles([{ productoId: '', cantidad: '', precioUnitario: '' }]);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => setOpenDialog(false);

    const handleDetalleChange = (index, field, value) => {
        const newDetalles = [...detalles];
        newDetalles[index][field] = value;
        setDetalles(newDetalles);
    };

    const handleAddDetalle = () => {
        setDetalles([...detalles, { productoId: '', cantidad: '', precioUnitario: '' }]);
    };

    const handleRemoveDetalle = (index) => {
        const newDetalles = detalles.filter((_, i) => i !== index);
        setDetalles(newDetalles);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            proveedorId: parseInt(proveedorId),
            fecha,
            detalles: detalles.map(d => ({
                productoId: parseInt(d.productoId),
                cantidad: parseInt(d.cantidad),
                precioUnitario: parseFloat(d.precioUnitario)
            }))
        };

        try {
            await compraService.createCompra(payload);
            fetchInitialData();
            handleCloseDialog();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar la compra.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const totalCompra = useMemo(() => {
        return detalles.reduce((sum, item) => {
            const subtotal = (item.cantidad || 0) * (item.precioUnitario || 0);
            return sum + subtotal;
        }, 0);
    }, [detalles]);

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Recepción de Compras a Proveedores
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenDialog}>
                        Registrar Ingreso de Mercadería
                    </Button>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchInitialData} disabled={loading}>
                        Actualizar
                    </Button>
                </Stack>
            </Box>

            {loading && <CircularProgress sx={{ my: 4 }} />}
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            {!loading && !error && (
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: theme.palette.grey[200] }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID Compra</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Proveedor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Detalles</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {compras.map((compra) => (
                                <TableRow key={compra.id} hover>
                                    <TableCell>#{compra.id}</TableCell>
                                    <TableCell>{compra.proveedor.nombre}</TableCell>
                                    <TableCell>{format(new Date(compra.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                                    <TableCell>
                                        {compra.detalles.map(d => (
                                            <Chip key={d.id} label={`${d.producto.nombre}: ${d.cantidad} uds.`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                        ))}
                                    </TableCell>
                                    <TableCell align="right">S/ {compra.total.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
                <DialogTitle>Registrar Ingreso de Mercadería</DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Proveedor</InputLabel>
                                    <Select value={proveedorId} label="Proveedor" onChange={(e) => setProveedorId(e.target.value)}>
                                        {proveedores.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField label="Fecha de Compra" type="date" fullWidth value={fecha} onChange={(e) => setFecha(e.target.value)} InputLabelProps={{ shrink: true }} required />
                            </Grid>
                        </Grid>
                        <Divider sx={{ my: 2 }}><Chip label="Productos Comprados" /></Divider>
                        {detalles.map((detalle, index) => (
                            <Grid container spacing={1} key={index} sx={{ mb: 1, alignItems: 'center' }}>
                                <Grid item xs={12} sm={5}>
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel>Producto</InputLabel>
                                        <Select value={detalle.productoId} label="Producto" onChange={(e) => handleDetalleChange(index, 'productoId', e.target.value)}>
                                            {productos.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField label="Cantidad" type="number" fullWidth size="small" value={detalle.cantidad} onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)} required InputProps={{ inputProps: { min: 1 } }} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField label="Precio Unitario" type="number" fullWidth size="small" value={detalle.precioUnitario} onChange={(e) => handleDetalleChange(index, 'precioUnitario', e.target.value)} required InputProps={{ inputProps: { min: 0, step: "0.01" } }} />
                                </Grid>
                                <Grid item xs={12} sm={1}>
                                    <IconButton color="error" onClick={() => handleRemoveDetalle(index)} disabled={detalles.length === 1}>
                                        <RemoveCircleOutlineIcon />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        ))}
                        <Button onClick={handleAddDetalle} startIcon={<AddCircleOutlineIcon />} sx={{ mt: 1 }}>
                            Añadir Fila
                        </Button>
                        <Divider sx={{ my: 2 }} />
                        <Box display="flex" justifyContent="flex-end">
                            <Typography variant="h6">Total de la Compra: S/ {totalCompra.toFixed(2)}</Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} color="secondary">Cancelar</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={loading || !proveedorId || detalles.some(d => !d.productoId || !d.cantidad || !d.precioUnitario)}>
                            {loading ? <CircularProgress size={24} /> : 'Confirmar Ingreso y Actualizar Stock'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Layout>
    );
};

export default ComprasPage;
