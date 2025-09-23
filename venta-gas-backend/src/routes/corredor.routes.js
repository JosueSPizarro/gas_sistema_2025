// src/routes/corredor.routes.js

const express = require('express');
const router = express.Router();
const {
  getAllCorredores,
  getCorredorById,
  createCorredor,
  updateCorredor,
  deleteCorredor,
  
} = require('../controllers/corredor.controller');

router.get('/', getAllCorredores);
router.get('/:id', getCorredorById);
router.post('/', createCorredor);
router.put('/:id', updateCorredor);
router.delete('/:id', deleteCorredor); // Usamos DELETE para la desactivación


module.exports = router;