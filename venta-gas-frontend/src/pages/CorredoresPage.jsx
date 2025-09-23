import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Paper,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, IconButton, Tooltip, Stack,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    TextField, FormControl, InputLabel, Select, MenuItem, Divider,
    InputAdornment, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Person as PersonIcon,
    LocalGasStation as LocalGasStationIcon,
    Close as CloseIcon,
    Visibility as VisibilityIcon,
    AddCircleOutline as AddCircleOutlineIcon,
    Refresh as RefreshIcon,
    LocalShipping as LocalShippingIcon,
    CalendarMonth as CalendarMonthIcon,
    AttachMoney as AttachMoneyIcon,
    ShoppingCart as ShoppingCartIcon,
    Loop as LoopIcon,
    Description as DescriptionIcon,
    Edit as EditIcon,
    ToggleOn as ToggleOnIcon,
    ToggleOff as ToggleOffIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Chart from 'chart.js/auto';
import Layout from '../components/Layout';
import api from '../services/api';

const CorredoresPage = () => {
    const theme = useTheme();

    const [corredores, setCorredores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState({ show: false, type: '', message: '' });
    const [formData, setFormData] = useState({
        nombre: '',
        dni: '',
        telefono: '',
    });
    const [corredorSeleccionado, setCorredorSeleccionado] = useState(null);
    const [historialSalidas, setHistorialSalidas] = useState([]);
    const [salidaSeleccionada, setSalidaSeleccionada] = useState(null);

    // Gráfico
    const chartRef = useRef(null);

    const fetchCorredores = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/corredores');
            setCorredores(res.data);
        } catch (err) {
            setError('No se pudieron cargar los corredores.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const showFeedback = (type, message) => {
        setFeedbackMessage({ show: true, type, message });
        setTimeout(() => setFeedbackMessage({ show: false, type: '', message: '' }), 5000);
    };

    useEffect(() => {
        fetchCorredores();
    }, [fetchCorredores]);

    // Lógica para el modal de detalles
    const fetchHistorialSalidas = useCallback(async (corredorId) => {
        try {
            // Este endpoint debe ser creado en el backend para filtrar por corredorId
            const res = await api.get(`/salidas?corredorId=${corredorId}`);
            setHistorialSalidas(res.data);
        } catch (err) {
            console.error('Error al obtener el historial de salidas:', err);
            showFeedback('error', 'Error al cargar el historial de salidas.');
        }
    }, []);

    useEffect(() => {
        if (corredorSeleccionado) {
            fetchHistorialSalidas(corredorSeleccionado.id);
        }
    }, [corredorSeleccionado, fetchHistorialSalidas]);

    const totalFaltantesPendientes = useMemo(() => {
        if (!historialSalidas) return 0;
        return historialSalidas
            .filter(s => s.diferencia < 0 && !s.diferenciaSaldada)
            .reduce((acc, s) => acc + Math.abs(s.diferencia), 0);
    }, [historialSalidas]);

    // Funciones del CRUD
    const handleOpenDialog = (modoEdicion, corredor = null) => {
        setModoEdicion(modoEdicion);
        if (corredor) {
            setCorredorSeleccionado(corredor);
            setFormData({
                nombre: corredor.nombre,
                dni: corredor.dni,
                telefono: corredor.telefono,
            });
        } else {
            setFormData({ nombre: '', dni: '', telefono: '' });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCorredorSeleccionado(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (modoEdicion) {
                await api.put(`/corredores/${corredorSeleccionado.id}`, formData);
                showFeedback('success', 'Corredor actualizado correctamente.');
            } else {
                await api.post('/corredores', formData);
                showFeedback('success', 'Corredor creado correctamente.');
            }
            fetchCorredores();
            handleCloseDialog();
        } catch (err) {
            console.error(err);
            showFeedback('error', `Error al guardar el corredor: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEstado = (corredor) => {
        setCorredorSeleccionado(corredor);
        setOpenConfirmDialog(true);
    };

    const handleConfirmToggle = async () => {
        setLoading(true);
        try {
            await api.patch(`/corredores/${corredorSeleccionado.id}/toggle-estado`);
            fetchCorredores();
            showFeedback('success', `Estado de corredor actualizado correctamente.`);
        } catch (err) {
            console.error(err);
            showFeedback('error', `Error al actualizar el estado: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
            setOpenConfirmDialog(false);
        }
    };

    const handleOpenDetailsDialog = (corredor) => {
        setCorredorSeleccionado(corredor);
        setOpenDetailsDialog(true);
    };

    const handleCloseDetailsDialog = () => {
        setOpenDetailsDialog(false);
        setCorredorSeleccionado(null);
        setHistorialSalidas([]);
        // Asegurarse de que el gráfico se destruya al cerrar el diálogo
        if (chartRef.current) {
            chartRef.current.destroy();
        }
    };

    // Lógica para renderizar el gráfico
    useEffect(() => {
        // Siempre destruir la instancia anterior del gráfico para evitar conflictos de renderizado.
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        // Solo proceder si el diálogo está abierto y hay datos.
        if (openDetailsDialog && corredorSeleccionado && historialSalidas.length > 0) {
            const ctx = document.getElementById('corredor-chart');
            if (!ctx) return; // Salir si el canvas no está disponible en el DOM.

            const salidasFinalizadas = historialSalidas.filter(s => s.estado === 'FINALIZADO');
            
            // Si no hay salidas finalizadas, no renderizar el gráfico.
            if (salidasFinalizadas.length === 0) return;

            const data = {
                labels: salidasFinalizadas.map(s => format(new Date(s.fecha), 'dd MMM', { locale: es })),
                datasets: [
                    {
                        label: 'Ventas Totales (S/.)',
                        data: salidasFinalizadas.map(s => s.totalVentas),
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.primary.main,
                        tension: 0.4,
                    },
                    {
                        label: 'Gastos Totales (S/.)',
                        data: salidasFinalizadas.map(s => s.totalGastos),
                        borderColor: theme.palette.error.main,
                        backgroundColor: theme.palette.error.main,
                        tension: 0.4,
                    },
                    {
                        label: 'Faltantes (S/.)',
                        data: salidasFinalizadas.map(s => s.diferencia < 0 ? Math.abs(s.diferencia) : 0),
                        borderColor: theme.palette.warning.dark,
                        backgroundColor: theme.palette.warning.dark,
                        tension: 0.4,
                    },
                    {
                        label: 'Sobrantes (S/.)',
                        data: salidasFinalizadas.map(s => s.diferencia > 0 ? s.diferencia : 0),
                        borderColor: theme.palette.info.main,
                        backgroundColor: theme.palette.info.main,
                        tension: 0.4,
                    },
                ],
            };

            const config = {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Análisis de Rendimiento por Jornada'
                        }
                    },
                },
            };
            
            // Crear la nueva instancia del gráfico.
            chartRef.current = new Chart(ctx, config);
        }
    }, [historialSalidas, corredorSeleccionado, openDetailsDialog, theme]); // Dependencias correctas

    // UI principal
    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Gestión de Corredores
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={() => handleOpenDialog(false)}
                    >
                        Agregar Corredor
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchCorredores}
                        disabled={loading}
                    >
                        Actualizar
                    </Button>
                </Stack>
            </Box>

            {loading && <CircularProgress sx={{ my: 4 }} />}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && (
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: theme.palette.grey[200] }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>DNI</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {corredores.map((corredor) => (
                                <TableRow key={corredor.id}>
                                    <TableCell>{corredor.id}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <PersonIcon />
                                            <Typography>{corredor.nombre}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{corredor.dni}</TableCell>
                                    <TableCell>{corredor.telefono}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={corredor.activo ? 'Activo' : 'Inactivo'}
                                            color={corredor.activo ? 'success' : 'error'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Ver detalles">
                                            <IconButton color="primary" onClick={() => handleOpenDetailsDialog(corredor)}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Editar">
                                            <IconButton color="info" onClick={() => handleOpenDialog(true, corredor)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={corredor.activo ? 'Desactivar' : 'Activar'}>
                                            <IconButton
                                                color={corredor.activo ? 'error' : 'success'}
                                                onClick={() => handleToggleEstado(corredor)}
                                            >
                                                {corredor.activo ? <ToggleOffIcon /> : <ToggleOnIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Diálogo de Agregar/Editar Corredor */}
            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>{modoEdicion ? 'Editar Corredor' : 'Agregar Corredor'}</DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent dividers>
                        <TextField
                            autoFocus
                            margin="dense"
                            name="nombre"
                            label="Nombre Completo"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            required
                            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
                        />
                        <TextField
                            margin="dense"
                            name="dni"
                            label="DNI"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={formData.dni}
                            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                            required
                            inputProps={{ maxLength: 8 }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon /></InputAdornment> }}
                        />
                        <TextField
                            margin="dense"
                            name="telefono"
                            label="Teléfono"
                            type="tel"
                            fullWidth
                            variant="outlined"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            required
                            inputProps={{ maxLength: 9 }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><LocalShippingIcon /></InputAdornment> }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} color="secondary">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="contained" color="primary" disabled={loading}>
                            {modoEdicion ? 'Guardar Cambios' : 'Crear Corredor'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Diálogo de Confirmación para activar/desactivar */}
            <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
                <DialogTitle>Confirmar Acción</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas {corredorSeleccionado?.activo ? 'desactivar' : 'activar'} a {corredorSeleccionado?.nombre}?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmDialog(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmToggle} color={corredorSeleccionado?.activo ? 'error' : 'success'} variant="contained">
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo de Detalles del Corredor */}
            <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center">
                        <PersonIcon sx={{ mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Historial de {corredorSeleccionado?.nombre}</Typography>
                    </Box>
                    <IconButton onClick={handleCloseDetailsDialog} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {historialSalidas.length > 0 ? (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={7}>
                                <Typography variant="h6" gutterBottom>Métricas Clave</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="subtitle1">Ventas Totales</Typography>
                                        <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                                            S/. {historialSalidas.reduce((acc, s) => acc + (s.totalVentas || 0), 0).toFixed(2)}
                                        </Typography>
                                    </Paper>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="subtitle1">Gastos Totales</Typography>
                                        <Typography variant="h5" color="error" sx={{ fontWeight: 'bold' }}>
                                            S/. {historialSalidas.reduce((acc, s) => acc + (s.totalGastos || 0), 0).toFixed(2)}
                                        </Typography>
                                    </Paper>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="subtitle1">Deuda del Corredor</Typography>
                                        <Typography variant="h5" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                                            S/. {totalFaltantesPendientes.toFixed(2)}
                                        </Typography>
                                    </Paper>
                                </Box>
                                <Typography variant="h6" mt={4} gutterBottom>Historial de Salidas</Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Ventas</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Gastos</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {historialSalidas.map((salida) => (
                                                <TableRow key={salida.id}>
                                                    <TableCell>{format(new Date(salida.fecha), 'dd/MM/yyyy HH:mm', { locale: es }) }</TableCell>
                                                    <TableCell>
                                                        <Chip label={salida.estado} color={salida.estado === 'FINALIZADO' ? 'success' : 'warning'} size="small" />
                                                    </TableCell>
                                                    <TableCell>S/. {salida.totalVentas ? salida.totalVentas.toFixed(2) : '0.00'}</TableCell>
                                                    <TableCell>S/. {salida.totalGastos ? salida.totalGastos.toFixed(2) : '0.00'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                            <Grid item xs={12} md={5}>
                                <Typography variant="h6" gutterBottom>Análisis de Rendimiento</Typography>
                                <Paper sx={{ p: 2, height: 400 }}>
                                    <canvas id="corredor-chart"></canvas>
                                </Paper>
                            </Grid>
                        </Grid>
                    ) : (
                        <Alert severity="info">No hay historial de salidas para este corredor.</Alert>
                    )}
                </DialogContent>
            </Dialog>

            {feedbackMessage.show && (
                <Alert
                    severity={feedbackMessage.type}
                    sx={{ position: 'fixed', bottom: 16, right: 16 }}
                    iconMapping={{
                        success: <SuccessIcon />,
                        error: <ErrorIcon />
                    }}
                >
                    {feedbackMessage.message}
                </Alert>
            )}
        </Layout>
    );
};

export default CorredoresPage;