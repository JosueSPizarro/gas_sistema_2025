// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  //baseURL:'http://192.168.101.27:3000/api',
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