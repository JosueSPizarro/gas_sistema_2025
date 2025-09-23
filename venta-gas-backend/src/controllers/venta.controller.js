// src/controllers/venta.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logStockGlobalChange, logStockChange } = require('./stockGlobal.controller');

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
 * Centraliza la lógica de conciliación de envases vacíos para `createVenta` y `updateVenta`.
 * CALCULA cuántos envases vacíos de una venta deben ir al StockGlobal después de compensar
 * las devoluciones físicas previas del corredor.
 * @param {Prisma.TransactionClient} tx - El cliente de transacción de Prisma.
 * @param {number} salidaId - El ID de la salida activa.
 * @param {number} productoId - El ID del producto vendido.
 * @param {number} cantidadVacioGanado - La cantidad de envases vacíos obtenidos en la venta.
 * @param {number|null} ventaIdToExclude - (Opcional) El ID de la venta a excluir del cálculo (para el caso de edición).
 * @returns {Promise<number>} La cantidad de vacíos que deben ir al StockGlobal.
 */
const calculateVaciosParaGlobal = async (tx, salidaId, productoId, cantidadVacioGanado, ventaIdToExclude = null) => {
    console.log(`[Calculator] Iniciando para Salida ID: ${salidaId}, Producto ID: ${productoId}, Cantidad Vacío Ganado: ${cantidadVacioGanado}`);

    const producto = await tx.producto.findUnique({ where: { id: productoId } });
    if (!producto || !(producto.tipo.startsWith('GAS_') || producto.tipo.startsWith('AGUA_'))) {
        console.log(`[Calculator] Producto ${productoId} no requiere conciliación de envases.`);
        return 0;
    }

    // 1. Contar vacíos ya devueltos físicamente en reabastecimientos para este tipo de envase.
    const reabastecimientos = await tx.reabastecimiento.findMany({
        where: { salidaId },
        include: { detalles: { where: { producto: { tipo: producto.tipo } } } }
    });
    const totalVaciosDevueltosFisicamente = reabastecimientos.flatMap(r => r.detalles).reduce((sum, d) => sum + d.cantidadVacioDevuelto, 0);
    console.log(`[Calculator] Total vacíos devueltos físicamente para tipo ${producto.tipo}: ${totalVaciosDevueltosFisicamente}`);

    // 2. Contar productos ya vendidos de este tipo (excluyendo la venta actual si se está editando).
    const whereClauseVentasAnteriores = {
        salidaId: salidaId,
        // Buscamos ventas que contengan productos del mismo tipo
        productos: { some: { producto: { tipo: producto.tipo } } },
    };
    if (ventaIdToExclude) {
        whereClauseVentasAnteriores.id = { not: ventaIdToExclude };
    }

    const ventasAnteriores = await tx.venta.findMany({
        where: whereClauseVentasAnteriores,
        include: {
            productos: { where: { producto: { tipo: producto.tipo } } }, // Solo productos del tipo relevante
            pendientes: true // Todos los pendientes de la venta
        }
    });

    let totalVendidoNormalAntes = 0;
    ventasAnteriores.forEach(v => {
        v.productos.forEach(p => {
            // Una venta se considera "normal" (genera un vacío para el corredor) si NO se vendió con envase
            // Y si NO tiene envases pendientes para ese producto.
            const esPendienteEnVenta = v.pendientes.some(pen => pen.productoId === p.productoId);
            // ✨ CORRECCIÓN: Excluir explícitamente las ventas pendientes del cálculo.
            if (!p.seVendioConEnvase && !esPendienteEnVenta) {
                totalVendidoNormalAntes += p.cantidadLleno;
            }
        });
    });
    console.log(`[Calculator] Total vendido normal (sin envase/pendiente) ANTES de esta operación: ${totalVendidoNormalAntes}`);

    // 3. Calcular cuántos vacíos de ESTA venta deben ir al StockGlobal.
    const vaciosPorJustificarAntes = Math.max(0, totalVendidoNormalAntes - totalVaciosDevueltosFisicamente);
    const vaciosPorJustificarDespues = Math.max(0, (totalVendidoNormalAntes + cantidadVacioGanado) - totalVaciosDevueltosFisicamente);
    const vaciosParaGlobal = vaciosPorJustificarDespues - vaciosPorJustificarAntes;
    console.log(`[Calculator] Vacíos para StockGlobal calculados: ${vaciosParaGlobal}. (Antes: ${vaciosPorJustificarAntes}, Después: ${vaciosPorJustificarDespues})`);

    return vaciosParaGlobal;
};

