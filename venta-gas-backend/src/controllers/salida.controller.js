// src/controllers/salida.controller.js
const { PrismaClient } = require('@prisma/client');
const { logStockGlobalChange, logStockChange } = require('./stockGlobal.controller');
const prisma = new PrismaClient();
const { startOfDay, endOfDay, parseISO } = require('date-fns');

/**
 * Obtener todas las salidas, con filtros opcionales por estado, corredor y fecha.
 */
const getAllSalidas = async (req, res) => {
    const { estado, corredorId, fecha } = req.query;
    try {
        const where = {};
        if (estado) {
            where.estado = estado;
        }
        if (corredorId) {
            where.corredorId = parseInt(corredorId);
        }
        if (fecha) {
            const fechaConsulta = parseISO(fecha);
            where.fecha = {
                gte: startOfDay(fechaConsulta),
                lte: endOfDay(fechaConsulta),
            };
        }

        const salidas = await prisma.salida.findMany({
            where,
            include: {
                corredor: true,
                usuario: { select: { id: true, nombre: true } }, // Incluir usuario
                stockCorredor: { // ✨ AÑADIDO: Incluir el stock actual del corredor
                    include: {
                        producto: true
                    }
                },
                salidaDetalles: { include: { producto: true } },
                reabastecimientos: {
                    include: {
                        detalles: { include: { producto: true } }
                    }
                }
            },
            orderBy: {
                fecha: 'desc',
            },
        });
        res.status(200).json(salidas);
    } catch (error) {
        console.error('Error al obtener las salidas:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener las salidas.' });
    }
};

/**
 * Obtener una salida por su ID
 */
const getSalidaById = async (req, res) => {
    const { id } = req.params;
    try {
        const salida = await prisma.salida.findUnique({
            where: { id: parseInt(id) },
            include: {
                corredor: true,
                usuario: { select: { id: true, nombre: true } }, // Incluir usuario
                stockCorredor: {
                    include: {
                        producto: true,
                    }
                },
                salidaDetalles: { // ✨ INCLUIR DETALLES INICIALES
                    include: {
                        producto: true,
                    }
                },
                ventas: {
                    include: {
                        productos: {
                            include: {
                                producto: true,
                            }
                        },
                        pendientes: {
                            // Filtramos para mostrar solo los envases que aún no han sido devueltos.
                            where: { entregado: false },
                            include: {
                                // ✨ CORRECCIÓN: Incluir el tipo de producto es crucial para el cálculo del balance.
                                producto: { select: { nombre: true, tipo: true } }
                            }
                        },
                    }
                },
                liquidacionDetalles: {
                    include: {
                        producto: true
                    }
                },
                gastos: true,
                reabastecimientos: {
                    orderBy: {
                        fecha: 'asc'
                    },
                    include: {
                        detalles: {
                            include: {
                                producto: true
                            }
                        }
                    }
                },
            },
        });
        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada.' });
        }
        
        // DEBUG: Imprime el objeto 'salida' en la consola del backend
        // para verificar si los pendientes se están incluyendo.
        //console.log('Datos de salida a enviar:', JSON.stringify(salida, null, 2));

        res.status(200).json(salida);
    } catch (error) {
        console.error('Error al obtener la salida por ID:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener la salida.' });
    }
};

/**
 * Función para crear una nueva salida
 */
