import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Paper, Box, CircularProgress, Alert,
    Grid, List, ListItem, ListItemText, Divider, Button, TextField, ListItemIcon
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/Layout';
import api from '../services/api';
import { MonetizationOn, ArrowDownward, ArrowUpward, Receipt } from '@mui/icons-material';

const CierreCajaPage = () => {
    const theme = useTheme();
    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCierreCaja = useCallback(async (fechaConsulta) => {
        if (!fechaConsulta) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/caja/cierre-diario`, { params: { fecha: fechaConsulta } });
            setReporte(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo generar el reporte de caja.');
            setReporte(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCierreCaja(fecha);
    }, [fecha, fetchCierreCaja]);

    const handleFechaChange = (e) => {
        setFecha(e.target.value);
    };

    const renderResumenCaja = (resumen) => (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, borderLeft: `5px solid ${theme.palette.primary.main}` }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Cuadre de Caja
            </Typography>
            <List dense>
                <ListItem>
                    <ListItemIcon><ArrowUpward color="success" /></ListItemIcon>
                    <ListItemText primary="Ventas en Efectivo del Día" />
                    <Typography variant="body1" fontWeight="bold">S/ {resumen.totalVentasEfectivo.toFixed(2)}</Typography>
                </ListItem>
                <ListItem>
                    <ListItemIcon><ArrowUpward color="success" /></ListItemIcon>
                    <ListItemText primary="Cobranza de Deudas en Efectivo" />
                    <Typography variant="body1" fontWeight="bold">S/ {resumen.totalDeudasCobradas.toFixed(2)}</Typography>
                </ListItem>
                <ListItem>
                    <ListItemIcon><ArrowDownward color="error" /></ListItemIcon>
                    <ListItemText primary="Gastos del Día (Efectivo)" />
                    <Typography variant="body1" fontWeight="bold">- S/ {resumen.totalGastos.toFixed(2)}</Typography>
                </ListItem>
                <Divider sx={{ my: 2 }} />
                <ListItem sx={{ bgcolor: 'grey.200', borderRadius: 1 }}>
                    <ListItemIcon><MonetizationOn color="primary" /></ListItemIcon>
                    <ListItemText primary={<Typography fontWeight="bold">SALDO FINAL CALCULADO EN CAJA</Typography>} />
                    <Typography variant="h6" fontWeight="bold">S/ {resumen.saldoFinalCalculado.toFixed(2)}</Typography>
                </ListItem>
            </List>
        </Paper>
    );

    const renderResumenGeneral = (resumen) => (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                Resumen General del Día
            </Typography>
            <List dense>
                <ListItem><ListItemText primary="Total Ventas (Todos los medios)" /><Typography>S/ {resumen.totalVentasGeneral.toFixed(2)}</Typography></ListItem>
                <ListItem><ListItemText primary="Total Pagos con Yape/Plin" /><Typography>S/ {resumen.totalVentasYapePlin.toFixed(2)}</Typography></ListItem>
                <ListItem><ListItemText primary="Total Descuento por Vales" /><Typography>S/ {resumen.totalVentasVale.toFixed(2)}</Typography></ListItem>
                <ListItem><ListItemText primary="Total Deudas Nuevas Generadas" /><Typography>S/ {resumen.totalDeudasNuevas.toFixed(2)}</Typography></ListItem>
            </List>
        </Paper>
    );

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Cierre de Caja Diario
                    </Typography>
                    <TextField
                        id="fecha"
                        label="Fecha del Reporte"
                        type="date"
                        value={fecha}
                        onChange={handleFechaChange}
                        InputLabelProps={{ shrink: true }}
                        disabled={loading}
                    />
                </Box>

                {loading && <Box display="flex" justifyContent="center" my={5}><CircularProgress /></Box>}
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {reporte && !loading && (
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={7}>
                            {renderResumenCaja(reporte.resumenCaja)}
                        </Grid>
                        <Grid item xs={12} md={5}>
                            {renderResumenGeneral(reporte.resumenGeneral)}
                        </Grid>
                    </Grid>
                )}
            </Container>
        </Layout>
    );
};

export default CierreCajaPage;
