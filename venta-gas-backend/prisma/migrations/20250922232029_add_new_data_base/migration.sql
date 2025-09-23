-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "telefono" TEXT,
    "password" VARCHAR(255) NOT NULL,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pageId" INTEGER NOT NULL,

    CONSTRAINT "UserPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corredor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" INTEGER NOT NULL,
    "telefono" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corredor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockLleno" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCorredor" (
    "id" SERIAL NOT NULL,
    "corredorId" INTEGER NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadLleno" INTEGER NOT NULL DEFAULT 0,
    "cantidadVacio" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCorredor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salida" (
    "id" SERIAL NOT NULL,
    "corredorId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "totalVentas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeudas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEntregado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diferencia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diferenciaSaldada" BOOLEAN NOT NULL DEFAULT false,
    "fechaDiferenciaSaldada" TIMESTAMP(3),
    "totalLlenosSalida" INTEGER NOT NULL DEFAULT 0,
    "totalVaciosSalida" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" SERIAL NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "clienteNombre" TEXT NOT NULL DEFAULT 'Cliente al paso',
    "clienteDireccion" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "pagoEfectivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pagoYapePlin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pagoVale" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esPendiente" BOOLEAN NOT NULL DEFAULT false,
    "montoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaProducto" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidadLleno" INTEGER NOT NULL,
    "cantidadVacio" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "esVale" BOOLEAN NOT NULL DEFAULT false,
    "cantidadVales" INTEGER NOT NULL DEFAULT 0,
    "seVendioConEnvase" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VentaProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" SERIAL NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deuda" (
    "id" SERIAL NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reabastecimiento" (
    "id" SERIAL NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reabastecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendiente" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "fechaEntrega" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pendiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockGlobal" (
    "id" SERIAL NOT NULL,
    "tipoProducto" TEXT NOT NULL,
    "stockLleno" INTEGER NOT NULL DEFAULT 0,
    "stockVacio" INTEGER NOT NULL DEFAULT 0,
    "stockTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraDetalle" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CompraDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReabastecimientoDetalle" (
    "id" SERIAL NOT NULL,
    "reabastecimientoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadLlenoTomado" INTEGER NOT NULL DEFAULT 0,
    "cantidadLlenoDevuelto" INTEGER NOT NULL DEFAULT 0,
    "cantidadVacioDevuelto" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReabastecimientoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionDetalle" (
    "id" SERIAL NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "llenosDevueltos" INTEGER NOT NULL DEFAULT 0,
    "vaciosDevueltos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LiquidacionDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalidaDetalle" (
    "id" SERIAL NOT NULL,
    "salidaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "SalidaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialStockGlobal" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoProducto" TEXT NOT NULL,
    "stockLleno" INTEGER NOT NULL,
    "stockVacio" INTEGER NOT NULL,
    "stockTotal" INTEGER NOT NULL,
    "stockTotalAnterior" INTEGER NOT NULL,
    "cambio" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalles" TEXT,
    "ventaId" INTEGER,
    "salidaId" INTEGER,

    CONSTRAINT "HistorialStockGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_telefono_key" ON "Usuario"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "Page_name_key" ON "Page"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Page_path_key" ON "Page"("path");

-- CreateIndex
CREATE UNIQUE INDEX "UserPage_userId_pageId_key" ON "UserPage"("userId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "StockCorredor_corredorId_productoId_salidaId_key" ON "StockCorredor"("corredorId", "productoId", "salidaId");

-- CreateIndex
CREATE UNIQUE INDEX "Deuda_ventaId_key" ON "Deuda"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "StockGlobal_tipoProducto_key" ON "StockGlobal"("tipoProducto");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "Proveedor"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "CompraDetalle_compraId_productoId_key" ON "CompraDetalle"("compraId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ReabastecimientoDetalle_reabastecimientoId_productoId_key" ON "ReabastecimientoDetalle"("reabastecimientoId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionDetalle_salidaId_productoId_key" ON "LiquidacionDetalle"("salidaId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "SalidaDetalle_salidaId_productoId_key" ON "SalidaDetalle"("salidaId", "productoId");

-- AddForeignKey
ALTER TABLE "UserPage" ADD CONSTRAINT "UserPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPage" ADD CONSTRAINT "UserPage_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorredor" ADD CONSTRAINT "StockCorredor_corredorId_fkey" FOREIGN KEY ("corredorId") REFERENCES "Corredor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorredor" ADD CONSTRAINT "StockCorredor_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorredor" ADD CONSTRAINT "StockCorredor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_corredorId_fkey" FOREIGN KEY ("corredorId") REFERENCES "Corredor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProducto" ADD CONSTRAINT "VentaProducto_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProducto" ADD CONSTRAINT "VentaProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reabastecimiento" ADD CONSTRAINT "Reabastecimiento_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendiente" ADD CONSTRAINT "Pendiente_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendiente" ADD CONSTRAINT "Pendiente_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReabastecimientoDetalle" ADD CONSTRAINT "ReabastecimientoDetalle_reabastecimientoId_fkey" FOREIGN KEY ("reabastecimientoId") REFERENCES "Reabastecimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReabastecimientoDetalle" ADD CONSTRAINT "ReabastecimientoDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionDetalle" ADD CONSTRAINT "LiquidacionDetalle_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionDetalle" ADD CONSTRAINT "LiquidacionDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalidaDetalle" ADD CONSTRAINT "SalidaDetalle_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalidaDetalle" ADD CONSTRAINT "SalidaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialStockGlobal" ADD CONSTRAINT "HistorialStockGlobal_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialStockGlobal" ADD CONSTRAINT "HistorialStockGlobal_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