/**
 * Función para crear una nueva venta.
 */
const createVenta = async (req, res) => {
  const usuarioId = req.usuario.id; // Obtenido del middleware de autenticación
  const {
    salidaId,
    clienteNombre,
    clienteDireccion,
    productos,
    pagoEfectivo,
    pagoYapePlin,
    pagoVale,
    montoPendiente,
    esPendiente,
    pendientes, // Asegúrate de que el frontend envíe este array
  } = req.body;

  if (!salidaId || !productos || !Array.isArray(productos)) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: salidaId y productos son requeridos.' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const salida = await tx.salida.findUnique({
        where: { id: parseInt(salidaId) },
      });

      if (!salida || salida.estado !== 'ABIERTO') {
        throw new Error('La salida seleccionada no existe o no está activa.');
      }

      // ✨ NUEVO: Mapa para almacenar los cambios pendientes para StockGlobal
      const stockGlobalChanges = new Map();

      // --- 1. Validar stock y actualizarlo atómicamente ANTES de crear la venta ---
      for (const item of productos) {
        const { productoId, cantidadLleno, cantidadVacio, seVendioConEnvase } = item;

        if (cantidadLleno <= 0) {
          throw new Error(`La cantidad a vender para el producto ID ${productoId} debe ser mayor a cero.`);
        }

        const updateResult = await tx.stockCorredor.updateMany({
          where: {
            salidaId: parseInt(salidaId),
            productoId: productoId,
            cantidadLleno: { gte: cantidadLleno }, // Comprobación atómica
          },
          data: {
            cantidadLleno: { decrement: cantidadLleno }, // Solo descontamos llenos aquí
          },
        });

        if (updateResult.count === 0) {
          const productoInfo = await tx.producto.findUnique({ where: { id: productoId }, select: { nombre: true } });
          const stockActual = await tx.stockCorredor.findFirst({ where: { salidaId: parseInt(salidaId), productoId: productoId }, select: { cantidadLleno: true } });
          throw new Error(`Stock insuficiente para "${productoInfo.nombre}". Se intentó vender ${cantidadLleno} pero solo hay ${stockActual?.cantidadLleno || 0} disponible(s).`);
        }

        // Usamos la cantidad de vacíos que el frontend calculó, que ya considera los pendientes.
        const cantidadVacioGanado = cantidadVacio || 0;

        if (cantidadVacioGanado > 0) {
            // El corredor siempre recibe el vacío en su stock personal
            await tx.stockCorredor.updateMany({ where: { salidaId: parseInt(salidaId), productoId }, data: { cantidadVacio: { increment: cantidadVacioGanado } } });
            
            // La función auxiliar CALCULA si parte de esto debe ir al stock global
            const vaciosParaGlobal = await calculateVaciosParaGlobal(tx, parseInt(salidaId), productoId, cantidadVacioGanado);
            if (vaciosParaGlobal > 0) {                
                const productoInfo = await tx.producto.findUnique({ where: { id: productoId } });
                if (productoInfo) {
                    // Almacenar el cambio para ejecutarlo después de tener el ID de la venta
                    stockGlobalChanges.set(productoInfo.tipo, (stockGlobalChanges.get(productoInfo.tipo) || 0) + vaciosParaGlobal);
                }
            }
        }

      }

      // --- 2. Calcular totales y crear la venta (ahora que el stock está confirmado) ---
      let totalVenta = 0;
      const productosVendidosData = [];

      // --- 2. Calcular totales y crear la venta (ahora que el stock está confirmado) ---
      // ✨ CORRECCIÓN: El total de la venta ahora es la suma de los subtotales enviados desde el frontend.
      totalVenta = productos.reduce((sum, item) => sum + (item.subtotal || 0), 0);

      for (const item of productos) {
        const { productoId, cantidadLleno, cantidadVacio, precioUnitario, esVale, seVendioConEnvase, subtotal, cantidadVales } = item;
        productosVendidosData.push({
          productoId,
          cantidadLleno,
          cantidadVacio: cantidadVacio || 0,
          precioUnitario,
          esVale: esVale || false,
          seVendioConEnvase: seVendioConEnvase || false,
          subtotal: subtotal || 0,
          cantidadVales: cantidadVales || 0,
        });
      }

      // ✨ CORRECCIÓN: El total pagado ahora incluye el valor de los vales.
      const totalPagado =
        (Number(pagoEfectivo) || 0) +
        (Number(pagoYapePlin) || 0) +
        (Number(pagoVale) || 0) +
        (Number(montoPendiente) || 0);

      if (Math.abs(totalVenta - totalPagado) > 0.02) {
        throw new Error(`El total de la venta (${totalVenta.toFixed(2)}) no coincide con el total pagado (${totalPagado.toFixed(2)}) y el monto pendiente.`);
      }

      const nuevaVenta = await tx.venta.create({
        data: {
          salidaId: parseInt(salidaId),
          usuarioId: usuarioId,
          clienteNombre: clienteNombre || "Cliente al paso",
          clienteDireccion: clienteDireccion || null,
          total: totalVenta,
          pagoEfectivo: Number(pagoEfectivo) || 0,
          pagoYapePlin: Number(pagoYapePlin) || 0,
          pagoVale: Number(pagoVale) || 0,
          esPendiente: Boolean(esPendiente),
          montoPendiente: Number(montoPendiente) || 0,
          productos: {
            create: productosVendidosData.map(p => ({
              productoId: p.productoId,
              cantidad: p.cantidadLleno + p.cantidadVacio,
              cantidadLleno: p.cantidadLleno,
              cantidadVacio: p.cantidadVacio,
              precioUnitario: p.precioUnitario,
              esVale: p.esVale,
              seVendioConEnvase: p.seVendioConEnvase,
              cantidadVales: p.cantidadVales || 0 // ✨ LÍNEA AÑADIDA
            }))
          },
          // --- 4. Crear los registros de envases pendientes ---
          pendientes: {
            create: (pendientes || []).map(p => ({
              productoId: p.productoId,
              cantidad: p.cantidad,
            }))
          },
        },
        include: { productos: true, pendientes: true }
      });

      // --- 5. Aplicar los cambios a StockGlobal y registrar en el historial AHORA que tenemos el ID de la venta ---
      for (const [tipoProducto, cambio] of stockGlobalChanges.entries()) {
        if (cambio > 0) {
            await logStockChange(
                tx,
                tipoProducto,
                { 
                    stockVacio: { increment: cambio },
                    stockTotal: { increment: cambio }
                },
                cambio,
                'VENTA_NORMAL',
                `Venta #${nuevaVenta.id}`,
                nuevaVenta.id,
                nuevaVenta.salidaId
            );
            console.log(`[CREATE-APPLY] Se incrementó StockGlobal para ${tipoProducto} en ${cambio}.`);
        }
      }

      // --- 3. Crear deuda si aplica ---
      if (esPendiente && montoPendiente > 0) {
        await tx.deuda.create({
          data: {
            salidaId: parseInt(salidaId),
            ventaId: nuevaVenta.id,
            nombreCliente: clienteNombre || "Cliente al paso",
            monto: Number(montoPendiente)
          }
        });
      }

      // --- Registrar eventos informativos en el historial de stock ---
      for (const item of nuevaVenta.productos) {
          const productoInfo = await tx.producto.findUnique({ where: { id: item.productoId } });
          if (productoInfo && (productoInfo.tipo.startsWith('GAS_') || productoInfo.tipo.startsWith('AGUA_'))) {
              // Registrar si fue venta con envase (evento informativo, no cambia stock)
              if (item.seVendioConEnvase) {
                  await logStockGlobalChange(tx, productoInfo.tipo, 0, 'VENTA_CON_ENVASE', `Venta #${nuevaVenta.id}`, nuevaVenta.id, nuevaVenta.salidaId);
              }

              // Registrar si fue venta con envase pendiente (evento informativo, no cambia stock)
              const esPendiente = nuevaVenta.pendientes.some(p => p.productoId === item.productoId);
              if (esPendiente) {
                  const pendienteInfo = nuevaVenta.pendientes.find(p => p.productoId === item.productoId);
                  await logStockGlobalChange(
                      tx, 
                      productoInfo.tipo, 
                      0, 
                      'VENTA_PENDIENTE', 
                      `Venta #${nuevaVenta.id} (${pendienteInfo.cantidad} pendiente(s))`,
                      nuevaVenta.id,
                      nuevaVenta.salidaId
                  );
              }
          }
      }

      return nuevaVenta;
    });

    res.status(201).json(resultado);
  } catch (error) {
    console.error('Error al crear la venta:', error);
    res.status(500).json({ error: error.message || 'Hubo un problema al crear la venta.' });
  }
};

