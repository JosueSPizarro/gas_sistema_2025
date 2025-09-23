// src/routes/pendiente.routes.js

const express = require('express');
const router = express.Router();
const {
  createPendiente,
  getAllPendientes,
  getPendienteById,
} = require('../controllers/pendiente.controller');

router.post('/', createPendiente);
router.get('/', getAllPendientes);
router.get('/:id', getPendienteById);

module.exports = router;