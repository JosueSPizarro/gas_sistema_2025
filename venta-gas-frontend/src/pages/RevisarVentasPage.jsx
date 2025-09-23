import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Typography, Box, Paper, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, CircularProgress, Alert, Slide,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tooltip, Pagination, Chip, Avatar, Grid, Divider, useTheme, Card, CardContent
} from '@mui/material';
import {
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  EventNote as EventNoteIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  ErrorOutline as ErrorOutlineIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterAlt as FilterAltIcon,
  Clear as ClearIcon,
  Paid as PaidIcon,
  LocalOffer as LocalOfferIcon,
  ShoppingCart as ShoppingCartIcon,
  Discount as DiscountIcon // Importa el icono de descuento
} from '@mui/icons-material';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import Layout from '../components/Layout';
import api from '../services/api';

const RevisarVentasPage = () => {
  const theme = useTheme();

  // Estados del componente
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ show: false, type: '', message: '' });

  // Estados para filtros
  const [searchTermTicket, setSearchTermTicket] = useState('');
  const [searchTermCliente, setSearchTermCliente] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados para diálogo de detalles
  const [openDetalleDialog, setOpenDetalleDialog] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // Estados para paginación
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  // Estados para ordenación
  const [sortBy, setSortBy] = useState('fechaVenta');
  const [sortOrder, setSortOrder] = useState('desc');

  // Ref para controlar la carga inicial y evitar doble fetch al montar
  const isInitialMount = useRef(true);

  // Obtener ventas del backend
  const fetchVentas = useCallback(async (
    currentPage = page,
    currentLimit = limit,
    currentSortBy = sortBy,
    currentSortOrder = sortOrder,
    // Pasar los términos de búsqueda y fechas directamente para la consistencia
    currentSearchTermTicket = searchTermTicket,
    currentSearchTermCliente = searchTermCliente,
    currentStartDate = startDate,
    currentEndDate = endDate
  ) => {
    setLoading(true);
    setFeedbackMessage({ show: false, type: '', message: '' });

    try {
      const response = await api.get('/ventas', {
        params: {
          page: currentPage,
          limit: currentLimit,
          sortBy: currentSortBy,
          sortOrder: currentSortOrder,
          ticket: currentSearchTermTicket,
          cliente: currentSearchTermCliente,
          startDate: currentStartDate,
          endDate: currentEndDate,
        }
      });
      const data = response.data; // Obtener los datos de la respuesta

      // Asegurarse de que data.ventas sea un array, si no, usar un array vacío
      const fetchedVentas = Array.isArray(data?.ventas) ? data.ventas : [];
      const fetchedTotalPages = data?.totalPages || 0;
      const fetchedTotalResults = data?.totalResults || 0;
      const fetchedCurrentPage = data?.currentPage || 1;

      setVentas(fetchedVentas);
      setTotalPages(fetchedTotalPages);
      setTotalResults(fetchedTotalResults);
      setPage(fetchedCurrentPage);

      if (fetchedVentas.length === 0 && (currentSearchTermTicket || currentSearchTermCliente || currentStartDate || currentEndDate)) {
        setFeedbackMessage({ show: true, type: 'info', message: 'No se encontraron ventas con los filtros actuales.' });
      } else if (fetchedVentas.length === 0 && (!currentSearchTermTicket && !currentSearchTermCliente && !currentStartDate && !currentEndDate)) {
          setFeedbackMessage({ show: true, type: 'info', message: 'No hay ventas registradas en el sistema.' });
      }

    } catch (error) {
      console.error('Error al cargar ventas:', error);
      setVentas([]);
      setTotalPages(0); // Resetear paginación en caso de error
      setTotalResults(0); // Resetear paginación en caso de error
      setPage(1); // Resetear paginación en caso de error
      setFeedbackMessage({
        show: true,
        type: 'error',
        message: error.response?.data?.message || 'Error al cargar las ventas.'
      });
    } finally {
      setLoading(false);
    }
  }, [limit, sortBy, sortOrder, searchTermTicket, searchTermCliente, startDate, endDate]); // Incluir todas las dependencias

  // Efecto principal para disparar la carga de ventas
  useEffect(() => {
    // Evitar el fetch inicial doble si ya se cargó en el primer render
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    const handler = setTimeout(() => {
      fetchVentas(page); // Usa la página actual, el resto se toma de los estados
    }, 300); // Debounce para todas las dependencias

    return () => clearTimeout(handler);
  }, [page, limit, sortBy, sortOrder, searchTermTicket, searchTermCliente, startDate, endDate, fetchVentas]);


  // Handlers para cambios en los filtros de texto y fecha que deben resetear la paginación
  const handleSearchTermChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1); // Reinicia la página a 1 cada vez que cambia un término de búsqueda
  };

  const handleDateChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1); // Reinicia la página a 1 cada vez que cambia una fecha
  };

  const handleClearFilters = () => {
    setSearchTermTicket('');
    setSearchTermCliente('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSortBy('fechaVenta');
    setSortOrder('desc');
    // El useEffect principal se encargará de volver a cargar las ventas con los filtros vacíos.
  };

  const handleOpenDetalleDialog = (venta) => {
    setVentaSeleccionada(venta);
    setOpenDetalleDialog(true);
  };

  const handleCloseDetalleDialog = () => {
    setOpenDetalleDialog(false);
    setVentaSeleccionada(null);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
    }
    return null;
  };

  const calculateSubtotalProductos = (detalles) => {
    return detalles.reduce((sum, item) => sum + (Number(item.cantidad) * Number(item.precio)), 0);
  };

  const getPaymentColor = (paymentMethod) => {
    switch (paymentMethod) {
      case 'EFECTIVO': return 'success';
      case 'TARJETA': return 'primary';
      case 'TRANSFERENCIA': return 'secondary';
      case 'YAPE/PLIN': return 'info';
      default: return 'default';
    }
  };

  return (
    <Layout>
      {/* Encabezado */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ flexWrap: 'wrap', gap: 2 }}>
        <Box display="flex" alignItems="center">
          <Avatar sx={{
            bgcolor: theme.palette.success.main,
            mr: 2,
            width: 56,
            height: 56
          }}>
            <ReceiptIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
              Historial de Ventas
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Revisión y seguimiento de transacciones
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          color="error"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          disabled={loading}
          sx={{
            borderRadius: '10px',
            px: 3,
            py: 1.5,
          }}
        >
          Limpiar Filtros
        </Button>
      </Box>

      {/* Mensajes de Feedback */}
      {feedbackMessage.show && (
        <Slide direction="down" in={feedbackMessage.show} mountOnEnter unmountOnExit>
          <Alert
            severity={feedbackMessage.type}
            icon={feedbackMessage.type === 'error' ? <ErrorOutlineIcon /> : null}
            onClose={() => setFeedbackMessage({ show: false, type: '', message: '' })}
            sx={{
              mb: 2,
              borderRadius: '8px',
              boxShadow: theme.shadows[1]
            }}
          >
            {feedbackMessage.message}
          </Alert>
        </Slide>
      )}

      {/* Tarjeta de Filtros */}
      <Card elevation={4} sx={{ mb: 3, borderRadius: '12px' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            color: 'text.primary'
          }}>
            <FilterAltIcon color="primary" sx={{ mr: 1 }} />
            Filtros de Búsqueda
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Nº de Ticket"
                fullWidth
                value={searchTermTicket}
                onChange={handleSearchTermChange(setSearchTermTicket)} // Usar el nuevo handler
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalOfferIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Cliente"
                fullWidth
                value={searchTermCliente}
                onChange={handleSearchTermChange(setSearchTermCliente)} // Usar el nuevo handler
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Fecha Inicio"
                type="date"
                fullWidth
                value={startDate}
                onChange={handleDateChange(setStartDate)} // Usar el nuevo handler
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventNoteIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Fecha Fin"
                type="date"
                fullWidth
                value={endDate}
                onChange={handleDateChange(setEndDate)} // Usar el nuevo handler
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventNoteIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end">
            {/* El botón de búsqueda explícita ya no es estrictamente necesario si el debounce es suficiente,
                pero se mantiene por si el usuario prefiere un clic para buscar */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<SearchIcon />}
              onClick={() => setPage(1)} // Al hacer clic en buscar, solo resetea la página para que el useEffect se dispare
              disabled={loading}
              sx={{
                borderRadius: '8px',
                px: 3,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none'
                }
              }}
            >
              Buscar Ventas
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tarjeta de Resultados */}
      <Card elevation={4} sx={{ borderRadius: '12px' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary'
            }}>
              <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
              Resultados ({totalResults} ventas)
            </Typography>

            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              disabled={loading}
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Box>

          <TableContainer sx={{
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
            maxHeight: 'calc(100vh - 400px)',
            minHeight: 200
          }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    onClick={() => handleSort('ticketNumber')}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      Ticket {getSortIcon('ticketNumber')}
                    </Box>
                  </TableCell>
                  <TableCell
                    onClick={() => handleSort('cliente')}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      Cliente {getSortIcon('cliente')}
                    </Box>
                  </TableCell>
                  <TableCell
                    onClick={() => handleSort('fechaVenta')}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      Fecha {getSortIcon('fechaVenta')}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    Pago
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={() => handleSort('descuento')} // Ordenación por descuento
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      Descuento {getSortIcon('descuento')}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={() => handleSort('total')}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      Total {getSortIcon('total')}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: 'bold'
                    }}
                  >
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}> {/* Colspan ajustado a 7 */}
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Cargando ventas...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : ventas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}> {/* Colspan ajustado a 7 */}
                      <ErrorOutlineIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
                      <Typography variant="body1">
                        No se encontraron ventas con los filtros actuales
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  ventas.map((venta) => (
                    <TableRow
                      key={venta.id}
                      hover
                      sx={{
                        '&:nth-of-type(even)': {
                          backgroundColor: theme.palette.action.hover
                        }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {venta.ticketNumber}
                      </TableCell>
                      <TableCell>
                        {venta.cliente || 'Cliente no especificado'}
                      </TableCell>
                      <TableCell>
                        {isValid(parseISO(String(venta.fechaVenta))) ?
                          format(parseISO(String(venta.fechaVenta)), "dd/MM/yyyy HH:mm", { locale: es }) :
                          'Fecha inválida'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={venta.formaPago}
                          color={getPaymentColor(venta.formaPago)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                          S/ {Number(venta.descuento || 0).toFixed(2)} {/* Muestra el descuento */}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        S/ {Number(venta.total).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalles">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDetalleDialog(venta)}
                            size="small"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                disabled={loading}
                shape="rounded"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Detalles de Venta */}
      <Dialog
        open={openDetalleDialog}
        onClose={handleCloseDetalleDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px'
          }
        }}
      >
        {ventaSeleccionada && (
          <>
            <DialogTitle sx={{
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ReceiptIcon sx={{ mr: 1 }} />
              Detalles de Venta {ventaSeleccionada.ticketNumber}
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.secondary'
                  }}>
                    <PersonIcon color="action" sx={{ mr: 1 }} />
                    Cliente: <Box component="span" sx={{ ml: 1, color: 'text.primary', fontWeight: 'medium' }}>
                      {ventaSeleccionada.cliente || 'No especificado'}
                    </Box>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.secondary'
                  }}>
                    <EventNoteIcon color="action" sx={{ mr: 1 }} />
                    Fecha: <Box component="span" sx={{ ml: 1, color: 'text.primary', fontWeight: 'medium' }}>
                      {isValid(parseISO(String(ventaSeleccionada.fechaVenta))) ?
                        format(parseISO(String(ventaSeleccionada.fechaVenta)), "dd/MM/yyyy HH:mm:ss", { locale: es }) :
                        'Fecha inválida'}
                    </Box>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.secondary'
                  }}>
                    <PaidIcon color="action" sx={{ mr: 1 }} />
                    Forma de Pago: <Box component="span" sx={{ ml: 1 }}>
                      <Chip
                        label={ventaSeleccionada.formaPago}
                        color={getPaymentColor(ventaSeleccionada.formaPago)}
                        size="small"
                      />
                    </Box>
                  </Typography>
                </Grid>
                {ventaSeleccionada.vendedor && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'text.secondary'
                    }}>
                      <PersonIcon color="action" sx={{ mr: 1 }} />
                      Vendedor: <Box component="span" sx={{ ml: 1, color: 'text.primary', fontWeight: 'medium' }}>
                        {ventaSeleccionada.vendedor}
                      </Box>
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2
              }}>
                <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
                Productos Vendidos
              </Typography>

              <TableContainer component={Paper} elevation={0} sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '8px',
                mb: 3
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>P. Unitario</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventaSeleccionada.detalles && ventaSeleccionada.detalles.map((detalle, index) => (
                      <TableRow key={index}>
                        <TableCell>{detalle.producto?.nombre || detalle.nombreProducto}</TableCell>
                        <TableCell align="center">
                          {`${Number(detalle.cantidad).toFixed((detalle.unidadMedidaProducto === 'KG' || detalle.producto?.unidadMedida === 'KG') ? 3 : 0)} ${detalle.unidadMedidaProducto || detalle.producto?.unidadMedida || 'UND'}`}
                        </TableCell>
                        <TableCell align="right">S/ {Number(detalle.precio).toFixed(2)}</TableCell>
                        <TableCell align="right">S/ {Number(detalle.subtotal).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 1,
                mt: 2,
                pr: 2
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '300px'
                }}>
                  <Typography variant="body1" color="text.secondary">
                    Subtotal de Productos:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    S/ {calculateSubtotalProductos(ventaSeleccionada.detalles || []).toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '300px'
                  }}>
                    <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <DiscountIcon color="error" sx={{ mr: 0.5, fontSize: '1rem' }} />
                      Descuento:
                    </Typography>
                    {ventaSeleccionada.descuento && Number(ventaSeleccionada.descuento) > 0 && (
                        <Typography component="span" fontWeight="bold" color="error">
                            -S/ {Number(ventaSeleccionada.descuento).toFixed(2)}
                        </Typography>
                    )}
                </Box>

                <Divider sx={{
                  width: '100%',
                  my: 1,
                  borderColor: theme.palette.divider,
                  borderBottomWidth: 2
                }} />

                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '300px'
                }}>
                  <Typography variant="h6" color="text.primary">
                    Total Final:
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    S/ {Number(ventaSeleccionada.total).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={handleCloseDetalleDialog}
                variant="contained"
                color="primary"
                sx={{
                  borderRadius: '8px',
                  px: 3,
                  textTransform: 'none'
                }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Layout>
  );
};

export default RevisarVentasPage;
