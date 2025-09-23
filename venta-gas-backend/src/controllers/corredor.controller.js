// src/controllers/corredor.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los corredores
const getAllCorredores = async (req, res) => {
  try {
    const corredores = await prisma.corredor.findMany({
      // Puedes incluir las salidas, stock, etc., si lo necesitas
      include: {
        salidas: true,
        stockCorredor: true,
      },
    });
    res.status(200).json(corredores);
  } catch (error) {
    console.error('Error al obtener los corredores:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los corredores.' });
  }
};

// Obtener un corredor por ID
const getCorredorById = async (req, res) => {
  const { id } = req.params;
  try {
    const corredor = await prisma.corredor.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        salidas: true,
        stockCorredor: true,
      },
    });

    if (!corredor) {
      return res.status(404).json({ error: 'Corredor no encontrado.' });
    }

    res.status(200).json(corredor);
  } catch (error) {
    console.error('Error al obtener el corredor:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener el corredor.' });
  }
};

// Crear un nuevo corredor
const createCorredor = async (req, res) => {
  const { nombre, dni, telefono } = req.body;

  if (!nombre || dni === undefined || telefono === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, DNI y teléfono.' });
  }

  try {
    const nuevoCorredor = await prisma.corredor.create({
      data: {
        nombre,
        dni: parseInt(dni),
        telefono: telefono,
      },
    });
    res.status(201).json(nuevoCorredor);
  } catch (error) {
    console.error('Error al crear el corredor:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el corredor.' });
  }
};

// Actualizar un corredor
const updateCorredor = async (req, res) => {
  const { id } = req.params;
  const { nombre, dni, telefono, activo } = req.body;

  try {
    const corredorActualizado = await prisma.corredor.update({
      where: {
        id: parseInt(id),
      },
      data: {
        nombre,
        dni: dni !== undefined ? parseInt(dni) : undefined,
        telefono: telefono,
        activo: typeof activo === 'boolean' ? activo : undefined, // Permite actualizar el estado de activo
      },
    });

    res.status(200).json(corredorActualizado);
    
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Corredor no encontrado para actualizar.' });
    }
    console.error('Error al actualizar el corredor:', error);
    res.status(500).json({ error: 'Hubo un problema al actualizar el corredor.' });
  }
};

// Desactivar un corredor (cambiar su estado a inactivo)
// SUGERENCIA: Renombrar la función a `deactivateCorredor` para que sea más claro que es un "soft delete".
const deleteCorredor = async (req, res) => { // o `deactivateCorredor`
  const { id } = req.params;
  try {
    const corredorEliminado = await prisma.corredor.update({
      where: {
        id: parseInt(id),
      },
      data: {
        activo: false, // Mejor práctica es desactivar en lugar de eliminar
      },
    });
    res.status(200).json(corredorEliminado);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Corredor no encontrado para desactivar.' });
    }
    console.error('Error al desactivar el corredor:', error);
    res.status(500).json({ error: 'Hubo un problema al desactivar el corredor.' });
  }
};



module.exports = {
  getAllCorredores,
  getCorredorById,
  createCorredor,
  updateCorredor,
  deleteCorredor,
};