import { useEffect, useState, useCallback } from 'react';
import {
    Typography, Grid, Card, Box, Button, Fade, Alert, LinearProgress, CircularProgress,
    useTheme, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
    Paper, IconButton, Tooltip, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    ReportProblem, Inventory, Refresh, AccountBalanceWallet, People,
    PriceCheck as PriceCheckIcon, Warehouse as WarehouseIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DashboardPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState({
        lowStockProducts: [],
        pendingItems: [],
        runnerDebts: [],
        unpaidDebts: [],
        stockGlobal: [],
        stockProductos: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openSaldarDialog, setOpenSaldarDialog] = useState(false);
    const [salidaToSaldar, setSalidaToSaldar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/dashboard');
            const data = response.data;
            // Nos aseguramos de que todos los arrays esperados existan, incluso si la API no los devuelve.
            // Esto previene errores si, por ejemplo, `data.runnerDebts` es undefined.
            setDashboardData(prev => ({
                ...{ lowStockProducts: [], pendingItems: [], runnerDebts: [], unpaidDebts: [], stockGlobal: [], stockProductos: [] },
                ...data,
            }));
        } catch (err) {
            setError('No se pudieron cargar los datos del dashboard.');
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleOpenSaldarDialog = (salida) => {
        setSalidaToSaldar(salida);
        setOpenSaldarDialog(true);
    };

    const handleCloseSaldarDialog = () => {
        setOpenSaldarDialog(false);
        setSalidaToSaldar(null);
    };

    const handleConfirmSaldar = async () => {
        if (!salidaToSaldar) return;
        setIsSubmitting(true);
        try {
            await api.patch(`/salidas/${salidaToSaldar.id}/saldar-diferencia`);
            alert('Faltante saldado correctamente.');
            fetchDashboardData(); // Recargar datos del dashboard
            handleCloseSaldarDialog();
        } catch (err) {
            console.error("Error al saldar la diferencia:", err);
            alert(err.response?.data?.error || 'No se pudo saldar el faltante.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardData();
    };

    const handleRowClick = (salidaId, corredorId, ventaId = null) => {
        const searchParams = new URLSearchParams({
            salidaId,
            corredorId,
        });
        if (ventaId) searchParams.set('ventaId', ventaId);
        navigate(`/ventas?${searchParams.toString()}`);
    };

    return (
        <Layout>
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Dashboard Principal
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<Refresh />} 
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    Actualizar
                </Button>
            </Box>

            {loading ? (
                <LinearProgress sx={{ my: 4 }} />
            ) : error ? (
                <Alert severity="error" sx={{ my: 4 }}>{error}</Alert>
            ) : (
                <Fade in={!loading}>
                    <Grid container spacing={4}>
                        {/* Stock de Almacén (Global) */}
                        <Grid item xs={12} md={6} lg={4}>
                            <Card sx={{ p: 3, borderLeft: `4px solid ${theme.palette.primary.main}` }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <WarehouseIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                        Stock de Almacén (Global)
                                    </Typography>
                                </Box>
                                {dashboardData.stockGlobal.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Tipo Envase</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Llenos</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Vacíos</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dashboardData.stockGlobal.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.tipoProducto}</TableCell>
                                                        <TableCell align="center"><Chip label={item.stockLleno} color="success" size="small" /></TableCell>
                                                        <TableCell align="center"><Chip label={item.stockVacio} color="warning" size="small" /></TableCell>
                                                        <TableCell align="center"><Chip label={item.stockTotal} color="primary" size="small" /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body1" color="textSecondary">
                                        No hay datos de stock global.
                                    </Typography>
                                )}
                            </Card>
                        </Grid>

                        {/* Stock de Almacén (por Producto) */}
                        <Grid item xs={12} md={6} lg={4}>
                            <Card sx={{ p: 3, borderLeft: `4px solid ${theme.palette.success.main}` }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <Inventory sx={{ color: theme.palette.success.main, mr: 1 }} />
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                        Stock de Almacén (por Producto)
                                    </Typography>
                                </Box>
                                {dashboardData.stockProductos.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 300 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Stock Lleno</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dashboardData.stockProductos.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{p.nombre}</TableCell>
                                                        <TableCell align="right">{p.stockLleno}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body1" color="textSecondary">
                                        No hay productos registrados.
                                    </Typography>
                                )}
                            </Card>
                        </Grid>

                        {/* Alertas de Stock Crítico 
                        <Grid item xs={12} md={6} lg={4}>
                            <Card sx={{ p: 3, borderLeft: `4px solid ${theme.palette.warning.main}` }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <ReportProblem sx={{ color: theme.palette.warning.main, mr: 1 }} />
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                        Alertas de Stock Crítico
                                    </Typography>
                                </Box>
                                {dashboardData.lowStockProducts.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Mínimo</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dashboardData.lowStockProducts.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{p.nombre}</TableCell>
                                                        <TableCell>{p.stockLleno}</TableCell>
                                                        <TableCell>{p.stockMinimo}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body1" color="textSecondary">
                                        No hay productos con stock bajo.
                                    </Typography>
                                )}
                            </Card>
                        </Grid>*/}
                        {/* Clientes con Deuda */}
                        <Grid item xs={12} md={6} lg={4}>
                            <Card sx={{ p: 3, borderLeft: `4px solid ${theme.palette.error.main}` }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <AccountBalanceWallet sx={{ color: theme.palette.error.main, mr: 1 }} />
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                        Deudas de Clientes
                                    </Typography>
                                </Box>
                                {dashboardData.unpaidDebts.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Corredor</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Monto</TableCell>
                                                    
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dashboardData.unpaidDebts.map((deuda) => (
                                                    <TableRow
                                                        key={deuda.id}
                                                        hover
                                                        onClick={() => handleRowClick(deuda.venta.salida.id, deuda.venta.salida.corredor.id, deuda.ventaId)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell>{deuda.venta.usuario?.nombre}</TableCell>
                                                        <TableCell>{deuda.nombreCliente}</TableCell>
                                                        <TableCell>
                                                            {deuda.venta.salida.corredor.nombre}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ color: 'error.main' }}>S/ {deuda.monto.toFixed(2)}</TableCell>
                                                        
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body1" color="textSecondary">
                                        No hay deudas pendientes.
                                    </Typography>
                                )}
                            </Card>
                        </Grid>

                        {/* Pendientes de Balones/Bidones */}
                        <Grid item xs={12} md={6} lg={4}>
                            <Card sx={{ p: 3, borderLeft: `4px solid ${theme.palette.info.main}` }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <Inventory sx={{ color: theme.palette.info.main, mr: 1 }} />
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                        Balones/Bidones Pendientes
                                    </Typography>
                                </Box>
                                {dashboardData.pendingItems.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Corredor</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                                    
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dashboardData.pendingItems.map((item) => (
                                                    <TableRow
                                                        key={item.id}
                                                        hover
                                                        onClick={() => handleRowClick(item.venta.salida.id, item.venta.salida.corredor.id, item.venta.id)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell>{item.venta.usuario?.nombre}</TableCell>
                                                        <TableCell>{item.venta.clienteNombre}</TableCell>
                                                        <TableCell>
                                                            {item.venta.salida.corredor.nombre}
                                                        </TableCell>
                                                        <TableCell>{item.producto.nombre}</TableCell>
                                                        
                                                        <TableCell>{item.cantidad}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body1" color="textSecondary">
                                        No hay registros pendientes.
                                    </Typography>
                                )}
                            </Card>
                        </Grid>

                        {/* Faltantes de Corredores */}
                        <Grid item xs={12} md={6} lg={4}>
                            <Card sx={{ p: 3, borderLeft: `4px solid ${theme.palette.secondary.main}` }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <People sx={{ color: theme.palette.secondary.main, mr: 1 }} />
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                                        Faltantes de Corredores
                                    </Typography>
                                </Box>
                                {dashboardData.runnerDebts.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Corredor</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Monto</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Acción</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {dashboardData.runnerDebts.map((deuda) => (
                                                    <TableRow
                                                        key={deuda.id}
                                                        hover
                                                        
                                                    >
                                                        <TableCell>{deuda.usuarioLiquidador?.nombre || deuda.usuario?.nombre}</TableCell>
                                                        <TableCell>{deuda.corredor.nombre}</TableCell>
                                                        <TableCell>{format(new Date(deuda.fecha), 'dd MMM yyyy', { locale: es })}</TableCell>
                                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>S/ {Math.abs(deuda.diferencia).toFixed(2)}</TableCell>
                                                        <TableCell align="center">
                                                            <Tooltip title="Saldar Faltante">
                                                                <IconButton
                                                                    edge="end"
                                                                    color="success"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Detiene la propagación del evento al TableRow
                                                                        handleOpenSaldarDialog(deuda);
                                                                    }}
                                                                >
                                                                    <PriceCheckIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body1" color="textSecondary">No hay faltantes registrados.</Typography>
                                )}
                            </Card>
                        </Grid>
                    </Grid>
                </Fade>
            )}

            {/* Diálogo de Confirmación para Saldar Faltante */}
            <Dialog open={openSaldarDialog} onClose={handleCloseSaldarDialog}>
                <DialogTitle>Confirmar Pago de Faltante</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas marcar como pagado el faltante de 
                        <strong> S/ {salidaToSaldar ? Math.abs(salidaToSaldar.diferencia).toFixed(2) : '0.00'}</strong> del corredor 
                        <strong> {salidaToSaldar?.corredor.nombre}</strong> correspondiente a la salida del 
                        <strong> {salidaToSaldar ? format(new Date(salidaToSaldar.fecha), 'dd/MM/yyyy') : ''}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSaldarDialog} disabled={isSubmitting}>Cancelar</Button>
                    <Button onClick={handleConfirmSaldar} color="success" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Confirmar Pago'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};

export default DashboardPage;