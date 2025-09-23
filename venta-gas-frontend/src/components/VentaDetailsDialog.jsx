import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
    List, ListItem, ListItemText, Divider, TableContainer, Table, TableHead,
    TableRow, TableCell, TableBody, Chip, IconButton, CircularProgress, Paper, useTheme
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const VentaDetailsDialog = ({ open, onClose, ventaDetails }) => {
    const theme = useTheme();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Detalles de la Venta
                <IconButton
                    aria-label="close"
                    onClick={onClose}
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
                {!ventaDetails ? (
                    <Box display="flex" justifyContent="center" my={5}><CircularProgress /></Box>
                ) : (
                    <Box>
                        <Typography variant="h6" gutterBottom>Información General</Typography>
                        <List dense>
                            <ListItem disablePadding><ListItemText primary="ID de Venta" /><Typography variant="body1">{ventaDetails.id}</Typography></ListItem>
                            <ListItem disablePadding><ListItemText primary="Fecha y Hora" /><Typography variant="body1">{format(new Date(ventaDetails.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</Typography></ListItem>
                            <ListItem disablePadding><ListItemText primary="Cliente" /><Typography variant="body1">{ventaDetails.clienteNombre || 'N/A'}</Typography></ListItem>
                            <ListItem disablePadding><ListItemText primary="Corredor" /><Typography variant="body1">{ventaDetails.salida.corredor.nombre}</Typography></ListItem>
                        </List>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>Productos Vendidos</Typography>
                        <TableContainer component={Paper} elevation={1}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Producto</TableCell>
                                        <TableCell align="right">Cant.</TableCell>
                                        <TableCell align="center">Pendiente</TableCell>
                                        <TableCell align="center">c/ Envase</TableCell>
                                        <TableCell align="right">P/U</TableCell>
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
                                                <TableCell align="center">{cantidadPendiente > 0 ? `Sí (${cantidadPendiente})` : 'No'}</TableCell>
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
                        <List dense>
                            <ListItem disablePadding><ListItemText primary="Total Venta" /><Typography variant="body1" fontWeight="bold">S/ {ventaDetails.total.toFixed(2)}</Typography></ListItem>
                            <ListItem disablePadding><ListItemText primary="Pago en Efectivo" /><Typography variant="body1">S/ {ventaDetails.pagoEfectivo.toFixed(2)}</Typography></ListItem>
                            {ventaDetails.pagoYapePlin > 0 && (
                                <ListItem disablePadding><ListItemText primary="Pago Yape/Plin" /><Typography variant="body1">S/ {ventaDetails.pagoYapePlin.toFixed(2)}</Typography></ListItem>
                            )}
                            {ventaDetails.pagoVale > 0 && (
                                <ListItem disablePadding><ListItemText primary="Descuento por Vale" /><Typography variant="body1">S/ {ventaDetails.pagoVale.toFixed(2)}</Typography></ListItem>
                            )}
                            <ListItem disablePadding><ListItemText primary="Total Pagado" /><Typography variant="body1" fontWeight="bold">S/ {(Number(ventaDetails.pagoEfectivo) + Number(ventaDetails.pagoYapePlin)).toFixed(2)}</Typography></ListItem>
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
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default VentaDetailsDialog;