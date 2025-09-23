// src/controllers/stockGlobal.controller.js

const { PrismaClient } = require('@prisma/client');
const { startOfDay, endOfDay, parseISO } = require('date-fns');
const prisma = new PrismaClient();

/**
 * Lee el estado actual, aplica un cambio y registra el historial en una sola operación.
 * Esta es la nueva fuente de verdad para todas las modificaciones de StockGlobal.
 * @param {Prisma.TransactionClient} tx - El cliente de transacción de Prisma.
 * @param {string} tipoProducto - El tipo de producto afectado.
 * @param {object} dataChange - El objeto de datos para la actualización (ej. { stockTotal: { increment: 1 } }).
 * @param {number} cambioEnTotal - El cambio numérico neto en el stockTotal.
 * @param {string} motivo - La razón del cambio.
 * @param {string} [detalles] - Detalles adicionales.
 * @param {number} [ventaId] - ID de la venta asociada.
 * @param {number} [salidaId] - ID de la salida asociada.
 */
const logStockChange = async (tx, tipoProducto, dataChange, cambioEnTotal, motivo, detalles, ventaId, salidaId) => {
    // 1. Leer el estado ANTES de la actualización
    const stockAnterior = await tx.stockGlobal.findUnique({ where: { tipoProducto } });

    if (!stockAnterior) {
        console.warn(`Se intentó registrar un cambio para el tipo de producto "${tipoProducto}" que no existe en StockGlobal.`);
        return;
    }

    // 2. Aplicar la actualización
    const stockActual = await tx.stockGlobal.update({
        where: { tipoProducto },
        data: dataChange,
    });

    // 3. Registrar el historial con los datos de "antes" y "después"
    await tx.historialStockGlobal.create({
        data: {
            tipoProducto,
            stockLleno: stockActual.stockLleno,
            stockVacio: stockActual.stockVacio,
            stockTotal: stockActual.stockTotal,
            stockTotalAnterior: stockAnterior.stockTotal, // Usamos el valor real leído antes
            cambio: cambioEnTotal,
            motivo,
            detalles,
            ventaId,
            salidaId,
        },
    });

    return stockActual;
};

/** 
 * Registra un cambio en el historial de StockGlobal.
 * @param {Prisma.TransactionClient} tx - El cliente de transacción de Prisma.
 * @param {string} tipoProducto - El tipo de producto afectado (e.g., 'GAS_10K').
 * @param {number} cambio - La cantidad que cambió el stock total (e.g., -1, +5).
 * @param {string} motivo - La razón del cambio (e.g., 'VENTA_CON_ENVASE').
 * @param {string} [detalles] - Información adicional como el ID de la venta o compra.
 * @param {number} [ventaId] - ID de la venta asociada.
 * @param {number} [salidaId] - ID de la salida asociada.
 */
const logStockGlobalChange = async (tx, tipoProducto, cambio, motivo, detalles, ventaId = null, salidaId = null) => {
    // Esta función ahora es un envoltorio para la nueva función logStockChange,
    // manteniendo la compatibilidad con las llamadas existentes que solo pasan el cambio total.
    // Se asume que el cambio solo afecta a stockTotal y stockVacio si es positivo, o solo a stockTotal si es negativo.
    // Para operaciones más complejas, se debería llamar a logStockChange directamente.
    
    const dataChange = {};
    if (cambio > 0) { // Asumimos que un cambio positivo es una devolución de vacíos
        dataChange.stockVacio = { increment: cambio };
        dataChange.stockTotal = { increment: cambio };
    } else if (cambio < 0) { // Asumimos que un cambio negativo es una salida de envase completo
        dataChange.stockTotal = { increment: cambio }; // El incremento será negativo
    }
    // Si el cambio es 0, dataChange estará vacío, pero el historial se registrará igualmente.

    await logStockChange(tx, tipoProducto, dataChange, cambio, motivo, detalles, ventaId, salidaId);
};

/**
 * Función de seguridad para reconciliar el stock global con el stock de productos.
 * Se asegura de que el stockLleno y stockTotal en StockGlobal coincidan con la realidad.
 */
