import React, { useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, List, ListItem, ListItemText, Divider, Chip, Grid,
    Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper, TableFooter
} from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MonetizationOn, ShoppingCart, AssignmentReturn, Receipt, TrendingUp, TrendingDown } from '@mui/icons-material';

const ResumenLiquidacionDialog = ({ open, onClose, salida }) => {
    if (!salida) return null;

    const formatJsonList = (jsonString) => {
        try {
            const items = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
            if (!Array.isArray(items) || items.length === 0) return <Typography variant="body2" color="text.secondary">Ninguno</Typography>;
            return (
                <List dense disablePadding>
                    {items.map((item, index) => (
                        <ListItem key={index} disablePadding>
                            <ListItemText primary={`${item.producto}: ${item.cantidad}`} />
                        </ListItem>
                    ))}
                </List>
            );
        } catch (e) {
            return <Typography variant="body2" color="error">Error al leer datos</Typography>;
        }
    };

    const resumenVentas = useMemo(() => {
        if (!salida?.ventas) return [];
        const ventasMap = new Map();
        salida.ventas.forEach(venta => {
            (venta.productos || []).forEach(p => {
                const nombre = p.producto?.nombre || 'Desconocido';
                const cantidad = ventasMap.get(nombre) || 0;
                ventasMap.set(nombre, cantidad + p.cantidadLleno);
            });
        });
        return Array.from(ventasMap.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
    }, [salida]);

    const inventarioDevuelto = useMemo(() => {
        if (!salida?.liquidacionDetalles) return [];
        return salida.liquidacionDetalles.map(d => ({
            nombre: d.producto?.nombre || 'Desconocido',
            llenos: d.llenosDevueltos,
        })).filter(d => d.llenos > 0);
    }, [salida]);

    const gastosDetalle = useMemo(() => {
        return salida?.gastos || [];
    }, [salida]);

    const { allPendientes, totalPendientes } = useMemo(() => {
        if (!salida?.ventas) {
            return { allPendientes: [], totalPendientes: 0 };
        }

        const pendientesList = [];
        let total = 0;

        salida.ventas.forEach(venta => {
            if (venta.pendientes && venta.pendientes.length > 0) {
                venta.pendientes.forEach(p => {
                    // Asumimos que el backend ya filtra por entregado: false
                    pendientesList.push({
                        ventaId: venta.id,
                        clienteNombre: venta.clienteNombre,
                        productoNombre: p.producto?.nombre || 'Desconocido',
                        cantidad: p.cantidad,
                    });
                    total += p.cantidad;
                });
            }
        });

        return { allPendientes: pendientesList, totalPendientes: total };
    }, [salida]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Resumen de Liquidación - Salida #{salida.id}</DialogTitle>
            <DialogContent dividers>
                <Box mb={2}>
                    <Typography variant="h6" gutterBottom>Detalles Generales</Typography>
                    <List dense>
                        <Grid container spacing={1}>
                            <Grid item xs={6}><ListItem><ListItemText primary="Corredor" secondary={salida.corredor.nombre} /></ListItem></Grid>
                            <Grid item xs={6}><ListItem><ListItemText primary="Fecha de Salida" secondary={format(new Date(salida.fecha), 'dd/MM/yyyy HH:mm', { locale: es })} /></ListItem></Grid>
                            <Grid item xs={6}><ListItem><ListItemText primary="Estado" secondary={<Chip label={salida.estado} color={salida.estado === 'FINALIZADO' ? 'success' : 'warning'} />} /></ListItem></Grid>
                        </Grid>
                    </List>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box mb={2}>
                    <Typography variant="h6" gutterBottom>Resumen de Caja</Typography>
                    <List dense>
                        <Grid container spacing={1}>
                            <Grid item xs={6}><ListItem><ListItemText primary={<Box display="flex" alignItems="center"><TrendingUp sx={{ mr: 1, color: 'success.main' }} />Total Ventas</Box>} secondary={`S/ ${salida.totalVentas.toFixed(2)}`} /></ListItem></Grid>
                            <Grid item xs={6}><ListItem><ListItemText primary={<Box display="flex" alignItems="center"><TrendingDown sx={{ mr: 1, color: 'error.main' }} />Total Gastos</Box>} secondary={`S/ ${salida.totalGastos.toFixed(2)}`} /></ListItem></Grid>
                            <Grid item xs={6}><ListItem><ListItemText primary={<Box display="flex" alignItems="center"><Receipt sx={{ mr: 1, color: 'warning.main' }} />Total Deudas</Box>} secondary={`S/ ${salida.totalDeudas.toFixed(2)}`} /></ListItem></Grid>
                            <Grid item xs={6}><ListItem><ListItemText primary={<Box display="flex" alignItems="center"><MonetizationOn sx={{ mr: 1, color: 'info.main' }} />Entregado</Box>} secondary={`S/ ${salida.totalEntregado.toFixed(2)}`} /></ListItem></Grid>
                            <Grid item xs={12}><ListItem><ListItemText primary="Diferencia (Faltante/Sobrante)" primaryTypographyProps={{ fontWeight: 'bold' }} /><Chip label={`S/ ${salida.diferencia.toFixed(2)}`} color={salida.diferencia < 0 ? 'error' : (salida.diferencia > 0 ? 'success' : 'default')} /></ListItem></Grid>
                        </Grid>
                    </List>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="h6" gutterBottom>Resumen de Productos Vendidos</Typography>
                    {resumenVentas.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Cantidad Vendida</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {resumenVentas.map((item, index) => (
                                        <TableRow key={index}><TableCell>{item.nombre}</TableCell><TableCell align="right">{item.cantidad}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (<Typography variant="body2" color="text.secondary">No se registraron ventas.</Typography>)}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="h6" gutterBottom>Detalle de Gastos</Typography>
                    {gastosDetalle.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Concepto</TableCell><TableCell align="right">Monto</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {gastosDetalle.map((gasto, index) => (
                                        <TableRow key={index}><TableCell>{gasto.concepto}</TableCell><TableCell align="right">S/ {gasto.monto.toFixed(2)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (<Typography variant="body2" color="text.secondary">No se registraron gastos.</Typography>)}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="h6" gutterBottom>Detalle de Envases Pendientes</Typography>
                    {allPendientes.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small" aria-label="detalle de pendientes">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Venta</TableCell>
                                        <TableCell>Cliente</TableCell>
                                        <TableCell>Producto</TableCell>
                                        <TableCell align="right">Cantidad</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allPendientes.map((p, index) => (
                                        <TableRow key={`${p.ventaId}-${index}`}>
                                            <TableCell>#{p.ventaId}</TableCell>
                                            <TableCell>{p.clienteNombre}</TableCell>
                                            <TableCell>{p.productoNombre}</TableCell>
                                            <TableCell align="right">{p.cantidad}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold', border: 0 }}>Total Pendientes</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', border: 0 }}>{totalPendientes}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body2" color="text.secondary">No hay envases pendientes en esta liquidación.</Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ResumenLiquidacionDialog;
