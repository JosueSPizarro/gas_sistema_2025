// src/routes/stockCorredor.routes.js

const express = require('express');
const router = express.Router();
const {
  getAllStockCorredor,
  getStockCorredorById,
  createStockCorredor,
} = require('../controllers/stockCorredor.controller');

router.get('/', getAllStockCorredor);
router.get('/:id', getStockCorredorById);
router.post('/', createStockCorredor);

module.exports = router;