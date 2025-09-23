// src/controllers/proveedor.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener todos los proveedores
 */
const getAllProveedores = async (req, res) => {
    try {
        const proveedores = await prisma.proveedor.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.status(200).json(proveedores);
    } catch (error) {
        console.error('Error al obtener los proveedores:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener los proveedores.' });
    }
};

/**
 * Obtener un proveedor por su ID
 */
const getProveedorById = async (req, res) => {
    const { id } = req.params;
    try {
        const proveedor = await prisma.proveedor.findUnique({
            where: { id: parseInt(id) },
        });
        if (!proveedor) {
            return res.status(404).json({ error: 'Proveedor no encontrado.' });
        }
        res.status(200).json(proveedor);
    } catch (error) {
        console.error(`Error al obtener el proveedor ${id}:`, error);
        res.status(500).json({ error: 'Hubo un problema al obtener el proveedor.' });
    }
};

/**
 * Crear un nuevo proveedor
 */
const createProveedor = async (req, res) => {
    const { nombre, ruc, telefono, direccion } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El campo "nombre" es obligatorio.' });
    }

    try {
        const nuevoProveedor = await prisma.proveedor.create({
            data: { nombre, ruc, telefono, direccion, activo: true },
        });
        res.status(201).json(nuevoProveedor);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('ruc')) {
            return res.status(409).json({ error: 'Ya existe un proveedor con ese RUC.' });
        }
        console.error('Error al crear el proveedor:', error);
        res.status(500).json({ error: 'Hubo un problema al crear el proveedor.' });
    }
};

/**
 * Actualizar un proveedor existente
 */
const updateProveedor = async (req, res) => {
    const { id } = req.params;
    const { nombre, ruc, telefono, direccion, activo } = req.body;

    try {
        const proveedorActualizado = await prisma.proveedor.update({
            where: { id: parseInt(id) },
            data: { nombre, ruc, telefono, direccion, activo },
        });
        res.status(200).json(proveedorActualizado);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Proveedor no encontrado para actualizar.' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('ruc')) {
            return res.status(409).json({ error: 'Ya existe otro proveedor con ese RUC.' });
        }
        console.error(`Error al actualizar el proveedor ${id}:`, error);
        res.status(500).json({ error: 'Hubo un problema al actualizar el proveedor.' });
    }
};

/**
 * Eliminar un proveedor (cambia su estado a inactivo)
 */
const deleteProveedor = async (req, res) => {
    const { id } = req.params;
    try {
        const proveedorDesactivado = await prisma.proveedor.update({
            where: { id: parseInt(id) },
            data: { activo: false },
        });
        res.status(200).json({ message: 'Proveedor desactivado correctamente.', proveedor: proveedorDesactivado });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Proveedor no encontrado para desactivar.' });
        }
        console.error(`Error al desactivar el proveedor ${id}:`, error);
        res.status(500).json({ error: 'Hubo un problema al desactivar el proveedor.' });
    }
};

module.exports = {
    getAllProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor,
};
