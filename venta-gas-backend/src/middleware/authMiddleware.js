// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'un_secreto_super_seguro_y_largo_que_solo_tu_conoces_y_no_debes_compartir'; // Asegúrate de que coincida con el de authController

// --- Middleware para proteger rutas (Verifica el token y carga el usuario) ---
exports.protect = async (req, res, next) => {
    let token;

    // 1. Verificar si el token está presente en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener el token del header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar el token y decodificarlo
            const decoded = jwt.verify(token, JWT_SECRET);

            // 3. Buscar el usuario en la base de datos (incluyendo su estado isMaster y páginas accesibles)
            // Esto es crucial para que los middlewares de autorización puedan funcionar
            req.usuario = await prisma.usuario.findUnique({ // Cambiado de req.user a req.usuario para consistencia con tu código
                where: { id: decoded.id },
                select: { // Seleccionamos solo lo necesario para el middleware y protección de rutas
                    id: true,
                    nombre: true,
                    usuario: true, // Tu campo de nombre de usuario/login
                    telefono: true,
                    isMaster: true,
                    activo: true, // Importante para verificar si el usuario está activo
                    pages: { // Incluimos las páginas a las que tiene acceso
                        select: {
                            page: {
                                select: {
                                    id: true,
                                    name: true,
                                    path: true
                                }
                            }
                        }
                    }
                }
            });

            // Si el usuario no existe o está inactivo
            if (!req.usuario || !req.usuario.activo) {
                return res.status(401).json({ message: 'No autorizado, usuario no encontrado o inactivo.' });
            }

            next(); // Continuar con la siguiente función de middleware/ruta
        } catch (error) {
            console.error('Error en la autenticación (token inválido o expirado):', error.message);
            // Si el token es inválido o ha expirado
            return res.status(401).json({ message: 'No autorizado, token inválido o expirado.' });
        }
    }

    // Si no se proporcionó ningún token
    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
    }
};

// --- Middleware para autorizar solo al usuario MASTER ---
exports.authorizeMaster = (req, res, next) => {
    // req.usuario ya debe haber sido cargado por el middleware 'protect'
    if (!req.usuario || !req.usuario.isMaster) {
        return res.status(403).json({ message: 'Acceso denegado. Solo usuarios master pueden realizar esta acción.' });
    }
    next();
};

// --- Middleware para autorizar acceso basado en páginas ---
// Este middleware es más genérico y se usará para proteger rutas por URL/página.
// Recibe un 'requiredPath' (la ruta URL que el usuario necesita para acceder)
exports.authorizePageAccess = (requiredPath) => {
    return (req, res, next) => {
        // req.usuario ya debe haber sido cargado por el middleware 'protect'
        if (!req.usuario) {
            return res.status(401).json({ message: 'No autorizado, usuario no verificado.' });
        }

        // Si el usuario es master, tiene acceso a todo (supera cualquier restricción de página)
        if (req.usuario.isMaster) {
            return next();
        }

        // Si no es master, verificamos si tiene permiso para la página requerida
        const hasAccess = req.usuario.pages.some(userPage => userPage.page.path === requiredPath);

        if (!hasAccess) {
            return res.status(403).json({ message: `Acceso denegado. No tienes permisos para acceder a "${requiredPath}".` });
        }

        next();
    };
};

// Exportamos solo lo que necesitamos desde aquí
// module.exports = { protect, authorizeMaster, authorizePageAccess };