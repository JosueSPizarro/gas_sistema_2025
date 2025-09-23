// src/controllers/caja.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { startOfDay, endOfDay, parseISO } = require('date-fns');

const getCierreDiario = async (req, res) => {
    const { fecha } = req.query;
    let fechaConsulta;

    try {
        // Si no se proporciona fecha, se usa la fecha actual.
        // Si se proporciona, se convierte a un objeto Date.
        fechaConsulta = fecha ? parseISO(fecha) : new Date();
        if (isNaN(fechaConsulta.getTime())) {
            return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });
    }

    const inicioDia = startOfDay(fechaConsulta);
    const finDia = endOfDay(fechaConsulta);

    try {
        // 1. Ventas del día para desglosar pagos
        const ventasDelDia = await prisma.venta.findMany({
            where: {
                fecha: {
                    gte: inicioDia,
                    lte: finDia,
                },
            },
        });

        const totalVentasEfectivo = ventasDelDia.reduce((sum, venta) => sum + venta.pagoEfectivo, 0);
        const totalVentasYapePlin = ventasDelDia.reduce((sum, venta) => sum + venta.pagoYapePlin, 0);
        const totalVentasVale = ventasDelDia.reduce((sum, venta) => sum + venta.pagoVale, 0);
        const totalDeudasNuevas = ventasDelDia.reduce((sum, venta) => sum + venta.montoPendiente, 0);
        const totalVentasGeneral = ventasDelDia.reduce((sum, venta) => sum + venta.total, 0);

        // 2. Gastos del día (se asume que todos son en efectivo)
        const gastosDelDia = await prisma.gasto.findMany({
            where: {
                createdAt: {
                    gte: inicioDia,
                    lte: finDia,
                },
            },
        });
        const totalGastos = gastosDelDia.reduce((sum, gasto) => sum + gasto.monto, 0);

        // 3. Deudas pagadas hoy (se asume que se cobran en efectivo)
        const deudasPagadasHoy = await prisma.deuda.findMany({
            where: {
                pagado: true,
                fechaPago: {
                    gte: inicioDia,
                    lte: finDia,
                },
            },
        });
        const totalDeudasCobradas = deudasPagadasHoy.reduce((sum, deuda) => sum + deuda.monto, 0);

        // 4. Calcular el saldo final en caja
        const saldoFinalCalculado = totalVentasEfectivo + totalDeudasCobradas - totalGastos;

        res.status(200).json({
            fecha: fechaConsulta.toISOString(),
            resumenCaja: {
                totalVentasEfectivo,
                totalDeudasCobradas,
                totalGastos,
                saldoFinalCalculado,
            },
            resumenGeneral: {
                totalVentasGeneral,
                totalVentasYapePlin,
                totalVentasVale,
                totalDeudasNuevas,
            }
        });

    } catch (error) {
        console.error('Error al generar el cierre de caja diario:', error);
        res.status(500).json({ error: 'Hubo un problema al generar el reporte de caja.' });
    }
};

module.exports = {
    getCierreDiario,
};
