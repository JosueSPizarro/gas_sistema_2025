import React, { useMemo } from 'react';
import {
    Box, Typography, Paper, Grid, Divider, List, ListItem, ListItemText, Chip
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'; // <-- AÑADIR ICONO

const ResumenJornada = ({ salida }) => {
    if (!salida) return null;

    // 1. Calcular Total Llevado por producto
    const totalLlevadoMap = new Map();
    (salida.salidaDetalles || []).forEach(item => {
        if (item.producto) {
            totalLlevadoMap.set(item.producto.id, {
                nombre: item.producto.nombre,
                cantidad: item.cantidad,
            });
        }
    });

    (salida.reabastecimientos || []).forEach(reab => {
        (reab.detalles || []).forEach(det => {
            if (det.cantidadLlenoTomado > 0 && det.producto) {
                const current = totalLlevadoMap.get(det.productoId) || {
                    nombre: det.producto.nombre,
                    cantidad: 0
                };
                current.cantidad += det.cantidadLlenoTomado;
                totalLlevadoMap.set(det.productoId, current);
            }
        });
    });

    // 2. Calcular Total Vacíos Devueltos por tipo
    const totalVaciosDevueltosMap = new Map();
    (salida.reabastecimientos || []).forEach(reab => {
        (reab.detalles || []).forEach(det => {
            if (det.cantidadVacioDevuelto > 0 && det.producto) {
                const tipo = det.producto.tipo;
                totalVaciosDevueltosMap.set(tipo, (totalVaciosDevueltosMap.get(tipo) || 0) + det.cantidadVacioDevuelto);
            }
        });
    });

    // 2.5. Calcular Total Llenos Devueltos por producto
    const totalLlenosDevueltosMap = new Map();
    (salida.reabastecimientos || []).forEach(reab => {
        (reab.detalles || []).forEach(det => {
            if (det.cantidadLlenoDevuelto > 0 && det.producto) {
                const current = totalLlenosDevueltosMap.get(det.productoId) || {
                    nombre: det.producto.nombre,
                    cantidad: 0
                };
                current.cantidad += det.cantidadLlenoDevuelto;
                totalLlenosDevueltosMap.set(det.productoId, current);
            }
        });
    });

    // 3. Stock Actual en Poder del Corredor
    const stockActualMap = new Map();
    (salida.stockCorredor || []).forEach(item => {
        if (item.producto) {
            stockActualMap.set(item.producto.id, {
                nombre: item.producto.nombre,
                cantidad: item.cantidadLleno,
            });
        }
    });

    // 4. Calcular Balance de Envases por Tipo (LÓGICA CORREGIDA)
    const envasesPorJustificar = useMemo(() => {
        if (!salida) return {};

        const balancePorTipo = new Map();

        const actualizarBalance = (tipoProducto, cantidad) => {
            if (!tipoProducto || !tipoProducto.startsWith('GAS') && !tipoProducto.startsWith('AGUA')) return;
            balancePorTipo.set(tipoProducto, (balancePorTipo.get(tipoProducto) || 0) + cantidad);
        };

        // 1. Sumar deuda inicial (lo que se llevó)
        (salida.salidaDetalles || []).forEach(item => {
            if (item.producto) actualizarBalance(item.producto.tipo, item.cantidad);
        });
        (salida.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                if (det.producto) actualizarBalance(det.producto.tipo, det.cantidadLlenoTomado);
            });
        });

        // 2. Restar justificaciones (lo que devolvió o vendió)
        (salida.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                if (det.producto) {
                    actualizarBalance(det.producto.tipo, -det.cantidadVacioDevuelto);
                    actualizarBalance(det.producto.tipo, -det.cantidadLlenoDevuelto);
                }
            });
        });

        (salida.ventas || []).forEach(venta => {
            (venta.productos || []).forEach(p => {
                if (p.producto) {
                    // Cada producto vendido (con o sin envase) justifica un envase del stock del corredor.
                    // Los envases pendientes con clientes son responsabilidad del cliente, no del corredor para este balance.
                    actualizarBalance(p.producto.tipo, -p.cantidadLleno);
                }
            });
        });

        return Object.fromEntries(balancePorTipo);
    }, [salida]);

    // 5. Calcular Ventas Estimadas (Vacíos que el corredor debe tener)
    const ventasEstimadas = useMemo(() => {
        if (!salida) return {};

        const deudaPorTipo = new Map();
        const justificacionesPorTipo = new Map();
        const stockLlenoActualPorTipo = new Map();

        // Calcular deuda total por tipo
        (salida.salidaDetalles || []).forEach(item => {
            if (item.producto) deudaPorTipo.set(item.producto.tipo, (deudaPorTipo.get(item.producto.tipo) || 0) + item.cantidad);
        });
        (salida.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                if (det.producto) deudaPorTipo.set(det.producto.tipo, (deudaPorTipo.get(det.producto.tipo) || 0) + det.cantidadLlenoTomado);
            });
        });

        // Calcular justificaciones por devoluciones al almacén
        (salida.reabastecimientos || []).forEach(reab => {
            (reab.detalles || []).forEach(det => {
                if (det.producto) {
                    justificacionesPorTipo.set(det.producto.tipo, (justificacionesPorTipo.get(det.producto.tipo) || 0) + det.cantidadVacioDevuelto);
                    justificacionesPorTipo.set(det.producto.tipo, (justificacionesPorTipo.get(det.producto.tipo) || 0) + det.cantidadLlenoDevuelto);
                }
            });
        });

        // Calcular stock lleno actual en poder del corredor
        (salida.stockCorredor || []).forEach(stock => {
            if (stock.producto) {
                stockLlenoActualPorTipo.set(stock.producto.tipo, (stockLlenoActualPorTipo.get(stock.producto.tipo) || 0) + stock.cantidadLleno);
            }
        });

        const resultado = {};
        for (const [tipo, deuda] of deudaPorTipo.entries()) {
            const justificado = justificacionesPorTipo.get(tipo) || 0;
            const stockActual = stockLlenoActualPorTipo.get(tipo) || 0;
            resultado[tipo] = deuda - justificado - stockActual;
        }

        return resultado;
    }, [salida]);

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'primary.main' }}>
            <Typography variant="h6" gutterBottom>Resumen de Jornada</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Typography variant="subtitle1" fontWeight="bold"><ArrowUpwardIcon fontSize="small" color="success" /> Total Llevado</Typography>
                    <List dense>
                        {Array.from(totalLlevadoMap.entries()).map(([id, data]) => (
                            <ListItem key={id} disableGutters><ListItemText primary={data.nombre} secondary={`Cantidad: ${data.cantidad}`} /></ListItem>
                        ))}
                    </List>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Typography variant="subtitle1" fontWeight="bold"><ArrowDownwardIcon fontSize="small" color="warning" /> Total Llenos Devueltos</Typography>
                    <List dense>
                        {Array.from(totalLlenosDevueltosMap.entries()).map(([id, data]) => (
                            <ListItem key={id} disableGutters><ListItemText primary={data.nombre} secondary={`Cantidad: ${data.cantidad}`} /></ListItem>
                        ))}
                    </List>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Typography variant="subtitle1" fontWeight="bold"><ArrowDownwardIcon fontSize="small" color="warning" /> Total Vacíos Devueltos</Typography>
                    <List dense>
                        {Array.from(totalVaciosDevueltosMap.entries()).map(([tipo, cantidad]) => (
                            <ListItem key={tipo} disableGutters><ListItemText primary={`Envases de ${tipo}`} secondary={`Cantidad: ${cantidad}`} /></ListItem>
                        ))}
                    </List>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Typography variant="subtitle1" fontWeight="bold"><AccountBalanceWalletIcon fontSize="small" color="info" /> Stock Actual en Poder</Typography>
                    <List dense>
                        {Array.from(stockActualMap.values()).map(data => (
                            <ListItem key={data.nombre} disableGutters><ListItemText primary={data.nombre} secondary={`Cantidad: ${data.cantidad}`} /></ListItem>
                        ))}
                    </List>
                </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                <Typography variant="h6" fontWeight="bold"><HelpOutlineIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> Balance de Envases</Typography>
                <Box>
                    {Object.entries(envasesPorJustificar).map(([tipo, cantidad]) => (
                        cantidad > 0 && (
                            <Chip
                                key={tipo}
                                label={`${cantidad} de ${tipo}`}
                                color="error"
                                sx={{ ml: 1, mt: 1 }}
                            />
                        )
                    ))}
                    {Object.values(envasesPorJustificar).every(v => v <= 0) && (
                        <Chip label="Todo justificado" color="success" sx={{ mt: 1 }} />
                    )}
                </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
                Este número representa los balones vendidos cuyo envase vacío aún no ha sido devuelto al almacén. Debe ser 0 al liquidar la jornada.
            </Typography>
        </Paper>
    );
};

export default ResumenJornada;
