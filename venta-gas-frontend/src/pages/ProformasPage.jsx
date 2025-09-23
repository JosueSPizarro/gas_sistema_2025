import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Typography, Button, Box, Paper, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, CircularProgress, Alert, Slide, MenuItem as MuiMenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  Select, FormControl, InputLabel,
  Badge,
  Grid
} from '@mui/material';
import {
  AddShoppingCart as AddShoppingCartIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Payment as PaymentIcon,
  Inventory2Outlined as OutOfStockIcon,
  Inventory as InStockIcon,
  Description as ProformaIcon,
  CheckCircle as ConfirmSaleIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

import Layout from '../components/Layout';
import api from '../services/api';

const ProformasPage = () => {
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [productoSeleccionadoParaAgregar, setProductoSeleccionadoParaAgregar] = useState(null);

  const [itemsProforma, setItemsProforma] = useState([]);
  const [cliente, setCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ show: false, type: '', message: '' });
  const [openProformaSuccessDialog, setOpenProformaSuccessDialog] = useState(false);
  const [currentProformaId, setCurrentProformaId] = useState(null);

  const [totalProforma, setTotalProforma] = useState(0);
  const [formaPago, setFormaPago] = useState('Efectivo');
  const formasDePagoOpciones = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia Bancaria' },
    { value: 'Yape/Plin', label: 'Yape/Plin' },
    { value: 'Otro', label: 'Otro' },
  ];

  const grInputRefs = useRef({});

  // Estados para ver y listar proformas
  const [proformasExistentes, setProformasExistentes] = useState([]);
  const [openViewProformaDialog, setOpenViewProformaDialog] = useState(false);
  const [selectedProformaDetails, setSelectedProformaDetails] = useState(null);
  const [loadingProformas, setLoadingProformas] = useState(false);

  // --- Cargar productos y proformas al inicio ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productosRes, proformasRes] = await Promise.all([
          api.get('/productos'),
          api.get('/proformas')
        ]);
        setProductosDisponibles(productosRes.data);
        setProformasExistentes(proformasRes.data);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setFeedbackMessage({ show: true, type: 'error', message: 'Error al cargar productos o proformas.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Filtrar productos por término de búsqueda ---
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = productosDisponibles.filter(prod =>
        prod.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setProductosFiltrados(filtered);
    } else {
      setProductosFiltrados([]);
    }
  }, [searchTerm, productosDisponibles]);

  // --- Calcular total de la proforma ---
  useEffect(() => {
    let currentTotal = 0;
    itemsProforma.forEach(item => {
      currentTotal += item.cantidad * item.precioVenta;
    });
    setTotalProforma(currentTotal);
  }, [itemsProforma]);

  // --- Helpers ---
  const handleProductoSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setProductoSeleccionadoParaAgregar(null);
  };

  const handleSelectProductToAdd = (producto) => {
    setProductoSeleccionadoParaAgregar(producto);
    setSearchTerm(producto.nombre);
    setProductosFiltrados([]);
  };

  // Esta función es crucial para convertir KG y GR a un único valor decimal
  const getCombinedKgQuantity = useCallback((kilos, gramos) => {
    const totalGrams = (parseFloat(kilos || 0) * 1000) + parseFloat(gramos || 0);
    return totalGrams / 1000;
  }, []);

  // Función para descomponer una cantidad decimal en KG y GR
  const decomposeQuantity = useCallback((cantidadDecimal) => {
    const kg = Math.floor(cantidadDecimal);
    const gr = Math.round((cantidadDecimal - kg) * 1000);
    return { kg, gr };
  }, []);

  // --- Agregar Ítem a la Proforma (Actualizado para inicializar KG/GR) ---
  const handleAddItem = () => {
    if (!productoSeleccionadoParaAgregar) {
      setFeedbackMessage({ show: true, type: 'info', message: 'Selecciona un producto primero.' });
      return;
    }

    const existingItemIndex = itemsProforma.findIndex(item => item.id === productoSeleccionadoParaAgregar.id);

    if (existingItemIndex > -1) {
      setFeedbackMessage({ show: true, type: 'info', message: `"${productoSeleccionadoParaAgregar.nombre}" ya está en la lista. Edita su cantidad directamente.` });
    } else {
      const initialQuantity = productoSeleccionadoParaAgregar.unidadMedida === 'UND' ? 1 : 0;
      const { kg, gr } = decomposeQuantity(initialQuantity); // Descomponer para los inputs

      setItemsProforma(prevItems => [
        ...prevItems,
        {
          id: productoSeleccionadoParaAgregar.id,
          nombre: productoSeleccionadoParaAgregar.nombre,
          codigo: productoSeleccionadoParaAgregar.codigo,
          precioVenta: productoSeleccionadoParaAgregar.precioVenta,
          stockDisponible: productoSeleccionadoParaAgregar.stock,
          unidadMedida: productoSeleccionadoParaAgregar.unidadMedida || 'UND',
          cantidad: initialQuantity, // Cantidad total decimal
          kgInput: String(kg), // Parte para el input de KG/UND
          grInput: String(gr).padStart(3, '0'), // Parte para el input de GR
          grInputTouched: false, // Control para el formato de gramos
        }
      ]);
      setFeedbackMessage({ show: true, type: 'success', message: `"${productoSeleccionadoParaAgregar.nombre}" añadido a la proforma.` });
    }
    setProductoSeleccionadoParaAgregar(null);
    setSearchTerm('');
  };

  // --- Manejo de Cantidades KG/UND ---
  const handleKgInputChange = (id, value) => {
    setItemsProforma(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          let newKg = parseInt(value, 10);
          if (isNaN(newKg) || newKg < 0) {
            newKg = 0;
          }
          // Para unidades, el kgInput es la cantidad total
          if (item.unidadMedida === 'UND') {
            const newQuantity = Math.max(1, newKg); // Cantidad mínima 1 para unidades
            return { ...item, cantidad: newQuantity, kgInput: String(newQuantity) };
          } else { // Para KG
            const newCombinedQuantity = getCombinedKgQuantity(newKg, item.grInput);
            return { ...item, kgInput: String(newKg), cantidad: newCombinedQuantity };
          }
        }
        return item;
      })
    );
  };

  const handleGrInputChange = (id, value) => {
    setItemsProforma(prevItems =>
      prevItems.map(item => {
        if (item.id === id && item.unidadMedida === 'KG') {
          let newGr = parseInt(value, 10);
          if (isNaN(newGr) || newGr < 0) {
            newGr = 0;
          }
          newGr = Math.min(newGr, 999); // Limitar a 3 dígitos (0-999)
          const newCombinedQuantity = getCombinedKgQuantity(item.kgInput, newGr);
          return { ...item, grInput: String(newGr), cantidad: newCombinedQuantity, grInputTouched: true };
        }
        return item;
      })
    );
  };

  const handleDeleteItem = (id) => {
    setItemsProforma(prevItems => prevItems.filter(item => item.id !== id));
  };

  // --- Función para limpiar todo y resetear la proforma ---
  const handleClearProforma = () => {
    setItemsProforma([]);
    setCliente('');
    setFormaPago('Efectivo');
    setProductoSeleccionadoParaAgregar(null);
    setSearchTerm('');
    setFeedbackMessage({ show: false, type: '', message: '' });
    setCurrentProformaId(null);
    setSelectedProformaDetails(null); // Limpiar detalles de proforma cargada
  };

  // --- Función Principal: Generar Proforma ---
  const handleGenerateProforma = async () => {
    setLoading(true);
    setFeedbackMessage({ show: false, type: '', message: '' });

    if (itemsProforma.length === 0) {
      setFeedbackMessage({ show: true, type: 'warning', message: 'Agrega al menos un producto para generar la proforma.' });
      setLoading(false);
      return;
    }

    for (const item of itemsProforma) {
      if (item.cantidad <= 0 && item.unidadMedida === 'KG') { // KG puede ser 0 si solo hay gramos
          // Si es KG y la cantidad combinada es 0, podría ser un error.
          // O si es KG y solo se ingresó "0 KG 0 GR", podría no ser deseable.
          // Validamos que al menos haya KG o GR para productos por peso.
          if (parseFloat(item.kgInput || 0) === 0 && parseFloat(item.grInput || 0) === 0) {
            setFeedbackMessage({ show: true, type: 'error', message: `La cantidad de ${item.nombre} debe ser mayor a 0.` });
            setLoading(false);
            return;
          }
      } else if (item.cantidad < 1 && item.unidadMedida === 'UND') { // Unidades deben ser al menos 1
        setFeedbackMessage({ show: true, type: 'error', message: `La cantidad de ${item.nombre} debe ser al menos 1.` });
        setLoading(false);
        return;
      }
      
      // Validar stock antes de generar proforma
      const productoOriginal = productosDisponibles.find(p => p.id === item.id);
      if (productoOriginal && item.cantidad > productoOriginal.stock) {
        setFeedbackMessage({
          show: true,
          type: 'error',
          message: `Stock insuficiente para "${item.nombre}". Disponible: ${productoOriginal.stock} ${item.unidadMedida}.`
        });
        setLoading(false);
        return;
      }
    }

    const payload = {
      cliente: cliente.trim() || 'Consumidor Final',
      items: itemsProforma.map(item => ({
        producto: {
          id: item.id,
          nombre: item.nombre,
          unidadMedida: item.unidadMedida,
        },
        cantidad: item.cantidad, // Ya es el valor decimal combinado (ej. 2.5)
        precioUnitario: item.precioVenta,
        subtotal: parseFloat((item.cantidad * item.precioVenta).toFixed(2)),
      })),
      total: parseFloat(totalProforma.toFixed(2)),
      fecha: new Date().toISOString(),
      formaPago: formaPago,
    };

    try {
      const response = await api.post('/proformas', payload);
      setCurrentProformaId(response.data.id);
      setFeedbackMessage({ show: true, type: 'success', message: '¡Proforma generada exitosamente!' });
      setOpenProformaSuccessDialog(true);
      handleClearProforma();
      // Vuelve a cargar las proformas existentes para actualizar la lista
      const { data } = await api.get('/proformas');
      setProformasExistentes(data);
    } catch (error) {
      console.error('Error al generar proforma:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 'Error al generar la proforma. Inténtalo de nuevo.';
      setFeedbackMessage({ show: true, type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // --- Convertir Proforma a Venta ---
  const handleConvertProformaToSale = useCallback(async () => {
    if (!selectedProformaDetails || !selectedProformaDetails.id) {
      setFeedbackMessage({ show: true, type: 'error', message: 'No hay proforma seleccionada para convertir.' });
      return;
    }

    setLoading(true);
    setFeedbackMessage({ show: false, type: '', message: '' });

    // Validar stock antes de convertir (importante!)
    for (const item of selectedProformaDetails.items) {
      const productoOriginal = productosDisponibles.find(p => p.id === item.producto.id);
      if (!productoOriginal || item.cantidad > productoOriginal.stock) {
        setFeedbackMessage({
          show: true,
          type: 'error',
          message: `Stock insuficiente para "${item.producto.nombre}". Disponible: ${productoOriginal?.stock || 0} ${item.producto.unidadMedida}. Ajusta la proforma o el inventario.`
        });
        setLoading(false);
        return;
      }
    }

    const salePayload = {
      cliente: selectedProformaDetails.cliente,
      items: selectedProformaDetails.items.map(item => ({
        producto: {
          id: item.producto.id,
          // No es necesario enviar nombre y unidadMedida aquí si el backend los busca por ID
          // Si tu backend los requiere para algún log o validación extra, déjalos.
        },
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      total: selectedProformaDetails.total,
      fecha: new Date().toISOString(),
      formaPago: selectedProformaDetails.formaPago,
      proformaId: selectedProformaDetails.id,
    };

    try {
      await api.post('/ventas', salePayload);
      await api.delete(`/proformas/${selectedProformaDetails.id}`); // Eliminar la proforma después de convertirla

      setFeedbackMessage({ show: true, type: 'success', message: `¡Proforma ${selectedProformaDetails.id} convertida a venta exitosamente y eliminada!` });
      setOpenViewProformaDialog(false);
      setSelectedProformaDetails(null);
      handleClearProforma();

      // Refrescar listas
      const [productosRes, proformasRes] = await Promise.all([
        api.get('/productos'),
        api.get('/proformas')
      ]);
      setProductosDisponibles(productosRes.data);
      setProformasExistentes(proformasRes.data);

    } catch (error) {
      console.error('Error al convertir proforma a venta:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 'Error al convertir la proforma a venta. Inténtalo de nuevo.';
      setFeedbackMessage({ show: true, type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [selectedProformaDetails, productosDisponibles]);


  // --- Cargar detalles de una proforma para ver/convertir (Actualizado para KG/GR) ---
  const handleViewProforma = async (proformaId) => {
    setLoadingProformas(true);
    try {
      const { data } = await api.get(`/proformas/${proformaId}`);
      // Descomponer la cantidad para mostrarla correctamente en el diálogo
      const itemsWithDecomposedQuantities = data.items.map(item => {
        const { kg, gr } = decomposeQuantity(item.cantidad);
        return {
          ...item,
          kgInput: String(kg),
          grInput: String(gr).padStart(3, '0'),
          grInputTouched: false, // Asumimos que no está "tocado" al cargar
        };
      });
      setSelectedProformaDetails({ ...data, items: itemsWithDecomposedQuantities });
      setOpenViewProformaDialog(true);
    } catch (error) {
      console.error('Error al cargar detalles de la proforma:', error);
      setFeedbackMessage({ show: true, type: 'error', message: 'Error al cargar los detalles de la proforma.' });
    } finally {
      setLoadingProformas(false);
    }
  };

  const handleCloseProformaSuccessDialog = () => {
    setOpenProformaSuccessDialog(false);
    setCurrentProformaId(null);
  };

  const handleCloseViewProformaDialog = () => {
    setOpenViewProformaDialog(false);
    setSelectedProformaDetails(null);
  };

  const handleKgInputKeyPress = (e, itemId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      grInputRefs.current[itemId]?.focus();
    }
  };

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main">
          Gestión de Proformas
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<ClearIcon />}
          onClick={handleClearProforma}
          disabled={loading || itemsProforma.length === 0}
          sx={{ minWidth: 150, mt: { xs: 2, sm: 0 } }}
        >
          Limpiar Proforma Actual
        </Button>
      </Box>

      {/* Mensajes de Feedback */}
      {feedbackMessage.show && (
        <Slide direction="down" in={feedbackMessage.show} mountOnEnter unmountOnExit>
          <Alert
            severity={feedbackMessage.type}
            icon={feedbackMessage.type === 'success' ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
            onClose={() => setFeedbackMessage({ show: false, type: '', message: '' })}
            sx={{ mb: 2 }}
          >
            {feedbackMessage.message}
          </Alert>
        </Slide>
      )}

      {/* Sección para Generar Nueva Proforma */}
      <Paper elevation={4} sx={{ p: 3, borderRadius: '12px', mb: 3 }}>
        <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
          Generar Nueva Proforma
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
          <TextField
            label="Nombre del Cliente (Opcional)"
            fullWidth
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            margin="none"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />

          <FormControl fullWidth margin="none" variant="outlined" sx={{ flex: 0.5 }}>
            <InputLabel id="forma-pago-label">Forma de Pago</InputLabel>
            <Select
              labelId="forma-pago-label"
              id="forma-pago-select"
              value={formaPago}
              label="Forma de Pago"
              onChange={(e) => setFormaPago(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <PaymentIcon color="action" />
                </InputAdornment>
              }
            >
              {formasDePagoOpciones.map((option) => (
                <MuiMenuItem key={option.value} value={option.value}>
                  {option.label}
                </MuiMenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box display="flex" alignItems="flex-end" gap={2} mb={3} flexDirection={{ xs: 'column', sm: 'row' }}>
          <TextField
            label="Buscar Producto por Nombre o Código"
            fullWidth
            value={searchTerm}
            onChange={handleProductoSearchChange}
            variant="outlined"
            margin="none"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<AddShoppingCartIcon />}
            onClick={handleAddItem}
            disabled={loading || !productoSeleccionadoParaAgregar}
            size="large"
            sx={{ minWidth: 150, height: 56 }}
          >
            Añadir Producto
          </Button>
        </Box>

        {searchTerm.length > 0 && productosFiltrados.length > 0 && (
          <Paper elevation={2} sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
            {productosFiltrados.map((prod) => (
              <MuiMenuItem
                key={prod.id}
                onClick={() => handleSelectProductToAdd(prod)}
                sx={{
                  py: 1.5,
                  '&:hover': { backgroundColor: '#e3f2fd' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" fontWeight="bold">{prod.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary">Código: {prod.codigo} | Precio: S/ {Number(prod.precioVenta).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {prod.stock <= 0 ? (
                      <Tooltip title="Producto Sin Stock">
                        <Badge color="error" overlap="circular" badgeContent="0" sx={{ '& .MuiBadge-badge': { right: -5, top: 5, border: '2px solid white' } }}>
                          <OutOfStockIcon color="error" sx={{ mr: 0.5 }} />
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Tooltip title={`Stock Disponible: ${prod.stock} ${prod.unidadMedida}`}>
                        <InStockIcon color="success" sx={{ mr: 0.5 }} />
                      </Tooltip>
                    )}
                    <Typography variant="body2" fontWeight="bold" color={prod.stock <= 0 ? 'error' : 'text.primary'}>
                      {prod.stock <= 0 ? 'Sin Stock' : `${prod.stock} ${prod.unidadMedida}`}
                    </Typography>
                  </Box>
                </Box>
              </MuiMenuItem>
            ))}
          </Paper>
        )}
        {searchTerm.length > 0 && productosFiltrados.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No se encontraron productos con "{searchTerm}".
          </Typography>
        )}
        {searchTerm.length === 0 && productoSeleccionadoParaAgregar && (
          <Typography variant="body2" color="primary.main" sx={{ mb: 2 }}>
            Producto seleccionado: <Typography component="span" fontWeight="bold">{productoSeleccionadoParaAgregar.nombre}</Typography>
          </Typography>
        )}

        <TableContainer component={Paper} elevation={2} sx={{ mt: 3, borderRadius: '8px', overflow: 'hidden' }}>
          <Table aria-label="items de proforma">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                <TableCell>Producto</TableCell>
                <TableCell align="center">Cantidad</TableCell>
                <TableCell align="right">Precio Unit.</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {itemsProforma.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                    Aún no hay productos en esta proforma.
                  </TableCell>
                </TableRow>
              ) : (
                itemsProforma.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body1">{item.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.codigo}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                        <Box display="flex" alignItems="center" justifyContent="center">
                          {item.unidadMedida === 'KG' ? (
                            <Box display="flex" alignItems="center" gap={0.5} mx={1}>
                              <TextField
                                value={item.kgInput}
                                onChange={(e) => handleKgInputChange(item.id, e.target.value)}
                                onKeyPress={(e) => handleKgInputKeyPress(e, item.id)}
                                type="text"
                                inputProps={{ min: 0, step: 1 }}
                                sx={{ width: 60 }}
                                size="small"
                                disabled={loading}
                              />
                              <Typography variant="body2">KG</Typography>
                              <TextField
                                value={item.grInputTouched ? item.grInput : String(item.grInput).padStart(3, '0')}
                                onChange={(e) => handleGrInputChange(item.id, e.target.value)}
                                type="text"
                                inputProps={{ min: 0, max: 999, step: 1 }}
                                sx={{ width: 60 }}
                                size="small"
                                disabled={loading}
                                ref={el => grInputRefs.current[item.id] = el}
                              />
                              <Typography variant="body2">GR</Typography>
                            </Box>
                          ) : (
                            <TextField
                              value={item.kgInput} // Para UND, kgInput es la cantidad completa
                              onChange={(e) => handleKgInputChange(item.id, e.target.value)}
                              type="number"
                              inputProps={{ min: 1, step: 1 }}
                              sx={{ width: 80, mx: 1 }}
                              size="small"
                              disabled={loading}
                            />
                          )}
                        </Box>
                        <Typography variant="body1" color={item.stockDisponible <= 0 ? 'error' : 'text.secondary'} sx={{ mt: 1 }}>
                          Stock: {item.stockDisponible <= 0 ? 'Sin Stock' : `${item.stockDisponible} ${item.unidadMedida}`}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">S/ {Number(item.precioVenta).toFixed(2)}</TableCell>
                    <TableCell align="right">S/ {Number(item.cantidad * item.precioVenta).toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Eliminar ítem">
                        <IconButton color="error" onClick={() => handleDeleteItem(item.id)} disabled={loading}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 2 }}>
          <Typography variant="h5" color="primary" sx={{ mt: 1 }}>
            Total: <Typography component="span" fontWeight="bold">S/ {Number(totalProforma).toFixed(2)}</Typography>
          </Typography>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ProformaIcon />}
            onClick={handleGenerateProforma}
            disabled={loading || itemsProforma.length === 0}
            sx={{ minWidth: 200, py: 1.5 }}
          >
            {loading ? 'Generando...' : 'Generar Proforma'}
          </Button>
        </Box>
      </Paper>

      {/* Separador */}
      <Box sx={{ my: 4, borderBottom: '1px solid #ddd' }} />

      {/* Sección para Ver Proformas Existentes */}
      <Paper elevation={4} sx={{ p: 3, borderRadius: '12px', mb: 3 }}>
        <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
          Proformas Existentes
        </Typography>

        {loadingProformas ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : proformasExistentes.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No hay proformas registradas aún.
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={2} sx={{ mt: 2, borderRadius: '8px', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                  <TableCell>ID Proforma</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proformasExistentes.map((proforma) => (
                  <TableRow key={proforma.id}>
                    <TableCell>{proforma.id}</TableCell>
                    <TableCell>{proforma.cliente}</TableCell>
                    <TableCell>{new Date(proforma.fecha).toLocaleDateString()}</TableCell>
                    <TableCell align="right">S/ {Number(proforma.total).toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver Detalles">
                        <IconButton color="info" onClick={() => handleViewProforma(proforma.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {/* Aquí podrías añadir un botón para Eliminar o Editar la proforma si el backend lo permite */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Diálogo de éxito de Proforma Generada */}
      <Dialog
        open={openProformaSuccessDialog}
        onClose={handleCloseProformaSuccessDialog}
        aria-labelledby="proforma-success-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="proforma-success-dialog-title" sx={{ backgroundColor: '#2196F3', color: 'white' }}>
          <Box display="flex" alignItems="center">
            <ProformaIcon sx={{ mr: 1 }} /> Proforma Generada
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, textAlign: 'center' }}>
          <Typography variant="h6" color="text.primary">¡La proforma se ha generado exitosamente!</Typography>
          {currentProformaId && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Número de Proforma: <Typography component="span" fontWeight="bold">{currentProformaId}</Typography>
            </Typography>
          )}
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Ahora puedes verla en la lista de proformas existentes o generar una nueva.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleCloseProformaSuccessDialog} variant="contained" color="primary">
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para ver Detalles de Proforma Existente y Convertir a Venta */}
      <Dialog
        open={openViewProformaDialog}
        onClose={handleCloseViewProformaDialog}
        aria-labelledby="view-proforma-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="view-proforma-dialog-title" sx={{ backgroundColor: '#1976D2', color: 'white' }}>
          <Box display="flex" alignItems="center">
            <ProformaIcon sx={{ mr: 1 }} /> Detalles de Proforma: {selectedProformaDetails?.id}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2, pb: 1 }}>
          {selectedProformaDetails ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1"><strong>Cliente:</strong> {selectedProformaDetails.cliente}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1"><strong>Fecha:</strong> {new Date(selectedProformaDetails.fecha).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1"><strong>Forma de Pago:</strong> {selectedProformaDetails.formaPago}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1"><strong>Total:</strong> S/ {Number(selectedProformaDetails.total).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Productos:</Typography>
                <TableContainer component={Paper} elevation={1}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Producto</TableCell>
                        <TableCell align="center">Cant.</TableCell>
                        <TableCell align="right">P. Unit.</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedProformaDetails.items.map((item, index) => {
                        const { kg, gr } = decomposeQuantity(item.cantidad);
                        return (
                          <TableRow key={index}>
                            <TableCell>{item.producto.nombre}</TableCell>
                            <TableCell align="center">
                                {item.producto.unidadMedida === 'KG'
                                    ? `${kg} KG ${String(gr).padStart(3, '0')} GR`
                                    : `${item.cantidad} ${item.producto.unidadMedida}`
                                }
                            </TableCell>
                            <TableCell align="right">S/ {Number(item.precioUnitario).toFixed(2)}</TableCell>
                            <TableCell align="right">S/ {Number(item.subtotal).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={100}>
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>Cargando detalles...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={handleConvertProformaToSale}
            variant="contained"
            color="success"
            startIcon={<ConfirmSaleIcon />}
            disabled={loading}
            sx={{ minWidth: 180 }}
          >
            {loading ? 'Convirtiendo...' : 'Convertir a Venta'}
          </Button>
          <Button onClick={handleCloseViewProformaDialog} variant="outlined" color="secondary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ProformasPage;