const createSalida = async (req, res) => {
    const usuarioId = req.usuario.id; // Obtenido del middleware de autenticación
    const { corredorId, productosLlenosLlevados, productosVaciosDejados = [] } = req.body;

    if (!corredorId || !productosLlenosLlevados || !Array.isArray(productosLlenosLlevados)) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: corredorId y productosLlenosLlevados son requeridos.' });
    }

    try {
        const nuevaSalida = await prisma.$transaction(async (tx) => {
            // 1. Crear la Salida para obtener un ID
            const salida = await tx.salida.create({
                data: {
                    corredorId: parseInt(corredorId),
                    usuarioId: usuarioId,
                    estado: 'ABIERTO',
                    // ✨ NUEVO: Crear los detalles iniciales de la salida
                    salidaDetalles: {
                        create: productosLlenosLlevados.map(p => ({
                            productoId: p.productoId,
                            cantidad: p.cantidad,
                        })),
                    },
                },
            });

            const stockGlobalUpdates = new Map();

            // 2. Procesar productos LLENOS que el corredor se lleva del almacén
            for (const item of productosLlenosLlevados) {
                const producto = await tx.producto.update({
                    where: { id: item.productoId },
                    data: { stockLleno: { decrement: item.cantidad } },
                });

                if (producto.stockLleno < 0) {
                    throw new Error(`Stock insuficiente para ${producto.nombre}. Se intentó retirar ${item.cantidad} pero solo había ${producto.stockLleno + item.cantidad}.`);
                }

                // FIX: La lógica solo debe aplicar a tipos de producto que usan envase.
                if (producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_')) {
                    const update = stockGlobalUpdates.get(producto.tipo) || { stockLleno: 0, stockVacio: 0 };
                    update.stockLleno -= item.cantidad;
                    stockGlobalUpdates.set(producto.tipo, update);
                }

                await tx.stockCorredor.create({
                    data: {
                        corredorId: parseInt(corredorId),
                        salidaId: salida.id,
                        productoId: item.productoId,
                        cantidadLleno: item.cantidad,
                        cantidadVacio: 0,
                    },
                });
            }

            // 3. Procesar productos VACÍOS que el corredor deja en el almacén (si los hay)
            if (productosVaciosDejados.length > 0) {
                for (const item of productosVaciosDejados) {
                    const producto = await tx.producto.findUnique({ where: { id: item.productoId } });
                    if (!producto) throw new Error(`Producto con ID ${item.productoId} no encontrado.`);

                    // FIX: La lógica solo debe aplicar a tipos de producto que usan envase.
                    if (producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_')) {
                        const update = stockGlobalUpdates.get(producto.tipo) || { stockLleno: 0, stockVacio: 0 };
                        update.stockVacio += item.cantidad;
                        stockGlobalUpdates.set(producto.tipo, update);
                    }
                }
            }

            // 4. Aplicar las actualizaciones agrupadas a StockGlobal
            for (const [tipo, update] of stockGlobalUpdates.entries()) {
                const cambioTotal = update.stockLleno + update.stockVacio;
                await tx.stockGlobal.update({
                    where: { tipoProducto: tipo },
                    data: {
                        stockLleno: { increment: update.stockLleno },
                        stockVacio: { increment: update.stockVacio },
                    },
                });
            }

            // 5. Actualizar totales en la Salida
            const totalLlenosSalida = productosLlenosLlevados.reduce((sum, p) => sum + p.cantidad, 0);
            const totalVaciosSalida = 0; // El corredor empieza con 0 vacíos en su poder

            const salidaActualizada = await tx.salida.update({
                where: { id: salida.id },
                data: { totalLlenosSalida, totalVaciosSalida },
            });

            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return salidaActualizada;
        });

        const salidaCompleta = await prisma.salida.findUnique({
            where: { id: nuevaSalida.id },
            include: { corredor: true },
        });

        res.status(201).json(salidaCompleta);
    } catch (error) {
        console.error('Error en la transacción de creación de salida:', error);
        res.status(500).json({ error: 'Hubo un problema al crear la salida.', details: error.message });
    }
};

/**
 * Función para liquidar y finalizar una salida.
 */
