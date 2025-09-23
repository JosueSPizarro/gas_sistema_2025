// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando el seeding de la base de datos...');

    // 1. Crear/Actualizar Páginas
    // =====================================================================
    const pagesData = [
        { name: 'Dashboard Principal', path: '/dashboard' },
        { name: 'Gestión de Productos', path: '/productos' },
        { name: 'Registro de Ventas', path: '/ventas' },
        { name: 'Stock General', path: '/stockGeneral' },
        { name: 'Gestion de Proveedores', path: '/proveedores' },
        { name: 'Gestion de Compras', path: '/compras' },
        { name: 'Jornada Corredor', path: '/jornada' },
        { name: 'Corredores', path: '/corredores' },
        { name: 'Gestión de Usuarios', path: '/admin/users' }, // Página para el master
        { name: 'Cierre de Caja', path: '/cierre-caja' },
    ];

    const createdPages = {}; // Para almacenar las páginas creadas y sus IDs
    for (const page of pagesData) {
        const createdPage = await prisma.page.upsert({
            where: { path: page.path },
            update: {},
            create: page,
        });
        createdPages[createdPage.path] = createdPage; // Guardamos la página por su path
        console.log(`Página '${createdPage.name}' (${createdPage.path}) creada/actualizada.`);
    }

    // 2. Crear Usuarios
    // =====================================================================

    // Contraseñas encriptadas
    const hashedPasswordMaster = await bcrypt.hash('master123', 10);

    // --- Usuario MASTER ---
    const masterUser = await prisma.usuario.upsert({
        where: { usuario: 'master' },
        update: {
            nombre: 'Administrador Maestro',
            telefono: '123456789',
            password: hashedPasswordMaster,
            isMaster: true,
            activo: true,
        },
        create: {
            nombre: 'Administrador Maestro',
            usuario: 'master',
            telefono: '123456789',
            password: hashedPasswordMaster,
            isMaster: true,
            activo: true,
        },
        include: { pages: true } // Incluir las páginas para manipularlas
    });
    console.log(`Usuario 'master' creado/actualizado.`);

    // Como el master tiene acceso a todo, le asignamos todas las páginas creadas
    // Primero, eliminamos todas las asignaciones existentes para este master
    await prisma.userPage.deleteMany({
        where: { userId: masterUser.id }
    });
    // Luego, creamos las nuevas asignaciones
    const masterPageAssignments = Object.values(createdPages).map(page => ({
        userId: masterUser.id,
        pageId: page.id
    }));
    await prisma.userPage.createMany({ data: masterPageAssignments, skipDuplicates: true });
    console.log(`Asignadas ${masterPageAssignments.length} páginas al usuario master.`);
    console.log('Seeding completado.');

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });