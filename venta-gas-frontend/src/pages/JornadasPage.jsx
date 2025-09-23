import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Button, CircularProgress, Alert, Paper,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, IconButton, Tooltip, Stack, AlertTitle,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    TextField, FormControl, InputLabel, Select, MenuItem, Divider,
    Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText,
    Grid, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    AddCircleOutline as AddCircleOutlineIcon,
    Visibility as VisibilityIcon,
    Close as CloseIcon,
    Stop as StopIcon,
    Cancel as CancelIcon,
    ExpandMore as ExpandMoreIcon,
    LocalShipping as LocalShippingIcon,
    Person as PersonIcon,
    AssignmentReturn as DevolverLlenosIcon, // ✨ Icono para la nueva acción
    Cached as ReabastecerIcon,
    PointOfSale as PointOfSaleIcon,
    Info as InfoIcon, // ✨ Icono para el nuevo aviso
    CheckCircle as CheckCircleIcon // ✨ Icono para estado OK
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Importaciones de componentes personalizados
import Layout from '../components/Layout';
import api from '../services/api';
import ResumenJornada from '../components/ResumenJornada'; // ✨ IMPORTAR NUEVO COMPONENTE
import ReabastecimientoModal from '../components/ReabastecimientoModal';
import HistorialReabastecimientos from '../components/HistorialReabastecimientos';


// Mapeo de tipos de productos para evitar strings "mágicos"
const PRODUCT_TYPES = {
    BALON_GAS: 'BALON_GAS',
    AGUA: 'AGUA',
    VALVULA: 'VALVULA',
};

// Mapeo de estados de salida
const ESTADOS_SALIDA = {
    ABIERTO: 'ABIERTO',
    FINALIZADA: 'FINALIZADO',
    CANCELADA: 'CANCELADA',
};

const SalidaPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSalidaIdToOpen = searchParams.get('openSalidaId');

    // Estados para la página
    const [salidas, setSalidas] = useState([]);
    const [corredores, setCorredores] = useState([]);
    const [productosAlmacen, setProductosAlmacen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para los diálogos
    const [openStartDialog, setOpenStartDialog] = useState(false);
    const [openLiquidarDialog, setOpenLiquidarDialog] = useState(false);
    const [openDevolverLlenosDialog, setOpenDevolverLlenosDialog] = useState(false); // ✨ Nuevo estado para el diálogo de devolución
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);

    // Estados para el formulario de inicio de salida
    const [corredorSeleccionado, setCorredorSeleccionado] = useState('');
    const [stockAsignado, setStockAsignado] = useState({});
    const [modalReabastecerOpen, setModalReabastecerOpen] = useState(false);

    // Estados para el formulario de liquidación
    const [salidaParaLiquidar, setSalidaParaLiquidar] = useState(null);
    const [llenosDevueltos, setLlenosDevueltos] = useState({}); // ✨ Nuevo estado para la devolución de llenos

    // Estado para los detalles de la salida seleccionada
    const [salidaSeleccionada, setSalidaSeleccionada] = useState(null);
    const handleReabastecimientoExitoso = (nuevoReabastecimiento) => {
        // Actualiza la lista principal de salidas para reflejar el nuevo historial
        setSalidas(prevSalidas =>
            prevSalidas.map(s => {
                if (s.id === salidaSeleccionada.id) {
                    return { ...s, reabastecimientos: [...(s.reabastecimientos || []), nuevoReabastecimiento] };
                }
                return s;
            })
        );
        // Si el diálogo de detalles está abierto para la misma salida, actualízalo también
        if (salidaSeleccionada && salidaSeleccionada.id === nuevoReabastecimiento.salidaId) {
            setSalidaSeleccionada(prev => ({ ...prev, reabastecimientos: [...(prev.reabastecimientos || []), nuevoReabastecimiento] }));
        }
        showFeedback('success', 'Reabastecimiento registrado con éxito.');
    };
    // Estado para los mensajes de feedback (Alerts)
    const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });

    // Mapa para buscar nombres de productos por ID de forma eficiente
    const productosMap = useMemo(() => {
        if (!productosAlmacen) return new Map();
        return new Map(productosAlmacen.map(p => [p.id, p.nombre]));
    }, [productosAlmacen]);

    // ✨ CÁLCULO AÑADIDO: Calcula los envases que el corredor debe justificar (devolver)
    const envasesPorJustificar = useMemo(() => {
        if (!salidaSeleccionada) return {};

        const stockPorTipo = new Map();
        const justificadoPorTipo = new Map();
        const ventasPorTipo = new Map();

        const procesarMovimiento = (map, tipo, cantidad) => {
            if (!tipo || !(tipo.startsWith('GAS_') || tipo.startsWith('AGUA_'))) return;
            map.set(tipo, (map.get(tipo) || 0) + cantidad);
        };

        // 1. Calcular el total de envases que el corredor debe justificar (Stock que se llevó)
        (salidaSeleccionada.salidaDetalles || []).forEach(item => {
            procesarMovimiento(stockPorTipo, item.producto.tipo, item.cantidad);
        });
        (salidaSeleccionada.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                procesarMovimiento(stockPorTipo, det.producto.tipo, det.cantidadLlenoTomado);
            });
        });

        // 2. Calcular el total de envases que el corredor ya justificó (Devoluciones físicas)
        (salidaSeleccionada.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                procesarMovimiento(justificadoPorTipo, det.producto.tipo, det.cantidadVacioDevuelto);
                procesarMovimiento(justificadoPorTipo, det.producto.tipo, det.cantidadLlenoDevuelto);
            });
        });

        // 3. Contar las ventas normales (que generan un vacío para el corredor)
        (salidaSeleccionada.ventas || []).forEach(venta => {
            (venta.productos || []).forEach(p => {
                const esPendienteDeEnvase = (venta.pendientes || []).some(pen => pen.productoId === p.productoId);
                if (!p.seVendioConEnvase && !esPendienteDeEnvase) {
                    procesarMovimiento(ventasPorTipo, p.producto.tipo, p.cantidadLleno);
                }
            });
        });

        // 4. Calcular el balance final
        const balanceFinal = new Map();
        stockPorTipo.forEach((cantidad, tipo) => {
            const justificadoFisico = justificadoPorTipo.get(tipo) || 0;
            const ventas = ventasPorTipo.get(tipo) || 0;
            const balance = cantidad - justificadoFisico - ventas;
            balanceFinal.set(tipo, Math.max(0, balance)); // No mostrar saldos negativos
        });

        return Object.fromEntries(balanceFinal);
    }, [salidaSeleccionada]);

    const showFeedback = useCallback((type, message) => {
        setFeedback({ show: true, type, message });
        setTimeout(() => setFeedback({ show: false, type: '', message: '' }), 5000);
    }, []);

    const handleOpenDetailsDialog = useCallback(async (salida) => {
        setLoading(true);
        try {
            const res = await api.get(`/salidas/${salida.id}`);
            setSalidaSeleccionada(res.data);
            setOpenDetailsDialog(true);
        } catch (err) {
            console.error('Error al obtener detalles de la salida:', err);
            showFeedback('error', 'Error al obtener detalles de la salida.');
        } finally {
            setLoading(false);
        }
    }, [showFeedback]);
    
    // Función para limpiar estados del diálogo de inicio
    const resetStartDialogState = () => {
        setCorredorSeleccionado('');
        setStockAsignado({});
    };

    // --- Funciones de Fetching de Datos ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [salidasRes, corredoresRes, productosRes] = await Promise.all([
                api.get('/salidas'),
                api.get('/corredores'),
                api.get('/productos')
            ]);
            setSalidas(salidasRes.data);
            setCorredores(corredoresRes.data.filter(c => c.activo));
            setProductosAlmacen(productosRes.data);
        } catch (err) {
            console.error('Error al cargar datos iniciales:', err);
            setError('Error al cargar la información inicial.');
            showFeedback('error', 'No se pudo cargar la información del servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Hook para cargar datos al montar el componente
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ✨ NUEVO EFECTO: Abrir detalles si viene un ID en la URL
    useEffect(() => {
        if (initialSalidaIdToOpen && salidas.length > 0) {
            const salidaToOpen = salidas.find(s => s.id === parseInt(initialSalidaIdToOpen));
            if (salidaToOpen) {
                // Usar un timeout para asegurar que la UI esté lista
                setTimeout(() => {
                    handleOpenDetailsDialog(salidaToOpen);
                    // Limpiar el parámetro de la URL para no reabrir en un refresh
                    searchParams.delete('openSalidaId');
                    setSearchParams(searchParams, { replace: true });
                }, 100);
            }
        }
    }, [initialSalidaIdToOpen, salidas, handleOpenDetailsDialog, searchParams, setSearchParams]);

    // --- Lógica del Diálogo para Iniciar Salida ---
    const handleOpenStartDialog = () => {
        resetStartDialogState();
        setOpenStartDialog(true);
    };

    const handleCloseStartDialog = () => {
        setOpenStartDialog(false);
    };

    const handleStockAsignadoChange = (productoId, field, value) => {
        const numericValue = parseInt(value, 10);
        if (numericValue >= 0 || value === '') {
            setStockAsignado(prevStock => ({
                ...prevStock,
                [productoId]: {
                    ...prevStock[productoId],
                    [field]: numericValue || 0,
                }
            }));
        }
    };

    const handleStartSalida = async () => {
        if (!corredorSeleccionado) {
            showFeedback('warning', 'Debe seleccionar un corredor.');
            return;
        }

        const productosLlenosLlevados = Object.entries(stockAsignado)
            .filter(([_, stock]) => stock.stockLleno > 0)
            .map(([productoId, stock]) => ({
                productoId: parseInt(productoId, 10),
                cantidad: stock.stockLleno,
            }));

        const productosVaciosDejados = Object.entries(stockAsignado)
            .filter(([_, stock]) => stock.stockVacio > 0)
            .map(([productoId, stock]) => ({
                productoId: parseInt(productoId, 10),
                cantidad: stock.stockVacio,
            }));

        if (productosLlenosLlevados.length === 0) {
            showFeedback('warning', 'Debe asignar al menos un balón lleno para la salida.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/salidas', {
                corredorId: corredorSeleccionado,
                productosLlenosLlevados,
                productosVaciosDejados,
            });
            showFeedback('success', 'Salida iniciada correctamente.');
            handleCloseStartDialog();
            fetchData();
        } catch (err) {
            console.error('Error al iniciar salida:', err);
            showFeedback('error', `Error al iniciar salida: ${err.response?.data?.details || err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Lógica para Liquidar Salida ---
    const handleOpenLiquidarDialog = async (salida) => {
        setLoading(true);
        try {
            // Se obtienen los detalles completos de la salida para tener los datos de ventas y gastos actualizados.
            const { data: salidaCompleta } = await api.get(`/salidas/${salida.id}`);
            setSalidaParaLiquidar(salidaCompleta); // ✨ Ya no se inicializa data de liquidación aquí
            setOpenLiquidarDialog(true);
        } catch (err) {
            showFeedback('error', 'No se pudieron cargar los detalles para la liquidación.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseLiquidarDialog = () => {
        setOpenLiquidarDialog(false);
        setSalidaParaLiquidar(null);
    };

    const handleLiquidarSalida = async () => {
        if (!salidaParaLiquidar) return;
        
        if (window.confirm('¿Estás seguro de finalizar y liquidar esta salida? Esta acción es irreversible.') === false) {
            return;
        }

        setLoading(true);
        try {
            // ✨ La liquidación ahora es solo una confirmación. El stock ya fue manejado.
            // El backend se encargará de devolver el stock restante del corredor al almacén.
            await api.put(`/salidas/${salidaParaLiquidar.id}/liquidar`, {});
            showFeedback('success', 'Salida liquidada y finalizada correctamente.');
            handleCloseLiquidarDialog();
            fetchData();
        } catch (err) {
            console.error('Error al liquidar salida:', err);
            showFeedback('error', `Error al liquidar: ${err.response?.data?.details || err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- ✨ Lógica para el Nuevo Diálogo "Devolver Llenos" ---
    const handleOpenDevolverLlenosDialog = async (salida) => {
        // ✨ CORRECCIÓN: Se debe obtener la información completa y actualizada de la salida,
        // incluyendo el stock del corredor, antes de abrir el diálogo.
        setLoading(true);
        try {
            const { data: salidaCompleta } = await api.get(`/salidas/${salida.id}`);
            setSalidaSeleccionada(salidaCompleta);
            setLlenosDevueltos({}); // Limpiar estado anterior
            setOpenDevolverLlenosDialog(true);
        } catch (err) {
            console.error('Error al cargar detalles para devolución:', err);
            showFeedback('error', 'No se pudieron cargar los detalles de la salida.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDevolverLlenosDialog = () => {
        setOpenDevolverLlenosDialog(false);
        setSalidaSeleccionada(null);
    };

    const handleDevolucionChange = (productoId, value) => {
        const numericValue = parseInt(value, 10) || 0;
        setLlenosDevueltos(prev => ({
            ...prev,
            [productoId]: numericValue
        }));
    };

    const handleConfirmarDevolucionLlenos = async () => {
        if (!salidaSeleccionada) return;

        const payload = {
            productosLlenosDevueltos: Object.entries(llenosDevueltos)
                .filter(([_, cantidad]) => cantidad > 0)
                .map(([productoId, cantidad]) => ({ productoId: parseInt(productoId), cantidad }))
        };

        setLoading(true);
        try {
            await api.put(`/salidas/${salidaSeleccionada.id}/finalizar-reabastecimiento`, payload);
            showFeedback('success', 'Devolución de llenos registrada. El stock del corredor ha sido calculado.');
            handleCloseDevolverLlenosDialog();
            fetchData();
        } catch (err) {
            console.error('Error al registrar devolución:', err);
            showFeedback('error', `Error al registrar devolución: ${err.response?.data?.details || err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const isLiquidarInvalid = useMemo(() => {
        if (!salidaParaLiquidar) return true;
        // El botón de liquidar estará activo siempre que no se esté cargando.
        // La acción de liquidar es una decisión del encargado.
        return loading;
    }, [salidaParaLiquidar, loading]);


    // --- Lógica para Acciones de la Tabla (Cancelar) ---
    const handleCancelSalida = async (salidaId) => {
        if (window.confirm('¿Estás seguro de que deseas cancelar esta salida? Esta acción no se puede deshacer y devolverá el stock al almacén.')) {
            setLoading(true);
            try {
                await api.put(`/salidas/${salidaId}/cancelar`);
                showFeedback('success', 'Salida cancelada correctamente.');
                fetchData();
            } catch (err) {
                console.error('Error al cancelar salida:', err);
                showFeedback('error', `Error al cancelar salida: ${err.response?.data?.error || err.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCloseDetailsDialog = () => {
        setOpenDetailsDialog(false);
        setSalidaSeleccionada(null);
    };

    // Función auxiliar para obtener el estado visual
    const getEstadoSalida = (salida) => {
        if (!salida || !salida.estado) return { label: 'Desconocido', color: 'default' };
        switch (salida.estado) {
            case ESTADOS_SALIDA.ABIERTO:
                return { label: 'Activa', color: 'success' };
            case ESTADOS_SALIDA.FINALIZADA:
                return { label: 'Finalizada', color: 'primary' };
            case ESTADOS_SALIDA.CANCELADA:
                return { label: 'Cancelada', color: 'error' };
            default:
                return { label: 'Desconocido', color: 'default' };
        }
    };

    // Renderizado del componente
    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Gestión de Salidas
                </Typography>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleOpenStartDialog}
                >
                    Iniciar Salida
                </Button>
            </Box>

            {feedback.show && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({ show: false, type: '', message: '' })}>{feedback.message}</Alert>}
            {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 4 }} />}
            {error && !loading && <Alert severity="error">{error}</Alert>}

            {!loading && !error && salidas.length > 0 && (
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: theme.palette.grey[200] }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Corredor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Fecha de Inicio</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {salidas.map((salida) => {
                                const estado = getEstadoSalida(salida);
                                const fechaInicioFormatted = salida.fecha ? format(new Date(salida.fecha), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A';
                                return (
                                    <TableRow key={salida.id} hover>
                                        <TableCell>{salida.id}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <PersonIcon fontSize="small" />
                                                <Typography>{salida.corredor?.nombre}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{fechaInicioFormatted}</TableCell>
                                        <TableCell>
                                            <Chip label={estado.label} color={estado.color} size="small" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Ver detalles">
                                                <IconButton color="primary" onClick={() => handleOpenDetailsDialog(salida)}>
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                            {salida.estado === ESTADOS_SALIDA.ABIERTO && (
                                                <>
                                                    <Tooltip title="Reabastecer">
                                                        <IconButton color="info" onClick={() => {
                                                            setSalidaSeleccionada(salida);
                                                            setModalReabastecerOpen(true);
                                                        }}>
                                                            <ReabastecerIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Devolver Llenos y Calcular Ventas">
                                                        <IconButton style={{ color: theme.palette.warning.main }} onClick={() => handleOpenDevolverLlenosDialog(salida)}>
                                                            <DevolverLlenosIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Registrar Ventas">
                                                        <IconButton
                                                            color="secondary"
                                                            onClick={() => {
                                                                const fechaFiltro = format(new Date(salida.fecha), 'yyyy-MM-dd');
                                                                navigate(`/ventas?corredorId=${salida.corredor?.id}&fecha=${fechaFiltro}&salidaId=${salida.id}`);
                                                            }}>
                                                            <PointOfSaleIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {!loading && !error && salidas.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    No hay salidas registradas. Inicia una nueva para empezar.
                </Alert>
            )}

            {/* Diálogo para iniciar una nueva salida */}
            <Dialog open={openStartDialog} onClose={handleCloseStartDialog} fullWidth maxWidth="sm">
                <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShippingIcon /> Iniciar Nueva Salida
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <DialogContentText sx={{ mb: 2 }}>
                        Selecciona un corredor y el stock que se le asignará.
                    </DialogContentText>
                    
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Corredor</InputLabel>
                        <Select
                            value={corredorSeleccionado}
                            label="Corredor"
                            onChange={(e) => setCorredorSeleccionado(e.target.value)}
                        >
                            {corredores.map((corredor) => (
                                <MenuItem key={corredor.id} value={corredor.id}>
                                    {corredor.nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, mb: 2 }}>
                        Asignar Stock
                    </Typography>
                    
                    {productosAlmacen.map(producto => (
                        <Paper key={producto.id} sx={{ p: 2, mb: 2, bgcolor: theme.palette.grey[50] }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>{producto.nombre}</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={producto.tipo === PRODUCT_TYPES.VALVULA ? 12 : 6}>
                                    <TextField
                                        label={producto.tipo === PRODUCT_TYPES.VALVULA ? "Stock que se lleva" : "Balones llenos que se lleva"}
                                        type="number"
                                        value={stockAsignado[producto.id]?.stockLleno || ''}
                                        onChange={(e) => handleStockAsignadoChange(producto.id, 'stockLleno', e.target.value)}
                                        fullWidth size="small"
                                        InputProps={{ inputProps: { min: 0 } }}
                                    />
                                </Grid>
                                
                            </Grid>
                        </Paper>
                    ))}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseStartDialog} color="secondary">Cancelar</Button>
                    <Button onClick={handleStartSalida} color="primary" variant="contained" disabled={!corredorSeleccionado || loading}>
                        {loading ? <CircularProgress size={24} /> : 'Iniciar Salida'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo para Liquidar Salida */}
            <Dialog open={openLiquidarDialog} onClose={handleCloseLiquidarDialog} fullWidth maxWidth="md">
                <DialogTitle sx={{ bgcolor: theme.palette.success.main, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StopIcon /> Finalizar y Liquidar Salida
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <DialogContentText sx={{ mb: 2 }}>
                        Registra la devolución final de stock del corredor <strong>{salidaParaLiquidar?.corredor?.nombre}</strong>. El sistema calculará automáticamente el cuadre de caja basado en las ventas y gastos registrados.
                    </DialogContentText>
                    
                    {/* ✨ El formulario de stock se ha movido al nuevo diálogo. Aquí solo se muestra el resumen. */}
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>Resumen de Caja</Typography>
                    {salidaParaLiquidar && (() => {
                        const totalVentas = salidaParaLiquidar.ventas.reduce((sum, v) => sum + v.total, 0);
                        const totalGastos = salidaParaLiquidar.gastos.reduce((sum, g) => sum + g.monto, 0);
                        const totalDeudas = salidaParaLiquidar.ventas.reduce((sum, v) => sum + v.montoPendiente, 0);
                        const totalYapePlin = salidaParaLiquidar.ventas.reduce((sum, v) => sum + (v.pagoYapePlin || 0), 0);
                        const efectivoEsperado = totalVentas - totalGastos - totalDeudas - totalYapePlin;

                        return (
                            <List dense>
                                <ListItem><ListItemText primary="Total Ventas" secondary={`S/ ${totalVentas.toFixed(2)}`} /></ListItem>
                                <ListItem><ListItemText primary="(-) Total Gastos" secondary={`S/ ${totalGastos.toFixed(2)}`} /></ListItem>
                                <ListItem><ListItemText primary="(-) Total Deudas" secondary={`S/ ${totalDeudas.toFixed(2)}`} /></ListItem>
                                <ListItem><ListItemText primary="(-) Total Yape/Plin" secondary={`S/ ${totalYapePlin.toFixed(2)}`} /></ListItem>
                                <Divider sx={{ my: 1 }} />
                                <ListItem><ListItemText primary="Efectivo a Entregar (Calculado)" secondaryTypographyProps={{ variant: 'h6', color: 'primary.main' }} secondary={`S/ ${efectivoEsperado.toFixed(2)}`} /></ListItem>
                            </List>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseLiquidarDialog} color="secondary">Cancelar</Button>
                    <Button onClick={handleLiquidarSalida} color="success" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Confirmar Liquidación'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo de Detalles */}
            <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} fullWidth maxWidth="md">
                <DialogTitle>Detalles de la Salida #{salidaSeleccionada?.id}</DialogTitle>
                <DialogContent dividers>
                    {salidaSeleccionada && (
                        <>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body1">
                                        **Corredor:** {salidaSeleccionada.corredor?.nombre}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body1">
                                        **Fecha:** {format(new Date(salidaSeleccionada.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body1">
                                        **Estado:** <Chip label={salidaSeleccionada.estado} color={getEstadoSalida(salidaSeleccionada).color} size="small" />
                                    </Typography>
                                </Grid>
                            </Grid>
                            <ResumenJornada salida={salidaSeleccionada} />
                            {salidaSeleccionada.reabastecimientos?.length > 0 && (
                                <HistorialReabastecimientos reabastecimientos={salidaSeleccionada.reabastecimientos} />
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetailsDialog}>Cerrar</Button>
                </DialogActions>
            </Dialog>
            <ReabastecimientoModal
                open={modalReabastecerOpen}
                onClose={() => setModalReabastecerOpen(false)}
                salida={salidaSeleccionada}
                onReabastecimientoExitoso={handleReabastecimientoExitoso}
            />

            {/* ✨ Nuevo Diálogo para Devolver Llenos y Calcular Ventas */}
            <Dialog open={openDevolverLlenosDialog} onClose={handleCloseDevolverLlenosDialog} fullWidth maxWidth="sm">
                <DialogTitle sx={{ bgcolor: theme.palette.warning.main, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DevolverLlenosIcon /> Devolver Llenos y Calcular Ventas
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <DialogContentText sx={{ mb: 2 }}>
                        Registra los balones **llenos** que el corredor <strong>{salidaSeleccionada?.corredor?.nombre}</strong> devuelve al almacén.
                        Una vez confirmado, el sistema calculará el stock final del corredor basado en los vacíos que ya entregó.
                    </DialogContentText>

                    {/* ✨ AVISO AÑADIDO: Muestra cuántos envases faltan por justificar */}
                    <Alert
                        severity={Object.values(envasesPorJustificar).some(v => v > 0) ? "info" : "success"}
                        icon={Object.values(envasesPorJustificar).some(v => v > 0) ? <InfoIcon fontSize="inherit" /> : <CheckCircleIcon fontSize="inherit" />}
                        sx={{ mb: 2, mt: 1, border: 1, borderColor: 'divider' }}
                    >
                        <AlertTitle sx={{ fontWeight: 'bold' }}>Balance de Envases a Devolver</AlertTitle>
                        {Object.values(envasesPorJustificar).some(v => v > 0) ? (
                            <List dense sx={{ pt: 0 }}>
                                {Object.entries(envasesPorJustificar).map(([tipo, cantidad]) =>
                                    cantidad > 0 && <ListItemText key={tipo} primary={`Debe justificar ${cantidad} envase(s) de tipo ${tipo}`} />
                                )}
                            </List>
                        ) : (
                            "El corredor no tiene envases pendientes por justificar. ¡Todo en orden!"
                        )}
                    </Alert>

                    {/* ✨ MEJORA: Solo mostrar los campos de los productos cuyo tipo de envase tiene deuda. */}
                    {(salidaSeleccionada?.stockCorredor || [])
                        .filter(stock => stock.cantidadLleno > 0 && envasesPorJustificar[stock.producto.tipo] > 0)
                        .map(stock => (
                            <Paper key={stock.productoId} sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>{productosMap.get(stock.productoId)}</Typography>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Llenos en poder del corredor:</Typography>
                                        <Typography variant="h6">{stock.cantidadLleno}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="Cantidad a devolver"
                                            type="number"
                                            value={llenosDevueltos[stock.productoId] || ''}
                                            onChange={(e) => handleDevolucionChange(stock.productoId, e.target.value)}
                                            fullWidth size="small"
                                            InputProps={{ inputProps: { min: 0, max: stock.cantidadLleno } }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDevolverLlenosDialog} color="secondary">Cancelar</Button>
                    <Button onClick={handleConfirmarDevolucionLlenos} color="warning" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Confirmar Devolución'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Layout>
    );
};

export default SalidaPage;