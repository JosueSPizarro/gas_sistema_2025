// src/router/AppRouter.jsx
import React from 'react'; // Asegúrate de importar React
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import customTheme from '../theme/theme'; // Asegúrate de que esta ruta es correcta

// Importa tus contextos y componentes
import { useAuth } from '../auth/useAuth'; // Importamos useAuth aquí
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import NoAutorizado from '../pages/NoAutorizado';
import ProtectedRoute from '../auth/ProtectedRoute'; // Asegúrate de que esta ruta es correcta

// Importa todas tus páginas
import ProductosPage from '../pages/ProductosPage';
import VentaPage from '../pages/VentaPage';
import ComprasPage from '../pages/ComprasPage';
import ReportesPage from '../pages/ReportesPage';
import UsersPage from '../pages/UsersPage';
import JornadasPage from '../pages/JornadasPage';
import CierreCajaPage from '../pages/CierreCajaPage';
import CorredoresPage from '../pages/CorredoresPage';
import GestionAlmacen from '../pages/GestionAlmacen';
import ProveedoresPage from '../pages/ProveedoresPage';

// import ClientesPage from '../pages/ClientesPage'; // Asegúrate de importar si la usas


function AppRouter() {
    const { isAuthenticated, loading } = useAuth(); // Usamos useAuth para la lógica de redirección inicial

    // Muestra un estado de carga mientras se inicializa el AuthContext
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#555' }}>
                Cargando aplicación...
            </div>
        );
    }

    return (
        <ThemeProvider theme={customTheme}>
            <Routes>
                {/* Ruta de login */}
                <Route path="/login" element={<LoginPage />} />

                {/* Ruta de acceso denegado */}
                <Route path="/no-autorizado" element={<NoAutorizado />} />

                {/* Redirección de la raíz (/) */}
                {/* Si el usuario está autenticado, redirige a /dashboard, de lo contrario a /login */}
                <Route
                    path="/"
                    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                />

                {/* Rutas Protegidas de la Aplicación */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute requiredPath="/dashboard">
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/productos"
                    element={
                        <ProtectedRoute requiredPath="/productos">
                            <ProductosPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/ventas"
                    element={
                        <ProtectedRoute requiredPath="/ventas">
                            <VentaPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/reporte-ventas"
                    element={
                        <ProtectedRoute requiredPath="/reporte-ventas">
                            <ReportesPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/stockGeneral"
                    element={
                        <ProtectedRoute requiredPath="/stockGeneral">
                            <GestionAlmacen />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/proveedores"
                    element={
                        <ProtectedRoute requiredPath="/proveedores">
                            <ProveedoresPage/>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/cierre-caja"
                    element={
                        <ProtectedRoute requiredPath="/cierre-caja">
                            <CierreCajaPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/compras"
                    element={
                        <ProtectedRoute requiredPath="/compras">
                            <ComprasPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/jornada"
                    element={
                        <ProtectedRoute requiredPath="/jornada">
                            <JornadasPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/corredores"
                    element={
                        <ProtectedRoute requiredPath="/corredores">
                            <CorredoresPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/usuarios"
                    element={
                        <ProtectedRoute requiredPath="/usuarios">
                            <UsersPage />
                        </ProtectedRoute>
                    }
                />

                {/* Ruta de fallback (catch-all para URLs no definidas) */}
                {/* Redirige al dashboard si el usuario está autenticado, sino al login. */}
                <Route
                    path="*"
                    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                />
            </Routes>
        </ThemeProvider>
    );
}

export default AppRouter;