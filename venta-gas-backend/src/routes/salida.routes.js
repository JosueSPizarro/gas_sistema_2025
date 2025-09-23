// src/routes/salida.routes.js

const express = require('express');
const router = express.Router();
const {
  createSalida,
  liquidarSalidaCompleta,
  getAllSalidas,
  getSalidaById,
  getTotalStockByCorredor,
  cancelarSalida,
  reabastecerCorredor,
  finalizarReabastecimiento,
  setSalidaFinalizada,
  getVentasBySalidaId,
  saldarDiferencia,
} = require('../controllers/salida.controller');

const { protect, authorizePageAccess } = require('../middleware/authMiddleware');


// GET /api/salidas?corredorId=X&fecha=Y&estado=Z
router.get('/', protect, authorizePageAccess('/jornada'), getAllSalidas);

// POST /api/salidas
router.post('/', protect, authorizePageAccess('/jornada'),createSalida);

// GET /api/salidas/corredores/:id/total-stock
router.get('/corredores/:id/total-stock', protect, authorizePageAccess('/jornada'),getTotalStockByCorredor);

// GET /api/salidas/:id
router.get('/:id', protect, authorizePageAccess('/jornada'),getSalidaById);

// GET /api/salidas/:salidaId/ventas
router.get('/:salidaId/ventas', protect, authorizePageAccess('/jornada'),getVentasBySalidaId);

// PUT /api/salidas/:id/liquidar
router.put('/:id/liquidar', protect, authorizePageAccess('/jornada'),liquidarSalidaCompleta);

// PUT /api/salidas/:id/cancelar
router.put('/:id/cancelar', protect, authorizePageAccess('/jornada'),cancelarSalida);

// PUT /api/salidas/:id/reabastecer
router.put('/:id/reabastecer', protect, authorizePageAccess('/jornada'),reabastecerCorredor);

// PUT /api/salidas/:id/finalizar-reabastecimiento
router.put('/:id/finalizar-reabastecimiento', protect, authorizePageAccess('/jornada'),finalizarReabastecimiento);

// PUT /api/salidas/:id/finalizar-simple
router.put('/:id/finalizar-simple', protect, authorizePageAccess('/jornada'),setSalidaFinalizada);

// PATCH /api/salidas/:id/saldar-diferencia
router.patch('/:id/saldar-diferencia', protect, authorizePageAccess('/jornada'),saldarDiferencia);

module.exports = router;