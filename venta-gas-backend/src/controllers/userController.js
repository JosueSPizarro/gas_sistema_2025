// src/controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler'); // Importamos asyncHandler

// --- Obtener todos los usuarios ---
// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private (Master o usuario con acceso a /usuarios)
exports.getAllUsers = asyncHandler(async (req, res) => { // Envuelto en asyncHandler
    const users = await prisma.usuario.findMany({
        select: {
            id: true,
            nombre: true,
            usuario: true,
            telefono: true,
            isMaster: true,
            activo: true,
            createdAt: true,
            updatedAt: true,
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
        orderBy: {
            nombre: 'asc'
        }
    });
    res.status(200).json(users);
});

// --- Obtener un usuario por ID ---
// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private (Master o usuario con acceso a /usuarios)
exports.getUserById = asyncHandler(async (req, res) => { // Envuelto en asyncHandler
    const { id } = req.params;
    console.log(`[Backend DEBUG] Intentando obtener usuario por ID. ID recibido: "${id}" (Tipo: ${typeof id})`);
    
    const userId = parseInt(id); // Asegurarse de que el ID es un entero

    if (isNaN(userId)) {
        res.status(400);
        throw new Error('ID de usuario inválido. Debe ser un número.');
    }

    const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
            id: true,
            nombre: true,
            usuario: true,
            telefono: true,
            isMaster: true,
            activo: true,
            createdAt: true,
            updatedAt: true,
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
        }
    });

    if (!user) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }
    res.status(200).json(user);
});


// --- Crear un nuevo usuario ---
exports.createUser = asyncHandler(async (req, res) => {
    // Recibimos 'pageIds' (array de números) del frontend
    const { nombre, usuario, telefono, password, isMaster, activo, pageIds } = req.body;

    // Validaciones básicas (puedes añadir más si es necesario)
    if (!nombre || !usuario || !telefono || !password) {
        res.status(400);
        throw new Error('Por favor, complete todos los campos obligatorios: nombre, usuario, telefono, password.');
    }

    // Verificar si el usuario o telefono ya existen
    const userExists = await prisma.usuario.findFirst({
        where: {
            OR: [
                { usuario: usuario },
                { telefono: telefono }
            ]
        }
    });

    if (userExists) {
        res.status(400);
        throw new Error('El nombre de usuario o el telefono ya están registrados.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.usuario.create({
        data: {
            nombre,
            usuario,
            telefono: telefono,
            password: hashedPassword,
            isMaster: isMaster || false,
            activo: activo !== undefined ? activo : true
        },
        select: { // Seleccionar también las relaciones para devolverlas
            id: true,
            nombre: true,
            usuario: true,
            telefono: true,
            isMaster: true,
            activo: true,
            createdAt: true,
            updatedAt: true,
            pages: { // Incluir las páginas asignadas en la respuesta
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

    // Asignar páginas si se proporcionan pageIds
    if (Array.isArray(pageIds) && pageIds.length > 0) {
        const connectData = pageIds.map(pageId => ({ 
            userId: newUser.id,
            pageId: pageId, 
        }));

        // Opcional: Verificar que los pageIds existan
        const existingPages = await prisma.page.findMany({
            where: { id: { in: pageIds } },
            select: { id: true },
        });
        const existingPageIdsSet = new Set(existingPages.map(p => p.id));

        const dataToCreate = connectData.filter(item => existingPageIdsSet.has(item.pageId));

        if (dataToCreate.length > 0) {
            await prisma.userPage.createMany({
                data: dataToCreate,
                skipDuplicates: true
            });
        }
    }

    res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
});

// --- Actualizar un usuario existente ---
exports.updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, usuario, telefono, password, isMaster, activo, pageIds } = req.body;
    const userId = parseInt(id);

    if (isNaN(userId)) {
        res.status(400);
        throw new Error('ID de usuario inválido. Debe ser un número.');
    }

    const user = await prisma.usuario.findUnique({
        where: { id: userId },
    });

    if (!user) {
        res.status(404);
        throw new Error('Usuario no encontrado para actualizar.');
    }

    const dataToUpdate = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre;
    if (usuario !== undefined) dataToUpdate.usuario = usuario;
    if (isMaster !== undefined) dataToUpdate.isMaster = isMaster;
    if (activo !== undefined) dataToUpdate.activo = activo;

    if (password) {
        dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    if (telefono !== undefined) {
        dataToUpdate.telefono = telefono;
    }

    const updatedUser = await prisma.usuario.update({
        where: { id: userId },
        data: dataToUpdate,
        select: { 
            id: true,
            nombre: true,
            usuario: true,
            telefono: true,
            isMaster: true,
            activo: true,
            createdAt: true,
            updatedAt: true,
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
        }
    });

    // Actualizar páginas de acceso del usuario
    // Solo si pageIds está presente en el body (significa que se está gestionando)
    if (pageIds !== undefined) {
        if (!Array.isArray(pageIds)) {
            res.status(400);
            throw new Error('El campo pageIds debe ser un array de IDs de página.');
        }

        await prisma.$transaction(async (tx) => {
            // Eliminar todas las asignaciones de páginas existentes para este usuario
            await tx.userPage.deleteMany({
                where: { userId: updatedUser.id },
            });

            // Crear nuevas asignaciones si se proporcionaron pageIds y hay páginas
            if (pageIds.length > 0) {
                // Asegurarse de que los pageIds sean enteros y válidos
                const validPageIds = pageIds.map(id => parseInt(id)).filter(id => !isNaN(id));

                // Opcional: Verificar que todos los pageIds existan en la tabla Page
                const existingPages = await tx.page.findMany({
                    where: { id: { in: validPageIds } },
                    select: { id: true }
                });
                const existingPageIdsSet = new Set(existingPages.map(p => p.id));

                const dataToCreate = validPageIds
                    .filter(id => existingPageIdsSet.has(id)) // Solo crear para IDs que realmente existen
                    .map(pageId => ({
                        userId: updatedUser.id,
                        pageId: pageId
                    }));

                if (dataToCreate.length > 0) {
                    await tx.userPage.createMany({
                        data: dataToCreate,
                        skipDuplicates: true
                    });
                }
            }
        });
    }

    res.status(200).json({ message: 'Usuario actualizado exitosamente', user: updatedUser });
});

// --- Eliminar un usuario ---
exports.deleteUser = asyncHandler(async (req, res) => { // Envuelto en asyncHandler
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
        res.status(400);
        throw new Error('ID de usuario inválido. Debe ser un número.');
    }

    const userToDelete = await prisma.usuario.findUnique({
        where: { id: userId },
    });

    if (!userToDelete) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }

    // Prevenir que un master se elimine a sí mismo
    if (userToDelete.isMaster && req.usuario.id === userToDelete.id) {
        res.status(400);
        throw new Error('Un usuario Master no puede eliminarse a sí mismo.');
    }

    // Eliminar el usuario (onDelete: Cascade en UserPage se encargará de las asignaciones)
    // Se asume que otras relaciones (ej. con Ventas, Egresos) están configuradas con cascade
    // o se manejan manualmente si no se desea eliminar en cascada.
    await prisma.usuario.delete({
        where: { id: userId },
    });
    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
});

