-- AlterTable
ALTER TABLE "Reabastecimiento" ADD COLUMN     "usuarioId" INTEGER;

-- AlterTable
ALTER TABLE "Salida" ADD COLUMN     "usuarioLiquidadorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_usuarioLiquidadorId_fkey" FOREIGN KEY ("usuarioLiquidadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reabastecimiento" ADD CONSTRAINT "Reabastecimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