const reconcileStockGlobal = async (tx = prisma) => {
    console.log('Iniciando reconciliación y registro de historial de StockGlobal...');

    const tiposGlobales = await prisma.stockGlobal.findMany({
        select: { tipoProducto: true, stockLleno: true, stockVacio: true, stockTotal: true }
    });

    for (const stock of tiposGlobales) {
        const tipo = stock.tipoProducto;

        // Sumar el stockLleno de todos los productos de ese tipo
        const sumaProductos = await prisma.producto.aggregate({
            _sum: { stockLleno: true },
            where: { tipo: tipo },
        });
        const stockRealLleno = sumaProductos._sum.stockLleno || 0;
        const stockRealTotal = stockRealLleno + stock.stockVacio;

        // Si no coinciden, actualizar StockGlobal para que refleje la realidad de la tabla Producto.
        if (stock.stockLleno !== stockRealLleno || stock.stockTotal !== stockRealTotal) {
            console.warn(`Discrepancia encontrada para ${tipo}. Reconciliando...`);
            await prisma.stockGlobal.update({
                where: { tipoProducto: tipo },
                data: { 
                    stockLleno: stockRealLleno,
                    stockTotal: stockRealTotal
                }
            });
        }
    }
    console.log('Reconciliación y registro de historial de StockGlobal completado.');
};

// Obtener todo el stock global
const getStockGlobal = async (req, res) => {
    try {
        // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
        // Se ejecuta siempre para garantizar la consistencia de los datos.
        await reconcileStockGlobal();

        const stockGlobal = await prisma.stockGlobal.findMany({
            orderBy: { tipoProducto: 'asc' }
        });
        res.status(200).json(stockGlobal);
    } catch (error) {
        console.error('Error al obtener el stock global:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener el stock global.' });
    }
};

// Actualizar el stock de vacíos (para ajustes manuales o devoluciones)
const updateStockVacio = async (req, res) => {
    const { tipoProducto } = req.params;
    const { cantidad, operacion } = req.body; // operacion puede ser 'increment' o 'decrement'

    if (!cantidad || !operacion || !['increment', 'decrement'].includes(operacion)) {
        return res.status(400).json({ error: 'Se requiere una cantidad y una operación válida (increment/decrement).' });
    }

    const cantidadAjuste = parseInt(cantidad);

    try {
        const stockActualizado = await prisma.$transaction(async (tx) => {            
            // Registrar el ajuste manual en el historial
            const cambio = operacion === 'increment' ? cantidadAjuste : -cantidadAjuste;
            // Usamos la nueva función para asegurar la consistencia
            const updatedStock = await logStockChange(
                tx,
                tipoProducto,
                { stockVacio: { [operacion]: cantidadAjuste }, stockTotal: { [operacion]: cantidadAjuste } },
                cambio,
                'AJUSTE_MANUAL',
                `Ajuste manual de ${cambio} envases vacíos.`,
                null,
                null
            );

            // Reconciliar stock de productos llenos por seguridad
            await reconcileStockGlobal(tx);

            return updatedStock;
        });

        res.status(200).json(stockActualizado);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: `No se encontró stock global para el tipo: ${tipoProducto}` });
        }
        console.error('Error al actualizar el stock de vacíos:', error);
        res.status(500).json({ error: 'Hubo un problema al actualizar el stock de vacíos.' });
    }
};

// Obtener el historial de stock global
const getHistorialStockGlobal = async (req, res) => {
    const { fechaInicio, fechaFin, motivo, page = 1, limit = 15 } = req.query;
    try {
        const where = {};
        if (fechaInicio) {
            where.fecha = { ...where.fecha, gte: new Date(`${fechaInicio}T00:00:00.000Z`) };
        }
        if (fechaFin) {
            where.fecha = { ...where.fecha, lte: new Date(`${fechaFin}T23:59:59.999Z`) };
        }
        if (motivo && motivo.length > 0) {
            where.motivo = { in: motivo.split(',') };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalResults = await prisma.historialStockGlobal.count({ where });

        const historial = await prisma.historialStockGlobal.findMany({
            where,
            skip,
            take: limitNum,
            include: {
                // ✨ INCLUIR DATOS DEL CORREDOR
                // Obtenemos la salida asociada al historial, y de ahí el corredor.
                salida: {
                    select: {
                        id: true,
                        corredor: {
                            select: {
                                id: true,
                                nombre: true,
                            }
                        }
                    }
                },
                venta: {
                    select: {
                        id: true,
                        clienteNombre: true,
                    }
                }
            },
            orderBy: [
                { fecha: 'desc' },
                { tipoProducto: 'asc' }
            ],
        });
        res.status(200).json({
            historial,
            totalPages: Math.ceil(totalResults / limitNum),
            currentPage: pageNum,
            totalResults,
        });
    } catch (error) {
        console.error('Error al obtener el historial de stock global:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener el historial.', details: error.message });
    }
};

