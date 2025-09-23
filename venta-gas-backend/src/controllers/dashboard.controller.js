// src/controllers/dashboard.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardData = async (req, res) => {
  try {
    // 1. Obtener productos con stock bajo (usando el stockMinimo)
    const lowStockProducts = await prisma.producto.findMany({
      where: {
        stockLleno: {
          lte: prisma.producto.fields.stockMinimo,
        },

      },
      select: {
        id: true,
        nombre: true,
        stockLleno: true,
        stockMinimo: true,
        tipo: true,
      },
    });

    // 2. Obtener pendientes no entregados
    const pendingItems = await prisma.pendiente.findMany({
      where: {
        entregado: false,
      },
      include: {
        venta: {
          select: {
            id: true, // ID de la venta para la navegación
            clienteNombre: true,
            usuario: { // Usuario que registró la VENTA
              select: { id: true, nombre: true },
            },
            salida: {
              select: {
                id: true,
                corredor: {
                  select: { id: true, nombre: true }, // ID y nombre del corredor
                },
              },
            },
          },
        },
        producto: {
          select: {
            nombre: true, // Y el nombre del producto
          },
        },
      },
    });

    // 3. Obtener deudas no pagadas
    const unpaidDebts = await prisma.deuda.findMany({
      where: {
        pagado: false,
      },
      // Cambiado a 'select' para ser más explícito y eficiente
      select: {
        id: true,
        ventaId: true, // ID de la venta para la navegación
        nombreCliente: true,
        monto: true,
        venta: { // Incluimos la venta para obtener el usuario que la registró
          select: { 
            id: true, 
            usuario: { select: { id: true, nombre: true } },
            salida: { // Y de la venta, obtenemos la salida para el corredor
              select: { id: true, corredor: { select: { id: true, nombre: true } } }
            }
          },
        },
      },
    });

    // 4. (NUEVO) Obtener faltantes de corredores en salidas finalizadas
    const runnerDebts = await prisma.salida.findMany({
      where: {
        estado: 'FINALIZADO',
        diferencia: {
          lt: 0, // lt = less than (menor que cero)
        },
        diferenciaSaldada: false, // Solo mostrar faltantes no saldados
      },
      select: {
        id: true,
        fecha: true,
        diferencia: true,
        usuario: { select: { id: true, nombre: true } }, // Usuario que CREÓ la salida
        usuarioLiquidador: { select: { id: true, nombre: true } }, // Usuario que LIQUIDÓ la salida
        corredor: {
          select: {
            id: true, // ID del corredor para la navegación
            nombre: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    // 5. (NUEVO) Obtener el stock global de envases
    const stockGlobal = await prisma.stockGlobal.findMany({
        orderBy: {
            tipoProducto: 'asc'
        }
    });

    // 6. (NUEVO) Obtener el stock por producto individual
    const stockProductos = await prisma.producto.findMany({
        select: {
            id: true,
            nombre: true,
            tipo: true,
            stockLleno: true
        },
        // FIX: Para ordenar por múltiples campos, se debe usar un array de objetos.
        orderBy: [ { tipo: 'asc' }, { nombre: 'asc' } ]
    });

    console.log('Faltantes de Corredores encontrados:', runnerDebts);

    res.status(200).json({
      lowStockProducts,
      pendingItems,
      unpaidDebts,
      runnerDebts, // Descomentado para enviar los datos
      stockGlobal,
      stockProductos,
    });
  } catch (error) {
    console.error('Error al obtener los datos del dashboard:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los datos del dashboard.' });
  }
}; 

module.exports = {
  getDashboardData,
};