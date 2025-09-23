// src/routes/caja.routes.js
const express = require('express');
const router = express.Router();
const { getCierreDiario } = require('../controllers/caja.controller');
// const { protect } = require('../middleware/authMiddleware'); // Descomentar para proteger la ruta

// Por ahora, la ruta es pública, pero se puede proteger con `protect`
router.get('/cierre-diario', getCierreDiario);

module.exports = router;

