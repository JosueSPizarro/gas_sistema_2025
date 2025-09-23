// src/routes/dashboard.routes.js

const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboard.controller');
const { protect, authorizePageAccess } = require('../middleware/authMiddleware');

router.get('/', protect, authorizePageAccess('/dashboard'), getDashboardData);

module.exports = router;