import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Button, CircularProgress, Alert, Paper, TableContainer,
    Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton,
    Tooltip, Stack, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, TextField, FormControl, InputLabel, Select, MenuItem, Divider, Snackbar,
    List, ListItem, ListItemText, Checkbox, FormControlLabel, Grid, Pagination,
    useMediaQuery, InputAdornment
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    AddCircleOutline as AddCircleOutlineIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Close as CloseIcon,
    Clear as ClearIcon,
    CheckCircle as CheckCircleIcon,
    QrCode as QrCodeIcon,
    AttachMoney as AttachMoneyIcon,
    Info as InfoIcon,
    RemoveCircleOutline as RemoveCircleOutlineIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/Layout';
import api from '../services/api';
import ResumenLiquidacionDialog from '../components/ResumenLiquidacionDialog';
import LiquidacionDialog from '../components/LiquidacionDialog';

// Valor del descuento por vale/cupón
const DESCUENTO_VALE_FIJO = 20.00;

// Clave para guardar los filtros en el almacenamiento local
const VENTA_FILTERS_KEY = 'ventaFilters';

// Clave para guardar el borrador en el almacenamiento local
const VENTA_DRAFT_KEY = 'ventaFormDraft';

// Estado inicial para una nueva venta
const initialVentaState = {
    salidaId: '',
    clienteNombre: 'Cliente al paso',
    clienteDireccion: '', // ✨ AÑADIDO: cantidadVales para el manejo de múltiples vales por producto
    productos: [{ productoId: '', cantidadLleno: 0, cantidadVacio: 0, precioUnitario: 0, esVale: false, seVendioConEnvase: false, cantidadPendiente: 0, subtotal: 0, cantidadVales: 0 }],
    pagoEfectivo: 0,
    pagoYapePlin: 0,
    pagoVale: 0,
    montoPendiente: 0,
    esPendiente: false,
};

const VentaPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSalidaId = searchParams.get('salidaId');
    const initialCorredorId = searchParams.get('corredorId');
    const initialFecha = searchParams.get('fecha');
    const ventaIdFromUrl = searchParams.get('ventaId');

    const [selectedSalidaId, setSelectedSalidaId] = useState(initialSalidaId || '');
    const [corredores, setCorredores] = useState([]);
    const [selectedCorredorId, setSelectedCorredorId] = useState(initialCorredorId || '');
    const [salidasFiltradas, setSalidasFiltradas] = useState([]);
    const [filtroFecha, setFiltroFecha] = useState(initialFecha || '');
    const [ventas, setVentas] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);
    const [loadingSalidas, setLoadingSalidas] = useState(true);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentVenta, setCurrentVenta] = useState(initialVentaState);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [ventaToDelete, setVentaToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogError, setDialogError] = useState(null);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [isPaymentManuallyEdited, setIsPaymentManuallyEdited] = useState(false);
    const [selectedSalida, setSelectedSalida] = useState(null);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [ventaDetails, setVentaDetails] = useState(null);
    const [isSalidaFinalizada, setIsSalidaFinalizada] = useState(false);
    const [productErrors, setProductErrors] = useState({}); // ✨ ESTADOS PARA CONTROLAR LA EDICIÓN EN JORNADAS FINALIZADAS
    const [canEditPendientes, setCanEditPendientes] = useState(false);
    const [canEditPayments, setCanEditPayments] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [openLiquidacionDialog, setOpenLiquidacionDialog] = useState(false);
    const [salidaParaResumen, setSalidaParaResumen] = useState(null);
    const [loadingResumen, setLoadingResumen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [openResumenDialog, setOpenResumenDialog] = useState(false);
    const [isParentSalidaFinalized, setIsParentSalidaFinalized] = useState(false);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar({ ...snackbar, open: false });
    };

    const handleDialogKeyDown = (e) => {
        if (e.key === 'Enter' && !isEditing) {
            e.preventDefault(); // Prevenir el submit por defecto del formulario
            handleSaveVenta(e, false); // Llamar a la función de guardar y añadir otra
        }
    };
    const fetchVentasBySalida = useCallback(async (salidaId, currentPage = 1) => {
        if (!salidaId) {
            setVentas([]);
            setTotalPages(0);
            return;
        }
        setLoadingVentas(true);
        setError(null);
        try {
            const response = await api.get(`/salidas/${salidaId}/ventas`, {
                params: {
                    page: currentPage,
                    limit: limit
                }
            });
            setVentas(response.data.ventas);
            setTotalPages(response.data.totalPages);
            setPage(response.data.currentPage);
        } catch (err) {
            console.error('Error fetching ventas for salida:', err);
            setError(`No se pudieron cargar las ventas para la salida ${salidaId}.`);
            setVentas([]);
            setTotalPages(0);
        } finally {
            setLoadingVentas(false);
        }
    }, [limit]);

    const fetchSalidasFiltradas = useCallback(async (keepSelection = false) => {
        if (!selectedCorredorId) {
            setSalidasFiltradas([]);
            if (!keepSelection) setSelectedSalidaId('');
            return;
        }
        setLoadingSalidas(true);
        try {
            const params = { corredorId: selectedCorredorId };
            if (filtroFecha) {
                params.fecha = filtroFecha;
            }
            const res = await api.get('/salidas', { params });
            const fetchedSalidas = res.data;
            setSalidasFiltradas(fetchedSalidas);

            // ✨ CORRECCIÓN: Lógica de selección de salida mejorada.
            if (!keepSelection) {
                const savedFilters = JSON.parse(localStorage.getItem(VENTA_FILTERS_KEY) || '{}');
                const savedSalidaId = savedFilters.salidaId;

                // 1. Prioridad: Usar el ID de la URL si existe.
                if (initialSalidaId) {
                    setSelectedSalidaId(initialSalidaId);
                // 2. Si no, intentar restaurar la última salida guardada, si todavía existe en la lista filtrada.
                } else if (savedSalidaId && fetchedSalidas.some(s => s.id.toString() === savedSalidaId)) {
                    setSelectedSalidaId(savedSalidaId);
                // 3. Si solo hay una jornada, seleccionarla automáticamente.
                } else if (fetchedSalidas.length === 1) {
                    setSelectedSalidaId(fetchedSalidas[0].id.toString());
                } // 4. Si no, no seleccionar ninguna.
            }
        } catch (err) {
            console.error('Error fetching filtered salidas:', err);
            setError('No se pudieron cargar las jornadas para la selección.');
            setSalidasFiltradas([]);
            if (!keepSelection) setSelectedSalidaId('');
        } finally {
            setLoadingSalidas(false);
        }
    }, [selectedCorredorId, filtroFecha, initialSalidaId]);

    const fetchCorredores = useCallback(async () => {
        setLoadingSalidas(true);
        setError(null);
        try {
            const corredoresRes = await api.get('/corredores');
            setCorredores(corredoresRes.data.filter(c => c.activo));
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Hubo un problema al cargar los datos.');
        } finally {
            setLoadingSalidas(false);
        }
    }, []);

    useEffect(() => {
        fetchCorredores();
    }, [fetchCorredores]);

    // Efecto para cargar los filtros guardados al montar el componente
    useEffect(() => {
        // Solo se ejecuta una vez al cargar la página para establecer los filtros iniciales.
        if (!initialSalidaId && !initialCorredorId) { // No restaurar si vienen de URL
            const savedFilters = localStorage.getItem(VENTA_FILTERS_KEY);
            if (savedFilters) {
                const { corredorId, fecha } = JSON.parse(savedFilters);
                setSelectedCorredorId(corredorId || '');
                setFiltroFecha(fecha || '');
            }
        }
    }, [initialSalidaId, initialCorredorId]); // Dependencias para asegurar que se ejecute solo una vez al inicio.

    // Efecto para guardar los filtros cuando cambian
    useEffect(() => {
        // No guardar si los filtros vienen de la URL para no sobreescribir una sesión limpia.
        if (initialSalidaId || initialCorredorId) {
            return;
        }
        // Guarda los filtros en localStorage cada vez que cambian.
        localStorage.setItem(VENTA_FILTERS_KEY, JSON.stringify({ corredorId: selectedCorredorId, fecha: filtroFecha, salidaId: selectedSalidaId }));
    }, [selectedCorredorId, filtroFecha, selectedSalidaId, initialCorredorId, initialSalidaId]);

    // Efecto para guardar el borrador en el almacenamiento local
    useEffect(() => {
        // Solo guarda si se está creando una nueva venta y el diálogo está abierto
        if (!isEditing && openDialog) {
            const draft = {
                selectedCorredorId,
                filtroFecha,
                selectedSalidaId,
                currentVenta,
                paymentMethod,
            };
            localStorage.setItem(VENTA_DRAFT_KEY, JSON.stringify(draft));
        }
    }, [isEditing, openDialog, selectedCorredorId, filtroFecha, selectedSalidaId, currentVenta, paymentMethod]); // Dependencias para guardar el borrador

    useEffect(() => {
        fetchSalidasFiltradas(false);
    }, [fetchSalidasFiltradas]);


    useEffect(() => {
        if (currentVenta.salidaId) {
            const salidaSeleccionada = salidasFiltradas.find(s => s.id === Number(currentVenta.salidaId));
            if (salidaSeleccionada && salidaSeleccionada.stockCorredor) {
                const productsFromStock = salidaSeleccionada.stockCorredor.map(stock => ({
                    id: stock.producto.id,
                    nombre: stock.producto.nombre,
                    stockLleno: stock.cantidadLleno,
                    stockVacio: stock.cantidadVacio,
                    precioUnitario: stock.producto.precioUnitario,
                    tipo: stock.producto.tipo
                }));
                setAvailableProducts(productsFromStock);
            }
        } else {
            setAvailableProducts([]);
        }
    }, [currentVenta.salidaId, salidasFiltradas]);

    useEffect(() => {
        if (selectedSalidaId) {
            const salida = salidasFiltradas.find(s => s.id === Number(selectedSalidaId));
            setSelectedSalida(salida);
            setPage(1);
            fetchVentasBySalida(selectedSalidaId, 1);
        } else {
            setSelectedSalida(null);
            setVentas([]);
            if (initialSalidaId) {
                searchParams.delete('salidaId');
                setSearchParams(searchParams, { replace: true });
            }
            setTotalPages(0);
        }
    }, [selectedSalidaId, salidasFiltradas, fetchVentasBySalida]);

    useEffect(() => {
        if (ventaIdFromUrl && ventas.length > 0) {
            const ventaParaEditar = ventas.find(v => v.id === parseInt(ventaIdFromUrl));
            if (ventaParaEditar) {
                // Usamos un timeout para asegurar que el estado de la UI se haya actualizado
                // antes de intentar abrir el diálogo.
                setTimeout(() => {
                    handleOpenEditDialog(ventaParaEditar);
                    // Opcional: limpiar el parámetro de la URL para no reabrir en refresh
                    searchParams.delete('ventaId');
                    setSearchParams(searchParams, { replace: true });
                }, 100);
            }
        }
    }, [ventaIdFromUrl, ventas]);

    const handlePageChange = (event, value) => {
        setPage(value);
        fetchVentasBySalida(selectedSalidaId, value);
    };

    const handleOpenCreateDialog = useCallback(async () => {
        if (!selectedSalidaId) {
            showSnackbar('Por favor, selecciona una jornada primero.', 'warning');
            return;
        }

        // ✨ CORRECCIÓN: Obtener los datos más recientes de la salida antes de abrir el diálogo.
        try {
            const { data: salidaCompleta } = await api.get(`/salidas/${selectedSalidaId}`);
            
            // Actualizar la lista de salidas en el estado para que el stock disponible sea el correcto.
            setSalidasFiltradas(prev => prev.map(s => s.id === salidaCompleta.id ? salidaCompleta : s));

            setCurrentVenta({
                ...initialVentaState,
                salidaId: selectedSalidaId,
            });
            
            const isFinalized = salidaCompleta?.estado === 'FINALIZADO';
            setIsSalidaFinalizada(isFinalized);
            setIsParentSalidaFinalized(isFinalized);
            setIsEditing(false);
            setDialogError(null);
            setOpenDialog(true);
            setIsPaymentManuallyEdited(false);
            setPaymentMethod('Efectivo');
        } catch (err) {
            console.error('Error al cargar datos de la salida:', err);
            showSnackbar('No se pudieron cargar los datos actualizados de la jornada.', 'error');
        }
    }, [selectedSalidaId, showSnackbar]);

    const handleOpenEditDialog = (venta) => {
        let method = 'Efectivo';
        if (venta.pagoYapePlin > 0 && venta.pagoEfectivo === 0) {
            method = 'Yape/Plin';
        } else if (venta.pagoYapePlin > 0 && venta.pagoEfectivo > 0) {
            method = 'Mixto';
        }

        // ✨ LÓGICA DE CONTROL DE EDICIÓN
        const isFinalized = venta.salida.estado === 'FINALIZADO';
        const hasDeuda = venta.esPendiente && venta.montoPendiente > 0;
        const hasEnvasePendiente = venta.pendientes && venta.pendientes.length > 0;

        // Determinar qué se puede editar
        const editablePendientes = isFinalized && hasEnvasePendiente;
        const editablePagos = isFinalized && hasDeuda;
        const modoSoloLectura = isFinalized && !editablePendientes && !editablePagos;

        setCanEditPendientes(editablePendientes);
        setCanEditPayments(editablePagos);
        setIsReadOnly(modoSoloLectura);
        setIsSalidaFinalizada(isFinalized); // Mantener para lógica general

        setIsPaymentManuallyEdited(true);
        setPaymentMethod(method);

        setCurrentVenta({
            ...venta,
            salidaId: venta.salidaId.toString(),
            // ✨ CORRECCIÓN: Calcular el subtotal para cada producto al cargar la venta.
            productos: venta.productos.map(p => {
                const pendiente = venta.pendientes?.find(pen => pen.productoId === p.productoId);
                return {
                    ...p,
                    subtotal: p.cantidadLleno * p.precioUnitario, // Calcular subtotal
                    esVale: p.esVale || false,
                    cantidadPendiente: pendiente ? pendiente.cantidad : 0
                };
            }),
        });
        setProductErrors({});
        setIsEditing(true);
        setDialogError(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCurrentVenta(initialVentaState); // Limpiar el estado de la venta actual
        // Limpiar el borrador al cerrar manualmente el diálogo
        localStorage.removeItem(VENTA_DRAFT_KEY);
        setProductErrors({});
    };

    const handleOpenDetailsDialog = async (id) => {
        try {
            const response = await api.get(`/ventas/${id}`);
            setVentaDetails(response.data);
            setOpenDetailsDialog(true);
        } catch (err) {
            console.error('Error fetching venta details:', err);
            setError('No se pudieron cargar los detalles de la venta.');
        }
    };

    const handleCloseDetailsDialog = () => {
        setOpenDetailsDialog(false);
        setVentaDetails(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'pagoEfectivo' || name === 'pagoYapePlin') {
            setIsPaymentManuallyEdited(true);
        }

        setCurrentVenta(prevState => {
            const updatedState = {
                ...prevState,
                [name]: type === 'checkbox' ? checked : value,
            };

            // Si el método es Mixto, calcula automáticamente el campo restante.
            if (paymentMethod === 'Mixto') {
                const numericValue = Number(value) || 0;
                if (name === 'pagoEfectivo') {
                        const restante = (totalVenta - totalVale) - numericValue;
                    updatedState.pagoYapePlin = Math.max(0, restante).toFixed(2);
                } else if (name === 'pagoYapePlin') {
                        const restante = (totalVenta - totalVale) - numericValue;
                    updatedState.pagoEfectivo = Math.max(0, restante).toFixed(2);
                }
            }
            return updatedState;
        });
    };

    const handlePaymentMethodChange = (e) => {
        const newMethod = e.target.value;
        setPaymentMethod(newMethod);
        setIsPaymentManuallyEdited(false);

        if (newMethod === 'Mixto') {
            setCurrentVenta(prevState => ({ ...prevState, pagoEfectivo: 0, pagoYapePlin: 0 }));
        }
    };

    const handleProductChange = (index, e) => {
        const { name, value, checked } = e.target;
        const list = [...currentVenta.productos];
        const newProductErrors = { ...productErrors };
        if (!newProductErrors[index]) newProductErrors[index] = {};

        const productoEnFila = list[index];
        const selectedProductInfo = availableProducts.find(p => p.id === productoEnFila.productoId);

        if (name === 'esVale') {
            list[index].esVale = checked;
            // Si se desmarca, se resetea la cantidad de vales. Si se marca, se pone 1 por defecto.
            if (!checked) {
                list[index].cantidadVales = 0;
            } else if (!list[index].cantidadVales || list[index].cantidadVales === 0) {
                list[index].cantidadVales = 1;
            }
            // ✨ CORRECCIÓN: Forzar recálculo de pago al cambiar el estado del vale.
            setIsPaymentManuallyEdited(false);

        } else if (name === 'cantidadVales') {
            const numericValue = Number(value) >= 0 ? Number(value) : 0;
            list[index].cantidadVales = numericValue;
            // ✨ CORRECCIÓN: Forzar recálculo de pago al cambiar la cantidad de vales.
            setIsPaymentManuallyEdited(false);

        } else if (name === 'seVendioConEnvase') {
            list[index].seVendioConEnvase = checked;
            if (checked) {
                list[index].cantidadPendiente = 0;
                list[index].cantidadVacio = 0;
            }
        } else if (name === 'productoId') {
            const newSelectedProduct = availableProducts.find(p => p.id === Number(value));
            if (newSelectedProduct) {
                list[index].productoId = Number(value);
                list[index].precioUnitario = newSelectedProduct.precioUnitario;
                list[index].cantidadLleno = 1;
                list[index].cantidadVacio = 0;
                list[index].subtotal = newSelectedProduct.precioUnitario * 1;
                list[index].cantidadPendiente = 0;
                list[index].cantidadVales = 0; // Resetear vales al cambiar de producto
                list[index].seVendioConEnvase = false;
                list[index].esVale = false;
                delete newProductErrors[index];
            }
        } else if (name === 'cantidadLleno') {
            const numericValue = Number(value);
            list[index].cantidadLleno = numericValue;

            if (!list[index].seVendioConEnvase) {
                list[index].cantidadVacio = numericValue;
                list[index].cantidadPendiente = 0;
            }
            
            // Recalcular subtotal basado en el precio de lista del producto
            const precioDeLista = selectedProductInfo?.precioUnitario || list[index].precioUnitario || 0;
            list[index].subtotal = numericValue * precioDeLista;
            list[index].precioUnitario = precioDeLista;
            
            if (selectedProductInfo) {
                const cantidadUsadaEnOtrasFilas = currentVenta.productos
                    .filter((p, i) => i !== index && p.productoId === selectedProductInfo.id)
                    .reduce((sum, p) => sum + p.cantidadLleno, 0);
                const stockDisponible = selectedProductInfo.stockLleno - cantidadUsadaEnOtrasFilas;
                if (numericValue > stockDisponible) {
                    newProductErrors[index].cantidadLleno = `Stock insuficiente. Disponible: ${stockDisponible}`;
                } else {
                    delete newProductErrors[index].cantidadLleno;
                }
            }
        } else if (name === 'cantidadPendiente') {
            const numericValue = Number(value);
            const cantidadLleno = list[index].cantidadLleno || 0;

            if (numericValue > cantidadLleno) {
                newProductErrors[index].cantidadPendiente = `Máximo: ${cantidadLleno}`;
                list[index].cantidadPendiente = cantidadLleno;
                list[index].cantidadVacio = 0;
            } else {
                list[index].cantidadPendiente = numericValue;
                list[index].cantidadVacio = cantidadLleno - numericValue;
                delete newProductErrors[index].cantidadPendiente;
            }
        } else if (name === 'subtotal') {
            const subtotalValue = Number(value);
            list[index].subtotal = subtotalValue;
            const cantidad = list[index].cantidadLleno;
            if (cantidad > 0) {
                list[index].precioUnitario = subtotalValue / cantidad;
            } else {
                list[index].precioUnitario = 0;
            }
        } else {
            list[index][name] = Number(value);
        }

        setCurrentVenta(prevState => ({ ...prevState, productos: list }));
        setProductErrors(newProductErrors);
    };

    const handleAddProduct = () => {
        setCurrentVenta(prevState => ({
            ...prevState,
            productos: [...prevState.productos, { productoId: '', cantidadLleno: 0, cantidadVacio: 0, precioUnitario: 0, esVale: false, seVendioConEnvase: false, cantidadPendiente: 0, subtotal: 0, cantidadVales: 0 }],
        }));
    };

    const handleRemoveProduct = (index) => {
        const list = [...currentVenta.productos];
        list.splice(index, 1);
        setCurrentVenta(prevState => ({ ...prevState, productos: list }));
        setProductErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            delete newErrors[index];
            return newErrors;
        });
    };

    const totalVenta = useMemo(() => {
        return currentVenta.productos.reduce((acc, p) => acc + (p.subtotal || 0), 0);
    }, [currentVenta.productos]);

    const totalVale = useMemo(() => {
        return currentVenta.productos.reduce((acc, p) => {
            // Simplemente suma el valor de todos los vales ingresados.
            const valorValesProducto = (p.esVale ? (p.cantidadVales || 0) : 0) * DESCUENTO_VALE_FIJO;
            return acc + valorValesProducto;
        }, 0);
    }, [currentVenta.productos]);

    useEffect(() => {
        setCurrentVenta(prevState => ({ ...prevState, pagoVale: totalVale }));
    }, [totalVale]);

    const totalPagado = useMemo(() => {
        return Number(currentVenta.pagoEfectivo) + Number(currentVenta.pagoYapePlin) + Number(currentVenta.pagoVale);
    }, [currentVenta.pagoEfectivo, currentVenta.pagoYapePlin, currentVenta.pagoVale]);

    useEffect(() => {
        // ✨ CORRECCIÓN: Autocompletar el monto del pago si no se ha editado manualmente
        if (!isPaymentManuallyEdited) {
            const montoAPagar = Math.max(0, totalVenta - totalVale);
            setCurrentVenta(prevState => ({
                ...prevState,
                pagoEfectivo: paymentMethod === 'Efectivo' ? montoAPagar : 0,
                pagoYapePlin: paymentMethod === 'Yape/Plin' ? montoAPagar : 0,
            }));
        } // No se necesita `isEditing` aquí, el comportamiento debe ser el mismo
    }, [totalVenta, totalVale, isPaymentManuallyEdited, paymentMethod, isEditing]);

    useEffect(() => {
        const pendiente = totalVenta - totalPagado;
        setCurrentVenta(prevState => ({
            ...prevState,
            montoPendiente: Math.max(0, pendiente),
            esPendiente: pendiente > 0.01
        }));
    }, [totalVenta, totalPagado]);

    const handleSaveVenta = async (e, closeOnSave = true) => {
        e.preventDefault();
        setIsSubmitting(true);
        setDialogError(null);

        const hasProductErrors = Object.values(productErrors).some(p => p && (p.cantidadLleno || p.cantidadVacio || p.cantidadPendiente));
        if (hasProductErrors) {
            setDialogError('Corrige los errores en las cantidades de los productos.');
            setIsSubmitting(false);
            return;
        }

        const payload = {
            ...currentVenta,
            salidaId: Number(currentVenta.salidaId),
            pagoEfectivo: Number(currentVenta.pagoEfectivo),
            pagoYapePlin: Number(currentVenta.pagoYapePlin),
            pagoVale: Number(currentVenta.pagoVale),
            montoPendiente: Number(currentVenta.montoPendiente),
            esPendiente: Boolean(currentVenta.esPendiente),
            pendientes: currentVenta.productos
                .filter(p => p.cantidadPendiente > 0)
                .map(p => ({
                    productoId: p.productoId,
                    cantidad: Number(p.cantidadPendiente)
                })),
            productos: currentVenta.productos.map(({ cantidadPendiente, ...rest }) => rest)
        };

        try {
            let successMessage = '';
            if (isEditing) {
                await api.put(`/ventas/${currentVenta.id}`, payload);
                successMessage = 'Venta actualizada correctamente.';
            } else {
                await api.post('/ventas', payload);
                successMessage = 'Venta registrada correctamente.';
            }
            await fetchVentasBySalida(selectedSalidaId);

            const updatedSalidaRes = await api.get(`/salidas/${selectedSalidaId}`);
            setSalidasFiltradas(prevSalidas =>
                prevSalidas.map(s => s.id === updatedSalidaRes.data.id ? updatedSalidaRes.data : s)
            );
            
            if (closeOnSave) {
                handleCloseDialog();
            } else {
                // ✨ CORRECCIÓN: Resetear formulario para nueva venta, pero manteniendo los datos de pago.
                const lastPaymentData = {
                    pagoEfectivo: currentVenta.pagoEfectivo,
                    pagoYapePlin: currentVenta.pagoYapePlin,
                };
                setCurrentVenta({
                    ...initialVentaState,
                    salidaId: selectedSalidaId,
                    ...lastPaymentData,
                });
                setDialogError(null);
                setIsPaymentManuallyEdited(true); // Los pagos se consideran manuales para la siguiente venta
                setProductErrors({});
                localStorage.removeItem(VENTA_DRAFT_KEY);
            }
            showSnackbar(successMessage);
        } catch (err) {
            console.error('Error saving venta:', err.response?.data?.error || err.message);
            setDialogError(err.response?.data?.error || 'Error al guardar la venta.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDeleteDialog = (venta) => {
        setVentaToDelete(venta);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setVentaToDelete(null);
    };

    const handleDeleteVenta = async () => {
        setIsSubmitting(true);
        try {
            await api.delete(`/ventas/${ventaToDelete.id}`);
            // Limpiar el borrador si se elimina una venta que podría estar relacionada
            localStorage.removeItem(VENTA_DRAFT_KEY);
            await fetchVentasBySalida(selectedSalidaId);
            handleCloseDeleteDialog();
            showSnackbar('Venta eliminada correctamente.', 'success');
        } catch (err) {
            console.error('Error deleting venta:', err);
            showSnackbar('Hubo un problema al eliminar la venta.', 'error');
            handleCloseDeleteDialog();
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (openDialog && !isEditing) {
            setTimeout(() => {
                productInputRefs.current[0]?.select?.focus();
            }, 100);
        }
    }, [openDialog, isEditing]);
    const handleOpenResumenDialog = async () => {
        if (!selectedSalidaId) return;
        setLoadingResumen(true);
        setError(null);
        try {
            const response = await api.get(`/salidas/${selectedSalidaId}`);
            setSalidaParaResumen(response.data);
            setOpenResumenDialog(true);
        } catch (err) {
            console.error('Error fetching summary data:', err);
            setError('No se pudieron cargar los detalles de la liquidación.');
        } finally {
            setLoadingResumen(false);
        }
    };

    const handleLiquidationSuccess = () => {
        fetchSalidasFiltradas(true); // Refresca la lista de salidas, manteniendo la selección actual
        showSnackbar('Salida liquidada y finalizada correctamente.', 'success');
    };

    if (loadingSalidas) {
        return (
            <Layout>
                <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                    <CircularProgress />
                </Box>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <Box my={4}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </Layout>
        );
    }

    return (
        <Layout>
            <Box my={4} mx={isMobile ? 2 : 4}>
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
                    <Typography variant="h4" component="h1" fontWeight="bold">Registro de Ventas por Salida</Typography>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => fetchVentasBySalida(selectedSalidaId)}
                            disabled={!selectedSalidaId || loadingVentas}
                        >
                            Refrescar
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={handleOpenCreateDialog}
                            disabled={!selectedSalidaId || selectedSalida?.estado === 'FINALIZADO'}
                        >
                            Registrar Nueva Venta
                        </Button>
                        <Button
                            variant="outlined"
                            color="info"
                            onClick={handleOpenResumenDialog}
                            disabled={!selectedSalidaId || selectedSalida?.estado !== 'FINALIZADO' || loadingResumen}
                        >
                            {loadingResumen ? <CircularProgress size={24} /> : 'Ver Resumen'}
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => setOpenLiquidacionDialog(true)}
                            disabled={!selectedSalidaId || selectedSalida?.estado === 'FINALIZADO'}
                        >
                            Liquidar Salida
                        </Button>
                    </Stack>
                </Stack>

                <Grid container spacing={2} sx={{ mb: 4 }} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                            <InputLabel>1. Seleccionar Corredor</InputLabel>
                            <Select
                                value={selectedCorredorId}
                                label="1. Seleccionar Corredor"
                                onChange={(e) => {
                                    setSelectedCorredorId(e.target.value);
                                    setFiltroFecha('');
                                }}
                            >
                                <MenuItem value=""><em>-- Seleccione un Corredor --</em></MenuItem>
                                {corredores.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="2. Filtrar por Fecha (Opcional)"
                            type="date"
                            fullWidth
                            value={filtroFecha}
                            onChange={(e) => setFiltroFecha(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            disabled={!selectedCorredorId}
                            InputProps={{
                                endAdornment: filtroFecha && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setFiltroFecha('')} edge="end">
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth disabled={!selectedCorredorId || salidasFiltradas.length === 0}>
                            <InputLabel>3. Seleccionar Jornada</InputLabel>
                            <Select
                                value={selectedSalidaId}
                                label="3. Seleccionar Jornada"
                                onChange={(e) => setSelectedSalidaId(e.target.value)}
                            >
                                <MenuItem value=""><em>{salidasFiltradas.length > 0 ? '-- Seleccione una Jornada --' : 'No hay jornadas para la selección'}</em></MenuItem>
                                {salidasFiltradas.map(salida => (
                                    <MenuItem key={salida.id} value={salida.id}>
                                        {`Salida #${salida.id} - ${format(new Date(salida.fecha), 'dd/MM/yyyy HH:mm')} (${salida.estado})`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Paper elevation={3} sx={{ p: isMobile ? 1 : 2 }}>
                    <TableContainer>
                        <Table aria-label="tabla de ventas">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 250 }}>Productos Vendidos</TableCell>
                                    <TableCell>Usuario</TableCell>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Pagos</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ventas.map((venta) => (
                                    <TableRow key={venta.id}>
                                        <TableCell>
                                            <Stack spacing={0.5}>
                                                {venta.productos.map(p => (
                                                    <Typography key={p.id} variant="body2">
                                                        {p.cantidadLleno} x <strong>{p.producto.nombre}</strong> <Chip label={p.producto.tipo} size="small" variant="outlined" sx={{ ml: 0.5 }} />
                                                    </Typography>
                                                ))}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{venta.usuario?.nombre}</TableCell>
                                        <TableCell>{venta.clienteNombre || 'Sin nombre'}</TableCell>
                                        <TableCell align="right">S/ {venta.total.toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="column" spacing={0.5} alignItems="flex-end">
                                                <Typography variant="body2" sx={{ color: venta.pagoEfectivo > 0 ? 'green' : 'inherit' }}>
                                                    Efectivo: S/ {venta.pagoEfectivo.toFixed(2)}
                                                </Typography>
                                                {venta.pagoYapePlin > 0 && (
                                                    <Typography variant="body2" sx={{ color: 'green' }}>
                                                        Yape/Plin: S/ {venta.pagoYapePlin.toFixed(2)}
                                                    </Typography>
                                                )}
                                                {venta.pagoVale > 0 && (
                                                    <Typography variant="body2" sx={{ color: 'green' }}>
                                                        Vale: S/ {venta.pagoVale.toFixed(2)}
                                                    </Typography>
                                                )}
                                                {venta.esPendiente && (
                                                    <Chip
                                                        label={`Pendiente: S/ ${venta.montoPendiente.toFixed(2)}`}
                                                        color="warning"
                                                        size="small"
                                                        icon={<InfoIcon />}
                                                    />
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Tooltip title="Ver Detalles">
                                                    <IconButton color="info" onClick={() => handleOpenDetailsDialog(venta.id)}>
                                                        <VisibilityIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Editar Venta">
                                                    <IconButton color="primary" onClick={() => handleOpenEditDialog(venta)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                {venta.salida.estado !== 'FINALIZADO' && (
                                                    <Tooltip title="Eliminar Venta">
                                                        <IconButton color="error" onClick={() => handleOpenDeleteDialog(venta)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                                disabled={loadingVentas}
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    )}
                </Paper>

                {/* Diálogo de Crear/Editar Venta - VERSIÓN MEJORADA */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {isEditing ? 'Editar Venta' : 'Crear Nueva Venta'}
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseDialog}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <Box component="form" onSubmit={(e) => handleSaveVenta(e, true)}>
                        <DialogContent dividers>
                            {dialogError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>{dialogError}</Alert>}
                            {isEditing && isSalidaFinalizada && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    La salida está finalizada. Solo se pueden editar los detalles del pago.
                                </Alert>
                            )}
                            
                            <Grid container spacing={3}>
                                {/* Información general */}
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        name="clienteNombre"
                                        label="Nombre del Cliente"
                                        fullWidth
                                        value={currentVenta.clienteNombre}
                                        onChange={handleInputChange} // ✨ DESHABILITAR SI ES NECESARIO
                                        sx={{ mb: 2 }}
                                        disabled={isReadOnly || canEditPendientes || canEditPayments}
                                    />
                                    <TextField
                                        name="clienteDireccion"
                                        label="Dirección del Cliente"
                                        fullWidth
                                        value={currentVenta.clienteDireccion}
                                        onChange={handleInputChange} // ✨ DESHABILITAR SI ES NECESARIO
                                        sx={{ mb: 2 }}
                                        disabled={isReadOnly || canEditPendientes || canEditPayments}
                                    />
                                    
                                    <Divider sx={{ my: 2 }} />
                                    
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6">Productos</Typography>
                                        <Button 
                                            onClick={handleAddProduct} 
                                            startIcon={<AddCircleOutlineIcon />} 
                                            disabled={!currentVenta.salidaId || isSalidaFinalizada} // ✨ DESHABILITAR SI ES NECESARIO
                                            size="small"
                                        >
                                            Añadir
                                        </Button>
                                    </Box>
                                    
                                    {currentVenta.productos.map((producto, index) => {
                                        const selectedProduct = availableProducts.find(p => p.id === producto.productoId);
                                        const errorLleno = productErrors[index]?.cantidadLleno || '';
                                        const errorPendiente = productErrors[index]?.cantidadPendiente || '';

                                        let stockDisponibleLleno = 'N/A';
                                        if (selectedProduct) {
                                            const cantidadUsadaEnOtrasFilas = currentVenta.productos
                                                .filter((p, i) => i !== index && p.productoId === selectedProduct.id)
                                                .reduce((sum, p) => sum + p.cantidadLleno, 0);

                                            stockDisponibleLleno = selectedProduct.stockLleno - cantidadUsadaEnOtrasFilas;
                                        }
                                        const helperTextLleno = selectedProduct ? `Stock: ${stockDisponibleLleno}` : 'Selecciona un producto';

                                        return (
                                            <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, position: 'relative' }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                    <Typography variant="subtitle2">Producto #{index + 1}</Typography>
                                                    <IconButton 
                                                        onClick={() => handleRemoveProduct(index)} 
                                                        size="small" 
                                                        color="error" // ✨ DESHABILITAR SI ES NECESARIO
                                                        disabled={isSalidaFinalizada || currentVenta.productos.length === 1}
                                                        sx={{ mt: -1, mr: -1 }}
                                                    >
                                                        <RemoveCircleOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                                
                                                <FormControl fullWidth sx={{ mb: 2 }} disabled={!currentVenta.salidaId || isSalidaFinalizada || isReadOnly || canEditPayments}>
                                                    <InputLabel>Tipo de Producto</InputLabel>
                                                    <Select
                                                        name="productoId"
                                                        value={producto.productoId}
                                                        label="Tipo de Producto"
                                                        onChange={(e) => handleProductChange(index, e)}
                                                        required
                                                    >
                                                        {availableProducts.length > 0 ? (
                                                            availableProducts.map(p => (
                                                                <MenuItem key={p.id} value={p.id}>
                                                                    {p.nombre}
                                                                </MenuItem>
                                                            ))
                                                        ) : (
                                                            <MenuItem value="" disabled>Selecciona una salida primero</MenuItem>
                                                        )}
                                                    </Select>
                                                </FormControl>
                                                
                                                <Grid container spacing={1}>
                                                    <Grid item xs={6}>
                                                        <TextField
                                                            type="number"
                                                            name="cantidadLleno"
                                                            label="Cantidad"
                                                            fullWidth
                                                            value={producto.cantidadLleno}
                                                            onChange={(e) => handleProductChange(index, e)}
                                                            required
                                                            error={!!errorLleno}
                                                            helperText={errorLleno || helperTextLleno}
                                                            InputProps={{ inputProps: { min: 0 } }}
                                                            disabled={isSalidaFinalizada || isReadOnly || canEditPayments}
                                                            size="small"
                                                        />
                                                    </Grid>
                                                    
                                                    <Grid item xs={6}>
                                                        <TextField
                                                            type="number"
                                                            name="subtotal"
                                                            label="Monto Total"
                                                            fullWidth
                                                            value={producto.subtotal}
                                                            onChange={(e) => handleProductChange(index, e)}
                                                            required // ✨ DESHABILITAR SI ES NECESARIO
                                                            disabled={isSalidaFinalizada || isReadOnly || canEditPayments}
                                                            InputProps={{
                                                                startAdornment: <Typography sx={{ mr: 0.5, fontSize: '0.875rem' }}>S/</Typography>,
                                                                inputProps: { step: "0.10" }
                                                            }}
                                                            helperText={`P/U: S/ ${producto.precioUnitario.toFixed(2)}`}
                                                            size="small"
                                                        />
                                                    </Grid>
                                                    
                                                    {selectedProduct && (selectedProduct.tipo?.startsWith('GAS') || selectedProduct.tipo?.startsWith('AGUA')) && !producto.seVendioConEnvase && ( // ✨ LÓGICA PARA HABILITAR CAMPO PENDIENTE
                                                        <Grid item xs={12}>
                                                            <TextField
                                                                type="number"
                                                                name="cantidadPendiente"
                                                                label="Envases Pendientes"
                                                                fullWidth
                                                                value={producto.cantidadPendiente || 0}
                                                                onChange={(e) => handleProductChange(index, e)}
                                                                error={!!errorPendiente}
                                                                helperText={errorPendiente || `Máx: ${producto.cantidadLleno || 0}`}
                                                                InputProps={{ inputProps: { min: 0, max: producto.cantidadLleno } }}
                                                                disabled={isReadOnly || canEditPayments || (isSalidaFinalizada && !canEditPendientes)}
                                                                size="small"
                                                            />
                                                        </Grid>
                                                    )}
                                                    
                                                    <Grid item xs={12} container spacing={1} alignItems="center">
                                                        <Grid item xs={12} sm="auto">
                                                            <Tooltip title="Marcar si el cliente paga con un vale de descuento">
                                                                <FormControlLabel
                                                                    control={
                                                                        <Checkbox
                                                                            name="esVale"
                                                                            checked={producto.esVale}
                                                                            onChange={(e) => handleProductChange(index, e)} // ✨ DESHABILITAR SI ES NECESARIO
                                                                            disabled={isSalidaFinalizada || isReadOnly || canEditPayments}
                                                                            size="small"
                                                                        />
                                                                    }
                                                                    label="Vale/Cupón"
                                                                />
                                                            </Tooltip>
                                                        </Grid>
                                                        {producto.esVale && (
                                                            <Grid item xs={6} sm={4}>
                                                                <TextField
                                                                    type="number"
                                                                    name="cantidadVales"
                                                                    label="Cant. Vales"
                                                                    value={producto.cantidadVales}
                                                                    onChange={(e) => handleProductChange(index, e)} // ✨ DESHABILITAR SI ES NECESARIO
                                                                    disabled={isSalidaFinalizada || isReadOnly || canEditPayments}
                                                                    size="small"
                                                                    InputProps={{ inputProps: { min: 1 } }}
                                                                />
                                                            </Grid>
                                                        )}
                                                        {selectedProduct && (selectedProduct.tipo?.startsWith('GAS') || selectedProduct.tipo?.startsWith('AGUA')) && (
                                                            <Grid item xs={12} sm="auto">
                                                                <Tooltip title="Marcar si el cliente compra el producto con todo y envase">
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Checkbox
                                                                                name="seVendioConEnvase"
                                                                                checked={producto.seVendioConEnvase}
                                                                                onChange={(e) => handleProductChange(index, e)} // ✨ DESHABILITAR SI ES NECESARIO
                                                                                disabled={isSalidaFinalizada || isReadOnly || canEditPayments}
                                                                                size="small"
                                                                            />
                                                                        }
                                                                        label="Vender con envase"
                                                                    />
                                                                </Tooltip>
                                                            </Grid>
                                                        )}
                                                    </Grid>
                                                </Grid>
                                            </Paper>
                                        );
                                    })}
                                </Grid>
                                
                                {/* Pagos y Resumen */}
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" mb={2}>Pagos</Typography>
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Método de Pago</InputLabel>
                                        <Select
                                            value={paymentMethod}
                                            label="Método de Pago"
                                            onChange={handlePaymentMethodChange} // ✨ DESHABILITAR SI ES NECESARIO
                                            disabled={isReadOnly || canEditPendientes}
                                        >
                                            <MenuItem value="Efectivo">Efectivo</MenuItem>
                                            <MenuItem value="Yape/Plin">Yape/Plin</MenuItem>
                                            <MenuItem value="Mixto">Mixto (Efectivo y Yape/Plin)</MenuItem>
                                        </Select>
                                    </FormControl>
                                    
                                    {(paymentMethod === 'Efectivo' || paymentMethod === 'Mixto') && (
                                        <TextField
                                            type="number"
                                            name="pagoEfectivo"
                                            label="Pago en Efectivo"
                                            fullWidth
                                            value={currentVenta.pagoEfectivo}
                                            onChange={handleInputChange} // ✨ DESHABILITAR SI ES NECESARIO
                                            disabled={isReadOnly || canEditPendientes}
                                            sx={{ mb: 2 }}
                                            InputProps={{ 
                                                startAdornment: <AttachMoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                                inputProps: { step: "0.10" }
                                            }}
                                        />
                                    )}
                                    
                                    {(paymentMethod === 'Yape/Plin' || paymentMethod === 'Mixto') && (
                                        <TextField
                                            name="pagoYapePlin"
                                            type="number"
                                            label="Pago Yape/Plin"
                                            fullWidth
                                            value={currentVenta.pagoYapePlin}
                                            onChange={handleInputChange} // ✨ DESHABILAR SI ES NECESARIO
                                            disabled={isReadOnly || canEditPendientes}
                                            sx={{ mb: 2 }}
                                            InputProps={{ 
                                                startAdornment: <QrCodeIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                                inputProps: { step: "0.10" }
                                            }}
                                        />
                                    )}
                                    
                                    <Divider sx={{ my: 2 }} />
                                    
                                    <Typography variant="h6" mb={2}>Resumen</Typography>
                                    
                                    <Box sx={{ p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body1">Total Venta:</Typography>
                                            <Typography variant="body1" fontWeight="bold">S/ {totalVenta.toFixed(2)}</Typography>
                                        </Box>
                                        
                                        {Number(currentVenta.pagoEfectivo) > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="body2">Efectivo:</Typography>
                                                <Typography variant="body2">S/ {Number(currentVenta.pagoEfectivo).toFixed(2)}</Typography>
                                            </Box>
                                        )}
                                        
                                        {Number(currentVenta.pagoYapePlin) > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="body2">Yape/Plin:</Typography>
                                                <Typography variant="body2">S/ {Number(currentVenta.pagoYapePlin).toFixed(2)}</Typography>
                                            </Box>
                                        )}
                                        
                                        {currentVenta.pagoVale > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="body2">Pago con Vale:</Typography>
                                                <Typography variant="body2">S/ {currentVenta.pagoVale.toFixed(2)}</Typography>
                                            </Box>
                                        )}
                                        
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body1" fontWeight="medium">Total Cubierto:</Typography>
                                            <Typography variant="body1" fontWeight="bold">S/ {totalPagado.toFixed(2)}</Typography>
                                        </Box>
                                        
                                        {currentVenta.montoPendiente > 0 && (
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="body2">Monto Pendiente:</Typography>
                                                <Typography variant="body2" color={currentVenta.esPendiente ? "error" : "text.secondary"}>
                                                    S/ {currentVenta.montoPendiente.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        )}
                                        
                                        {currentVenta.montoPendiente > 0 && (
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        name="esPendiente"
                                                        checked={currentVenta.esPendiente} // ✨ DESHABILITAR SI ES NECESARIO
                                                        onChange={handleInputChange} // ✨ DESHABILITAR SI ES NECESARIO
                                                        color="primary"
                                                        disabled={currentVenta.montoPendiente <= 0 || isReadOnly || canEditPendientes}
                                                    />
                                                }
                                                label="Marcar como deuda"
                                                sx={{ mt: 1 }}
                                            />
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        
                        <DialogActions sx={{
                            position: 'sticky',
                            bottom: 0,
                            bgcolor: 'background.paper',
                            zIndex: 1,
                            borderTop: `1px solid ${theme.palette.divider}`,
                            p: 2,
                            justifyContent: 'flex-end'
                        }}>
                            <Button onClick={handleCloseDialog} color="secondary" disabled={isSubmitting}> {/* ✨ LÓGICA PARA BOTONES */}
                                Cancelar
                            </Button>
                            {!isEditing && !isSalidaFinalizada && (
                                <Button 
                                    onClick={(e) => handleSaveVenta(e, false)} 
                                    variant="outlined" 
                                    color="primary" 
                                    disabled={isSubmitting}
                                >
                                    Guardar y Añadir Otra
                                </Button>
                            )}
                            <Button // ✨ LÓGICA PARA BOTONES
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                disabled={isSubmitting || isReadOnly}
                            >
                                {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Guardar Cambios' : 'Crear Venta')}
                            </Button>
                        </DialogActions>
                    </Box>
                </Dialog>

                {/* Diálogo de Confirmación de Eliminación */}
                <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
                    <DialogTitle>Confirmar Eliminación</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            ¿Estás seguro de que deseas eliminar la venta de **{ventaToDelete?.clienteNombre || 'Cliente Desconocido'}** por un total de S/ {ventaToDelete?.total.toFixed(2)}? Esta acción es irreversible.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} color="secondary" disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button onClick={handleDeleteVenta} color="error" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={24} /> : 'Eliminar'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Diálogo de Detalles de la Venta */}
                <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        Detalles de la Venta
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseDetailsDialog}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        {ventaDetails ? (
                            <Box>
                                <Typography variant="h6" gutterBottom>Información General</Typography>
                                <List>
                                    <ListItem disablePadding>
                                        <ListItemText primary="ID de Venta" />
                                        <Typography variant="body1">{ventaDetails.id}</Typography>
                                    </ListItem>
                                    <ListItem disablePadding>
                                        <ListItemText primary="Fecha y Hora" />
                                        <Typography variant="body1">{format(new Date(ventaDetails.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</Typography>
                                    </ListItem>
                                    <ListItem disablePadding>
                                        <ListItemText primary="Cliente" />
                                        <Typography variant="body1">{ventaDetails.clienteNombre || 'N/A'}</Typography>
                                    </ListItem>
                                    <ListItem disablePadding>
                                        <ListItemText primary="Dirección" />
                                        <Typography variant="body1">{ventaDetails.clienteDireccion || 'N/A'}</Typography>
                                    </ListItem>
                                    <ListItem disablePadding>
                                        <ListItemText primary="Corredor" />
                                        <Typography variant="body1">{ventaDetails.salida.corredor.nombre}</Typography>
                                    </ListItem>
                                </List>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" gutterBottom>Productos Vendidos</Typography>
                                <TableContainer component={Paper} elevation={1}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Producto</TableCell>
                                                <TableCell align="right">Lleno</TableCell>
                                                <TableCell align="right">Pendiente?</TableCell>
                                                <TableCell align="center">Venta c/ Envase</TableCell>
                                                <TableCell align="right">Precio</TableCell>
                                                <TableCell align="right">Subtotal</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {ventaDetails.productos.map((p, index) => {
                                                const pendiente = ventaDetails.pendientes?.find(item => item.productoId === p.productoId);
                                                const cantidadPendiente = pendiente ? pendiente.cantidad : 0;
                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell>{p.producto.nombre}</TableCell>
                                                        <TableCell align="right">{p.cantidadLleno}</TableCell>
                                                        <TableCell align="right">{cantidadPendiente > 0 ? `Sí (${cantidadPendiente})` : 'No'}</TableCell>
                                                        <TableCell align="center">
                                                            {p.seVendioConEnvase 
                                                                ? <Chip label={`Sí (${p.cantidadLleno})`} color="info" size="small" variant="outlined" /> 
                                                                : 'No'}
                                                        </TableCell>
                                                        <TableCell align="right">S/ {p.precioUnitario.toFixed(2)}</TableCell>
                                                        <TableCell align="right">S/ {(p.cantidadLleno * p.precioUnitario).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" gutterBottom>Resumen de Pagos</Typography>
                                <List>
                                    <ListItem disablePadding>
                                        <ListItemText primary="Total de la Venta" />
                                        <Typography variant="body1" fontWeight="bold">S/ {ventaDetails.total.toFixed(2)}</Typography>
                                    </ListItem>
                                    <ListItem disablePadding>
                                        <ListItemText primary="Pago en Efectivo" />
                                        <Typography variant="body1">S/ {ventaDetails.pagoEfectivo.toFixed(2)}</Typography>
                                    </ListItem>
                                    {ventaDetails.pagoYapePlin > 0 && (
                                        <ListItem disablePadding>
                                            <ListItemText primary="Pago Yape/Plin" />
                                            <Typography variant="body1">S/ {ventaDetails.pagoYapePlin.toFixed(2)}</Typography>
                                        </ListItem>
                                    )}
                                    {ventaDetails.pagoVale > 0 && (
                                        <ListItem disablePadding>
                                            <ListItemText primary="Descuento por Vale" />
                                            <Typography variant="body1">S/ {ventaDetails.pagoVale.toFixed(2)}</Typography>
                                        </ListItem>
                                    )}
                                    <ListItem disablePadding>
                                        <ListItemText primary="Total Pagado" />
                                        <Typography variant="body1" fontWeight="bold">S/ {(Number(ventaDetails.pagoEfectivo) + Number(ventaDetails.pagoYapePlin)).toFixed(2)}</Typography>
                                    </ListItem>
                                    {ventaDetails.montoPendiente > 0 && (
                                        <ListItem disablePadding>
                                            <ListItemText primary="Monto Pendiente" />
                                            <Typography variant="body1" color={ventaDetails.esPendiente ? "error" : "text.secondary"}>
                                                S/ {ventaDetails.montoPendiente.toFixed(2)}
                                            </Typography>
                                        </ListItem>
                                    )}
                                </List>
                            </Box>
                        ) : (
                            <CircularProgress />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDetailsDialog} color="primary">Cerrar</Button>
                    </DialogActions>
                </Dialog>

                {/* Diálogo de Liquidación */}
                <LiquidacionDialog
                    open={openLiquidacionDialog}
                    onClose={() => setOpenLiquidacionDialog(false)}
                    salida={selectedSalida}
                    onLiquidationSuccess={handleLiquidationSuccess}
                />

                {/* Diálogo de Resumen de Liquidación */}
                <ResumenLiquidacionDialog
                    open={openResumenDialog}
                    onClose={() => {
                        setOpenResumenDialog(false);
                        setSalidaParaResumen(null);
                    }}
                    salida={salidaParaResumen}
                />
            </Box>
        </Layout>
    );
};

export default VentaPage;