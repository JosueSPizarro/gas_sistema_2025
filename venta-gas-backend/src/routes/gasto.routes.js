// src/routes/gasto.routes.js

const express = require('express');
const router = express.Router();
const {
  createGasto,
  getAllGastos,
  getGastoById,
} = require('../controllers/gasto.controller');

router.post('/', createGasto);
router.get('/', getAllGastos);
router.get('/:id', getGastoById);

module.exports = router;