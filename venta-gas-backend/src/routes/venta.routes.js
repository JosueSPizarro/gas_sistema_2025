// src/routes/venta.routes.js

const express = require('express');
const router = express.Router();
const { createVenta, getVentas, getVentaById, updateVenta, deleteVenta } = require('../controllers/venta.controller');
const { protect, authorizePageAccess } = require('../middleware/authMiddleware');

router.get('/', protect, authorizePageAccess('/ventas'), getVentas)
router.get('/:id', protect, authorizePageAccess('/ventas'), getVentaById)
router.post('/', protect, authorizePageAccess('/ventas'), createVenta);
router.put('/:id', protect, authorizePageAccess('/ventas'), updateVenta);
router.delete('/:id', protect, authorizePageAccess('/ventas'), deleteVenta);


module.exports = router;