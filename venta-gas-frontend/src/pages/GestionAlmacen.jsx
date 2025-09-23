import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Box,
    IconButton,
    Tooltip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Button,
    Snackbar,
    Alert,
    ToggleButtonGroup,
    ToggleButton,
    Chip,
    Stack,
    Grid,
    Divider,
    FormControl, InputLabel, Select, MenuItem, Pagination
} from '@mui/material';
import { Tune as TuneIcon, Visibility as VisibilityIcon, Launch as LaunchIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, TrendingFlat as TrendingFlatIcon } from '@mui/icons-material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PropaneTankIcon from '@mui/icons-material/PropaneTank';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import api from '../services/api';
import Layout from '../components/Layout';
import VentaDetailsDialog from '../components/VentaDetailsDialog'; // ✨ NUEVA IMPORTACIÓN

const motivoLabels = {
    VENTA_CON_ENVASE: { label: 'Venta c/ Envase', color: 'info' },
    VENTA_PENDIENTE: { label: 'Envase Pendiente', color: 'warning' },
    REVERSION_VENTA_CON_ENVASE: { label: 'Reversión Venta c/ Envase', color: 'default' },
    REVERSION_VENTA_PENDIENTE: { label: 'Reversión Pendiente', color: 'default' },
    SALDO_PENDIENTE_POST_CIERRE: { label: 'Saldo Post-Cierre', color: 'success' },
    INICIO_SALIDA: { label: 'Inicio de Jornada', color: 'secondary' },
    COMPRA_CANJE: { label: 'Compra (Canje)', color: 'primary' },
    AJUSTE_MANUAL: { label: 'Ajuste Manual', color: 'default' },
    DEVOLUCION_LLENOS: { label: 'Devolución Llenos', color: 'info' },
    VENTA_NORMAL: { label: 'Venta Normal', color: 'success' },
};

const StockGlobalPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [fechaInicio, setFechaInicio] = useState(format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
    // ✨ NUEVOS ESTADOS PARA FILTRO Y PAGINACIÓN
    const [motivoFilter, setMotivoFilter] = useState(''); // '' para todos
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [ajusteData, setAjusteData] = useState({
        tipoProducto: '',
        cantidad: '',
        operacion: 'increment',
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });
    // ✨ NUEVOS ESTADOS PARA EL DIÁLOGO DE DETALLES
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [ventaDetails, setVentaDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    // ✨ ESTADOS PARA EL RESUMEN DIARIO
    const [summaryDate, setSummaryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const fetchStockGlobal = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/stock-global');
            setStockData(response.data);
        } catch (error) {
            console.error('Error al obtener el stock global:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar el stock global.',
                severity: 'error',
            });
        } finally {  
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStockGlobal();
    }, [fetchStockGlobal]);

    const fetchHistorial = useCallback(async () => {
        setLoadingHistorial(true);
        try {
            const response = await api.get('/stock-global/historial', {
                params: {
                    fechaInicio, 
                    fechaFin,
                    motivo: motivoFilter,
                    page: page,
                    limit: 15, // Puedes ajustar este valor
                },
            });
            // ✨ ACTUALIZADO: El backend ahora devuelve un objeto con paginación
            setHistorial(response.data.historial);
            setTotalPages(response.data.totalPages);
            setTotalResults(response.data.totalResults);
            setPage(response.data.currentPage);
        } catch (error) {
            console.error('Error al obtener el historial de stock:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar el historial de stock.',
                severity: 'error',
            });
        } finally {
            setLoadingHistorial(false);
        }
    }, [fechaInicio, fechaFin, motivoFilter, page]);

    useEffect(() => {
        fetchHistorial();
    }, [fetchHistorial]);

    const fetchDailySummary = useCallback(async () => {
        if (!summaryDate) return;
        setLoadingSummary(true);
        try {
            const response = await api.get('/stock-global/summary', { params: { date: summaryDate } });
            setSummaryData(response.data);
        } catch (error) {
            console.error('Error al obtener el resumen diario:', error);
            setSnackbar({ open: true, message: 'Error al cargar el resumen diario.', severity: 'error' });
        } finally {
            setLoadingSummary(false);
        }
    }, [summaryDate]);

    useEffect(() => {
        fetchDailySummary();
    }, [fetchDailySummary]);

    const handleOpenDialog = (tipoProducto) => {
        setAjusteData({ tipoProducto, cantidad: '', operacion: 'increment' });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleAjusteChange = (e) => {
        const { name, value } = e.target;
        setAjusteData((prev) => ({ ...prev, [name]: value }));
    };

    const handleOperacionChange = (event, newOperacion) => {
        if (newOperacion !== null) {
            setAjusteData((prev) => ({ ...prev, operacion: newOperacion }));
        }
    };

    const handleAjusteSubmit = async () => {
        if (!ajusteData.cantidad || isNaN(parseInt(ajusteData.cantidad)) || parseInt(ajusteData.cantidad) <= 0) {
            setSnackbar({ open: true, message: 'Por favor, ingrese una cantidad válida.', severity: 'warning' });
            return;
        }

        try {
            await api.put(`/stock-global/${ajusteData.tipoProducto}`, {
                cantidad: parseInt(ajusteData.cantidad),
                operacion: ajusteData.operacion,
            });
            setSnackbar({ open: true, message: 'Stock de vacíos actualizado con éxito.', severity: 'success' });
            handleCloseDialog();
            fetchStockGlobal(); // Recargar datos de la tabla de stock
            fetchHistorial();   // ✨ CORRECCIÓN: Recargar también el historial para reflejar el ajuste
        } catch (error) {
            console.error('Error al actualizar el stock de vacíos:', error);
            setSnackbar({ open: true, message: 'Error al actualizar el stock.', severity: 'error' });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handlePageChange = (event, value) => {
        setPage(value);
        // El useEffect se encargará de llamar a fetchHistorial
    };

    const handleRedirect = (item) => {
        const isReversion = item.motivo.startsWith('REVERSION_');
        const isVentaRelated = item.motivo.includes('VENTA') || item.motivo.includes('SALDO');

        // Si es un evento de venta (y no una reversión), redirige a la venta específica.
        if (item.ventaId && !isReversion && isVentaRelated) {
            const params = new URLSearchParams({
                salidaId: item.salida.id,
                corredorId: item.salida.corredor.id,
                ventaId: item.ventaId,
            });
            navigate(`/ventas?${params.toString()}`);
        } 
        // Para cualquier otro evento que tenga una salida (incluyendo reversiones), redirige a la jornada.
        else if (item.salida?.id) {
            navigate(`/jornadas?openSalidaId=${item.salida.id}`);
        }
    };

    // ✨ NUEVA LÓGICA PARA ABRIR EL DIÁLOGO DE DETALLES
    const handleOpenDetailsDialog = async (ventaId) => {
        if (!ventaId) return;
        setLoadingDetails(true);
        setOpenDetailsDialog(true);
        try {
            const response = await api.get(`/ventas/${ventaId}`);
            setVentaDetails(response.data);
        } catch (err) {
            console.error('Error fetching venta details:', err);
            setSnackbar({ open: true, message: 'No se pudieron cargar los detalles de la venta.', severity: 'error' });
            setOpenDetailsDialog(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    const getProductoIcon = (tipo) => {
        if (tipo?.startsWith('GAS')) return <PropaneTankIcon color="action" />;
        if (tipo?.startsWith('AGUA')) return <WaterDropIcon color="action" />;
        return null;
    };

    const formatTipoProductoLabel = (tipo) => {
        if (tipo?.startsWith('GAS_')) {
            return `Balones de Gas (${tipo.replace('GAS_', '')})`;
        }
        if (tipo?.startsWith('AGUA_')) {
            return `Bidones de Agua (${tipo.replace('AGUA_', '')})`;
        }
        return tipo;
    };

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Gestión de Stock de Almacén
                </Typography>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Producto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Lleno</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Vacío</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Total</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stockData.map((item) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={2}>
                                                    {getProductoIcon(item.tipoProducto)}
                                                    <Typography variant="body1" fontWeight="500">
                                                        {formatTipoProductoLabel(item.tipoProducto)}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={item.stockLleno} color="success" variant="outlined" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={item.stockVacio} color="warning" variant="outlined" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={item.stockTotal} color="primary" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Ajustar Stock de Vacíos">
                                                    <IconButton color="primary" onClick={() => handleOpenDialog(item.tipoProducto)}>
                                                        <TuneIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                <Divider sx={{ my: 4 }}><Chip label="Resumen del Día" /></Divider>

                <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                            Resumen del Día
                        </Typography>
                        <TextField
                            label="Fecha del Resumen"
                            type="date"
                            value={summaryDate}
                            onChange={(e) => setSummaryDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 220 }}
                        />
                    </Stack>
                    {loadingSummary ? <CircularProgress /> : (
                        <Grid container spacing={2}>
                            {summaryData.length > 0 ? summaryData.map(summary => (
                                <Grid item xs={12} md={6} key={summary.tipoProducto}>
                                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                                        <Typography variant="h6" gutterBottom>{formatTipoProductoLabel(summary.tipoProducto)}</Typography>
                                        <Stack direction="row" spacing={2} justifyContent="space-around" mb={2} alignItems="center">
                                            <Box textAlign="center"><Typography variant="caption">Inicial</Typography><Typography variant="h5">{summary.stockInicial}</Typography></Box>
                                            {summary.cambioNeto > 0 ? <TrendingUpIcon color="success" sx={{ fontSize: 40 }} /> : summary.cambioNeto < 0 ? <TrendingDownIcon color="error" sx={{ fontSize: 40 }} /> : <TrendingFlatIcon color="action" sx={{ fontSize: 40 }} />}
                                            <Box textAlign="center"><Typography variant="caption">Final</Typography><Typography variant="h5">{summary.stockFinal}</Typography></Box>
                                        </Stack>
                                        {/* ✨ SECCIÓN SIMPLIFICADA: Se quita el desglose de cambios de stock para mayor claridad */}
                                        
                                        {summary.eventos.length > 0 && <Divider sx={{ my: 1, mt: 2 }} />}
                                        {summary.eventos.length > 0 && <Typography variant="subtitle2" mt={1} mb={1}>Envases No Devueltos en Ventas:</Typography>}
                                        {summary.eventos.map(e => (
                                            <Stack key={e.motivo} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                <Typography variant="body2">{motivoLabels[e.motivo]?.label || e.motivo.replace(/_/g, ' ')}</Typography>
                                                <Chip label={e.count} size="small" color={motivoLabels[e.motivo]?.color || 'default'} />
                                            </Stack>
                                        ))}
                                    </Paper>
                                </Grid>
                            )) : (
                                <Grid item xs={12}>
                                    <Alert severity="info">No se encontraron datos para el resumen en la fecha seleccionada.</Alert>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </Paper>

                <Divider sx={{ my: 4 }}><Chip label="Historial Detallado" /></Divider>

                <Typography variant="h5" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'secondary.main', mb: 2 }}>
                    Historial de Stock de Almacén
                </Typography>
                <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                    <Grid container spacing={2} alignItems="flex-start">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Fecha de Inicio"
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Fecha de Fin"
                                type="date"
                                value={fechaFin}
                                onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>Filtrar por Motivo</InputLabel>
                                <Select
                                    value={motivoFilter}
                                    label="Filtrar por Motivo"
                                    onChange={(e) => { setMotivoFilter(e.target.value); setPage(1); }}
                                >
                                    <MenuItem value=""><em>Todos los Motivos</em></MenuItem>
                                    <MenuItem value="VENTA_CON_ENVASE">Venta con Envase</MenuItem>
                                    <MenuItem value="VENTA_PENDIENTE">Envase Pendiente</MenuItem>
                                    <MenuItem value="SALDO_PENDIENTE_POST_CIERRE">Saldo Post-Cierre</MenuItem>
                                    <MenuItem value="COMPRA_CANJE">Compra (Canje)</MenuItem>
                                    <MenuItem value="AJUSTE_MANUAL">Ajuste Manual</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2} sx={{ display: 'none' }}> {/* Botón oculto, el filtro es automático */}
                            <Button variant="contained" onClick={fetchHistorial} fullWidth sx={{ height: '56px' }}>
                                Filtrar
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                        {totalResults} registros encontrados.
                    </Typography>
                    {totalPages > 1 && <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" disabled={loadingHistorial} />}
                </Box>

                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: theme.palette.grey[100] }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>                                    
                                    <TableCell sx={{ fontWeight: 'bold' }}>Motivo</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cambio</TableCell>                                    
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Anterior</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Actual</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Corredor</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Detalles</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingHistorial ? (
                                    <TableRow><TableCell colSpan={9} align="center"><CircularProgress /></TableCell></TableRow>
                                ) : historial.length === 0 ? (
                                    <TableRow><TableCell colSpan={9} align="center">No hay registros para las fechas seleccionadas.</TableCell></TableRow>
                                ) : (
                                    historial.map((item) => (
                                        <TableRow key={item.id} hover >
                                            <TableCell>{format(new Date(item.fecha), 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={motivoLabels[item.motivo]?.label || item.motivo.replace(/_/g, ' ')}
                                                    color={motivoLabels[item.motivo]?.color || 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{item.tipoProducto}</TableCell>
                                            <TableCell align="center">
                                                <Chip 
                                                    label={`${item.cambio > 0 ? '+' : ''}${item.cambio}`}
                                                    color={item.cambio > 0 ? 'success' : (item.cambio < 0 ? 'error' : 'default')}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="center">{item.stockTotalAnterior}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{item.stockTotal}</TableCell>
                                            <TableCell>{item.salida?.corredor?.nombre || 'N/A'}</TableCell>
                                            <TableCell>{item.detalles}</TableCell>
                                            <TableCell align="center">
                                                {/* ✨ LÓGICA MEJORADA: Mostrar acciones si hay venta O salida asociada */}
                                                {(() => {
                                                    const isReversion = item.motivo.startsWith('REVERSION_');
                                                    
                                                    if (item.ventaId && !isReversion) {
                                                        // Si hay ventaId y no es una reversión, mostrar ambas acciones.
                                                        return (
                                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                                <Tooltip title="Ver Detalles Rápidos de la Venta">
                                                                    <IconButton color="primary" size="small" onClick={(e) => { e.stopPropagation(); handleOpenDetailsDialog(item.ventaId); }}>
                                                                        <VisibilityIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Ir a la Página de Ventas">
                                                                    <IconButton color="secondary" size="small" onClick={(e) => { e.stopPropagation(); handleRedirect(item); }}>
                                                                        <LaunchIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        );
                                                    } else if (item.salida?.id) {
                                                        // Si solo hay salidaId (ej. INICIO_SALIDA o una reversión), mostrar solo la acción de ir a la jornada.
                                                        return (
                                                            <Tooltip title="Ir a la Jornada">
                                                                <IconButton color="secondary" size="small" onClick={(e) => { e.stopPropagation(); handleRedirect(item); }}>
                                                                    <LaunchIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        );
                                                    }
                                                    return null; // No mostrar nada si no hay IDs
                                                })()}
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" disabled={loadingHistorial} />
                        </Box>
                    )}
                </Paper>
            </Container>

            {/* Dialogo para ajustar stock */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog}>
                <DialogTitle>Ajustar Stock de Envases Vacíos</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Ajuste el inventario para los envases de tipo <strong>{ajusteData.tipoProducto}</strong>.
                        Esta acción es para correcciones manuales del inventario.
                    </DialogContentText>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <ToggleButtonGroup
                            color="primary"
                            value={ajusteData.operacion}
                            exclusive
                            onChange={handleOperacionChange}
                            aria-label="operacion"
                            fullWidth
                        >
                            <ToggleButton value="increment" aria-label="incrementar">
                                <AddCircleOutlineIcon sx={{ mr: 1 }} />
                                Incrementar
                            </ToggleButton>
                            <ToggleButton value="decrement" aria-label="decrementar">
                                <RemoveCircleOutlineIcon sx={{ mr: 1 }} />
                                Decrementar
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <TextField
                            autoFocus
                            margin="dense"
                            name="cantidad"
                            label="Cantidad"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={ajusteData.cantidad}
                            onChange={handleAjusteChange}
                            InputProps={{
                                inputProps: {
                                    min: 1
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={handleCloseDialog} color="secondary">
                        Cancelar
                    </Button>
                    <Button onClick={handleAjusteSubmit} variant="contained" color="primary">
                        Guardar Ajuste
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar para notificaciones */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* ✨ DIÁLOGO DE DETALLES REUTILIZADO */}
            <VentaDetailsDialog
                open={openDetailsDialog}
                onClose={() => setOpenDetailsDialog(false)}
                ventaDetails={loadingDetails ? null : ventaDetails}
            />
        </Layout>
    );
};

export default StockGlobalPage;
