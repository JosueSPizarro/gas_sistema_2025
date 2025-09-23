// src/routes/reportes.routes.js
const express = require('express');
const router = express.Router();
const { getReporteVentasDiarioGlobal, getReporteVentasPorCorredor } = require('../controllers/reportes.controller');
// const { protect } = require('../middleware/authMiddleware'); // Se puede añadir protección después

router.get('/ventas/global', /* protect, */ getReporteVentasDiarioGlobal);
router.get('/ventas/corredor/:corredorId', /* protect, */ getReporteVentasPorCorredor);

module.exports = router;
