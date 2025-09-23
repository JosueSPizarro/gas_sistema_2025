import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
    Typography, Box, CircularProgress, Divider, InputAdornment, Snackbar, Alert
} from '@mui/material';
import PropaneTankIcon from '@mui/icons-material/PropaneTank';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import api from '../services/api';

const ReabastecimientoModal = ({ open, onClose, salida, onReabastecimientoExitoso }) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [productosLlenosTomados, setProductosLlenosTomados] = useState({});
    const [vaciosDevueltos, setVaciosDevueltos] = useState({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

    useEffect(() => {
        if (open) {
            const fetchProductos = async () => {
                try {
                    const response = await api.get('/productos');
                    // Cargar todos los productos, el filtrado se hará en el renderizado
                    setProductos(response.data);
                } catch (error) {
                    console.error("Error al cargar productos", error);
                }
            };
            fetchProductos();
        }
    }, [open]);

    const handleLlenosTomadosChange = (productoId, cantidad) => {
        setProductosLlenosTomados(prev => ({
            ...prev,
            [productoId]: cantidad,
        }));
    };

    const handleVaciosChange = (tipoProducto, cantidad) => {
        setVaciosDevueltos(prev => ({
            ...prev,
            [tipoProducto]: cantidad,
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                productosLlenosTomados: Object.entries(productosLlenosTomados)
                    .map(([productoId, cantidad]) => ({
                        productoId: parseInt(productoId),
                        cantidad: parseInt(cantidad) || 0,
                    }))
                    .filter(p => p.cantidad > 0),
                vaciosDevueltos: vaciosDevueltos,
            };

            const response = await api.put(`/salidas/${salida.id}/reabastecer`, payload);
            onReabastecimientoExitoso(response.data.reabastecimiento);
            handleClose();
        } catch (error) {
            console.error("Error al reabastecer", error);
            const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Ocurrió un error al reabastecer.';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setProductosLlenosTomados({});
        setVaciosDevueltos({});
        onClose();
    };

    const productosParaLlevar = useMemo(() => productos.filter(p => (p.tipo?.startsWith('GAS') || p.tipo?.startsWith('AGUA')) && p.stockLleno > 0), [productos]);

    const tiposDeEnvase = useMemo(() => {
        if (!productos) return [];
        const tipos = new Set(
            productos
                .filter(p => p.tipo?.startsWith('GAS') || p.tipo?.startsWith('AGUA'))
                .map(p => p.tipo)
        );
        return Array.from(tipos);
    }, [productos]);

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Reabastecer a {salida?.corredor?.nombre}</DialogTitle>
            <DialogContent dividers>
                {/* SECCIÓN DE PRODUCTOS LLENOS A LLEVAR */}
                <Typography variant="h6" gutterBottom>1. Productos Llenos a Llevar</Typography>
                <Grid container spacing={2}>
                    {productosParaLlevar.map(producto => (
                        <Grid item xs={12} sm={6} key={producto.id}>
                            <TextField
                                fullWidth
                                type="number"
                                label={producto.nombre}
                                value={productosLlenosTomados[producto.id] || ''}
                                onChange={(e) => handleLlenosTomadosChange(producto.id, e.target.value)}
                                helperText={`Stock almacén: ${producto.stockLleno}`}
                                InputProps={{
                                    inputProps: { min: 0, max: producto.stockLleno }
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* SECCIÓN DE DEVOLUCIONES */}
                <Typography variant="h6" gutterBottom>2. Devoluciones al Almacén</Typography>
                <Grid container spacing={2}>
                    {tiposDeEnvase.map(tipo => (
                        <Grid item xs={12} sm={6} key={tipo}>
                            <TextField
                                fullWidth
                                type="number"
                                label={`Vacíos devueltos de tipo ${tipo}`}
                                value={vaciosDevueltos[tipo] || ''}
                                onChange={(e) => handleVaciosChange(tipo, e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            {tipo.startsWith('GAS') ? <PropaneTankIcon /> : <WaterDropIcon />}
                                        </InputAdornment>
                                    ),
                                    inputProps: { min: 0 }
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Registrar Reabastecimiento'}
                </Button>
            </DialogActions>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
};

export default ReabastecimientoModal;