const liquidarSalidaCompleta = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.usuario.id; // Obtenido del middleware de autenticación
    const { totalEntregado, gastos: nuevosGastos = [] } = req.body;

    try {
        const salidaId = parseInt(id);

        const resultadoFinal = await prisma.$transaction(async (tx) => {
            const salida = await tx.salida.findUnique({
                where: { id: salidaId },
                include: {
                    // Incluir ventas y gastos para el cálculo final
                    ventas: true,
                    gastos: true,
                    // Ya no necesitamos el stock del corredor, se asume que está conciliado.
                }
            });
            
            if (!salida || salida.estado !== 'ABIERTO') {
                throw new Error('La salida no existe o no está en estado "ABIERTO".');
            }

            // ✨ AÑADIDO: Crear los nuevos gastos de último minuto
            if (nuevosGastos.length > 0) {
                await tx.gasto.createMany({
                    data: nuevosGastos.map(g => ({
                        salidaId: salidaId,
                        usuarioId: usuarioId,
                        concepto: g.concepto,
                        monto: g.monto
                    }))
                });
            }

            // Ya no se maneja el stock aquí. Se asume que todo el stock (llenos y vacíos)
            // ha sido conciliado a través de las funciones de Reabastecimiento, Devolución de Llenos y Ventas.
            // Esta función ahora se centra en el cierre financiero y de estado.

            // 3. Calcular totales y diferencia de caja
            const montoNuevosGastos = nuevosGastos.reduce((sum, g) => sum + g.monto, 0);
            const totalVentas = salida.ventas.reduce((sum, v) => sum + v.total, 0);
            const totalGastosPrevios = salida.gastos.reduce((sum, g) => sum + g.monto, 0);
            const totalGastosFinal = totalGastosPrevios + montoNuevosGastos;
            const totalDeudas = salida.ventas.reduce((sum, v) => sum + v.montoPendiente, 0);
            const totalVales = salida.ventas.reduce((sum, v) => sum + (v.pagoVale || 0), 0);
            const totalYapePlin = salida.ventas.reduce((sum, v) => sum + v.pagoYapePlin, 0);

            const efectivoEsperado = totalVentas - totalGastosFinal - totalDeudas - totalYapePlin - totalVales;
            const diferencia = parseFloat(totalEntregado) - efectivoEsperado;

            // 4. Actualizar la salida con los valores finales y cambiar el estado
            const salidaActualizada = await tx.salida.update({
                where: { id: salidaId },
                data: {
                    usuarioLiquidadorId: usuarioId, // ✨ REGISTRAMOS QUIÉN LIQUIDA
                    estado: 'FINALIZADO',
                    totalVentas,
                    totalGastos: totalGastosFinal,
                    totalDeudas,
                    totalEntregado: parseFloat(totalEntregado),
                    diferencia,
                    // Ya no se crean detalles de liquidación de stock aquí.
                },
                include: {
                    corredor: true,
                    ventas: true,
                    gastos: true,
                    liquidacionDetalles: { include: { producto: true } }
                }
            });

            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return salidaActualizada;
        });

        res.status(200).json({ message: 'Salida liquidada correctamente.', data: resultadoFinal });
    } catch (error) {
        console.error('Error al liquidar la salida:', error);
        res.status(500).json({ error: 'Hubo un problema al liquidar la salida.', details: error.message });
    }
};

/**
 * Función para cancelar una salida
 */
const cancelarSalida = async (req, res) => {
    const { id } = req.params;
    try {
        const salidaId = parseInt(id);
        const salidaActiva = await prisma.salida.findUnique({
            where: { id: salidaId }
        });

        if (!salidaActiva || salidaActiva.estado !== 'ABIERTO') {
            return res.status(400).json({ error: 'Solo se pueden cancelar salidas en estado ABIERTO.' });
        }

        const salidaCancelada = await prisma.$transaction(async (tx) => {
            // Revertir el stock al cancelar
            const stockCorredorItems = await tx.stockCorredor.findMany({
                where: { salidaId },
                include: { producto: true } // Incluir el producto para saber su tipo
            });

            for (const item of stockCorredorItems) {
                // 1. Devolver los productos llenos al stock principal del producto
                if (item.cantidadLleno > 0) {
                    await tx.producto.update({
                        where: { id: item.productoId },
                        data: {
                            stockLleno: { increment: item.cantidadLleno },
                        },
                    });
                }

                // 2. Devolver tanto llenos como vacíos al stock global de envases
                // FIX: La lógica solo debe aplicar a tipos de producto que usan envase.
                if (item.producto.tipo.startsWith('GAS_') || item.producto.tipo.startsWith('AGUA_')) {
                    await tx.stockGlobal.update({
                        where: { tipoProducto: item.producto.tipo },
                        data: {
                            stockLleno: { increment: item.cantidadLleno },
                            stockVacio: { increment: item.cantidadVacio },
                            stockTotal: { increment: item.cantidadLleno + item.cantidadVacio },
                        },
                    });
                }
            }

            // Eliminar los registros de stock del corredor para esta salida
            await tx.stockCorredor.deleteMany({ where: { salidaId } });

            // Actualizar el estado de la salida a "CANCELADA"
            const salidaActualizada = await tx.salida.update({
                where: { id: salidaId },
                data: { estado: 'CANCELADA' },
            });

            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return salidaActualizada;
        });

        res.status(200).json(salidaCancelada);
    } catch (error) {
        console.error('Error al cancelar la salida:', error);
        res.status(500).json({ error: 'Hubo un problema al cancelar la salida.', details: error.message });
    }
};

