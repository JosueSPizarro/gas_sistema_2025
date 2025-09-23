// src/controllers/pendiente.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear un nuevo registro de pendiente
const createPendiente = async (req, res) => {
  const { salidaId, nombreCliente, productoId, cantidad, entregado } = req.body;

  if (!salidaId || !nombreCliente || !productoId || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: salidaId, nombreCliente, productoId, cantidad.' });
  }

  try {
    const nuevoPendiente = await prisma.pendiente.create({
      data: {
        salidaId: parseInt(salidaId),
        nombreCliente,
        productoId: parseInt(productoId),
        cantidad: parseInt(cantidad),
        entregado: entregado || false,
      },
    });
    res.status(201).json(nuevoPendiente);
  } catch (error) {
    console.error('Error al crear el pendiente:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el pendiente.' });
  }
};

// Obtener todos los pendientes
const getAllPendientes = async (req, res) => {
  try {
    const pendientes = await prisma.pendiente.findMany({
      include: {
        salida: true,
        producto: true,
      },
    });
    res.status(200).json(pendientes);
  } catch (error) {
    console.error('Error al obtener los pendientes:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los pendientes.' });
  }
};

// Obtener un pendiente por ID
const getPendienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const pendiente = await prisma.pendiente.findUnique({
      where: { id: parseInt(id) },
      include: { salida: true, producto: true },
    });

    if (!pendiente) {
      return res.status(404).json({ error: 'Pendiente no encontrado.' });
    }
    res.status(200).json(pendiente);
  } catch (error) {
    console.error('Error al obtener el pendiente:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener el pendiente.' });
  }
};

const getPendingItems = async (req, res) => {
  try {
    const pendientes = await prisma.pendiente.findMany({
      where: {
        entregado: false,
      },
      include: {
        producto: {
          select: {
            nombre: true,
            tipo: true,
          },
        },
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
    res.status(200).json(pendientes);
  } catch (error) {
    console.error('Error al obtener los pendientes:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los pendientes.' });
  }
};

module.exports = {
  createPendiente,
  getAllPendientes,
  getPendienteById,
  getPendingItems,
};