const getDailySummary = async (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'La fecha es requerida.' });
    }

    try {
        const targetDate = parseISO(date);
        const startDate = startOfDay(targetDate);
        const endDate = endOfDay(targetDate);

        const tiposGlobales = await prisma.stockGlobal.findMany({
            select: { tipoProducto: true }
        });

        const summary = [];

        for (const { tipoProducto } of tiposGlobales) {
            // 1. Encontrar el stock inicial
            const firstRecordOfDay = await prisma.historialStockGlobal.findFirst({
                where: { tipoProducto, fecha: { gte: startDate, lte: endDate } },
                orderBy: { fecha: 'asc' }
            });

            let stockInicial = 0;
            if (firstRecordOfDay) {
                stockInicial = firstRecordOfDay.stockTotalAnterior;
            } else {
                const lastRecordBefore = await prisma.historialStockGlobal.findFirst({
                    where: { tipoProducto, fecha: { lt: startDate } },
                    orderBy: { fecha: 'desc' }
                });
                // Si no hay registros anteriores, el stock inicial es el actual (asumiendo que no hubo cambios)
                const currentStock = await prisma.stockGlobal.findUnique({ where: { tipoProducto } });
                stockInicial = lastRecordBefore ? lastRecordBefore.stockTotal : (currentStock?.stockTotal || 0);
            }

            // 2. Encontrar el stock final
            const lastRecordOfDay = await prisma.historialStockGlobal.findFirst({
                where: { tipoProducto, fecha: { gte: startDate, lte: endDate } },
                orderBy: { fecha: 'desc' }
            });

            const stockFinal = lastRecordOfDay ? lastRecordOfDay.stockTotal : stockInicial;

            // 3. Agrupar los cambios por motivo
            const cambiosDelDia = await prisma.historialStockGlobal.groupBy({
                by: ['motivo'],
                where: {
                    tipoProducto,
                    fecha: { gte: startDate, lte: endDate },
                    cambio: { not: 0 } // Solo nos interesan los cambios que afectan el stock
                },
                _sum: { cambio: true },
                _count: { id: true },
            });

            // 4. Contar envases de 'Venta con Envase' del día
            const ventasConEnvaseDelDia = await prisma.ventaProducto.aggregate({
                _sum: {
                    cantidadLleno: true
                },
                where: {
                    seVendioConEnvase: true,
                    venta: {
                        fecha: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    producto: {
                        tipo: tipoProducto
                    }
                }
            });
            const countVentasConEnvase = ventasConEnvaseDelDia._sum.cantidadLleno || 0;

            // 5. Sumar envases pendientes *activos* creados en el día
            const pendientesActivosDelDia = await prisma.pendiente.aggregate({
                _sum: {
                    cantidad: true
                },
                where: {
                    producto: {
                        tipo: tipoProducto
                    },
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    entregado: false // La condición clave: solo los no entregados
                }
            });
            const countPendientes = pendientesActivosDelDia._sum.cantidad || 0;

            const eventos = [];
            if (countVentasConEnvase > 0) eventos.push({ motivo: 'VENTA_CON_ENVASE', count: countVentasConEnvase });
            if (countPendientes > 0) eventos.push({ motivo: 'VENTA_PENDIENTE', count: countPendientes });

            summary.push({
                tipoProducto,
                stockInicial,
                stockFinal,
                cambioNeto: stockFinal - stockInicial,
                desglose: cambiosDelDia.map(item => ({ motivo: item.motivo, cambioTotal: item._sum.cambio, count: item._count.id })),
                eventos,
            });
        }

        res.status(200).json(summary);
    } catch (error) {
        console.error('Error al obtener el resumen diario:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener el resumen diario.', details: error.message });
    }
};

module.exports = {
    getStockGlobal,
    updateStockVacio,
    logStockGlobalChange,
    getHistorialStockGlobal,
    logStockChange, // ✨ Exportar la nueva función
    getDailySummary,
};
