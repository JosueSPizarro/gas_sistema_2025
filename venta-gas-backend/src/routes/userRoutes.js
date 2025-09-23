// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeMaster } = require('../middleware/authMiddleware'); // Importamos los middlewares de protección y autorización

// --- ASEGÚRATE DE QUE ESTA RUTA ESTÁ SIEMPRE PRIMERO ENTRE LAS RUTAS GET DE USUARIOS ---
// Opcional: Obtener todas las páginas disponibles para la interfaz de asignación
router.get('/pages', protect, authorizeMaster, userController.getAllPages);

// Opcional: Asignar/desasignar páginas a un usuario (bulk update de permisos)
router.put('/:id/assign-pages', protect, authorizeMaster, userController.assignPagesToUser);


// --- Rutas Generales de CRUD de Usuarios ---
// Obtener todos los usuarios
router.get('/', protect, authorizeMaster, userController.getAllUsers);

// Obtener un usuario por ID
router.get('/:id', protect, authorizeMaster, userController.getUserById);

// Crear un nuevo usuario
router.post('/', protect, authorizeMaster, userController.createUser);

// Actualizar un usuario existente
router.put('/:id', protect, authorizeMaster, userController.updateUser);

// Eliminar un usuario
router.delete('/:id', protect, authorizeMaster, userController.deleteUser);



module.exports = router;