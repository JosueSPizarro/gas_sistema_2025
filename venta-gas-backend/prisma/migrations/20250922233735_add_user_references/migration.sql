-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "usuarioId" INTEGER;

-- AlterTable
ALTER TABLE "Salida" ADD COLUMN     "usuarioId" INTEGER;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "usuarioId" INTEGER;

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
