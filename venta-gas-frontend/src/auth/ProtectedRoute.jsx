// src/auth/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth'; // Asegúrate de que esta ruta es correcta

// El componente ProtectedRoute ahora acepta 'requiredPath' en lugar de 'roles'
const ProtectedRoute = ({ children, requiredPath }) => {
  const { isAuthenticated, hasAccessToPage, usuario } = useAuth();

  // 1. Verificar si el usuario está autenticado (tiene token y objeto usuario)
  if (!isAuthenticated) {
    // Si no hay token o usuario, redirigir a la página de login
    return <Navigate to="/login" replace />; // 'replace' evita que el usuario pueda volver con el botón de atrás
  }

  // 2. Verificar el acceso a la página requerida
  // Si no se proporciona un 'requiredPath', la ruta solo necesita autenticación (cualquier usuario logueado)
  // Esto es útil para rutas como el perfil de usuario que no tienen una "página" específica de gestión de permisos.
  if (requiredPath && !hasAccessToPage(requiredPath)) {
    // Si la ruta requiere un permiso específico y el usuario NO lo tiene, redirigir a "No Autorizado"
    return <Navigate to="/no-autorizado" replace />;
  }

  // Si todas las verificaciones pasan, renderizar los componentes hijos (la página protegida)
  return children;
};

export default ProtectedRoute;