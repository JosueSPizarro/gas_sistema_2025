// src/pages/VehiculosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Paper,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, IconButton, Tooltip, Stack,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    TextField, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    LocalShipping as LocalShippingIcon,
    AddCircleOutline as AddCircleOutlineIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    ToggleOn as ToggleOnIcon,
    ToggleOff as ToggleOffIcon,
    Close as CloseIcon,
    Person as PersonIcon, // Para el corredor asignado
    CalendarMonth as CalendarMonthIcon, // Para fechas de jornada
    CheckCircle as SuccessIcon, // Importar SuccessIcon para alertas
    Error as ErrorIcon,         // Importar ErrorIcon para alertas
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Asume que api.js está configurado con axios y la base URL de tu backend
import Layout from '../components/Layout';
import api from '../services/api'; // Asegúrate de que api.js esté configurado correctamente con axios

const VehiculosPage = () => {
    const theme = useTheme();

    // Estados para la gestión de datos y UI
    const [vehiculos, setVehiculos] = useState([]);
    const [corredores, setCorredores] = useState([]); // Para el dropdown de asignación
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [filterActivo, setFilterActivo] = useState('all'); // 'all', 'true', 'false'
    const [filterEstado, setFilterEstado] = useState('all'); // 'all', 'operativo', 'en_mantenimiento', etc.

    // Estados para modales
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Estado para el vehículo seleccionado en el modal de detalles/edición
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [formMode, setFormMode] = useState('create'); // 'create' o 'edit'
    const [formData, setFormData] = useState({
        placa: '',
        modelo: '',
        capacidadCarga: '',
        estado: 'operativo',
        notas: '',
        activo: true,
        corredorActual: '', // ID del corredor o null
        marca: '',
        tipo: '', // Asegúrate de que siempre se inicialice o se seleccione
        unidadCarga: '',
        anioFabricacion: '',
        kilometrajeActual: '',
        numeroPoliza: '',
        aseguradora: '',
        fechaVencimientoSeguro: '',
        tipoCobertura: '',
        montoAsegurado: '',
        idDispositivoGPS: '',
        proveedorGPS: '',
        fechaVencimientoGPS: '',
    });

    // Estados para el modal de confirmación
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');

    // Función para mostrar mensajes de éxito/error temporales
    const showMessage = (message, type) => {
        if (type === 'success') {
            setSuccessMessage(message);
            setError(null);
        } else {
            setError(message);
            setSuccessMessage(null);
        }
        setTimeout(() => {
            setSuccessMessage(null);
            setError(null);
        }, 5000); // Mensaje desaparece después de 5 segundos
    };

    // Función para obtener todos los vehículos
    const fetchVehiculos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (filterActivo !== 'all') {
                params.activo = filterActivo;
            }
            if (filterEstado !== 'all') {
                params.estado = filterEstado;
            }
            const response = await api.get('/vehiculos', { params });
            setVehiculos(response.data);
        } catch (err) {
            console.error('Error al obtener vehículos:', err);
            showMessage('Error al cargar los vehículos. Inténtalo de nuevo.', 'error');
        } finally {
            setLoading(false);
        }
    }, [filterActivo, filterEstado]);

    // Función para obtener todos los corredores (para el dropdown de asignación)
    const fetchCorredores = useCallback(async () => {
        try {
            const response = await api.get('/corredores?activo=true'); // Solo corredores activos
            setCorredores(response.data);
        } catch (err) {
            console.error('Error al obtener corredores para asignación:', err);
            // No se muestra un error al usuario si falla la carga de corredores, solo se registra en consola
        }
    }, []);

    // useEffect para cargar vehículos y corredores al inicio y cuando cambian los filtros
    useEffect(() => {
        fetchVehiculos();
        fetchCorredores();
    }, [fetchVehiculos, fetchCorredores]);

    // Función para abrir el modal de detalles del vehículo
    const openDetailModal = async (vehiculoId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/vehiculos/${vehiculoId}`);
            setSelectedVehiculo(response.data);
            setIsDetailModalOpen(true);
            setLoading(false);
        } catch (err) {
            console.error('Error al obtener detalles del vehículo:', err);
            showMessage('Error al cargar los detalles del vehículo.', 'error');
            setLoading(false);
        }
    };

    // Función para cerrar cualquier modal
    const closeModal = (modalId) => {
        if (modalId === 'detailModal') {
            setIsDetailModalOpen(false);
            setSelectedVehiculo(null);
        } else if (modalId === 'formModal') {
            setIsFormModalOpen(false);
            // Restablecer formData a su estado inicial para el próximo uso
            setFormData({
                placa: '', modelo: '', capacidadCarga: '', estado: 'operativo', notas: '', activo: true, corredorActual: '',
                marca: '', tipo: '', unidadCarga: '', anioFabricacion: '', kilometrajeActual: '',
                numeroPoliza: '', aseguradora: '', fechaVencimientoSeguro: '', tipoCobertura: '', montoAsegurado: '',
                idDispositivoGPS: '', proveedorGPS: '', fechaVencimientoGPS: '',
            });
        } else if (modalId === 'confirmModal') {
            setIsConfirmModalOpen(false);
            setConfirmAction(null);
            setConfirmTitle('');
            setConfirmMessage('');
        }
    };

    // Función para abrir el modal de creación
    const openCreateModal = () => {
        setFormMode('create');
        // Asegúrate de que 'tipo' tenga un valor por defecto si es obligatorio
        setFormData({
            placa: '', modelo: '', capacidadCarga: '', estado: 'operativo', notas: '', activo: true, corredorActual: '',
            marca: '', tipo: '', unidadCarga: '', anioFabricacion: '', kilometrajeActual: '',
            numeroPoliza: '', aseguradora: '', fechaVencimientoSeguro: '', tipoCobertura: '', montoAsegurado: '',
            idDispositivoGPS: '', proveedorGPS: '', fechaVencimientoGPS: '',
        });
        setIsFormModalOpen(true);
    };

    // Función para abrir el modal de edición
    const openEditModal = () => {
        if (selectedVehiculo) {
            setFormMode('edit');
            setFormData({
                placa: selectedVehiculo.placa || '',
                modelo: selectedVehiculo.modelo || '',
                capacidadCarga: selectedVehiculo.capacidadCarga ? parseFloat(selectedVehiculo.capacidadCarga) : '', // Convertir a float
                estado: selectedVehiculo.estado || 'operativo',
                notas: selectedVehiculo.notas || '',
                activo: selectedVehiculo.activo,
                corredorActual: selectedVehiculo.corredorActual?.id || '', // ID del corredor o cadena vacía
                marca: selectedVehiculo.marca || '',
                tipo: selectedVehiculo.tipo || '', // Asegúrate de que 'tipo' se cargue
                unidadCarga: selectedVehiculo.unidadCarga || '',
                anioFabricacion: selectedVehiculo.anioFabricacion || '',
                kilometrajeActual: selectedVehiculo.kilometrajeActual ? parseFloat(selectedVehiculo.kilometrajeActual) : '', // Convertir a float
                numeroPoliza: selectedVehiculo.numeroPoliza || '',
                aseguradora: selectedVehiculo.aseguradora || '',
                fechaVencimientoSeguro: selectedVehiculo.fechaVencimientoSeguro ? format(new Date(selectedVehiculo.fechaVencimientoSeguro), 'yyyy-MM-dd') : '',
                tipoCobertura: selectedVehiculo.tipoCobertura || '',
                montoAsegurado: selectedVehiculo.montoAsegurado ? parseFloat(selectedVehiculo.montoAsegurado) : '', // Convertir a float
                idDispositivoGPS: selectedVehiculo.idDispositivoGPS || '',
                proveedorGPS: selectedVehiculo.proveedorGPS || '',
                fechaVencimientoGPS: selectedVehiculo.fechaVencimientoGPS ? format(new Date(selectedVehiculo.fechaVencimientoGPS), 'yyyy-MM-dd') : '',
            });
            setIsDetailModalOpen(false); // Cierra el modal de detalles
            setIsFormModalOpen(true); // Abre el modal de formulario
        }
    };

    // Manejador de cambios en el formulario
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Manejador de envío del formulario (crear/editar)
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        // Preparar datos para enviar al backend
        const dataToSend = { ...formData };

        // Validar campos obligatorios en el frontend antes de enviar
        if (!dataToSend.placa || !dataToSend.modelo || !dataToSend.capacidadCarga || !dataToSend.tipo) {
            showMessage('Por favor, complete todos los campos obligatorios: Placa, Modelo, Capacidad de Carga y Tipo de Vehículo.', 'error');
            setLoading(false);
            return; // Detener el envío si faltan campos
        }

        // Convertir capacidadCarga a número si no es nulo/vacío
        if (dataToSend.capacidadCarga !== null && dataToSend.capacidadCarga !== '') {
            dataToSend.capacidadCarga = parseFloat(dataToSend.capacidadCarga);
            if (isNaN(dataToSend.capacidadCarga) || dataToSend.capacidadCarga <= 0) {
                showMessage('La capacidad de carga debe ser un número positivo válido.', 'error');
                setLoading(false);
                return;
            }
        } else {
            // Si capacidadCarga es opcional en tu modelo y se envía vacío, puedes eliminarlo
            // Si es obligatorio (como lo tienes ahora), esta rama no debería alcanzarse si la validación superior funciona
            delete dataToSend.capacidadCarga;
        }

        // Convertir kilometrajeActual a número si no es nulo/vacío
        if (dataToSend.kilometrajeActual !== null && dataToSend.kilometrajeActual !== '') {
            dataToSend.kilometrajeActual = parseFloat(dataToSend.kilometrajeActual);
            if (isNaN(dataToSend.kilometrajeActual) || dataToSend.kilometrajeActual < 0) {
                showMessage('El kilometraje actual debe ser un número no negativo válido.', 'error');
                setLoading(false);
                return;
            }
        } else {
            delete dataToSend.kilometrajeActual;
        }
        // Convertir anioFabricacion a número si no es nulo/vacío
        if (dataToSend.anioFabricacion !== null && dataToSend.anioFabricacion !== '') {
            dataToSend.anioFabricacion = parseInt(dataToSend.anioFabricacion);
            if (isNaN(dataToSend.anioFabricacion) || dataToSend.anioFabricacion <= 0) {
                showMessage('El año de fabricación debe ser un número positivo válido.', 'error');
                setLoading(false);
                return;
            }
        } else {
            delete dataToSend.anioFabricacion;
        }
        // Convertir montoAsegurado a número si no es nulo/vacío
        if (dataToSend.montoAsegurado !== null && dataToSend.montoAsegurado !== '') {
            dataToSend.montoAsegurado = parseFloat(dataToSend.montoAsegurado);
            if (isNaN(dataToSend.montoAsegurado) || dataToSend.montoAsegurado < 0) {
                showMessage('El monto asegurado debe ser un número no negativo válido.', 'error');
                setLoading(false);
                return;
            }
        } else {
            delete dataToSend.montoAsegurado;
        }

        // Manejar el campo `corredorActual`: si es cadena vacía, enviar `null`
        if (dataToSend.corredorActual === '') {
            dataToSend.corredorActualId = null; // Usar corredorActualId para el backend
        } else if (dataToSend.corredorActual !== null) {
            dataToSend.corredorActualId = parseInt(dataToSend.corredorActual); // Asegurar que sea un número
        }
        delete dataToSend.corredorActual; // Eliminar el campo temporal

        // Convertir fechas a formato ISO si existen
        if (dataToSend.fechaVencimientoSeguro) {
            dataToSend.fechaVencimientoSeguro = new Date(dataToSend.fechaVencimientoSeguro).toISOString();
        } else {
            dataToSend.fechaVencimientoSeguro = null; // Enviar null si está vacío para campos opcionales
        }
        if (dataToSend.fechaVencimientoGPS) {
            dataToSend.fechaVencimientoGPS = new Date(dataToSend.fechaVencimientoGPS).toISOString();
        } else {
            dataToSend.fechaVencimientoGPS = null; // Enviar null si está vacío para campos opcionales
        }

        try {
            if (formMode === 'create') {
                await api.post('/vehiculos', dataToSend);
                showMessage('Vehículo creado exitosamente.', 'success');
            } else { // edit mode
                await api.put(`/vehiculos/${selectedVehiculo.id}`, dataToSend);
                showMessage('Vehículo actualizado exitosamente.', 'success');
            }
            closeModal('formModal');
            fetchVehiculos(); // Refrescar la lista
        } catch (err) {
            console.error('Error al guardar vehículo:', err);
            const msg = err.response?.data?.message || 'Error al guardar el vehículo.';
            showMessage(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Función para manejar la activación/desactivación (soft delete)
    const handleToggleActive = (vehiculo) => {
        const newStatus = !vehiculo.activo;
        const actionText = newStatus ? 'activar' : 'desactivar';
        setConfirmTitle(`Confirmar ${actionText} vehículo`);
        setConfirmMessage(`¿Estás seguro de que quieres ${actionText} el vehículo con placa ${vehiculo.placa}?`);
        setConfirmAction(async () => {
            try {
                await api.put(`/vehiculos/${vehiculo.id}`, { activo: newStatus });
                showMessage(`Vehículo con placa ${vehiculo.placa} ${newStatus ? 'activado' : 'desactivado'} exitosamente.`, 'success');
                fetchVehiculos(); // Refrescar la lista
                closeModal('detailModal'); // Cerrar modal de detalles si está abierto
            } catch (err) {
                console.error(`Error al ${actionText} vehículo:`, err);
                const msg = err.response?.data?.message || `Error al ${actionText} el vehículo.`;
                showMessage(msg, 'error');
            }
        });
        setIsConfirmModalOpen(true);
    };

    // Manejador de la acción de confirmación
    const handleConfirmAction = async () => {
        if (confirmAction) {
            await confirmAction();
        }
        closeModal('confirmModal');
    };

    // Opciones de estado para el filtro y el formulario
    const estadoOptions = [
        { value: 'operativo', label: 'Operativo' },
        { value: 'en_mantenimiento', label: 'En Mantenimiento' },
        { value: 'fuera_de_servicio', label: 'Fuera de Servicio' },
    ];

    return (
        <Layout>
            <Box sx={{ flexGrow: 1, bgcolor: theme.palette.background.default, minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
                {/* Header */}
                <Box sx={{ bgcolor: theme.palette.primary.main, color: 'white', p: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, boxShadow: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ maxWidth: 1200, mx: 'auto', px: 2 }}>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                            Gestión de Vehículos
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={openCreateModal}
                            sx={{
                                bgcolor: theme.palette.secondary.main || '#D4D4D4', // Light Gray
                                color: theme.palette.text.primary || '#333',
                                '&:hover': { bgcolor: theme.palette.secondary.dark || '#C0C0C0' },
                                borderRadius: '0.5rem',
                                py: 1.5,
                                px: 3,
                            }}
                        >
                            Crear Nuevo Vehículo
                        </Button>
                    </Stack>
                </Box>

                {/* Main Content Area */}
                <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>{error}</Alert>
                    )}
                    {successMessage && (
                        <Alert severity="success" sx={{ mb: 2 }} icon={<SuccessIcon />}>{successMessage}</Alert>
                    )}

                    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: '0.5rem', mb: 4, bgcolor: theme.palette.grey[100] }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 'semibold', mb: 2, color: theme.palette.primary.main }}>
                            Lista de Vehículos
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3, color: theme.palette.text.secondary }}>
                            Esta sección muestra un listado completo de todos los vehículos registrados en el sistema.
                            Puedes filtrar la lista por su estado de actividad o por su estado operativo.
                            Haz clic en cualquier fila para ver los detalles completos de un vehículo, incluyendo su historial de jornadas.
                        </Typography>

                        {/* Filters */}
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel id="filter-activo-label">Filtrar por Activo</InputLabel>
                                <Select
                                    labelId="filter-activo-label"
                                    id="filterActivo"
                                    value={filterActivo}
                                    label="Filtrar por Activo"
                                    onChange={(e) => setFilterActivo(e.target.value)}
                                    sx={{ borderRadius: '0.5rem', bgcolor: 'white' }}
                                >
                                    <MenuItem value="all">Todos</MenuItem>
                                    <MenuItem value="true">Activos</MenuItem>
                                    <MenuItem value="false">Inactivos</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel id="filter-estado-label">Filtrar por Estado</InputLabel>
                                <Select
                                    labelId="filter-estado-label"
                                    id="filterEstado"
                                    value={filterEstado}
                                    label="Filtrar por Estado"
                                    onChange={(e) => setFilterEstado(e.target.value)}
                                    sx={{ borderRadius: '0.5rem', bgcolor: 'white' }}
                                >
                                    <MenuItem value="all">Todos</MenuItem>
                                    {estadoOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        {/* Vehiculos Table */}
                        <TableContainer component={Paper} sx={{ borderRadius: '0.5rem', boxShadow: 1 }}>
                            <Table aria-label="tabla de vehículos">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: theme.palette.grey[300] }}>
                                        <TableCell sx={{ fontWeight: 'bold', borderRadius: '0.5rem 0 0 0' }}>Placa</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Modelo</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', display: { xs: 'none', sm: 'table-cell' } }}>Capacidad (m³)</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Activo</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', borderRadius: '0 0.5rem 0 0' }}>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {vehiculos.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: theme.palette.text.secondary }}>
                                                No se encontraron vehículos.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {vehiculos.map((vehiculo) => (
                                        <TableRow
                                            key={vehiculo.id}
                                            hover
                                            onClick={() => openDetailModal(vehiculo.id)}
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'pointer' }}
                                        >
                                            <TableCell>{vehiculo.placa}</TableCell>
                                            <TableCell>{vehiculo.modelo || 'N/A'}</TableCell>
                                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                {vehiculo.capacidadCarga ? parseFloat(vehiculo.capacidadCarga).toFixed(2) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={estadoOptions.find(opt => opt.value === vehiculo.estado)?.label || vehiculo.estado}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: vehiculo.estado === 'operativo' ? theme.palette.success.light : (vehiculo.estado === 'en_mantenimiento' ? theme.palette.warning.light : theme.palette.error.light),
                                                        color: vehiculo.estado === 'operativo' ? theme.palette.success.contrastText : (vehiculo.estado === 'en_mantenimiento' ? theme.palette.warning.contrastText : theme.palette.error.contrastText),
                                                        fontWeight: 'bold',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={vehiculo.activo ? 'Sí' : 'No'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: vehiculo.activo ? theme.palette.success.light : theme.palette.error.light,
                                                        color: vehiculo.activo ? theme.palette.success.contrastText : theme.palette.error.contrastText,
                                                        fontWeight: 'bold',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title="Ver Detalles">
                                                        <IconButton
                                                            color="primary"
                                                            onClick={(e) => { e.stopPropagation(); openDetailModal(vehiculo.id); }}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Editar Vehículo">
                                                        <IconButton
                                                            color="secondary"
                                                            onClick={(e) => { e.stopPropagation(); setSelectedVehiculo(vehiculo); openEditModal(); }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>

                {/* Vehiculo Detail Modal */}
                <Dialog open={isDetailModalOpen} onClose={() => closeModal('detailModal')} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                            Detalles del Vehículo
                        </Typography>
                        <IconButton onClick={() => closeModal('detailModal')} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: theme.palette.grey[50], p: 4 }}>
                        {selectedVehiculo ? (
                            <Box>
                                <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: theme.palette.primary.dark }}>
                                    <LocalShippingIcon sx={{ mr: 1 }} /> {selectedVehiculo.placa} - {selectedVehiculo.modelo}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 3, color: theme.palette.text.secondary }}>
                                    Esta ventana muestra los detalles completos del vehículo seleccionado. Aquí puedes ver su información general,
                                    el corredor que tiene asignado actualmente, y un historial de sus últimas jornadas.
                                    Utiliza los botones inferiores para editar la información del vehículo o para cambiar su estado de actividad.
                                </Typography>

                                <Divider sx={{ my: 3 }} />

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mb: 4 }}>
                                    <Paper elevation={1} sx={{ p: 3, borderRadius: '0.5rem', bgcolor: 'white' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'semibold', mb: 2, display: 'flex', alignItems: 'center', color: theme.palette.primary.main }}>
                                            Información General
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Marca:</strong> {selectedVehiculo.marca || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Tipo:</strong> {selectedVehiculo.tipo || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Capacidad:</strong> {selectedVehiculo.capacidadCarga ? `${parseFloat(selectedVehiculo.capacidadCarga).toFixed(2)} m³` : 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Unidad de Carga:</strong> {selectedVehiculo.unidadCarga || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Año Fabricación:</strong> {selectedVehiculo.anioFabricacion || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Kilometraje Actual:</strong> {selectedVehiculo.kilometrajeActual ? `${parseFloat(selectedVehiculo.kilometrajeActual).toFixed(2)} km` : 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong style={{ color: theme.palette.primary.dark }}>Notas:</strong> {selectedVehiculo.notas || 'N/A'}
                                        </Typography>
                                        {/* CORREGIDO: Añadir component="div" aquí */}
                                        <Typography variant="body2" sx={{ mb: 1 }} component="div">
                                            <strong style={{ color: theme.palette.primary.dark }}>Estado:</strong>
                                            <Chip
                                                label={estadoOptions.find(opt => opt.value === selectedVehiculo.estado)?.label || selectedVehiculo.estado}
                                                size="small"
                                                sx={{
                                                    ml: 1,
                                                    bgcolor: selectedVehiculo.estado === 'operativo' ? theme.palette.success.light : (selectedVehiculo.estado === 'en_mantenimiento' ? theme.palette.warning.light : theme.palette.error.light),
                                                    color: selectedVehiculo.estado === 'operativo' ? theme.palette.success.contrastText : (selectedVehiculo.estado === 'en_mantenimiento' ? theme.palette.warning.contrastText : theme.palette.error.contrastText),
                                                    fontWeight: 'bold',
                                                }}
                                            />
                                        </Typography>
                                        {/* CORREGIDO: Añadir component="div" aquí */}
                                        <Typography variant="body2" component="div">
                                            <strong style={{ color: theme.palette.primary.dark }}>Activo:</strong>
                                            <Chip
                                                label={selectedVehiculo.activo ? 'Sí' : 'No'}
                                                size="small"
                                                sx={{
                                                    ml: 1,
                                                    bgcolor: selectedVehiculo.activo ? theme.palette.success.light : theme.palette.error.light,
                                                    color: selectedVehiculo.activo ? theme.palette.success.contrastText : theme.palette.error.contrastText,
                                                    fontWeight: 'bold',
                                                }}
                                            />
                                        </Typography>
                                    </Paper>

                                    <Paper elevation={1} sx={{ p: 3, borderRadius: '0.5rem', bgcolor: 'white' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'semibold', mb: 2, display: 'flex', alignItems: 'center', color: theme.palette.primary.main }}>
                                            <PersonIcon sx={{ mr: 1 }} /> Corredor Asignado
                                        </Typography>
                                        {selectedVehiculo.corredorActual ? (
                                            <Box>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Nombre:</strong> {selectedVehiculo.corredorActual.nombreCompleto}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Teléfono:</strong> {selectedVehiculo.corredorActual.telefono || 'N/A'}
                                                </Typography>
                                                {/* CORREGIDO: Añadir component="div" aquí */}
                                                <Typography variant="body2" component="div">
                                                    <strong style={{ color: theme.palette.primary.dark }}>Estado Corredor:</strong>
                                                    <Chip
                                                        label={selectedVehiculo.corredorActual.activo ? 'Activo' : 'Inactivo'}
                                                        size="small"
                                                        sx={{
                                                            ml: 1,
                                                            bgcolor: selectedVehiculo.corredorActual.activo ? theme.palette.success.light : theme.palette.error.light,
                                                            color: selectedVehiculo.corredorActual.activo ? theme.palette.success.contrastText : theme.palette.error.contrastText,
                                                            fontWeight: 'bold',
                                                        }}
                                                    />
                                                </Typography>

                                                <Divider sx={{ my: 3 }} />

                                                <Typography variant="h6" sx={{ fontWeight: 'semibold', mb: 2, display: 'flex', alignItems: 'center', color: theme.palette.primary.main }}>
                                                    Información de Seguro
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Número Póliza:</strong> {selectedVehiculo.numeroPoliza || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Aseguradora:</strong> {selectedVehiculo.aseguradora || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Vencimiento Seguro:</strong> {selectedVehiculo.fechaVencimientoSeguro ? format(new Date(selectedVehiculo.fechaVencimientoSeguro), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Tipo Cobertura:</strong> {selectedVehiculo.tipoCobertura || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2">
                                                    <strong style={{ color: theme.palette.primary.dark }}>Monto Asegurado:</strong> {selectedVehiculo.montoAsegurado ? `S/. ${parseFloat(selectedVehiculo.montoAsegurado).toFixed(2)}` : 'N/A'}
                                                </Typography>

                                                <Divider sx={{ my: 3 }} />

                                                <Typography variant="h6" sx={{ fontWeight: 'semibold', mb: 2, display: 'flex', alignItems: 'center', color: theme.palette.primary.main }}>
                                                    Información de GPS
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>ID Dispositivo:</strong> {selectedVehiculo.idDispositivoGPS || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong style={{ color: theme.palette.primary.dark }}>Proveedor GPS:</strong> {selectedVehiculo.proveedorGPS || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2">
                                                    <strong style={{ color: theme.palette.primary.dark }}>Vencimiento GPS:</strong> {selectedVehiculo.fechaVencimientoGPS ? format(new Date(selectedVehiculo.fechaVencimientoGPS), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                                No hay corredor asignado.
                                            </Typography>
                                        )}
                                    </Paper>
                                </Box>

                                <Divider sx={{ my: 3 }} />

                                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.5rem', bgcolor: 'white' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'semibold', mb: 2, display: 'flex', alignItems: 'center', color: theme.palette.primary.main }}>
                                        <CalendarMonthIcon sx={{ mr: 1 }} /> Jornadas Recientes
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                                        Aquí se listan las últimas jornadas en las que este vehículo ha sido utilizado,
                                        mostrando las fechas de inicio y fin, así como el corredor asignado.
                                    </Typography>
                                    {selectedVehiculo.jornadas && selectedVehiculo.jornadas.length > 0 ? (
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                            {selectedVehiculo.jornadas.map(jornada => (
                                                <li key={jornada.id}>
                                                    Jornada ID: {jornada.id} - Inicio: {format(new Date(jornada.fechaInicio), 'dd/MM/yyyy', { locale: es })} - Estado: {jornada.estado}
                                                    {jornada.fechaFin && ` (Fin: ${format(new Date(jornada.fechaFin), 'dd/MM/yyyy', { locale: es })})`}
                                                    {jornada.corredor && ` - Corredor: ${jornada.corredor.nombreCompleto}`}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                            No hay jornadas recientes para mostrar.
                                        </Typography>
                                    )}
                                </Paper>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 3, bgcolor: theme.palette.grey[100] }}>
                        <Button
                            onClick={openEditModal}
                            variant="contained"
                            sx={{
                                bgcolor: theme.palette.secondary.main || '#D4D4D4',
                                color: theme.palette.text.primary || '#333',
                                '&:hover': { bgcolor: theme.palette.secondary.dark || '#C0C0C0' },
                                borderRadius: '0.5rem',
                                px: 3,
                            }}
                        >
                            Editar
                        </Button>
                        <Button
                            onClick={() => handleToggleActive(selectedVehiculo)}
                            variant="contained"
                            sx={{
                                bgcolor: selectedVehiculo?.activo ? theme.palette.error.main : theme.palette.success.main,
                                color: 'white',
                                '&:hover': { bgcolor: selectedVehiculo?.activo ? theme.palette.error.dark : theme.palette.success.dark },
                                borderRadius: '0.5rem',
                                px: 3,
                            }}
                        >
                            {selectedVehiculo?.activo ? 'Desactivar Vehículo' : 'Activar Vehículo'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Create/Edit Vehiculo Modal */}
                <Dialog open={isFormModalOpen} onClose={() => closeModal('formModal')} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                            {formMode === 'create' ? 'Crear Nuevo Vehículo' : 'Editar Vehículo'}
                        </Typography>
                        <IconButton onClick={() => closeModal('formModal')} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: theme.palette.grey[50], p: 4 }}>
                        <Typography variant="body1" sx={{ mb: 3, color: theme.palette.text.secondary }}>
                            {formMode === 'create'
                                ? 'Completa los campos a continuación para registrar un nuevo vehículo en el sistema.'
                                : 'Actualiza la información del vehículo. Los cambios se guardarán permanentemente.'
                            }
                        </Typography>
                        <form onSubmit={handleSubmitForm}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                                <TextField
                                    label="Placa"
                                    name="placa"
                                    value={formData.placa}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Marca"
                                    name="marca"
                                    value={formData.marca}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Modelo"
                                    name="modelo"
                                    value={formData.modelo}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <FormControl fullWidth margin="normal" required> {/* Añadido required */}
                                    <InputLabel id="tipo-label">Tipo de Vehículo</InputLabel>
                                    <Select
                                        labelId="tipo-label"
                                        id="tipo"
                                        name="tipo"
                                        value={formData.tipo}
                                        label="Tipo de Vehículo"
                                        onChange={handleFormChange}
                                        sx={{ borderRadius: '0.5rem', bgcolor: 'white' }}
                                    >
                                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                                        <MenuItem value="Camioneta">Camioneta</MenuItem>
                                        <MenuItem value="Moto">Moto</MenuItem>
                                        <MenuItem value="Camión">Camión</MenuItem>
                                        <MenuItem value="Furgoneta">Furgoneta</MenuItem>
                                        {/* Puedes añadir más tipos según sea necesario */}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Capacidad de Carga"
                                    name="capacidadCarga"
                                    type="number"
                                    value={formData.capacidadCarga}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    required
                                    inputProps={{ step: "0.01" }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Unidad de Carga"
                                    name="unidadCarga"
                                    value={formData.unidadCarga}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="estado-label">Estado Operativo</InputLabel>
                                    <Select
                                        labelId="estado-label"
                                        id="estado"
                                        name="estado"
                                        value={formData.estado}
                                        label="Estado Operativo"
                                        onChange={handleFormChange}
                                        sx={{ borderRadius: '0.5rem', bgcolor: 'white' }}
                                    >
                                        {estadoOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Año de Fabricación"
                                    name="anioFabricacion"
                                    type="number"
                                    value={formData.anioFabricacion}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Kilometraje Actual (km)"
                                    name="kilometrajeActual"
                                    type="number"
                                    value={formData.kilometrajeActual}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    inputProps={{ step: "0.01" }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Notas Internas"
                                    name="notas"
                                    value={formData.notas}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    multiline
                                    rows={2}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                            </Box>

                            <Divider sx={{ my: 3 }}>Asignación de Corredor</Divider>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="corredor-actual-label">Corredor Asignado</InputLabel>
                                <Select
                                    labelId="corredor-actual-label"
                                    id="corredorActual"
                                    name="corredorActual"
                                    value={formData.corredorActual}
                                    label="Corredor Asignado"
                                    onChange={handleFormChange}
                                    sx={{ borderRadius: '0.5rem', bgcolor: 'white' }}
                                >
                                    <MenuItem value=""><em>Ninguno</em></MenuItem>
                                    {corredores.map((corredor) => (
                                        <MenuItem key={corredor.id} value={corredor.id}>
                                            {corredor.nombreCompleto}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Divider sx={{ my: 3 }}>Información de Seguro</Divider>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                                <TextField
                                    label="Número de Póliza"
                                    name="numeroPoliza"
                                    value={formData.numeroPoliza}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Aseguradora"
                                    name="aseguradora"
                                    value={formData.aseguradora}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Fecha Vencimiento Seguro"
                                    name="fechaVencimientoSeguro"
                                    type="date"
                                    value={formData.fechaVencimientoSeguro}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Tipo de Cobertura"
                                    name="tipoCobertura"
                                    value={formData.tipoCobertura}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Monto Asegurado (S/.)"
                                    name="montoAsegurado"
                                    type="number"
                                    value={formData.montoAsegurado}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    inputProps={{ step: "0.01" }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                            </Box>

                            <Divider sx={{ my: 3 }}>Información de GPS</Divider>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                                <TextField
                                    label="ID Dispositivo GPS"
                                    name="idDispositivoGPS"
                                    value={formData.idDispositivoGPS}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Proveedor GPS"
                                    name="proveedorGPS"
                                    value={formData.proveedorGPS}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                                <TextField
                                    label="Fecha Vencimiento GPS"
                                    name="fechaVencimientoGPS"
                                    type="date"
                                    value={formData.fechaVencimientoGPS}
                                    onChange={handleFormChange}
                                    fullWidth
                                    margin="normal"
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', bgcolor: 'white' } }}
                                />
                            </Box>

                            {formMode === 'edit' && (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="activo-label">Estado de Actividad</InputLabel>
                                    <Select
                                        labelId="activo-label"
                                        id="activo"
                                        name="activo"
                                        value={formData.activo}
                                        label="Estado de Actividad"
                                        onChange={handleFormChange}
                                        sx={{ borderRadius: '0.5rem', bgcolor: 'white' }}
                                    >
                                        <MenuItem value={true}>Activo</MenuItem>
                                        <MenuItem value={false}>Inactivo</MenuItem>
                                    </Select>
                                </FormControl>
                            )}

                            <DialogActions sx={{ p: 0, pt: 3, justifyContent: 'flex-end' }}>
                                <Button
                                    onClick={() => closeModal('formModal')}
                                    variant="outlined"
                                    sx={{
                                        color: theme.palette.text.primary,
                                        borderColor: theme.palette.grey[400],
                                        '&:hover': { borderColor: theme.palette.grey[600] },
                                        borderRadius: '0.5rem',
                                        px: 3,
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    sx={{
                                        bgcolor: theme.palette.primary.main,
                                        color: 'white',
                                        '&:hover': { bgcolor: theme.palette.primary.dark },
                                        borderRadius: '0.5rem',
                                        px: 3,
                                    }}
                                >
                                    {formMode === 'create' ? 'Crear' : 'Guardar Cambios'}
                                </Button>
                            </DialogActions>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Confirm Dialog */}
                <Dialog open={isConfirmModalOpen} onClose={() => closeModal('confirmModal')} maxWidth="sm">
                    <DialogTitle sx={{ bgcolor: theme.palette.warning.main, color: 'white' }}>
                        {confirmTitle}
                    </DialogTitle>
                    <DialogContent sx={{ p: 3, bgcolor: theme.palette.grey[50] }}>
                        <DialogContentText>
                            {confirmMessage}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, bgcolor: theme.palette.grey[100] }}>
                        <Button
                            onClick={() => closeModal('confirmModal')}
                            variant="outlined"
                            sx={{
                                color: theme.palette.text.primary,
                                borderColor: theme.palette.grey[400],
                                '&:hover': { borderColor: theme.palette.grey[600] },
                                borderRadius: '0.5rem',
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmAction}
                            variant="contained"
                            color="warning"
                            sx={{
                                bgcolor: theme.palette.warning.dark,
                                color: 'white',
                                '&:hover': { bgcolor: theme.palette.warning.main },
                                borderRadius: '0.5rem',
                            }}
                        >
                            Confirmar
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};

export default VehiculosPage;
