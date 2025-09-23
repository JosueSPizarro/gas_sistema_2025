// src/controllers/deuda.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear una nueva deuda
const createDeuda = async (req, res) => {
  const { salidaId, nombreCliente, monto, pagado } = req.body;

  if (!salidaId || !nombreCliente || !monto) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: salidaId, nombreCliente, monto.' });
  }

  try {
    const nuevaDeuda = await prisma.deuda.create({
      data: {
        salidaId: parseInt(salidaId),
        nombreCliente,
        monto: parseFloat(monto),
        pagado: pagado || false,
      },
    });
    res.status(201).json(nuevaDeuda);
  } catch (error) {
    console.error('Error al crear la deuda:', error);
    res.status(500).json({ error: 'Hubo un problema al crear la deuda.' });
  }
};

// Obtener todas las deudas
const getAllDeudas = async (req, res) => {
  try {
    const deudas = await prisma.deuda.findMany({
      include: {
        salida: true,
      },
    });
    res.status(200).json(deudas);
  } catch (error) {
    console.error('Error al obtener las deudas:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener las deudas.' });
  }
};

// Obtener una deuda por ID
const getDeudaById = async (req, res) => {
  const { id } = req.params;
  try {
    const deuda = await prisma.deuda.findUnique({
      where: { id: parseInt(id) },
      include: { salida: true },
    });

    if (!deuda) {
      return res.status(404).json({ error: 'Deuda no encontrada.' });
    }
    res.status(200).json(deuda);
  } catch (error) {
    console.error('Error al obtener la deuda:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener la deuda.' });
  }
};

const getUnpaidDebts = async (req, res) => {
  try {
    const deudas = await prisma.deuda.findMany({
      where: {
        pagado: false,
      },
      include: {
        salida: {
          include: {
            corredor: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });
    res.status(200).json(deudas);
  } catch (error) {
    console.error('Error al obtener las deudas:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener las deudas.' });
  }
};

module.exports = {
  createDeuda,
  getAllDeudas,
  getDeudaById,
  getUnpaidDebts,
};