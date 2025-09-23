// src/routes/deuda.routes.js

const express = require('express');
const router = express.Router();
const {
  createDeuda,
  getAllDeudas,
  getDeudaById,
} = require('../controllers/deuda.controller');

router.post('/', createDeuda);
router.get('/', getAllDeudas);
router.get('/:id', getDeudaById);

module.exports = router;