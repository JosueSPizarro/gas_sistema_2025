// src/controllers/compra.controller.js
const { PrismaClient } = require('@prisma/client');
const { logStockGlobalChange } = require('./stockGlobal.controller');
const prisma = new PrismaClient();

/**
 * Función de seguridad para reconciliar el stock global con el stock de productos.
 * Se asegura de que el stockLleno en StockGlobal coincida con la suma real de los productos.
 * @param {Prisma.TransactionClient} tx - El cliente de transacción de Prisma.
 */
const reconcileStockGlobal = async (tx) => {
    console.log('Iniciando reconciliación de StockGlobal...');

    const tiposGlobales = await tx.stockGlobal.findMany({
        select: { tipoProducto: true, stockLleno: true, stockVacio: true, stockTotal: true }
    });

    for (const stock of tiposGlobales) {
        const tipo = stock.tipoProducto;

        // Sumar el stockLleno de todos los productos de ese tipo
        const sumaProductos = await tx.producto.aggregate({
            _sum: { stockLleno: true },
            where: { tipo: tipo },
        });
        const stockRealLleno = sumaProductos._sum.stockLleno || 0;
        const stockRealTotal = stockRealLleno + stock.stockVacio;

        // Si no coinciden, actualizar StockGlobal para que refleje la realidad de la tabla Producto.
        if (stock.stockLleno !== stockRealLleno || stock.stockTotal !== stockRealTotal) {
            console.warn(`Discrepancia encontrada para ${tipo}. Reconciliando...`);
            await tx.stockGlobal.update({
                where: { tipoProducto: tipo },
                data: { 
                    stockLleno: stockRealLleno,
                    stockTotal: stockRealTotal
                }
            });
        }
    }
    console.log('Reconciliación de StockGlobal completada.');
};

/**
 * Obtener todas las compras, incluyendo detalles y proveedor.
 */
const getAllCompras = async (req, res) => {
    try {
        const compras = await prisma.compra.findMany({
            include: {
                proveedor: true,
                detalles: {
                    include: {
                        producto: true,
                    },
                },
            },
            orderBy: { fecha: 'desc' },
        });
        res.status(200).json(compras);
    } catch (error) {
        console.error('Error al obtener las compras:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener las compras.' });
    }
};

/**
 * Obtener una compra por su ID.
 */
const getCompraById = async (req, res) => {
    const { id } = req.params;
    try {
        const compra = await prisma.compra.findUnique({
            where: { id: parseInt(id) },
            include: {
                proveedor: true,
                detalles: {
                    include: {
                        producto: true,
                    },
                },
            },
        });
        if (!compra) {
            return res.status(404).json({ error: 'Compra no encontrada.' });
        }
        res.status(200).json(compra);
    } catch (error) {
        console.error(`Error al obtener la compra ${id}:`, error);
        res.status(500).json({ error: 'Hubo un problema al obtener la compra.' });
    }
};

/**
 * Crear una nueva compra y actualizar el stock.
 */
const createCompra = async (req, res) => {
    const { proveedorId, fecha, detalles } = req.body;

    if (!proveedorId || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: proveedorId y al menos un detalle de producto son requeridos.' });
    }

    try {
        const nuevaCompra = await prisma.$transaction(async (tx) => {
            // 1. Calcular el total de la compra
            const totalCompra = detalles.reduce((sum, item) => {
                const subtotal = item.cantidad * item.precioUnitario;
                return sum + subtotal;
            }, 0);

            // 2. Crear el registro de la Compra
            const compra = await tx.compra.create({
                data: {
                    proveedorId: parseInt(proveedorId),
                    fecha: fecha ? new Date(fecha) : new Date(),
                    total: totalCompra,
                    detalles: {
                        create: detalles.map(item => ({
                            productoId: item.productoId,
                            cantidad: item.cantidad,
                            precioUnitario: item.precioUnitario,
                            subtotal: item.cantidad * item.precioUnitario,
                        })),
                    },
                },
            });

            // 3. Actualizar el stock de cada producto y el stock global
            for (const item of detalles) {
                const producto = await tx.producto.update({
                    where: { id: item.productoId },
                    data: { stockLleno: { increment: item.cantidad } },
                });

                if (producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_')) {
                    // Antes de actualizar, verificar si hay suficientes envases vacíos para el canje.
                    const stockGlobal = await tx.stockGlobal.findUnique({
                        where: { tipoProducto: producto.tipo },
                    });

                    if (!stockGlobal || stockGlobal.stockVacio < item.cantidad) {
                        throw new Error(`No hay suficientes envases vacíos de tipo "${producto.tipo}" en el almacén para realizar el canje. Vacíos disponibles: ${stockGlobal?.stockVacio || 0}, se necesitan: ${item.cantidad}.`);
                    }

                    // Se incrementan los llenos y se decrementan los vacíos. El stock total no cambia.
                    await tx.stockGlobal.update({
                        where: { tipoProducto: producto.tipo },
                        data: {
                            stockLleno: { increment: item.cantidad },
                            stockVacio: { decrement: item.cantidad },
                        },
                    });

                    // Registrar el canje en el historial. El cambio en stockTotal es 0.
                    await logStockGlobalChange(
                        tx,
                        producto.tipo,
                        0, // El stock total de envases no cambia en un canje
                        'COMPRA_CANJE',
                        `Compra #${compra.id}`,
                        null, // No hay ventaId
                        null  // No hay salidaId
                    );
                }
            }

            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return compra;
        });

        res.status(201).json(nuevaCompra);
    } catch (error) {
        console.error('Error al crear la compra:', error);
        res.status(500).json({ error: 'Hubo un problema al crear la compra.', details: error.message });
    }
};

module.exports = {
    getAllCompras,
    getCompraById,
    createCompra,
};