// --- Obtener todas las páginas disponibles (para la interfaz de asignación) ---
// @desc    Obtener todas las páginas disponibles para asignar
// @route   GET /api/users/pages
// @access  Private (Master)
exports.getAllPages = asyncHandler(async (req, res) => { // Envuelto en asyncHandler
    console.log('[Backend DEBUG] Intentando obtener todas las páginas para selección.');
    
    const pages = await prisma.page.findMany({
        select: {
            id: true,
            name: true,
            path: true
        },
        orderBy: { name: 'asc' }
    });
    res.status(200).json(pages);
});

// --- Asignar/desasignar páginas a un usuario ---
// @desc    Asignar/desasignar páginas a un usuario
// @route   PUT /api/users/:id/pages
// @access  Private (Master)
exports.assignPagesToUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { pagesToAssign } = req.body; // Asegúrate de que este nombre coincida con lo que envías del frontend

    console.log(`[Backend Debug] Intento de asignar páginas al usuario ID: ${id}`);
    console.log(`[Backend Debug] Páginas a asignar (pagesToAssign):`, pagesToAssign);
    console.log(`[Backend Debug] Tipo de pagesToAssign:`, typeof pagesToAssign, Array.isArray(pagesToAssign) ? ' (Es array)' : ' (NO es array)');


    const userId = parseInt(id);
    if (isNaN(userId)) {
        res.status(400);
        throw new Error('ID de usuario inválido. Debe ser un número.');
    }

    // Validar que pagesToAssign sea un array de números (o IDs válidos)
    if (!Array.isArray(pagesToAssign) || pagesToAssign.some(pageId => typeof pageId !== 'number' || isNaN(pageId))) {
        res.status(400);
        throw new Error('Las páginas a asignar deben ser un array de IDs numéricos válidos.');
    }

    try {
        // 1. Eliminar todas las páginas actuales del usuario
        await prisma.userPage.deleteMany({
            where: { userId: userId },
        });
        console.log(`[Backend Debug] Páginas existentes eliminadas para el usuario ${userId}`);

        // 2. Crear las nuevas asignaciones si hay páginas a asignar
        if (pagesToAssign.length > 0) {
            const dataToCreate = pagesToAssign.map(pageId => ({
                userId: userId,
                pageId: pageId,
            }));
            await prisma.userPage.createMany({
                data: dataToCreate,
                skipDuplicates: true, // Esto ayuda a evitar errores si por alguna razón hay duplicados en el array
            });
            console.log(`[Backend Debug] Nuevas páginas asignadas:`, dataToCreate.length);
        } else {
            console.log(`[Backend Debug] No hay páginas nuevas para asignar.`);
        }

        // Recuperar el usuario actualizado con sus nuevas páginas para la respuesta
        const updatedUser = await prisma.usuario.findUnique({
            where: { id: userId },
            include: {
                pages: {
                    select: {
                        page: {
                            select: { id: true, name: true, path: true }
                        }
                    }
                }
            }
        });

        res.status(200).json({
            message: 'Permisos actualizados exitosamente.', // Envía un mensaje claro
            user: updatedUser // Puedes devolver el usuario actualizado
        });

    } catch (error) {
        console.error('[Backend Error] Error al asignar páginas:', error);
        // Asegúrate de que el error tenga la propiedad 'error' para que el frontend la lea
        res.status(500).json({ error: 'Error interno del servidor al actualizar permisos.', details: error.message });
    }
});