/**
 * Obtener el stock total de un corredor
 * Esta función ya no es precisa con el nuevo modelo. Se necesita una lógica más completa.
 * A continuación, se muestra una versión revisada.
 */
const getTotalStockByCorredor = async (req, res) => {
    const { id } = req.params;
    
    try {
        const stockItems = await prisma.stockCorredor.findMany({
            where: {
                corredorId: parseInt(id),
                // Se asume que solo queremos el stock de las salidas activas
                salida: {
                    estado: 'ABIERTO'
                }
            },
            include: {
                producto: true,
            },
        });

        // Sumar cantidades de stock lleno y vacío por producto
        const stockResumen = stockItems.reduce((acc, item) => {
            if (!acc[item.productoId]) {
                acc[item.productoId] = {
                    productoNombre: item.producto.nombre,
                    cantidadLleno: 0,
                    cantidadVacio: 0,
                };
            }
            acc[item.productoId].cantidadLleno += item.cantidadLleno;
            acc[item.productoId].cantidadVacio += item.cantidadVacio;
            return acc;
        }, {});

        const resultados = Object.values(stockResumen);

        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al obtener el stock total del corredor:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener el stock total.' });
    }
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

/**
 * Registra un reabastecimiento simple: el corredor toma llenos y/o devuelve vacíos.
 * No se hacen cálculos de ventas aquí.
 */
const reabastecerCorredor = async (req, res) => {
    const { id } = req.params; // salidaId
    const usuarioId = req.usuario.id;
    const { productosLlenosTomados = [], vaciosDevueltos = {} } = req.body; // vaciosDevueltos es ahora un objeto { "GAS_10K": 10 }

    const hasMovimientos = productosLlenosTomados.some(p => p.cantidad > 0) ||
                           Object.values(vaciosDevueltos).some(v => (parseInt(v) || 0) > 0);

    if (!hasMovimientos) {
        return res.status(400).json({ error: 'Debes registrar al menos un movimiento de stock.' });
    }
    
    try {
        const salidaId = parseInt(id);

        const resultado = await prisma.$transaction(async (tx) => {
            const salida = await tx.salida.findUnique({ where: { id: salidaId } });
            if (!salida || salida.estado !== 'ABIERTO') {
                throw new Error('La salida no existe o no está en estado "ABIERTO".');
            }

            const reabastecimiento = await tx.reabastecimiento.create({ data: { 
                salidaId,
                usuarioId: usuarioId, // ✨ REGISTRAMOS QUIÉN HACE EL REABASTECIMIENTO
            } });
            const detallesMap = new Map();
            const stockGlobalUpdates = new Map();

            const getDetalle = (productoId) => {
                if (!detallesMap.has(productoId)) {
                    detallesMap.set(productoId, { productoId, cantidadLlenoTomado: 0, cantidadLlenoDevuelto: 0, cantidadVacioDevuelto: 0 });
                }
                return detallesMap.get(productoId);
            };

            // 1. Procesar LLENOS que el corredor TOMA del almacén
            for (const { productoId, cantidad } of productosLlenosTomados) {
                if (cantidad <= 0) continue;
                const producto = await tx.producto.findUnique({ where: { id: productoId } });
                if (!producto) throw new Error(`Producto con ID ${productoId} no encontrado.`);
                if (producto.stockLleno < cantidad) {
                    throw new Error(`Stock de almacén insuficiente para "${producto.nombre}". Disponible: ${producto.stockLleno}, se necesitan: ${cantidad}.`);
                }

                await tx.producto.update({ where: { id: productoId }, data: { stockLleno: { decrement: cantidad } } });
                await tx.stockCorredor.upsert({
                    where: { corredorId_productoId_salidaId: { corredorId: salida.corredorId, productoId, salidaId } },
                    update: { cantidadLleno: { increment: cantidad } },
                    create: { corredorId: salida.corredorId, salidaId, productoId, cantidadLleno: cantidad, cantidadVacio: 0 }
                });

                getDetalle(productoId).cantidadLlenoTomado += cantidad;

                // FIX: La lógica solo debe aplicar a tipos de producto que usan envase.
                if (producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_')) {
                    const update = stockGlobalUpdates.get(producto.tipo) || { stockLleno: 0, stockVacio: 0 };
                    update.stockLleno -= cantidad;
                    stockGlobalUpdates.set(producto.tipo, update);
                }
            }

            // 2. Procesar VACÍOS que el corredor DEVUELVE al almacén (Lógica Corregida y Simplificada)
            for (const tipoProducto in vaciosDevueltos) {
                let cantidadADevolver = parseInt(vaciosDevueltos[tipoProducto]);
                if (isNaN(cantidadADevolver) || cantidadADevolver <= 0) continue;

                // Se busca un producto representativo de ese tipo para asociar el registro en el detalle.
                // Esto es solo para mantener la integridad de la base de datos, no afecta el stock del corredor.
                const productoRepresentativo = await tx.producto.findFirst({
                    where: { tipo: tipoProducto }
                });

                if (!productoRepresentativo) {
                    throw new Error(`No se encontró un producto representativo para el tipo de envase "${tipoProducto}".`);
                }

                // Registrar la devolución en el detalle del reabastecimiento.
                // NO se modifica el stock del corredor.
                getDetalle(productoRepresentativo.id).cantidadVacioDevuelto += cantidadADevolver;

                // Actualizar el stock global de vacíos del almacén principal.
                // FIX: La lógica solo debe aplicar a tipos de producto que usan envase.
                if (tipoProducto.startsWith('GAS_') || tipoProducto.startsWith('AGUA_')) {
                    const update = stockGlobalUpdates.get(tipoProducto) || { stockLleno: 0, stockVacio: 0 };
                    update.stockVacio += cantidadADevolver;
                    stockGlobalUpdates.set(tipoProducto, update);
                }
            }

            // 3. Aplicar todos los cambios a la base de datos.
            const promises = [];

            // 3.1. Actualizar StockGlobal
            for (const [tipo, update] of stockGlobalUpdates.entries()) {
                promises.push(tx.stockGlobal.update({
                    where: { tipoProducto: tipo },
                    data: {
                        stockLleno: { increment: update.stockLleno },
                        stockVacio: { increment: update.stockVacio },
                        stockTotal: { increment: update.stockLleno + update.stockVacio },
                    },
                }));

            }

            // 3.2. Crear detalles del reabastecimiento
            if (detallesMap.size > 0) {
                promises.push(tx.reabastecimientoDetalle.createMany({
                    data: Array.from(detallesMap.values()).map(d => ({
                        reabastecimientoId: reabastecimiento.id,
                        productoId: d.productoId,
                        cantidadLlenoTomado: d.cantidadLlenoTomado,
                        cantidadLlenoDevuelto: d.cantidadLlenoDevuelto,
                        cantidadVacioDevuelto: d.cantidadVacioDevuelto
                    }))
                }));
            }

            // 3.3. Actualizar totales de la Salida
            const totalLlenosNuevos = [...detallesMap.values()].reduce((sum, d) => sum + d.cantidadLlenoTomado, 0);
            if (totalLlenosNuevos > 0) {
                promises.push(tx.salida.update({
                    where: { id: salidaId },
                    data: { totalLlenosSalida: { increment: totalLlenosNuevos } }
                }));
            }

            await Promise.all(promises);

            // 4. ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            // Medida de seguridad para garantizar que el stock global siempre sea consistente.
            await reconcileStockGlobal(tx);

            // 4. Devolver el reabastecimiento creado
            return tx.reabastecimiento.findUnique({
                where: { id: reabastecimiento.id },
                include: { detalles: { include: { producto: true } } }
            });
        });
    
    

        res.status(200).json({ message: 'Reabastecimiento registrado correctamente.', reabastecimiento: resultado });
    } catch (error) {
        console.error('Error al reabastecer al corredor:', error);
        res.status(500).json({ error: 'Hubo un problema al registrar el reabastecimiento.', details: error.message });
    }
};

/**
 * ✨ NUEVA FUNCIÓN: Finaliza un reabastecimiento registrando los llenos devueltos
 * y calculando las ventas (descontando llenos del corredor por los vacíos devueltos).
 */
const finalizarReabastecimiento = async (req, res) => {
    const { id } = req.params; // salidaId
    const { productosLlenosDevueltos = [] } = req.body;

    if (!productosLlenosDevueltos.some(p => p.cantidad > 0)) {
        return res.status(400).json({ error: 'Debes registrar al menos un balón lleno devuelto.' });
    }

    try {
        const salidaId = parseInt(id);

        const resultado = await prisma.$transaction(async (tx) => {
            const salida = await tx.salida.findUnique({
                where: { id: salidaId },
                include: {
                    // Necesitamos el stock actual del corredor para validar la devolución.
                    stockCorredor: { include: { producto: true } }
                }
            });

            if (!salida || salida.estado !== 'ABIERTO') {
                throw new Error('La salida no existe o no está en estado "ABIERTO".');
            }

            // Crear un nuevo registro de reabastecimiento para esta acción de "finalizar"
            const reabastecimiento = await tx.reabastecimiento.create({ data: { salidaId } });
            const promises = [];
            const stockGlobalUpdates = new Map();
            const detallesReabastecimientoData = []; // Para almacenar los detalles a crear en lote
            // 1. Procesar LLENOS que el corredor DEVUELVE al almacén
            for (const { productoId, cantidad } of productosLlenosDevueltos) {
                if (cantidad <= 0) continue;

                const stockCorredor = salida.stockCorredor.find(s => s.productoId === productoId);
                const producto = stockCorredor?.producto;

                if (!stockCorredor || stockCorredor.cantidadLleno < cantidad) {
                    throw new Error(`El corredor no tiene suficientes "${producto?.nombre || 'ID ' + productoId}" llenos para devolver. Tiene: ${stockCorredor?.cantidadLleno || 0}, intenta devolver ${cantidad}.`);
                }

                // Disminuir el stock de llenos del corredor
                await tx.stockCorredor.update({
                    where: { id: stockCorredor.id },
                    data: { cantidadLleno: { decrement: cantidad } }
                });

                // Aumentar el stock de llenos del almacén
                await tx.producto.update({
                    where: { id: productoId },
                    data: { stockLleno: { increment: cantidad } }
                });

                // ✨ CORRECCIÓN: Esta lógica ahora está DENTRO del bucle para que se ejecute por cada producto.
                // Registrar el detalle de esta devolución en ReabastecimientoDetalle
                detallesReabastecimientoData.push({
                    reabastecimientoId: reabastecimiento.id,
                    productoId: productoId,
                    cantidadLlenoDevuelto: cantidad,
                    cantidadLlenoTomado: 0, // No se toma nada en este paso
                    cantidadVacioDevuelto: 0 // No se devuelven vacíos en este paso
                });
    
                // Actualizar StockGlobal (si aplica)
                // FIX: La lógica solo debe aplicar a tipos de producto que usan envase.
                if (producto && (producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_'))) {
                    const update = stockGlobalUpdates.get(producto.tipo) || { stockLleno: 0 };
                    update.stockLleno += cantidad;
                    stockGlobalUpdates.set(producto.tipo, update);
                }
            }

            // Crear todos los detalles de reabastecimiento en lote
            if (detallesReabastecimientoData.length > 0) {
                promises.push(tx.reabastecimientoDetalle.createMany({ data: detallesReabastecimientoData }));
            }
            // Aplicar actualizaciones a StockGlobal
            for (const [tipo, update] of stockGlobalUpdates.entries()) {
                promises.push(tx.stockGlobal.update({
                    where: { tipoProducto: tipo },
                    data: {
                        stockLleno: { increment: update.stockLleno },
                        stockTotal: { increment: update.stockLleno },
                    },
                }));

            }
            await Promise.all(promises);
            
            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            // Devolver la salida actualizada con el nuevo stock del corredor.
            return tx.salida.findUnique({ where: { id: salidaId }, include: { stockCorredor: { include: { producto: true } } } });
        });

        res.status(200).json({ message: 'Devolución de llenos registrada correctamente.', salida: resultado });
    } catch (error) {
        console.error('Error al registrar la devolución de llenos:', error);
        res.status(500).json({ error: 'Hubo un problema al registrar la devolución de llenos.', details: error.message });
    }
};


/**
 * Cambia el estado de una salida a 'FINALIZADO' de forma simple.
 * No realiza liquidación de stock, solo cambia el estado para prevenir más ventas.
 */
const setSalidaFinalizada = async (req, res) => {
    const { id } = req.params;
    const salidaId = parseInt(id);

    if (isNaN(salidaId)) {
        return res.status(400).json({ error: 'ID de salida inválido.' });
    }

    try {
        const salida = await prisma.salida.findUnique({
            where: { id: salidaId },
        });

        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada.' });
        }

        if (salida.estado !== 'ABIERTO') {
            return res.status(400).json({ error: 'La salida no está en estado "ABIERTO".' });
        }

        const salidaActualizada = await prisma.salida.update({
            where: { id: salidaId },
            data: { estado: 'FINALIZADO' },
        });

        res.status(200).json({ message: 'Salida finalizada correctamente.', salida: salidaActualizada });
    } catch (error) {
        console.error('Error al finalizar la salida:', error);
        res.status(500).json({ error: error.message || 'Hubo un problema al finalizar la salida.' });
    }
};

const getVentasBySalidaId = async (req, res) => {
    const { salidaId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    try {
        const totalVentas = await prisma.venta.count({
            where: { salidaId: parseInt(salidaId) },
        });

        const ventas = await prisma.venta.findMany({
            where: { salidaId: parseInt(salidaId) },
            skip: skip,
            take: limitNum,
            include: {
                usuario: { select: { id: true, nombre: true } }, // ✨ AÑADIDO: Incluir el usuario que registró la venta
                salida: {
                    include: {
                        corredor: true,
                    },
                },
                productos: {
                    // ✨ CORRECCIÓN: Seleccionar todos los campos para asegurar que 'seVendioConEnvase' y 'esVale' se incluyan.
                    // Un simple `include` no es suficiente si hay un `select` en un nivel superior.
                    include: {
                        producto: true,
                    },
                    
                },
                deuda: true,
                pendientes: {
                    include: {
                        producto: true,
                    },
                },
            },
            orderBy: {
                fecha: 'desc',
            },
        });
        res.status(200).json({
            ventas,
            totalPages: Math.ceil(totalVentas / limitNum),
            currentPage: pageNum,
            totalResults: totalVentas,
        });
    } catch (error) {
        console.error('Error al obtener las ventas de la salida:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener las ventas.' });
    }
};

const saldarDiferencia = async (req, res) => {
    const { id } = req.params;
    const salidaId = parseInt(id);

    try {
        const salida = await prisma.salida.findUnique({
            where: { id: salidaId },
        });

        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada.' });
        }

        if (salida.estado !== 'FINALIZADO') {
            return res.status(400).json({ error: 'Solo se pueden saldar diferencias de salidas finalizadas.' });
        }

        if (salida.diferencia >= 0) {
            return res.status(400).json({ error: 'Esta salida no tiene un faltante pendiente de pago.' });
        }

        if (salida.diferenciaSaldada) {
            return res.status(400).json({ error: 'Este faltante ya ha sido saldado.' });
        }

        const salidaActualizada = await prisma.salida.update({
            where: { id: salidaId },
            data: {
                diferenciaSaldada: true,
                fechaDiferenciaSaldada: new Date(),
            },
        });

        res.status(200).json({ message: 'Faltante saldado correctamente.', data: salidaActualizada });
    } catch (error) {
        console.error('Error al saldar la diferencia:', error);
        res.status(500).json({ error: 'Hubo un problema al saldar la diferencia.', details: error.message });
    }
};

module.exports = {
    createSalida,
    liquidarSalidaCompleta, // Renombramos la exportación para no romper la ruta
    cancelarSalida,
    getAllSalidas,
    getSalidaById,
    getTotalStockByCorredor,
    reabastecerCorredor,
    finalizarReabastecimiento, // ✨ AÑADIDA NUEVA FUNCIÓN
    setSalidaFinalizada,
    getVentasBySalidaId,
    saldarDiferencia,

};