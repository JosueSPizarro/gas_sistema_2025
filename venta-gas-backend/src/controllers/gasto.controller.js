// src/controllers/gasto.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear un nuevo gasto
const createGasto = async (req, res) => {
  const { salidaId, concepto, monto } = req.body;

  if (!salidaId || !concepto || !monto) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: salidaId, concepto, monto.' });
  }

  try {
    const nuevoGasto = await prisma.gasto.create({
      data: {
        salidaId: parseInt(salidaId),
        concepto,
        monto: parseFloat(monto),
      },
    });
    res.status(201).json(nuevoGasto);
  } catch (error) {
    console.error('Error al crear el gasto:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el gasto.' });
  }
};

// Obtener todos los gastos
const getAllGastos = async (req, res) => {
  try {
    const gastos = await prisma.gasto.findMany({
      include: {
        salida: true,
      },
    });
    res.status(200).json(gastos);
  } catch (error) {
    console.error('Error al obtener los gastos:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los gastos.' });
  }
};

// Obtener un gasto por ID
const getGastoById = async (req, res) => {
  const { id } = req.params;
  try {
    const gasto = await prisma.gasto.findUnique({
      where: { id: parseInt(id) },
      include: { salida: true },
    });

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }
    res.status(200).json(gasto);
  } catch (error) {
    console.error('Error al obtener el gasto:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener el gasto.' });
  }
};

module.exports = {
  createGasto,
  getAllGastos,
  getGastoById,
};