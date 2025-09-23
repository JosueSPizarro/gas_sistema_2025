// src/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Asegúrate de que JWT_SECRET esté en tus variables de entorno (.env)
const JWT_SECRET = process.env.JWT_SECRET || 'un_secreto_super_seguro_y_largo_que_solo_tu_conoces_y_no_debes_compartir';

// --- Función de Login ---
exports.login = async (req, res) => {
    // Usaremos 'usuario' o 'email' para el login. Asumo que es 'usuario' por tu código original.
    // Si usas 'email' para el login, cambia 'usuario' a 'email' aquí y en el frontend.
    const { usuario, password } = req.body;

    try {
        const user = await prisma.usuario.findUnique({
            where: { usuario }, // Puedes cambiar a { email } si usas email para login
            // Incluimos las páginas a las que el usuario tiene acceso y si es master
            include: {
                pages: {
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
            },
        });

        if (!user || !user.activo) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo.' });
        }

        const passwordValido = await bcrypt.compare(password, user.password);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generar el token JWT
        // Ahora el token incluirá isMaster y las páginas a las que tiene acceso
        const token = jwt.sign(
            {
                id: user.id,
                usuario: user.usuario,
                isMaster: user.isMaster, // Incluimos si es master
                // No incluimos 'pages' directamente en el token por su tamaño y dinamismo.
                // En su lugar, se consulta al hacer findUnique en el login y se envía en la respuesta.
            },
            JWT_SECRET,
            { expiresIn: '8h' } // Token expira en 8 horas
        );

        // Devolver la información del usuario incluyendo si es master y sus páginas accesibles
        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                usuario: user.usuario, // El nombre de usuario
                email: user.email,     // El email (si lo tienes)
                isMaster: user.isMaster, // Si es master
                pages: user.pages.map(up => ({ // Las páginas accesibles por este usuario
                    id: up.page.id,
                    name: up.page.name,
                    path: up.page.path
                }))
            },
        });
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión', detalles: error.message });
    }
};

// --- La función registrarUsuario YA NO DEBE ESTAR AQUÍ ---
// Esta función será reemplazada por la lógica de 'Crear Nuevo Usuario'
// dentro de las rutas de gestión de usuarios (en el archivo `userRoutes.js` que ya te di),
// y solo será accesible por el usuario 'master'.
// Por lo tanto, puedes ELIMINAR la siguiente función de este archivo:
/*
exports.registrarUsuario = async (req, res) => {
    const { nombre, usuario, password, rolId } = req.body;

    try {
        const existe = await prisma.usuario.findUnique({ where: { usuario } });
        if (existe) {
            return res.status(400).json({ error: 'Este usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre,
                usuario,
                password: hashedPassword,
                rolId, // ESTO SE ELIMINA
            },
        });

        res.status(201).json({ mensaje: 'Usuario creado correctamente', usuario: nuevoUsuario });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el usuario', detalles: error.message });
    }
};
*/