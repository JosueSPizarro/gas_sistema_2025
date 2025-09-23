import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Paper,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, IconButton, Tooltip, Stack,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    TextField, InputAdornment
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    AddCircleOutline as AddCircleOutlineIcon,
    Refresh as RefreshIcon,
    Edit as EditIcon,
    ToggleOn as ToggleOnIcon,
    ToggleOff as ToggleOffIcon,
    Business as BusinessIcon,
    Phone as PhoneIcon,
    LocationOn as LocationOnIcon,
    ConfirmationNumber as RucIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import proveedorService from '../services/api';

const ProveedoresPage = () => {
    const theme = useTheme();
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProveedor, setCurrentProveedor] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        ruc: '',
        telefono: '',
        direccion: '',
    });
    const [confirmDialog, setConfirmDialog] = useState({ open: false, proveedor: null });

    const fetchProveedores = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await proveedorService.get(`/proveedores`);
            setProveedores(response.data);
        } catch (err) {
            setError('No se pudieron cargar los proveedores.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProveedores();
    }, [fetchProveedores]);

    const handleOpenDialog = (proveedor = null) => {
        if (proveedor) {
            setIsEditing(true);
            setCurrentProveedor(proveedor);
            setFormData({
                nombre: proveedor.nombre,
                ruc: proveedor.ruc || '',
                telefono: proveedor.telefono || '',
                direccion: proveedor.direccion || '',
            });
        } else {
            setIsEditing(false);
            setCurrentProveedor(null);
            setFormData({ nombre: '', ruc: '', telefono: '', direccion: '' });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                await proveedorService.put(`/proveedores/${currentProveedor.id}`, formData);
            } else {
                await proveedorService.post('/proveedores', formData);
            }
            fetchProveedores();
            handleCloseDialog();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el proveedor.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEstado = (proveedor) => {
        setConfirmDialog({ open: true, proveedor });
    };

    const handleConfirmToggle = async () => {
        const proveedor = confirmDialog.proveedor;
        if (!proveedor) return;

        setLoading(true);
        try {
            if (proveedor.activo) {
                await proveedorService.put(`/proveedores/${proveedor.id}`);
            } else {
                
                await proveedorService.put(`/proveedores/${proveedor.id}`, { ...proveedor, activo: true });
            }
            fetchProveedores();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cambiar el estado del proveedor.');
            console.error(err);
        } finally {
            setLoading(false);
            setConfirmDialog({ open: false, proveedor: null });
        }
    };

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Gestión de Proveedores
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Agregar Proveedor
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchProveedores}
                        disabled={loading}
                    >
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>RUC</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {proveedores.map((proveedor) => (
                                <TableRow key={proveedor.id} hover>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <BusinessIcon />
                                            <Typography>{proveedor.nombre}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{proveedor.ruc || 'N/A'}</TableCell>
                                    <TableCell>{proveedor.telefono || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={proveedor.activo ? 'Activo' : 'Inactivo'}
                                            color={proveedor.activo ? 'success' : 'error'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Editar">
                                            <IconButton color="info" onClick={() => handleOpenDialog(proveedor)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={proveedor.activo ? 'Desactivar' : 'Activar'}>
                                            <IconButton
                                                color={proveedor.activo ? 'error' : 'success'}
                                                onClick={() => handleToggleEstado(proveedor)}
                                            >
                                                {proveedor.activo ? <ToggleOffIcon /> : <ToggleOnIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>{isEditing ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}</DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent dividers>
                        <TextField autoFocus margin="dense" name="nombre" label="Nombre del Proveedor" type="text" fullWidth variant="outlined" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required InputProps={{ startAdornment: <InputAdornment position="start"><BusinessIcon /></InputAdornment> }} />
                        <TextField margin="dense" name="ruc" label="RUC" type="text" fullWidth variant="outlined" value={formData.ruc} onChange={(e) => setFormData({ ...formData, ruc: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><RucIcon /></InputAdornment> }} />
                        <TextField margin="dense" name="telefono" label="Teléfono" type="tel" fullWidth variant="outlined" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon /></InputAdornment> }} />
                        <TextField margin="dense" name="direccion" label="Dirección" type="text" fullWidth variant="outlined" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><LocationOnIcon /></InputAdornment> }} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} color="secondary">Cancelar</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : (isEditing ? 'Guardar Cambios' : 'Crear Proveedor')}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, proveedor: null })}>
                <DialogTitle>Confirmar Acción</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas {confirmDialog.proveedor?.activo ? 'desactivar' : 'activar'} a <strong>{confirmDialog.proveedor?.nombre}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ open: false, proveedor: null })}>Cancelar</Button>
                    <Button onClick={handleConfirmToggle} color={confirmDialog.proveedor?.activo ? 'error' : 'success'} variant="contained">
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};

export default ProveedoresPage;
