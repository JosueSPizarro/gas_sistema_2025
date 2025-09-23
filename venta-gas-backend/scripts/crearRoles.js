const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearRoles() {
  const roles = ['vendedor', 'admin', 'master'];

  for (const nombre of roles) {
    const existente = await prisma.rol.findUnique({ where: { nombre } });
    if (!existente) {
      await prisma.rol.create({ data: { nombre } });
      console.log(`✅ Rol creado: ${nombre}`);
    }
  }

  await prisma.$disconnect();
}

crearRoles();
