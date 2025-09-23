import React, { useEffect, useState, useCallback } from 'react';
import {
    Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, Paper, Box, Fade, IconButton, Tooltip, TableContainer,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    DialogContentText, Alert, Slide, InputAdornment, MenuItem,
    CircularProgress, useTheme, Chip, Divider, Container, Grid,
    FormControl,InputLabel,Select,
    FormControlLabel, Switch, Badge, Avatar, Stack
} from '@mui/material';

import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    AttachMoney as MoneyIcon,
    Inventory as InventoryIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Warning as WarningIcon,
    PriorityHigh as CriticalIcon,
    Info as InfoIcon,
    Description as DescriptionIcon,
    Category as CategoryIcon,
    LocalGasStation as BalonGasIcon,
    LocalDrink as AguaIcon,
    Settings as ValvulaIcon,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

const PRODUCT_TYPES_OPTIONS = [
    { value: 'GAS_5K', label: 'Gas (5kg)', icon: <BalonGasIcon /> },
    { value: 'GAS_10K', label: 'Gas (10kg)', icon: <BalonGasIcon /> },
    { value: 'GAS_45K', label: 'Gas (45kg)', icon: <BalonGasIcon /> },
    { value: 'AGUA_20L', label: 'Agua (20L)', icon: <AguaIcon /> },
    { value: 'VALVULA', label: 'Válvula', icon: <ValvulaIcon /> },
    { value: 'OTRO', label: 'Otro', icon: <CategoryIcon /> },
];

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const ProductosPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [mostrarSoloCriticos, setMostrarSoloCriticos] = useState(false);
    const [state, setState] = useState({
        productos: [],
        openDialog: false,
        openConfirmDialog: false,
        modoEdicion: false,
        feedbackMessage: { show: false, type: '', message: '' },
        formData: {
            nombre: '',
            descripcion: '',
            precioUnitario: '',
            tipo: '',
            stockLleno: '',
            stockMinimo: '',
        },
        productoSeleccionado: null,
        searchTerm: '',
        loading: false
    });

    const fetchProductos = useCallback(async () => {
        setState(prevState => ({ ...prevState, loading: true }));
        try {
            const res = await api.get('/productos');
            setState(prevState => ({ ...prevState, productos: res.data }));
        } catch (error) {
            console.error('Error al obtener productos:', error);
            showFeedback('error', 'Error al cargar los productos.');
        } finally {
            setState(prevState => ({ ...prevState, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchProductos();
    }, [fetchProductos]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setState(prevState => ({
            ...prevState,
            formData: {
                ...prevState.formData,
                [name]: value
            }
        }));
    };

    const handleOpenDialog = (modoEdicion, producto = null) => {
        setState(prevState => ({
            ...prevState,
            modoEdicion,
            openDialog: true,
            formData: producto ? {
                nombre: producto.nombre,
                descripcion: producto.descripcion || '',
                precioUnitario: producto.precioUnitario,
                tipo: producto.tipo,
                stockLleno: producto.stockLleno,
                stockMinimo: producto.stockMinimo,
            } : {
                nombre: '',
                descripcion: '',
                precioUnitario: '',
                tipo: '',
                stockLleno: '',
                stockMinimo: '',
            },
            productoSeleccionado: producto
        }));
    };

    const handleCloseDialog = () => {
        setState(prevState => ({ ...prevState, openDialog: false }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { modoEdicion, formData, productoSeleccionado } = state;
        setState(prevState => ({ ...prevState, loading: true }));
        
        const { stockVacio, ...restOfFormData } = formData;
        const dataToSend = {
            ...restOfFormData,
            precioUnitario: parseFloat(formData.precioUnitario),
            stockLleno: parseInt(formData.stockLleno),
            stockMinimo: parseInt(formData.stockMinimo),
        };

        try {
            if (modoEdicion) {
                await api.put(`/productos/${productoSeleccionado.id}`, dataToSend);
                showFeedback('success', 'Producto actualizado correctamente.');
            } else {
                await api.post('/productos', dataToSend);
                showFeedback('success', 'Producto creado correctamente.');
            }
            fetchProductos();
            handleCloseDialog();
        } catch (error) {
            console.error('Error al guardar el producto:', error);
            showFeedback('error', `Error al guardar el producto: ${error.response?.data?.error || error.message}`);
        } finally {
            setState(prevState => ({ ...prevState, loading: false }));
        }
    };

    const handleOpenConfirmDialog = (producto) => {
        setState(prevState => ({ ...prevState, openConfirmDialog: true, productoSeleccionado: producto }));
    };

    const handleCloseConfirmDialog = () => {
        setState(prevState => ({ ...prevState, openConfirmDialog: false, productoSeleccionado: null }));
    };

    const handleDelete = async () => {
        const { productoSeleccionado } = state;
        try {
            await api.delete(`/productos/${productoSeleccionado.id}`);
            fetchProductos();
            showFeedback('success', 'Producto eliminado correctamente.');
            handleCloseConfirmDialog();
        } catch (error) {
            console.error('Error al eliminar el producto:', error);
            showFeedback('error', 'Error al eliminar el producto.');
        }
    };

    const showFeedback = (type, message) => {
        setState(prevState => ({
            ...prevState,
            feedbackMessage: { show: true, type, message }
        }));
        setTimeout(() => {
            setState(prevState => ({ ...prevState, feedbackMessage: { show: false, type: '', message: '' } }));
        }, 5000);
    };

    const handleSearchChange = (e) => {
        setState(prevState => ({ ...prevState, searchTerm: e.target.value }));
    };

    const getStockValue = (producto) => {
        return producto.stockLleno;
    };

    const isCritical = (producto) => {
        const stock = getStockValue(producto);
        return stock <= producto.stockMinimo;
    };

    const getProductoIcon = (tipo) => {
        if (tipo?.startsWith('GAS')) return <BalonGasIcon />;
        if (tipo?.startsWith('AGUA')) return <AguaIcon />;
        if (tipo === 'VALVULA') return <ValvulaIcon />;
        return <InventoryIcon />;
    };

    const filteredProductos = state.productos.filter(p =>
        p.nombre.toLowerCase().includes(state.searchTerm.toLowerCase()) &&
        (!mostrarSoloCriticos || isCritical(p))
    );

    return (
        <Layout>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Box sx={{ 
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 2,
                    p: 4,
                    boxShadow: theme.shadows[2],
                    mb: 4
                }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                        <Typography variant="h4" component="h1" sx={{ 
                            fontWeight: 'bold',
                            color: theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <InventoryIcon fontSize="large" />
                            Gestión de Productos
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog(false)}
                            sx={{ 
                                borderRadius: 2,
                                px: 3,
                                py: 1,
                                textTransform: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Nuevo Producto
                        </Button>
                    </Box>

                    <Paper sx={{ 
                        p: 3, 
                        mb: 4, 
                        display: 'flex', 
                        alignItems: 'center',
                        backgroundColor: theme.palette.grey[50],
                        borderRadius: 2
                    }}>
                        <TextField
                            label="Buscar producto"
                            variant="outlined"
                            size="small"
                            value={state.searchTerm}
                            onChange={handleSearchChange}
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="primary" />
                                    </InputAdornment>
                                ),
                                endAdornment: state.searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton 
                                            onClick={() => setState(prevState => ({ ...prevState, searchTerm: '' }))} 
                                            size="small"
                                            sx={{ color: theme.palette.grey[500] }}
                                        >
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={mostrarSoloCriticos}
                                    onChange={(e) => setMostrarSoloCriticos(e.target.checked)}
                                    color="warning"
                                />
                            }
                            label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <CriticalIcon color="warning" />
                                    <Typography>Mostrar solo críticos</Typography>
                                </Stack>
                            }
                            sx={{ ml: 2, flexShrink: 0 }}
                        />
                    </Paper>

                    {state.loading ? (
                        <Box display="flex" justifyContent="center" my={5}>
                            <CircularProgress size={60} thickness={4} />
                        </Box>
                    ) : (
                        <Fade in={!state.loading}>
                            <Box>
                                <Box sx={{ 
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                    p: 1,
                                    backgroundColor: theme.palette.grey[100],
                                    borderRadius: 1
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Total de productos: {filteredProductos.length}
                                    </Typography>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {mostrarSoloCriticos && `Críticos: ${filteredProductos.filter(p => isCritical(p)).length}`}
                                    </Typography>
                                </Box>

                                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                                    <Table sx={{ minWidth: 800 }} aria-label="tabla de productos">
                                        <TableHead>
                                            <TableRow sx={{ 
                                                bgcolor: theme.palette.primary.light,
                                                '& th': { 
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.875rem'
                                                }
                                            }}>
                                                <TableCell>ID</TableCell>
                                                <TableCell>Producto</TableCell>                                
                                                <TableCell>Tipo</TableCell>
                                                <TableCell align="center">Stock Lleno</TableCell>
                                                <TableCell align="center">Stock Mínimo</TableCell>
                                                <TableCell align="right">Precio Unitario</TableCell>
                                                <TableCell align="center">Acciones</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredProductos.length > 0 ? (
                                                filteredProductos.map((producto) => (
                                                    <TableRow
                                                        key={producto.id}
                                                        hover
                                                        sx={{
                                                            '&:last-child td': { borderBottom: 0 },
                                                            backgroundColor: isCritical(producto) ? theme.palette.warning.light : 'inherit',
                                                            '&:hover': {
                                                                backgroundColor: isCritical(producto) 
                                                                    ? theme.palette.warning.light
                                                                    : theme.palette.action.hover
                                                            }
                                                        }}
                                                    >
                                                        <TableCell>{producto.id}</TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                                <Avatar sx={{ 
                                                                    bgcolor: isCritical(producto) 
                                                                        ? theme.palette.warning.dark 
                                                                        : theme.palette.primary.main
                                                                }}>
                                                                    {getProductoIcon(producto.tipo)}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography fontWeight="medium">{producto.nombre}</Typography>
                                                                    {producto.descripcion && (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {producto.descripcion}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={producto.tipo}
                                                                color={producto.tipo.startsWith('GAS') ? 'primary' :
                                                                        producto.tipo.startsWith('AGUA') ? 'info' : 'secondary'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
    <Badge 
        // La condición para el Badge debe ser ajustada para reflejar el stock general
        // Se utiliza 'stockLleno' como la única fuente de verdad para el stock general de todos los productos
        badgeContent={isCritical(producto) ? "!" : null} 
        color="error"
        overlap="circular"
    >
        {/* Se muestra directamente 'stockLleno' para todos los productos */}
        {producto.stockLleno}
    </Badge>
</TableCell>
                                                        <TableCell align="center">{producto.stockMinimo}</TableCell>
                                                        <TableCell align="right">
                                                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                                                                <MoneyIcon color="success" sx={{ mr: 1 }} />
                                                                <Typography fontWeight="medium">
                                                                    S/. {producto.precioUnitario.toFixed(2)}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                                <Tooltip title="Editar">
                                                                    <IconButton 
                                                                        color="primary" 
                                                                        onClick={() => handleOpenDialog(true, producto)}
                                                                        sx={{ 
                                                                            backgroundColor: theme.palette.primary.light,
                                                                            '&:hover': { backgroundColor: theme.palette.primary.main }
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Eliminar">
                                                                    <IconButton 
                                                                        color="error" 
                                                                        onClick={() => handleOpenConfirmDialog(producto)}
                                                                        sx={{ 
                                                                            backgroundColor: theme.palette.error.light,
                                                                            '&:hover': { backgroundColor: theme.palette.error.main }
                                                                        }}
                                                                    >
                                                                        <DeleteIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                                        <Box sx={{ 
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 2
                                                        }}>
                                                            <InventoryIcon sx={{ fontSize: 60, color: theme.palette.grey[400] }} />
                                                            <Typography variant="h6" color="text.secondary">
                                                                No se encontraron productos
                                                            </Typography>
                                                            <Button 
                                                                variant="outlined" 
                                                                startIcon={<AddIcon />}
                                                                onClick={() => handleOpenDialog(false)}
                                                            >
                                                                Agregar nuevo producto
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Fade>
                    )}

                    {/* Diálogo de formulario */}
                    <Dialog 
                        open={state.openDialog} 
                        onClose={handleCloseDialog} 
                        TransitionComponent={Transition}
                        fullWidth
                        maxWidth="sm"
                        PaperProps={{ sx: { borderRadius: 3 } }}
                    >
                        <DialogTitle sx={{ 
                            bgcolor: theme.palette.primary.main, 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            {state.modoEdicion ? (
                                <>
                                    <EditIcon /> Editar Producto
                                </>
                            ) : (
                                <>
                                    <AddIcon /> Agregar Producto
                                </>
                            )}
                        </DialogTitle>
                        <Box component="form" onSubmit={handleSubmit}>
                            <DialogContent dividers sx={{ py: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={8}>
                                        <TextField
                                            autoFocus
                                            margin="dense"
                                            name="nombre"
                                            label="Nombre del Producto"
                                            type="text"
                                            fullWidth
                                            variant="outlined"
                                            value={state.formData.nombre}
                                            onChange={handleChange}
                                            required
                                            InputProps={{ 
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <InventoryIcon color="primary" />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 2 }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            margin="dense"
                                            name="descripcion"
                                            label="Descripción"
                                            type="text"
                                            fullWidth
                                            variant="outlined"
                                            value={state.formData.descripcion}
                                            onChange={handleChange}
                                            multiline
                                            rows={3}
                                            InputProps={{ 
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <DescriptionIcon color="primary" />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 2 }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            margin="dense"
                                            name="precioUnitario"
                                            label="Precio Unitario"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={state.formData.precioUnitario}
                                            onChange={handleChange}
                                            required
                                            InputProps={{ 
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <MoneyIcon color="primary" />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 2 }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth margin="dense" required>
                                            <InputLabel>Tipo de Producto</InputLabel>
                                            <Select
                                                name="tipo"
                                                value={state.formData.tipo}
                                                label="Tipo de Producto"
                                                onChange={handleChange}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                {PRODUCT_TYPES_OPTIONS.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>{option.icon} <span>{option.label}</span></Stack>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {/* Campo de stock único */}
                                    {state.formData.tipo && (
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                margin="dense"
                                                name="stockLleno"
                                                label={state.formData.tipo === 'VALVULA' ? "Stock" : "Stock Lleno"}
                                                type="number"
                                                fullWidth
                                                variant="outlined"
                                                value={state.formData.stockLleno}
                                                onChange={handleChange}
                                                required
                                                InputProps={{ 
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <InventoryIcon color="primary" />
                                                        </InputAdornment>
                                                    ),
                                                    sx: { borderRadius: 2 }
                                                }}
                                            />
                                        </Grid>
                                    )}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            margin="dense"
                                            name="stockMinimo"
                                            label="Stock Mínimo"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={state.formData.stockMinimo}
                                            onChange={handleChange}
                                            required
                                            InputProps={{ 
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <WarningIcon color="warning" />
                                                    </InputAdornment>
                                                ),
                                                sx: { borderRadius: 2 }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </DialogContent>
                            <DialogActions sx={{ p: 2, bgcolor: theme.palette.grey[100] }}>
                                <Button 
                                    onClick={handleCloseDialog} 
                                    color="secondary"
                                    variant="outlined"
                                    sx={{ borderRadius: 2, px: 3 }}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    type="submit" 
                                    variant="contained" 
                                    color="primary" 
                                    disabled={state.loading}
                                    sx={{ borderRadius: 2, px: 3 }}
                                >
                                    {state.loading ? (
                                        <CircularProgress size={24} color="inherit" />
                                    ) : state.modoEdicion ? (
                                        'Guardar Cambios'
                                    ) : (
                                        'Crear Producto'
                                    )}
                                </Button>
                            </DialogActions>
                        </Box>
                    </Dialog>

                    {/* Diálogo de confirmación de eliminación */}
                    <Dialog 
                        open={state.openConfirmDialog} 
                        onClose={handleCloseConfirmDialog} 
                        TransitionComponent={Transition}
                        maxWidth="xs"
                        PaperProps={{ sx: { borderRadius: 3 } }}
                    >
                        <DialogTitle sx={{ 
                            bgcolor: theme.palette.error.main, 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <ErrorIcon /> Confirmar Eliminación
                        </DialogTitle>
                        <DialogContent sx={{ py: 3 }}>
                            <DialogContentText>
                                ¿Estás seguro de que deseas eliminar el producto <strong>"{state.productoSeleccionado?.nombre}"</strong>? Esta acción no se puede deshacer.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, bgcolor: theme.palette.grey[100] }}>
                            <Button 
                                onClick={handleCloseConfirmDialog} 
                                color="info"
                                variant="outlined"
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleDelete} 
                                variant="contained" 
                                color="error" 
                                autoFocus 
                                disabled={state.loading}
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                {state.loading ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : (
                                    'Eliminar'
                                )}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Notificación de feedback */}
                    <Fade in={state.feedbackMessage.show}>
                        <Alert
                            severity={state.feedbackMessage.type}
                            sx={{ 
                                position: 'fixed', 
                                bottom: 24, 
                                right: 24,
                                borderRadius: 2,
                                boxShadow: theme.shadows[4],
                                minWidth: 300
                            }}
                            iconMapping={{
                                success: <SuccessIcon fontSize="large" />,
                                error: <ErrorIcon fontSize="large" />,
                                warning: <WarningIcon fontSize="large" />
                            }}
                        >
                            <Typography fontWeight="medium">
                                {state.feedbackMessage.message}
                            </Typography>
                        </Alert>
                    </Fade>
                </Box>
            </Container>
        </Layout>
    );
};

export default ProductosPage;