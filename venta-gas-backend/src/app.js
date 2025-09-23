const express = require('express');
const cors = require('cors'); // Importa cors
require('dotenv').config();

// ¡IMPORTACIÓN NECESARIA AQUÍ!
const { protect } = require('./middleware/authMiddleware');


// Importa tus rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');

const productoRoutes = require('./routes/producto.routes');
const corredorRoutes = require('./routes/corredor.routes');
const stockCorredorRoutes = require('./routes/stockCorredor.routes');
const salidaRoutes = require('./routes/salida.routes');
const ventaRoutes = require('./routes/venta.routes');
const gastoRoutes = require('./routes/gasto.routes'); // <-- Importado
const deudaRoutes = require('./routes/deuda.routes'); // <-- Importado
const pendienteRoutes = require('./routes/pendiente.routes'); // <-- Importado
const dashboardRoutes = require('./routes/dashboard.routes')
const stockGlobalRoutes = require('./routes/stockGlobal.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const comprasRoutes = require('./routes/compra.routes');
const cajaRoutes = require('./routes/caja.routes');
const reportesRoutes = require('./routes/reportes.routes');


const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json()); // Para parsear el body de las peticiones JSON

app.use(cors({
    origin: [
        'http://localhost:5173',          // Para cuando el frontend corre en tu PC via localhost
        //'http://192.168.101.27:5173'      // Para cuando accedes al frontend desde otros dispositivos via IP
    ], // ¡Asegúrate que esta sea la IP y puerto correctos de tu frontend!
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // O los métodos que uses
    credentials: true // Solo si manejas cookies o tokens en credenciales cross-origin
}));

// 🔐 Rutas de autenticación (no requieren token)
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', protect, userRoutes);



app.use('/api/productos', productoRoutes);
app.use('/api/corredores', corredorRoutes);
app.use('/api/stock-corredor', stockCorredorRoutes);
app.use('/api/salidas', salidaRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/gastos', gastoRoutes); // <-- Usado
app.use('/api/deudas', deudaRoutes); // <-- Usado
app.use('/api/pendientes', pendienteRoutes); // <-- Usado
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock-global', stockGlobalRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/reportes', reportesRoutes);


console.log('JWT_SECRET en el servidor:', process.env.JWT_SECRET);
// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0',() => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
    //console.log(`Servidor corriendo en http://192.168.101.27:${PORT}`); // Asumo que esta es tu IP local
});