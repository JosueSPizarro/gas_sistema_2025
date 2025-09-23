import React, { useState, useMemo, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip,
    TextField, Typography, Box, CircularProgress, Alert, List, Skeleton,
    ListItem, ListItemText, Divider, IconButton,
    Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import api from '../services/api';

const LiquidacionDialog = ({ open, onClose, salida, onLiquidationSuccess }) => {
    const [salidaCompleta, setSalidaCompleta] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [efectivoEntregado, setEfectivoEntregado] = useState('');
    const [gastos, setGastos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            const fetchSalidaDetails = async () => {
                if (!salida?.id) return;
                setIsLoading(true);
                setError(null);
                try {
                    const response = await api.get(`/salidas/${salida.id}`);
                    setSalidaCompleta(response.data);
                } catch (err) {
                    setError(err.response?.data?.error || 'No se pudieron cargar los detalles de la salida.');
                } finally {
                    setIsLoading(false);
                }
            };

            fetchSalidaDetails();

            // Reset states when dialog opens
            setEfectivoEntregado('');
            setGastos([{ concepto: '', monto: '' }]);
            setIsSubmitting(false);
        } else {
            // Reset when dialog closes
            setSalidaCompleta(null);
        }
    }, [open, salida?.id]);

    const resumen = useMemo(() => {
        if (!salidaCompleta) return null;

        if (!salidaCompleta.ventas) {
            console.warn("LiquidacionDialog: El objeto 'salida' no contiene la propiedad 'ventas'. Los cálculos del resumen pueden ser incorrectos.");
        }

        const ventasList = salidaCompleta.ventas || [];
        const gastosList = salidaCompleta.gastos || [];

        const totalVentas = ventasList.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalYapePlin = ventasList.reduce((sum, v) => sum + (v.pagoYapePlin || 0), 0);
        const totalVales = ventasList.reduce((sum, v) => sum + (v.pagoVale || 0), 0);
        const totalDeudas = ventasList.reduce((sum, v) => sum + (v.montoPendiente || 0), 0);
        const totalGastosActuales = gastosList.reduce((sum, g) => sum + (g.monto || 0), 0);
        const nuevosGastos = gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
        const totalGastosFinal = totalGastosActuales + nuevosGastos;

        const efectivoEsperado = totalVentas - totalYapePlin - totalVales - totalDeudas - totalGastosFinal;

        return {
            totalVentas,
            totalYapePlin,
            totalVales,
            totalDeudas,
            totalGastosFinal,
            efectivoEsperado,
        };
    }, [salidaCompleta, gastos]);

    const pendientesPorProducto = useMemo(() => {
        if (!salidaCompleta?.ventas) return {};

        const pendientes = {};
        salidaCompleta.ventas.forEach(venta => {
            // Asumimos que 'pendientes' es un array en cada objeto 'venta'
            // y que solo se incluyen los no entregados desde el backend.
            (venta.pendientes || []).forEach(p => {
                // El backend debe incluir el nombre del producto en la consulta
                const productName = p.producto?.nombre || 'Producto Desconocido';
                pendientes[productName] = (pendientes[productName] || 0) + p.cantidad;
            });
        });
        return pendientes;
    }, [salidaCompleta]);

    const balanceEnvases = useMemo(() => {
        if (!salidaCompleta) return [];

        const balanceMap = new Map();

        const getProductBalance = (productoId, productoNombre) => {
            if (!balanceMap.has(productoId)) {
                balanceMap.set(productoId, {
                    nombre: productoNombre,
                    totalLlevado: 0,
                    totalVendido: 0,
                    totalLlenosDevueltos: 0,
                    stockFinalLleno: 0,
                });
            }
            return balanceMap.get(productoId);
        };

        // 1. Total Llevado (Salida inicial + Reabastecimientos)
        (salidaCompleta.salidaDetalles || []).forEach(item => {
            const balance = getProductBalance(item.productoId, item.producto.nombre);
            balance.totalLlevado += item.cantidad;
        });

        (salidaCompleta.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                if (det.cantidadLlenoTomado > 0) {
                    const balance = getProductBalance(det.productoId, det.producto.nombre);
                    balance.totalLlevado += det.cantidadLlenoTomado;
                }
                if (det.cantidadLlenoDevuelto > 0) {
                    const balance = getProductBalance(det.productoId, det.producto.nombre);
                    balance.totalLlenosDevueltos += det.cantidadLlenoDevuelto;
                }
            });
        });

        // 3. Total Vendido y Stock Final
        (salidaCompleta.ventas || []).forEach(venta => {
            (venta.productos || []).forEach(p => {
                const balance = getProductBalance(p.productoId, p.producto.nombre);
                balance.totalVendido += p.cantidadLleno;
            });
        });
        (salidaCompleta.stockCorredor || []).forEach(stock => getProductBalance(stock.productoId, stock.producto.nombre).stockFinalLleno = stock.cantidadLleno);
        return Array.from(balanceMap.values());
    }, [salidaCompleta]);

    const handleAddGasto = () => {
        setGastos([...gastos, { concepto: '', monto: '' }]);
    };

    const handleGastoChange = (index, field, value) => {
        const newGastos = [...gastos];
        newGastos[index][field] = value;
        setGastos(newGastos);
    };

    const handleRemoveGasto = (index) => {
        const newGastos = gastos.filter((_, i) => i !== index);
        setGastos(newGastos);
    };

    const handleLiquidar = async () => {
        if (!efectivoEntregado) {
            setError('Debes ingresar el monto de efectivo entregado.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const payload = {
            totalEntregado: Number(efectivoEntregado),
            gastos: gastos.filter(g => g.concepto && g.monto > 0).map(g => ({ ...g, monto: Number(g.monto) })),
        };

        try {
            await api.put(`/salidas/${salida.id}/liquidar`, payload);
            onLiquidationSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al liquidar la salida.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!salida) return null;

    const diferencia = resumen && efectivoEntregado ? Number(efectivoEntregado) - resumen.efectivoEsperado : 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Liquidar Salida #{salida.id} - {salida.corredor.nombre}</DialogTitle>
            <DialogContent dividers>
                {isLoading ? (
                    <Box>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="rectangular" height={80} sx={{ my: 2 }}/>
                        <Skeleton variant="text" width="80%" />
                        <Skeleton variant="text" width="70%" />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                ) : salidaCompleta && resumen ? (
                    <>
                        <Box mb={3}>
                            <Typography variant="h6" gutterBottom>Balance de Envases Llenos</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Producto</TableCell>
                                            <TableCell align="center">Llevados</TableCell>
                                            <TableCell align="center">Devueltos</TableCell>
                                            <TableCell align="center">Vendidos</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock Final</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {balanceEnvases.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.nombre}</TableCell>
                                                <TableCell align="center">{item.totalLlevado}</TableCell>
                                                <TableCell align="center">{item.totalLlenosDevueltos}</TableCell>
                                                <TableCell align="center">{item.totalVendido}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{item.stockFinalLleno}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                El "Stock Final" es la cantidad de llenos no vendidos que se devolverán al almacén al liquidar.
                            </Typography>

                            {Object.keys(pendientesPorProducto).length > 0 && (
                                <>
                                    <Divider sx={{ my: 1, mt: 2 }} light><Chip label="Pendientes de Clientes" size="small" /></Divider>
                                    <List dense>
                                    {Object.entries(pendientesPorProducto).map(([nombre, cantidad]) => (<ListItem key={`pendiente-${nombre}`} sx={{ pl: 0 }}><ListItemText primary={nombre} secondary={`Envases vacíos pendientes: ${cantidad}`} secondaryTypographyProps={{ color: 'warning.main' }} /></ListItem>))}
                                    </List>
                                </>
                            )}
                        </Box>
                        <Divider />
                        <Box mt={2}>
                            <Typography variant="h6" gutterBottom>Resumen de Caja</Typography>
                            <List dense>
                                <ListItem><ListItemText primary="Total Ventas" /> <Typography>S/ {resumen.totalVentas.toFixed(2)}</Typography></ListItem>
                                <ListItem><ListItemText primary="(-) Pagos con Yape/Plin" /> <Typography>S/ {resumen.totalYapePlin.toFixed(2)}</Typography></ListItem>
                                <ListItem><ListItemText primary="(-) Pagos con Vales" /> <Typography>S/ {resumen.totalVales.toFixed(2)}</Typography></ListItem>
                                <ListItem><ListItemText primary="(-) Deudas generadas" /> <Typography>S/ {resumen.totalDeudas.toFixed(2)}</Typography></ListItem>
                                <ListItem><ListItemText primary="(-) Gastos Totales" /> <Typography>S/ {resumen.totalGastosFinal.toFixed(2)}</Typography></ListItem>
                                <Divider sx={{ my: 1 }} />
                                <ListItem sx={{ backgroundColor: '#f0f0f0', borderRadius: 1 }}>
                                    <ListItemText primary={<Typography fontWeight="bold">Efectivo Esperado</Typography>} />
                                    <Typography fontWeight="bold">S/ {resumen.efectivoEsperado.toFixed(2)}</Typography>
                                </ListItem>
                        {efectivoEntregado && (
                            <ListItem>
                                <ListItemText primary={<Typography fontWeight="bold">Diferencia (Faltante/Sobrante)</Typography>} />
                                <Typography fontWeight="bold" color={diferencia < 0 ? 'error.main' : 'success.main'}>S/ {diferencia.toFixed(2)}</Typography>
                            </ListItem>
                        )}
                            </List>
                        </Box>
                    </>
                ) : null}

                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>Registro Final</Typography>
                    <TextField label="Efectivo Entregado por el Corredor" type="number" fullWidth value={efectivoEntregado} onChange={(e) => setEfectivoEntregado(e.target.value)} InputProps={{ startAdornment: <AttachMoneyIcon sx={{ mr: 1 }} /> }} sx={{ mb: 2 }} required />
                    {efectivoEntregado && (<Alert severity={Math.abs(diferencia) < 0.01 ? 'success' : (diferencia > 0 ? 'info' : 'error')}>Diferencia: S/ {diferencia.toFixed(2)} {diferencia > 0 ? '(Sobrante)' : diferencia < -0.01 ? '(Faltante)' : ''}</Alert>)}
                </Box>

                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>Añadir Gastos de Último Minuto</Typography>
                    {gastos.map((gasto, index) => (<Box key={index} display="flex" alignItems="center" gap={1} mb={1}><TextField label="Concepto" value={gasto.concepto} onChange={(e) => handleGastoChange(index, 'concepto', e.target.value)} fullWidth size="small" /><TextField label="Monto" type="number" value={gasto.monto} onChange={(e) => handleGastoChange(index, 'monto', e.target.value)} size="small" /><IconButton onClick={() => handleRemoveGasto(index)} size="small" color="error"><RemoveCircleOutlineIcon /></IconButton></Box>))}
                    <Button onClick={handleAddGasto} size="small">Añadir Gasto</Button>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={isSubmitting}>Cancelar</Button>
                <Button onClick={handleLiquidar} variant="contained" color="primary" disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} /> : 'Confirmar Liquidación'}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default LiquidacionDialog;