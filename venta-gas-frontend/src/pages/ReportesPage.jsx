import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Box, Paper, Button, CircularProgress, Alert, Slide,
  Grid, TextField, Tab, Tabs, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import Layout from '../components/Layout';
import api from '../services/api'; 

const ReportesPage = () => {
    const [tabIndex, setTabIndex] = useState(0);
    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [corredores, setCorredores] = useState([]);
    const [selectedCorredor, setSelectedCorredor] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCorredores = useCallback(async () => {
        try {
            const response = await api.get('/corredores');
            setCorredores(response.data.filter(c => c.activo));
        } catch (err) {
            console.error("Error al cargar corredores", err);
            setError("No se pudieron cargar los corredores para el filtro.");
        }
    }, []);

    useEffect(() => {
        fetchCorredores();
    }, [fetchCorredores]);

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
        setError(null); // Limpiar errores al cambiar de pestaña
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        setError(null);

        let url = '';
        let params = { fecha };
        let filename = '';

        if (tabIndex === 0) { // Reporte Global
            url = '/reportes/ventas/global';
            filename = `Resumen_Global_Ventas_${fecha}.pdf`;
        } else { // Reporte por Corredor
            if (!selectedCorredor) {
                setError('Por favor, seleccione un corredor.');
                setLoading(false);
                return;
            }
            url = `/reportes/ventas/corredor/${selectedCorredor}`;
            const corredorNombre = corredores.find(c => c.id === selectedCorredor)?.nombre || 'corredor';
            filename = `Reporte_${corredorNombre.replace(/\s/g, '_')}_${fecha}.pdf`;
        }

        try {
            const response = await api.get(url, {
                params,
                responseType: 'blob', // Importante para recibir el PDF
            });

            // Crear un enlace para descargar el PDF
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error('Error al generar el reporte:', err);
            setError('No se pudo generar el reporte. Verifique los filtros o intente más tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Box>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Generación de Reportes
                </Typography>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                    <Tabs value={tabIndex} onChange={handleTabChange} aria-label="pestañas de reportes" sx={{ mb: 3 }}>
                        <Tab label="Reporte Global Diario" />
                        <Tab label="Reporte por Corredor" />
                    </Tabs>

                    <Grid container spacing={3} alignItems="flex-end">
                        <Grid item xs={12} sm={tabIndex === 1 ? 4 : 6}>
                            <TextField
                                fullWidth
                                label="Fecha del Reporte"
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {tabIndex === 1 && (
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth>
                                    <InputLabel id="corredor-select-label">Corredor</InputLabel>
                                    <Select
                                        labelId="corredor-select-label"
                                        value={selectedCorredor}
                                        label="Corredor"
                                        onChange={(e) => setSelectedCorredor(e.target.value)}
                                    >
                                        <MenuItem value="">
                                            <em>Seleccione un corredor</em>
                                        </MenuItem>
                                        {corredores.map((corredor) => (
                                            <MenuItem key={corredor.id} value={corredor.id}>
                                                {corredor.nombre}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        <Grid item xs={12} sm={tabIndex === 1 ? 4 : 6}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
                                onClick={handleGenerateReport}
                                disabled={loading || (tabIndex === 1 && !selectedCorredor)}
                                sx={{ height: '56px' }}
                            >
                                {loading ? 'Generando...' : 'Generar PDF'}
                            </Button>
                        </Grid>
                    </Grid>

                    {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
                </Paper>
            </Box>
        </Layout>
    );
};

export default ReportesPage;