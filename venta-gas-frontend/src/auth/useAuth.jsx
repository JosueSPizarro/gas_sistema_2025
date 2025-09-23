// src/auth/useAuth.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react'; // Agregamos useMemo

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // Efecto para cargar el usuario desde localStorage al iniciar la aplicación
  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Aquí es donde nos aseguramos de que el objeto usuario contenga isMaster y pages
        setUsuario(parsedUser);
      } catch (error) {
        console.error("Error al parsear el usuario del localStorage:", error);
        // Si hay un error, limpiar el token y usuario para forzar un nuevo login
        logout();
      }
    }
  }, [token]); // Dependencia del token para reaccionar si el token cambia o se carga

  // Función de login: ahora acepta la nueva estructura del usuario
  const login = ({ token, usuario }) => {
    // El objeto 'usuario' que recibimos del backend ahora incluye id, nombre, usuario, email, isMaster, y pages
    setToken(token);
    setUsuario(usuario); // Guardamos el objeto usuario completo
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario)); // Guardamos el objeto usuario completo en localStorage
  };

  const logout = () => {
    setToken('');
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const authContextValue = useMemo(() => {
    // Función auxiliar para verificar si el usuario tiene acceso a una ruta específica
    const hasAccessToPage = (path) => {
        // Si el usuario es master, tiene acceso a todas las páginas
        if (usuario?.isMaster) {
            return true;
        }
        // Si no es master, verifica si la ruta está en su lista de páginas permitidas
        return usuario?.pages?.some(page => page.path === path);
    };

    return {
      usuario,
      token,
      login,
      logout,
      isAuthenticated: !!usuario, // Conveniencia para saber si el usuario está logueado
      isMaster: usuario?.isMaster || false, // Conveniencia para saber si es master
      hasAccessToPage // Nuestra nueva función para verificar permisos por página
    };
  }, [usuario, token]); // Las dependencias de useMemo son usuario y token

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);