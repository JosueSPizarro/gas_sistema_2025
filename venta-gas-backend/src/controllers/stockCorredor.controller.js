// src/controllers/stockCorredor.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todo el stock de todos los corredores
const getAllStockCorredor = async (req, res) => {
  try {
    const stockCorredores = await prisma.stockCorredor.findMany({
      include: {
        corredor: true,
        producto: true,
      },
    });
    res.status(200).json(stockCorredores);
  } catch (error) {
    console.error('Error al obtener el stock de corredores:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener el stock de corredores.' });
  }
};

// Obtener el stock de un corredor por ID
const getStockCorredorById = async (req, res) => {
  const { id } = req.params;
  try {
    const stockCorredor = await prisma.stockCorredor.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        corredor: true,
        producto: true,
      },
    });

    if (!stockCorredor) {
      return res.status(404).json({ error: 'Registro de stock no encontrado.' });
    }

    res.status(200).json(stockCorredor);
  } catch (error) {
    console.error('Error al obtener el registro de stock:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener el registro de stock.' });
  }
};

// Crear un nuevo registro de stock para un corredor
const createStockCorredor = async (req, res) => {
  const { corredorId, productoId, cantidad } = req.body;

  if (!corredorId || !productoId || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: corredorId, productoId, cantidad.' });
  }

  try {
    const nuevoStock = await prisma.stockCorredor.create({
      data: {
        corredorId: parseInt(corredorId),
        productoId: parseInt(productoId),
        cantidad: parseInt(cantidad),
      },
    });
    res.status(201).json(nuevoStock);
  } catch (error) {
    console.error('Error al crear el registro de stock:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el registro de stock.' });
  }
};

module.exports = {
  getAllStockCorredor,
  getStockCorredorById,
  createStockCorredor,
};