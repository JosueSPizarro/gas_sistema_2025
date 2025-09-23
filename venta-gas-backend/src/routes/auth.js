const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Asegúrate que el nombre sea correcto

router.post('/login', authController.login);

module.exports = router;