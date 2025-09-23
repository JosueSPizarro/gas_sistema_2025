// src/routes/stockGlobal.routes.js
const express = require('express');
const router = express.Router();
const { getStockGlobal, updateStockVacio, getHistorialStockGlobal, getDailySummary } = require('../controllers/stockGlobal.controller');
const { protect, authorizeMaster } = require('../middleware/authMiddleware');

// Rutas para StockGlobal
router.get('/', protect, getStockGlobal);
router.put('/:tipoProducto', protect, updateStockVacio);
router.get('/historial', protect, getHistorialStockGlobal);
router.get('/summary', protect, getDailySummary); // ✨ RUTA AÑADIDA

module.exports = router;
