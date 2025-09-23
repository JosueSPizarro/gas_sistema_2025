// src/controllers/producto.controller.js

const { logStockGlobalChange, logStockChange } = require('./stockGlobal.controller');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRODUCT_TYPES = {
    GAS: 'GAS',
    AGUA: 'AGUA',
    VALVULA: 'VALVULA',
};

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

// Obtener todos los productos
const getAllProductos = async (req, res) => {
  try {
    const productos = await prisma.producto.findMany();
    res.status(200).json(productos);
  } catch (error) {
    console.error('Error al obtener los productos:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los productos.' });
  }
};

// Obtener un producto por ID
const getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const producto = await prisma.producto.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    res.status(200).json(producto);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener el producto.' });
  }
};

const createProducto = async (req, res) => {
    const { nombre, descripcion, precioUnitario, tipo, stockLleno, stockMinimo } = req.body;

    // Validación básica de campos requeridos
    if (!nombre || !precioUnitario || !tipo) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, precioUnitario, tipo.' });
    }

    const stockLlenoInicial = parseInt(stockLleno || 0);

    const data = {
        nombre,
        descripcion,
        precioUnitario: parseFloat(precioUnitario),
        tipo,
        stockLleno: stockLlenoInicial,
        stockMinimo: parseInt(stockMinimo || 0),
    };

    try {
        const nuevoProducto = await prisma.$transaction(async (tx) => {
            const producto = await tx.producto.create({ data });

            // Si el producto es de un tipo que gestiona envases (comienza con GAS o AGUA), actualizamos el stock global
            if ((tipo.startsWith('GAS_') || tipo.startsWith('AGUA_')) && stockLlenoInicial > 0) {
                await tx.stockGlobal.upsert({
                    where: { tipoProducto: tipo },
                    update: {
                        stockLleno: { increment: stockLlenoInicial },
                        stockTotal: { increment: stockLlenoInicial },
                    },
                    create: {
                        tipoProducto: tipo,
                        stockLleno: stockLlenoInicial,
                        stockTotal: stockLlenoInicial,
                        stockVacio: 0,
                    },
                });
            }

            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return producto;
        });

        res.status(201).json(nuevoProducto);
    } catch (error) {
        console.error('Error al crear el producto:', error);
        res.status(500).json({ error: 'Hubo un problema al crear el producto.' });
    }
};

const updateProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precioUnitario, tipo, stockLleno, stockMinimo } = req.body;

    const stockLlenoNuevo = parseInt(stockLleno || 0);

    try {
        const productoActualizado = await prisma.$transaction(async (tx) => {
            const productoActual = await tx.producto.findUnique({
                where: { id: parseInt(id) },
            });

            if (!productoActual) {
                throw new Error('P2025');
            }

            const stockLlenoAnterior = productoActual.stockLleno;
            const tipoAnterior = productoActual.tipo;
            const tipoNuevo = tipo;

            const data = {
                nombre,
                descripcion,
                precioUnitario: parseFloat(precioUnitario),
                tipo: tipoNuevo,
                stockLleno: stockLlenoNuevo,
                stockMinimo: parseInt(stockMinimo || 0),
            };

            const producto = await tx.producto.update({
                where: { id: parseInt(id) },
                data,
            });

            // --- Lógica Refactorizada para actualizar StockGlobal ---
            const esTipoGlobalAnterior = tipoAnterior.startsWith('GAS_') || tipoAnterior.startsWith('AGUA_');
            const esTipoGlobalNuevo = tipoNuevo.startsWith('GAS_') || tipoNuevo.startsWith('AGUA_');

            if (tipoAnterior !== tipoNuevo) {
                // El tipo cambió.
                // 1. Restar el stock anterior del tipo anterior.
                if (esTipoGlobalAnterior && stockLlenoAnterior > 0) {
                    await tx.stockGlobal.updateMany({
                        where: { tipoProducto: tipoAnterior },
                        data: {
                            stockLleno: { decrement: stockLlenoAnterior },
                            stockTotal: { decrement: stockLlenoAnterior },
                        },
                    });
                }
                // 2. Sumar el nuevo stock al nuevo tipo.
                if (esTipoGlobalNuevo && stockLlenoNuevo > 0) {
                    await tx.stockGlobal.upsert({
                        where: { tipoProducto: tipoNuevo },
                        update: {
                            stockLleno: { increment: stockLlenoNuevo },
                            stockTotal: { increment: stockLlenoNuevo },
                        },
                        create: { tipoProducto: tipoNuevo, stockLleno: stockLlenoNuevo, stockTotal: stockLlenoNuevo, stockVacio: 0 }
                    });
                }
            } else {
                // El tipo no cambió, solo ajustamos la diferencia.
                const diferenciaStock = stockLlenoNuevo - stockLlenoAnterior;
                if (diferenciaStock !== 0 && esTipoGlobalNuevo) {
                    await tx.stockGlobal.updateMany({
                        where: { tipoProducto: tipoNuevo },
                        data: {
                            stockLleno: { increment: diferenciaStock },
                            stockTotal: { increment: diferenciaStock },
                        },
                    });
                }
            }

            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return producto;
        });
        res.status(200).json(productoActualizado);
    } catch (error) {
        if (error.code === 'P2025' || error.message === 'P2025') {
            return res.status(404).json({ error: 'Producto no encontrado para actualizar.' });
        }
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ error: 'Hubo un problema al actualizar el producto.' });
    }
};

// Eliminar un producto
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const productoEliminado = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id: parseInt(id) },
      });

      if (!producto) {
        throw new Error('P2025');
      }

      // Si es un producto con stock global, lo restamos
      if ((producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_')) && producto.stockLleno > 0) {
        await tx.stockGlobal.updateMany({
          where: { tipoProducto: producto.tipo },
          data: {
            stockLleno: { decrement: producto.stockLleno },
            stockTotal: { decrement: producto.stockLleno },
          },
        });
      }

      // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
      await reconcileStockGlobal(tx);

      return tx.producto.delete({
        where: { id: parseInt(id) },
      });
    });
    res.status(200).json(productoEliminado);
  } catch (error) {
    if (error.code === 'P2025' || error.message === 'P2025') {
      return res.status(404).json({ error: 'Producto no encontrado para eliminar.' });
    }
    console.error('Error al eliminar el producto:', error);
    res.status(500).json({ error: 'Hubo un problema al eliminar el producto.' });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const productos = await prisma.$queryRaw`
      SELECT id, nombre, "stockLleno", "stockMinimo", tipo
      FROM "Producto"
      WHERE "stockLleno" <= "stockMinimo" AND "stockMinimo" > 0
    `;

    res.status(200).json(productos);
  } catch (error) {
    console.error('Error al obtener productos con bajo stock:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener las alertas de stock.' });
  }
};

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  getLowStockProducts,
};