/**
 * Obtener todas las ventas
 */
const getVentas = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        salida: { 
          include: { corredor: true } 
        },
        // Incluir el usuario que registró la venta
        usuario: { select: { id: true, nombre: true } },
        productos: { include: { producto: true } },
        deuda: true
      },
      orderBy: { fecha: 'desc' },
    });
    res.status(200).json(ventas);
  } catch (error) {
    console.error('Error al obtener las ventas:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener las ventas.' });
  }
};

/**
 * Obtener una sola venta por ID
 */
const getVentaById = async (req, res) => {
  const { id } = req.params;
  try {
    const venta = await prisma.venta.findUnique({
      where: { id: parseInt(id) },
      include: {
        salida: {
          include: {
            corredor: true,
            // Incluir el usuario que creó la salida (contexto adicional)
            usuario: { select: { id: true, nombre: true } }
          }
        },
        productos: {
          include: {
            producto: true
          }
        },
        // Incluir el usuario que registró la venta
        usuario: { select: { id: true, nombre: true } },
        deuda: true,
        pendientes: {
          include: {
            producto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    res.status(200).json(venta);
  } catch (error) {
    console.error('Error al obtener los detalles de la venta:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los detalles de la venta.' });
  }
};

/**
 * Actualiza una venta.
 * Permite la edición completa si la salida está 'ABIERTA'.
 * Permite la edición de campos de pago si la salida está en otro estado (ej. 'FINALIZADO').
 */
const updateVenta = async (req, res) => {
    const { id } = req.params;
    const ventaId = parseInt(id);
    // Filtramos el body para quitar campos que no deberían llegar, como el objeto 'salida' completo
    const { salida, ...dataToUpdate } = req.body;

    try {
        const updatedVenta = await prisma.$transaction(async (tx) => {
            // 1. Obtener el estado actual de la venta y su salida
            const ventaActual = await tx.venta.findUnique({
                where: { id: ventaId },
                include: {
                    salida: true,
                    productos: true,
                    pendientes: true,
                    deuda: true
                }
            });

            if (!ventaActual) {
                throw new Error('Venta no encontrada.');
            }

            const isSalidaActiva = ventaActual.salida.estado === 'ABIERTO';

            // --- LÓGICA DE DEVOLUCIÓN DE ENVASES PENDIENTES (SOLO PARA SALIDAS FINALIZADAS) ---
            // ... (código existente sin cambios)
            // Si la salida NO está activa, cualquier envase pendiente que se salde va directo al almacén global.
            if (!isSalidaActiva) {
                const oldPendingsMap = new Map(ventaActual.pendientes.map(p => [p.productoId, p.cantidad]));
                const newPendingsMap = new Map((dataToUpdate.pendientes || []).map(p => [p.productoId, p.cantidad]));
                const allProductIdsWithPendings = new Set([...oldPendingsMap.keys(), ...newPendingsMap.keys()]);

                for (const productoId of allProductIdsWithPendings) {
                    const cantidadDevuelta = (oldPendingsMap.get(productoId) || 0) - (newPendingsMap.get(productoId) || 0);

                    if (cantidadDevuelta > 0) {
                        // El cliente devolvió envases. Van directo al almacén global.
                        const productoInfo = await tx.producto.findUnique({ where: { id: productoId } });
                        if (productoInfo && (productoInfo.tipo.startsWith('GAS_') || productoInfo.tipo.startsWith('AGUA_'))) {
                            // Registrar en el historial
                            await logStockChange(
                                tx,
                                productoInfo.tipo,
                                {
                                    stockVacio: { increment: cantidadDevuelta },
                                    stockTotal: { increment: cantidadDevuelta }
                                },
                                cantidadDevuelta,
                                'SALDO_PENDIENTE_POST_CIERRE',
                                `Venta #${ventaId}`,
                                ventaId,
                                ventaActual.salidaId
                            );
                        }
                    }
                }
            }

            // --- LÓGICA DE REVERSIÓN DE STOCK DEL CORREDOR (SOLO SI LA SALIDA ESTÁ ACTIVA) ---
            if (isSalidaActiva) {
                console.log(`[UPDATE-REVERT] Salida ${ventaActual.salidaId} está ABIERTA. Revertiendo Venta ID ${ventaId}.`);
                for (const item of ventaActual.productos) {
                    // 1. Revertir stock de llenos del corredor
                    await tx.stockCorredor.updateMany({
                        where: {
                            salidaId: ventaActual.salidaId,
                            productoId: item.productoId
                        },
                        data: {
                            cantidadLleno: { increment: item.cantidadLleno },
                        }
                    });
                    console.log(`[UPDATE-REVERT] Stock Corredor: +${item.cantidadLleno} llenos para Producto ID ${item.productoId}.`);

                    // 2. Revertir vacíos y el impacto en StockGlobal, usando la cantidad de vacíos que se guardó en la venta original.
                    // ✨ CORRECCIÓN: Usar la cantidad de vacíos que se guardó en la venta original.
                    const cantidadVacioOriginal = item.cantidadVacio || 0;

                    if (cantidadVacioOriginal > 0) {
                        // Revertimos el vacío que se le dio al corredor
                        await tx.stockCorredor.updateMany({
                            where: { salidaId: ventaActual.salidaId, productoId: item.productoId },
                            data: { cantidadVacio: { decrement: cantidadVacioOriginal } }
                        });
                        console.log(`[UPDATE-REVERT] Stock Corredor: -${cantidadVacioOriginal} vacíos para Producto ID ${item.productoId}.`);

                        // Revertimos el impacto en StockGlobal. Para ello, calculamos cuánto aportó la venta original y lo restamos.
                        const vaciosAportadosOriginalmente = await calculateVaciosParaGlobal(tx, ventaActual.salidaId, item.productoId, cantidadVacioOriginal, ventaId);
                        if (vaciosAportadosOriginalmente > 0) {
                            const productoInfo = await tx.producto.findUnique({ where: { id: item.productoId } });
                            if (productoInfo) { // Usar logStockChange para garantizar consistencia
                                await logStockChange(
                                    tx,
                                    productoInfo.tipo,
                                    { 
                                        stockVacio: { decrement: vaciosAportadosOriginalmente },
                                        stockTotal: { decrement: vaciosAportadosOriginalmente }
                                    },
                                    -vaciosAportadosOriginalmente, 'REVERSION_VENTA_NORMAL', `Edición de Venta #${ventaId}`
                                );
                                console.log(`[UPDATE-REVERT] Stock Global: -${vaciosAportadosOriginalmente} vacíos para tipo ${productoInfo.tipo}.`);
                            }
                        }
                    }

                    // 3. Revertir el impacto de "venta con envase" del estado ANTERIOR
                    if (item.seVendioConEnvase) {
                    }
                }
            }

            // --- LÓGICA DE ACTUALIZACIÓN ---

            // Eliminar relaciones antiguas para recrearlas con los nuevos datos
            if (ventaActual.deuda) await tx.deuda.delete({ where: { ventaId } });
            await tx.pendiente.deleteMany({ where: { ventaId } });
            await tx.ventaProducto.deleteMany({ where: { ventaId } });

            // Extraer los nuevos datos del body
            // ✨ CORRECCIÓN: Extraemos y descartamos el 'id' para que no se pase en el 'data' del update.
            // ✨ CORRECCIÓN 2: También descartamos 'salidaId', que no se puede actualizar.
            // ✨ CORRECCIÓN 3: También descartamos 'deuda', que se maneja por separado y no puede ser null.
            const { id: ventaIdFromPayload, salidaId: salidaIdFromPayload, deuda: deudaFromPayload, productos, pendientes, pagoEfectivo, pagoYapePlin, pagoVale, montoPendiente, esPendiente, ...ventaData } = dataToUpdate;

            // ✨ CORRECCIÓN: El nuevo total de la venta es la suma de los subtotales que vienen del frontend.
            const nuevoTotalVenta = productos.reduce((sum, p) => sum + (p.subtotal || 0), 0);

            // ✨ CORRECCIÓN: Validar que los nuevos totales cuadren, incluyendo el pago con vales.
            const nuevoTotalPagado =
                (Number(pagoEfectivo) || 0) +
                (Number(pagoYapePlin) || 0) +
                (Number(pagoVale) || 0) +
                (Number(montoPendiente) || 0);

            if (Math.abs(nuevoTotalVenta - nuevoTotalPagado) > 0.02) {
                throw new Error(`El nuevo total de la venta (${nuevoTotalVenta.toFixed(2)}) no coincide con el total pagado (${nuevoTotalPagado.toFixed(2)}).`);
            }
            // Actualizar la venta principal
            const ventaActualizada = await tx.venta.update({
                where: { id: ventaId },
                data: {
                    ...ventaData,
                    total: nuevoTotalVenta,
                    pagoEfectivo: Number(pagoEfectivo) || 0,
                    pagoYapePlin: Number(pagoYapePlin) || 0,
                    pagoVale: Number(pagoVale) || 0,
                    esPendiente: Boolean(esPendiente),
                    montoPendiente: Number(montoPendiente) || 0,
                    productos: {
                        create: productos.map(p => ({
                            productoId: p.productoId,
                            cantidad: p.cantidadLleno + (p.cantidadVacio || 0),
                            cantidadLleno: p.cantidadLleno,
                            cantidadVacio: p.cantidadVacio || 0,
                            precioUnitario: p.precioUnitario,
                            esVale: p.esVale || false,
                            seVendioConEnvase: p.seVendioConEnvase || false,
                            cantidadVales: p.cantidadVales || 0 // ✨ LÍNEA AÑADIDA
                        }))
                    },
                    pendientes: {
                        create: (pendientes || []).map(p => ({
                            productoId: p.productoId,
                            cantidad: p.cantidad,
                        }))
                    },
                },
            });

            // --- LÓGICA DE APLICACIÓN DE NUEVO STOCK (SOLO SI LA SALIDA ESTÁ ACTIVA) ---
            for (const item of productos) {
                if (isSalidaActiva) {
                    console.log(`[UPDATE-APPLY] Aplicando nuevo estado para Producto ID ${item.productoId}.`);
                    // 1. Descontar llenos y gestionar vacíos en el stock del corredor
                    // ✨ CORRECCIÓN: Usar la cantidad de vacíos que ya viene calculada desde el frontend.
                    // Esta cantidad ya considera si hay pendientes o si la venta fue con envase.
                    const cantidadVacioGanado = item.cantidadVacio || 0;

                    const updateResult = await tx.stockCorredor.updateMany({
                        where: {
                            salidaId: ventaActual.salidaId,
                            productoId: item.productoId
                        },
                        data: {
                            cantidadLleno: { decrement: item.cantidadLleno },
                            cantidadVacio: { increment: cantidadVacioGanado }
                        }
                    });
                    console.log(`[UPDATE-APPLY] Stock Corredor: -${item.cantidadLleno} llenos, +${cantidadVacioGanado} vacíos para Producto ID ${item.productoId}.`);

                    // 2. Lógica de conciliación de vacíos para StockGlobal (idéntica a createVenta)
                    if (cantidadVacioGanado > 0) {
                        // Llamamos a la función auxiliar, EXCLUYENDO la venta actual de los cálculos de "ventas anteriores"
                        const vaciosParaGlobal = await calculateVaciosParaGlobal(tx, ventaActual.salidaId, item.productoId, cantidadVacioGanado, ventaId);
                        if (vaciosParaGlobal > 0) {                            
                            const productoInfo = await tx.producto.findUnique({ where: { id: item.productoId } }); // Usar logStockChange
                            await logStockChange(
                                tx,
                                productoInfo.tipo,
                                { stockVacio: { increment: vaciosParaGlobal }, stockTotal: { increment: vaciosParaGlobal } },
                                vaciosParaGlobal, 'VENTA_NORMAL', `Edición de Venta #${ventaId}`
                            );
                            console.log(`[UPDATE-APPLY] Stock Global: +${vaciosParaGlobal} vacíos para tipo ${productoInfo.tipo}.`);
                        }
                    }

                } else {
                    // Si la salida está finalizada, validamos que no se hayan cambiado las cantidades de productos.
                    const oldItem = ventaActual.productos.find(p => p.productoId === item.productoId);                    
                    // La validación solo debe fallar si 'cantidadLleno' se envía explícitamente Y es diferente.
                    // Si 'cantidadLleno' es undefined o null en el 'item' (porque no se está editando), la condición no se cumple y la actualización continúa.
                    const cantidadLlenoNueva = item.cantidadLleno;
                    if (!oldItem || (cantidadLlenoNueva !== undefined && cantidadLlenoNueva !== null && oldItem.cantidadLleno !== cantidadLlenoNueva)) {
                        throw new Error(`No se puede modificar la cantidad de productos vendidos en una salida ya finalizada.`);
                    }
                }
            }

            // Crear nueva deuda si aplica
            if (esPendiente && montoPendiente > 0) {
                await tx.deuda.create({
                    data: {
                        salidaId: ventaActual.salidaId,
                        ventaId: ventaActualizada.id,
                        nombreCliente: ventaActualizada.clienteNombre,
                        monto: Number(montoPendiente)
                    }
                });
            }

            // --- REGISTRO DE CAMBIOS EN HISTORIAL DE STOCK GLOBAL ---
            // Comparamos el estado viejo y nuevo para registrar solo las diferencias.
            const oldVentaConEnvaseMap = new Map(ventaActual.productos.map(p => [p.productoId, p.seVendioConEnvase]));
            const newVentaConEnvaseMap = new Map(productos.map(p => [p.productoId, p.seVendioConEnvase]));
            const oldPendientesMap = new Map(ventaActual.pendientes.map(p => [p.productoId, p.cantidad]));
            const newPendientesMap = new Map((pendientes || []).map(p => [p.productoId, p.cantidad]));
            const allProductIds = new Set([...newVentaConEnvaseMap.keys(), ...oldVentaConEnvaseMap.keys(), ...newPendientesMap.keys(), ...oldPendientesMap.keys()]);

            for (const productoId of allProductIds) {
                const oldConEnvase = oldVentaConEnvaseMap.get(productoId) || false;
                const newConEnvase = newVentaConEnvaseMap.get(productoId) || false;
                const oldPendiente = oldPendientesMap.get(productoId) || 0;
                const newPendiente = newPendientesMap.get(productoId) || 0;

                if (oldConEnvase !== newConEnvase) {
                    const productoInfo = await tx.producto.findUnique({ where: { id: productoId } });
                    if (productoInfo && (productoInfo.tipo.startsWith('GAS_') || productoInfo.tipo.startsWith('AGUA_'))) {
                        const motivo = newConEnvase ? 'VENTA_CON_ENVASE' : 'REVERSION_VENTA_CON_ENVASE';                        
                        await logStockGlobalChange(tx, productoInfo.tipo, 0, motivo, `Edición de Venta #${ventaId}`, ventaId, ventaActual.salidaId);
                    }
                }

                if (oldPendiente !== newPendiente) {
                    const productoInfo = await tx.producto.findUnique({ where: { id: productoId } });
                    if (productoInfo && (productoInfo.tipo.startsWith('GAS_') || productoInfo.tipo.startsWith('AGUA_'))) {
                        const motivo = newPendiente > oldPendiente ? 'VENTA_PENDIENTE' : 'REVERSION_VENTA_PENDIENTE';                        
                        await logStockGlobalChange(tx, productoInfo.tipo, 0, motivo, `Edición de Venta #${ventaId}`, ventaId, ventaActual.salidaId);
                    }
                }
            }
            
            // ✨ RECONCILIACIÓN DE STOCK GLOBAL ✨
            await reconcileStockGlobal(tx);

            return ventaActualizada;
        });

        res.status(200).json({ message: 'Venta actualizada correctamente.', venta: updatedVenta });
    } catch (error) {
        console.error(`Error al actualizar la venta: ${error.message}`, error);
        res.status(500).json({ error: 'Hubo un problema al actualizar la venta.', details: error.message });
    }
};

/**
 * Eliminar venta
 */
const deleteVenta = async (req, res) => {
    const { id } = req.params;
    const ventaId = parseInt(id);

    try {
        await prisma.$transaction(async (tx) => {
            const venta = await tx.venta.findUnique({
                where: { id: ventaId },
                include: { productos: true, deuda: true, pendientes: true, salida: true }
            });

            if (!venta) {
                throw new Error('Venta no encontrada.');
            }

            // ✨ VALIDACIÓN DE SEGURIDAD AÑADIDA
            if (venta.salida.estado === 'FINALIZADO') {
                throw new Error('No se puede eliminar una venta de una jornada ya finalizada.');
            }

            // 1. Revertir el stock del corredor y del almacén global
            for (const item of venta.productos) {
                // Revertir stock del corredor
                await tx.stockCorredor.updateMany({
                    where: { salidaId: venta.salidaId, productoId: item.productoId },
                    data: {
                        cantidadLleno: { increment: item.cantidadLleno },
                        cantidadVacio: { decrement: item.cantidadVacio }
                    }
                });

                // --- Lógica de Reversión de Stock Global ---
                // Esta lógica es mutuamente excluyente. O se revierte una venta con envase, o se revierte una venta normal.
                const esPendiente = venta.pendientes.some(p => p.productoId === item.productoId);
                const fueVentaNormal = !item.seVendioConEnvase && !esPendiente;

                // ✨ NUEVO: Registrar la reversión de eventos informativos, sin afectar el stock.
                const productoInfo = await tx.producto.findUnique({ where: { id: item.productoId } });
                if (productoInfo && (productoInfo.tipo.startsWith('GAS_') || productoInfo.tipo.startsWith('AGUA_'))) {
                    if (item.seVendioConEnvase) {
                        await logStockGlobalChange(tx, productoInfo.tipo, 0, 'REVERSION_VENTA_CON_ENVASE', `Eliminación de Venta #${venta.id}`, venta.id, venta.salidaId);
                    }
                    if (esPendiente) {
                        await logStockGlobalChange(tx, productoInfo.tipo, 0, 'REVERSION_VENTA_PENDIENTE', `Eliminación de Venta #${venta.id}`, venta.id, venta.salidaId);
                    }
                }

                if (fueVentaNormal) { // Solo si fue una venta normal, se revierte el stock de vacíos.
                    // La venta fue normal. Se revierten los vacíos que pudo haber aportado al stock global.
                    const cantidadVacioOriginal = item.cantidadVacio || 0;
                    if (cantidadVacioOriginal > 0) {
                        const vaciosAportadosOriginalmente = await calculateVaciosParaGlobal(tx, venta.salidaId, item.productoId, cantidadVacioOriginal, ventaId);
                        if (vaciosAportadosOriginalmente > 0) {
                            if (productoInfo) {
                                await logStockChange(
                                    tx,
                                    productoInfo.tipo,
                                    {
                                        stockVacio: { decrement: vaciosAportadosOriginalmente },
                                        stockTotal: { decrement: vaciosAportadosOriginalmente } 
                                    },
                                    -vaciosAportadosOriginalmente, 'REVERSION_VENTA_NORMAL', `Eliminación de Venta #${venta.id}`
                                );
                                console.log(`[DELETE-REVERT] Stock Global: -${vaciosAportadosOriginalmente} vacíos y total para tipo ${productoInfo.tipo}.`);
                            }
                        }
                    }
                }
            }

            // 2. Eliminar registros dependientes ANTES de eliminar la venta
            if (venta.deuda) await tx.deuda.deleteMany({ where: { ventaId } });
            if (venta.pendientes.length > 0) await tx.pendiente.deleteMany({ where: { ventaId } });
            await tx.ventaProducto.deleteMany({ where: { ventaId } });

            // 3. Finalmente, eliminar la venta
            await tx.venta.delete({ where: { id: ventaId } });

            // 4. Reconciliar stock global como medida de seguridad
            await reconcileStockGlobal(tx);
        });

        res.status(200).json({ message: 'Venta eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la venta:', error);
        res.status(500).json({ error: 'Hubo un problema al eliminar la venta.', details: error.message });
    }
};

module.exports = {
  createVenta,
  getVentas,
  getVentaById,
  updateVenta,
  deleteVenta,
};
