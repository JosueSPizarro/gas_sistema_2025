import React from 'react';
import {
    Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip, Stack
} from '@mui/material';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';

const HistorialReabastecimientos = ({ reabastecimientos }) => {
    if (!reabastecimientos || reabastecimientos.length === 0) {
        return <Typography>No hay reabastecimientos para esta jornada.</Typography>;
    }

    const formatFecha = (fecha) => {
        return format(new Date(fecha), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Historial de Reabastecimientos</Typography>
            {reabastecimientos.map((reab, index) => {
                if (!reab.detalles) return null;
                const llevados = reab.detalles.filter(d => d.cantidadLlenoTomado > 0);
                const llenosDevueltos = reab.detalles.filter(d => d.cantidadLlenoDevuelto > 0);
                const vaciosDevueltos = reab.detalles.reduce((acc, d) => {
                    if (d.cantidadVacioDevuelto > 0 && d.producto) {
                        const tipo = d.producto.tipo;
                        acc[tipo] = (acc[tipo] || 0) + d.cantidadVacioDevuelto;
                    }
                    return acc;
                }, {});

                return (
                    <Paper key={reab.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Reabastecimiento #{index + 1} - {formatFecha(reab.fecha)}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        
                        {llevados.length > 0 && (
                            <Box>
                                <Typography variant="body2" fontWeight="500">Llenos Llevados:</Typography>
                                <List dense>
                                    {llevados.map(d => (
                                        <ListItem key={d.id} disableGutters>
                                            <ListItemText primary={`${d.producto.nombre}`} secondary={`Cantidad: ${d.cantidadLlenoTomado}`} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}

                        {llenosDevueltos.length > 0 && (
                            <Box mt={llevados.length > 0 ? 2 : 0}>
                                <Typography variant="body2" fontWeight="500">Llenos Devueltos:</Typography>
                                <List dense>
                                    {llenosDevueltos.map(d => (
                                        <ListItem key={d.id} disableGutters>
                                            <ListItemText primary={`${d.producto.nombre}`} secondary={`Cantidad: ${d.cantidadLlenoDevuelto}`} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}

                        {Object.keys(vaciosDevueltos).length > 0 && (
                             <Box mt={llevados.length > 0 ? 2 : 0}>
                                <Typography variant="body2" fontWeight="500">Vacíos Devueltos:</Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    {Object.entries(vaciosDevueltos).map(([tipo, cantidad]) => (
                                        <Chip key={tipo} label={`${cantidad} de ${tipo}`} color="warning" variant="outlined" />
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Paper>
                );
            })}
        </Box>
    );
};

export default HistorialReabastecimientos;
