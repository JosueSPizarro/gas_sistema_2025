// fillTickets.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importa tu función generarCodigoVenta
// Ahora desestructuramos el objeto que module.exports devuelve
const { generarCodigoVenta } = require('./src/utils/imprimirTicket'); 

async function fillExistingTicketNumbers() {
  try {
    const ventasSinTicket = await prisma.venta.findMany({
      where: {
        ticketNumber: null,
      },
      select: {
        id: true,
      },
    });

    if (ventasSinTicket.length === 0) {
      console.log('✅ No se encontraron ventas sin ticketNumber para actualizar. ¡Todo listo!');
      return;
    }

    console.log(`⏳ Encontradas ${ventasSinTicket.length} ventas sin ticketNumber. Actualizando...`);

    for (const venta of ventasSinTicket) {
      const newTicketNumber = generarCodigoVenta(venta.id);
      await prisma.venta.update({
        where: { id: venta.id },
        data: { ticketNumber: newTicketNumber },
      });
      console.log(`✨ Actualizado Venta ID ${venta.id} con ticketNumber: ${newTicketNumber}`);
    }

    console.log('✅ Todos los ticketNumbers existentes han sido generados y asignados correctamente.');
  } catch (error) {
    console.error('❌ Error al llenar los ticketNumbers existentes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fillExistingTicketNumbers();