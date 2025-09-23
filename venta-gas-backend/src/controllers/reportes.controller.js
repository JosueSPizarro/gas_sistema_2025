// src/controllers/reportes.controller.js
const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { startOfDay, endOfDay, parseISO } = require('date-fns');
const { format } = require('date-fns-tz');
const { es } = require('date-fns/locale');

// --- Helper Functions for PDF Generation (Refinadas) ---

function generateHeader(doc, title) {
    // doc.image('path/to/logo.png', 50, 20, { width: 60 });
    doc.fillColor('#131e2e')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Reporte de Ventas', 50, 40);

    doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#555')
        .text(title, 50, 65);

    doc.fontSize(8)
        .fillColor('#777')
        .text(`Generado: ${format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es, timeZone: 'America/Lima' })}`, {
            align: 'right'
        });

    doc.moveDown(3);
}

function generateFooter(doc) {
    doc.fontSize(8)
        .fillColor('#aaa')
        .text('Sistema de Ventas de Gas', 50, doc.page.height - 50, {
            align: 'center',
            lineBreak: false,
        });
}

function generateHr(doc, y) {
    doc.strokeColor("#e0e0e0")
        .lineWidth(0.5)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

// --- Controller Functions ---

exports.getReporteVentasDiarioGlobal = async (req, res) => {
    const { fecha } = req.query;
    let fechaConsulta;

    try {
        fechaConsulta = fecha ? parseISO(fecha) : new Date();
    } catch (e) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });
    }

    const inicioDia = startOfDay(fechaConsulta);
    const finDia = endOfDay(fechaConsulta);

    try {
        const ventas = await prisma.venta.findMany({
            where: { fecha: { gte: inicioDia, lte: finDia } },
            include: {
                salida: { include: { corredor: true } },
                productos: {
                    include: {
                        producto: true
                    }
                }
            },
            orderBy: { salida: { corredor: { nombre: 'asc' } } }
        });

        // --- Agregación de datos por corredor ---
        const resumenPorCorredor = new Map();
        ventas.forEach(venta => {
            const corredorId = venta.salida.corredor.id;
            const corredorNombre = venta.salida.corredor.nombre;

            if (!resumenPorCorredor.has(corredorId)) {
                resumenPorCorredor.set(corredorId, {
                    nombre: corredorNombre,
                    productosVendidos: new Map(),
                    productosVendidosPorTipo: new Map(), // Nuevo mapa para agrupar por tipo
                    totalEfectivo: 0,
                    totalYape: 0,
                    totalVales: 0,
                    totalVendido: 0, // Este será el total final (subtotal - vales), que equivale a la suma de pagos (efectivo, yape, deudas)
                    subtotalGeneral: 0, // Este será el total antes de descontar vales
                });
            }
            
            const resumen = resumenPorCorredor.get(corredorId);

            venta.productos.forEach(ventaProducto => {
                const productoNombre = ventaProducto.producto.nombre;
                const productoTipo = ventaProducto.producto.tipo;
                const cantidad = ventaProducto.cantidadLleno;
                const currentQty = resumen.productosVendidos.get(productoNombre) || 0;
                resumen.productosVendidos.set(productoNombre, currentQty + cantidad);

                const currentQtyPorTipo = resumen.productosVendidosPorTipo.get(productoTipo) || 0;
                resumen.productosVendidosPorTipo.set(productoTipo, currentQtyPorTipo + cantidad);
            });

            resumen.totalEfectivo += venta.pagoEfectivo;
            resumen.totalYape += venta.pagoYapePlin;
            resumen.totalVales += venta.pagoVale;
            resumen.subtotalGeneral += venta.total + venta.pagoVale; // Subtotal = Total final + descuento por vales
            resumen.totalVendido += venta.pagoEfectivo + venta.pagoYapePlin + venta.montoPendiente; // Total Vendido = Lo que se debe cubrir con pagos
        });

        const dataParaReporte = Array.from(resumenPorCorredor.values());

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=resumen_global_${format(fechaConsulta, 'yyyy-MM-dd')}.pdf`);
        doc.pipe(res);

        const reportTitle = `Resumen Global del ${format(fechaConsulta, "dd 'de' MMMM, yyyy", { locale: es })}`;
        generateHeader(doc, reportTitle);

        let y = doc.y;
        const startX = 50;
        const tableTop = y;
        const colWidths = [100, 110, 100, 50, 50, 50, 50]; // Corredor, Productos (Tipo), Productos (Nombre), Efectivo, Yape, Vales, Total Vendido

        // Table Header
        doc.font('Helvetica-Bold').fontSize(10);
        doc.fillColor('#003366');
        let currentX = startX;
        doc.text('Corredor', currentX, tableTop, { width: colWidths[0] });
        currentX += colWidths[0];
        doc.text('Productos (Tipo)', currentX, tableTop, { width: colWidths[1], align: 'left' });
        currentX += colWidths[1];
        doc.text('Productos Vendidos', currentX, tableTop, { width: colWidths[2] });
        currentX += colWidths[2];
        doc.text('Efectivo', currentX, tableTop, { width: colWidths[3], align: 'center' });
        currentX += colWidths[3];
        doc.text('Yape/Plin', currentX, tableTop, { width: colWidths[4], align: 'right' });
        currentX += colWidths[4];
        doc.text('Vales', currentX, tableTop, { width: colWidths[5], align: 'center' });
        currentX += colWidths[5];
        doc.text('Total Vendido', currentX, tableTop, { width: colWidths[6], align: 'center' });
        
        y = tableTop + 15;
        generateHr(doc, y);
        y += 5;

        // Table Rows
        doc.font('Helvetica').fontSize(9);
        dataParaReporte.forEach((resumen) => {
            const productosTexto = Array.from(resumen.productosVendidos.entries())
                .map(([nombre, cantidad]) => `${cantidad} x ${nombre}`)
                .join('\n');
            
            const productosPorTipoTexto = Array.from(resumen.productosVendidosPorTipo.entries())
                .map(([tipo, cantidad]) => `${cantidad} x ${tipo}`)
                .join('\n');

            // FIX: Calcular altura de fila dinámicamente para evitar superposición de texto.
            const corredorHeight = doc.heightOfString(resumen.nombre, { width: colWidths[0] });
            const productosHeight = Math.max(doc.heightOfString(productosTexto, { width: colWidths[2] }), doc.heightOfString(productosPorTipoTexto, { width: colWidths[1] }));
            const rowHeight = Math.max(15, corredorHeight, productosHeight) + 4;

            // FIX: Añadir nueva página si no hay espacio suficiente para la fila.
            if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                y = doc.y;
                // Opcional: redibujar cabecera en nueva página si se desea
            }

            const rowTop = y;
            doc.fillColor('#333');
            
            let currentX = startX;
            doc.text(resumen.nombre, currentX, rowTop, { width: colWidths[0] });
            currentX += colWidths[0];
            doc.text(productosPorTipoTexto, currentX, rowTop, { width: colWidths[1] });
            currentX += colWidths[1];
            doc.text(productosTexto, currentX, rowTop, { width: colWidths[2] });
            currentX += colWidths[2];
            doc.text(`S/ ${resumen.totalEfectivo.toFixed(2)}`, currentX, rowTop, { width: colWidths[3], align: 'right' });
            currentX += colWidths[3];
            doc.text(`S/ ${resumen.totalYape.toFixed(2)}`, currentX, rowTop, { width: colWidths[4], align: 'right' });
            currentX += colWidths[4];
            doc.text(`S/ ${resumen.totalVales.toFixed(2)}`, currentX, rowTop, { width: colWidths[5], align: 'right' });
            currentX += colWidths[5];
            doc.text(`S/ ${resumen.totalVendido.toFixed(2)}`, currentX, rowTop, { width: colWidths[6], align: 'right' });
            
            y = rowTop + rowHeight;
            generateHr(doc, y);
            y += 5;
        });

        // Grand Totals
        const totalesPorTipo = new Map();
        dataParaReporte.forEach(resumen => {
            resumen.productosVendidosPorTipo.forEach((cantidad, tipo) => {
                totalesPorTipo.set(tipo, (totalesPorTipo.get(tipo) || 0) + cantidad);
            });
        });
        const totalEfectivo = dataParaReporte.reduce((sum, item) => sum + item.totalEfectivo, 0);
        const totalYape = dataParaReporte.reduce((sum, item) => sum + item.totalYape, 0);
        const totalVales = dataParaReporte.reduce((sum, item) => sum + item.totalVales, 0);
        const totalVendido = dataParaReporte.reduce((sum, item) => sum + item.totalVendido, 0);
        const subtotalGeneral = dataParaReporte.reduce((sum, item) => sum + item.subtotalGeneral, 0);

        // FIX: Añadir nueva página si no hay espacio para la fila de totales.
        if (y + 30 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            y = doc.y;
        }

        const totalRowTop = y + 12;
        const totalesPorTipoTexto = Array.from(totalesPorTipo.entries())
            .map(([tipo, cantidad]) => `${cantidad} x ${tipo}`)
            .join('\n');

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#003366');
        
        let totalX = startX;
        doc.text('TOTALES', totalX, totalRowTop, { width: colWidths[0] });
        totalX += colWidths[0];
        doc.text(totalesPorTipoTexto, totalX, totalRowTop, { width: colWidths[1] });
        totalX += colWidths[1];
        // Dejar la columna de productos en blanco en la fila de totales
        totalX += colWidths[2];
        doc.text(`S/ ${totalEfectivo.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[3], align: 'right' });
        totalX += colWidths[3];
        doc.text(`S/ ${totalYape.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[4], align: 'right' });
        totalX += colWidths[4];
        doc.fillColor('#990000'); // Color rojo para los vales
        doc.text(`S/ ${totalVales.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[5], align: 'right' });
        totalX += colWidths[5];
        doc.fillColor('#003366'); // Resetear color
        doc.text(`S/ ${totalVendido.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[6], align: 'right' });

        // Añadir resumen final con subtotal
        doc.moveDown(3);
        const summaryX = 350;
        const valueX = 450;
        let summaryY = doc.y;

        doc.font('Helvetica-Bold').fontSize(11).text('Subtotal General:', summaryX, summaryY, { align: 'right', width: 100 });
        doc.font('Helvetica').text(`S/ ${subtotalGeneral.toFixed(2)}`, valueX, summaryY, { align: 'right', width: 100 });
        summaryY += 15;
        doc.font('Helvetica-Bold').text('Descuento Vales:', summaryX, summaryY, { align: 'right', width: 100 });
        doc.font('Helvetica').fillColor('#990000').text(`- S/ ${totalVales.toFixed(2)}`, valueX, summaryY, { align: 'right', width: 100 });
        
        summaryY += 15;
        doc.moveTo(summaryX, summaryY).lineTo(summaryX + 200, summaryY).strokeColor('#aaaaaa').stroke();
        summaryY += 5;

        doc.font('Helvetica-Bold').fontSize(12).fillColor('#333').text('Total Vendido:', summaryX, summaryY, { align: 'right', width: 100 });
        doc.font('Helvetica-Bold').fillColor('#005500').text(`S/ ${totalVendido.toFixed(2)}`, valueX, summaryY, { align: 'right', width: 100 });

        generateFooter(doc);
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar el reporte.' });
    }
};

exports.getReporteVentasPorCorredor = async (req, res) => {
    const { corredorId } = req.params;
    const { fecha } = req.query;
    let fechaConsulta;

    try {
        fechaConsulta = fecha ? parseISO(fecha) : new Date();
    } catch (e) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });
    }

    const inicioDia = startOfDay(fechaConsulta);
    const finDia = endOfDay(fechaConsulta);

    try {
        const corredor = await prisma.corredor.findUnique({ where: { id: parseInt(corredorId) } });
        if (!corredor) return res.status(404).json({ error: 'Corredor no encontrado' });

        const ventas = await prisma.venta.findMany({
            where: {
                fecha: { gte: inicioDia, lte: finDia },
                salida: { corredorId: parseInt(corredorId) }
            },
            include: {
                salida: { include: { corredor: true } },
                productos: {
                    include: {
                        producto: true
                    }
                }
            },
            orderBy: { fecha: 'asc' } // Mantener el orden por fecha para el reporte por corredor
        });

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_${corredor.nombre.replace(' ', '_')}_${format(fechaConsulta, 'yyyy-MM-dd')}.pdf`);
        doc.pipe(res);

        const reportTitle = `Ventas de ${corredor.nombre} - ${format(fechaConsulta, "dd 'de' MMMM, yyyy", { locale: es })}`;
        generateHeader(doc, reportTitle);

        let totalEfectivo = 0;
        let totalYape = 0;
        let totalVendidoNeto = 0; // Total a cubrir con pagos (efectivo, yape, deuda)
        let totalDeudas = 0;
        let granTotalVenta = 0; // Suma de la columna 'Total'
        let totalVales = 0;
        let y = doc.y;
        const startX = 50;
        const colWidths = [30, 90, 140, 50, 50, 45, 45, 45]; // ID, Cliente, Productos, Efectivo, Yape, Deudas, Vales, Total

        // Table Header
        doc.font('Helvetica-Bold').fontSize(10);
        doc.fillColor('#003366');
        let currentX = startX;
        doc.text('ID', currentX, y, { width: colWidths[0] });
        currentX += colWidths[0];
        doc.text('Cliente', currentX, y, { width: colWidths[1] });
        currentX += colWidths[1];
        doc.text('Productos Vendidos', currentX, y, { width: colWidths[2] });
        currentX += colWidths[2];
        doc.text('Efectivo', currentX, y, { width: colWidths[3], align: 'right' });
        currentX += colWidths[3];
        doc.text('Yape/Plin', currentX, y, { width: colWidths[4], align: 'right' });
        currentX += colWidths[4];
        doc.text('Deudas', currentX, y, { width: colWidths[5], align: 'right' });
        currentX += colWidths[5];
        doc.text('Vales', currentX, y, { width: colWidths[6], align: 'right' });
        currentX += colWidths[6];
        doc.text('Total', currentX, y, { width: colWidths[7], align: 'right' });
        
        y += 15;
        generateHr(doc, y);
        y += 5;

        // Table Rows
        doc.font('Helvetica').fontSize(9);
        ventas.forEach((venta) => {
            const productosTexto = venta.productos
                .map(p => `${p.cantidadLleno} x ${p.producto.nombre}`)
                .join('\n');

            const clienteHeight = doc.heightOfString(venta.clienteNombre, { width: colWidths[1] });
            const productosHeight = doc.heightOfString(productosTexto, { width: colWidths[2] });
            const rowHeight = Math.max(15, clienteHeight, productosHeight) + 5;

            // FIX: Añadir nueva página si no hay espacio suficiente para la fila.
            if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                y = doc.y;
            }

            const rowTop = y;
            doc.fillColor('#333');
            
            let currentX = startX;
            doc.text(`#${venta.id}`, currentX, rowTop, { width: colWidths[0] });
            currentX += colWidths[0];
            doc.text(venta.clienteNombre, currentX, rowTop, { width: colWidths[1] });
            currentX += colWidths[1];
            doc.text(productosTexto, currentX, rowTop, { width: colWidths[2] });
            currentX += colWidths[2];
            doc.text(`S/ ${venta.pagoEfectivo.toFixed(2)}`, currentX, rowTop, { width: colWidths[3], align: 'right' });
            currentX += colWidths[3];
            doc.text(`S/ ${venta.pagoYapePlin.toFixed(2)}`, currentX, rowTop, { width: colWidths[4], align: 'right' });
            currentX += colWidths[4];
            doc.text(`S/ ${venta.montoPendiente.toFixed(2)}`, currentX, rowTop, { width: colWidths[5], align: 'right' });
            currentX += colWidths[5];
            doc.text(`S/ ${venta.pagoVale.toFixed(2)}`, currentX, rowTop, { width: colWidths[6], align: 'right' });
            currentX += colWidths[6];
            doc.text(`S/ ${venta.total.toFixed(2)}`, currentX, rowTop, { width: colWidths[7], align: 'right' });
            
            y = rowTop + rowHeight;
            generateHr(doc, y);
            y += 5;

            totalEfectivo += venta.pagoEfectivo;
            totalYape += venta.pagoYapePlin;
            totalDeudas += venta.montoPendiente;
            totalVales += venta.pagoVale;
            // El total vendido neto es la suma de los pagos que no son vales
            totalVendidoNeto += venta.pagoEfectivo + venta.pagoYapePlin + venta.montoPendiente;
            granTotalVenta += venta.total;
        });

        // --- Fila de Totales ---
        const totalRowTop = y + 5;
        generateHr(doc, y);
        
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#003366');
        
        let totalX = startX;
        // Ocupa el espacio de las primeras 3 columnas
        doc.text('TOTALES', totalX, totalRowTop, { width: colWidths[0] + colWidths[1] + colWidths[2] });
        totalX += colWidths[0] + colWidths[1] + colWidths[2];
        
        doc.text(`S/ ${totalEfectivo.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[3], align: 'right' });
        totalX += colWidths[3];
        
        doc.text(`S/ ${totalYape.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[4], align: 'right' });
        totalX += colWidths[4];
        
        doc.text(`S/ ${totalDeudas.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[5], align: 'right' });
        totalX += colWidths[5];
        
        doc.text(`S/ ${totalVales.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[6], align: 'right' });
        totalX += colWidths[6];
        
        doc.text(`S/ ${granTotalVenta.toFixed(2)}`, totalX, totalRowTop, { width: colWidths[7], align: 'right' });

        // Summary
        // FIX: Añadir nueva página si no hay espacio para el resumen de totales.
        if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
        }

        doc.moveDown(2);

        const summaryX = 350;
        const valueX = 450;
        const summaryColWidth = 100;
        let summaryY = doc.y;

        const subtotalGeneral = totalVendidoNeto + totalVales;

        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Subtotal Ventas:', summaryX, summaryY, { align: 'right', width: summaryColWidth });
        doc.font('Helvetica').fontSize(11);
        doc.text(`S/ ${subtotalGeneral.toFixed(2)}`, valueX, summaryY, { align: 'right', width: summaryColWidth });

        summaryY += 15;
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Descuento Vales:', summaryX, summaryY, { align: 'right', width: summaryColWidth }).fillColor('#333');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#990000'); // Color rojo para vales
        doc.text(`- S/ ${totalVales.toFixed(2)}`, valueX, summaryY, { align: 'right', width: summaryColWidth });

        summaryY += 15;
        doc.moveTo(summaryX, summaryY).lineTo(summaryX + 200, summaryY).strokeColor('#aaaaaa').stroke();
        summaryY += 5;

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total a Pagar:', summaryX, summaryY, { align: 'right', width: summaryColWidth }).fillColor('#333');
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#005500'); // Color verde para el total vendido
        doc.text(`S/ ${totalVendidoNeto.toFixed(2)}`, valueX, summaryY, { align: 'right', width: summaryColWidth });

        doc.moveDown(1);
        summaryY = doc.y;
        doc.font('Helvetica').fontSize(9).fillColor('#555');
        doc.text(`(Pagado con: Efectivo S/ ${totalEfectivo.toFixed(2)} | Yape/Plin S/ ${totalYape.toFixed(2)} | Deudas S/ ${totalDeudas.toFixed(2)})`, summaryX - 50, summaryY, {
            width: 250, align: 'right'
        });

        generateFooter(doc);
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar el reporte.' });
    }
};
