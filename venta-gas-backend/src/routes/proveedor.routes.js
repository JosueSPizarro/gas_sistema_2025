// src/routes/proveedor.routes.js
const express = require('express');
const router = express.Router();
const {
    getAllProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor,
} = require('../controllers/proveedor.controller');

// Rutas para el CRUD de Proveedores

router.get('/', getAllProveedores);
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor); // Soft delete

module.exports = router;
