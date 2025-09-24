// src/services/api.js
import axios from 'axios';

// La URL base de la API se toma de una variable de entorno para producción,
// o usa un valor por defecto para desarrollo local.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// 👉 Agrega el token a todas las peticiones automáticamente, EXCEPTO para el login
api.interceptors.request.use((config) => {
  // Excluir la ruta de login del interceptor de token
  if (config.url === '/auth/login') {
    return config; // No añadir el token para la petición de login
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;