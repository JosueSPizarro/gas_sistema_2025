// src/routes/compra.routes.js
const express = require('express');
const router = express.Router();
const {
    getAllCompras,
    getCompraById,
    createCompra,
} = require('../controllers/compra.controller');
const { protect, authorizePageAccess } = require('../middleware/authMiddleware');

router.get('/', protect, authorizePageAccess('/compras'), getAllCompras);
router.get('/:id', protect, authorizePageAccess('/compras'), getCompraById);
router.post('/', protect, authorizePageAccess('/compras'), createCompra);

module.exports = router;
