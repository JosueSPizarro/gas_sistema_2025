// src/api/userService.js
import api from '../services/api'; // Importa tu instancia de Axios configurada

const API_BASE_PATH = '/usuarios'; // Las rutas base para el controlador de usuarios

// --- Funciones para la gestión de usuarios ---

// Obtener todos los usuarios
const getAllUsers = async () => {
  // Usamos 'api' directamente, ya que el token se maneja en el interceptor de api.js
  const response = await api.get(API_BASE_PATH);
  return response.data;
};

// Obtener un usuario por ID
const getUserById = async (id) => {
  const response = await api.get(`${API_BASE_PATH}/${id}`);
  return response.data;
};

// Crear un nuevo usuario
const createUser = async (userData) => {
  const response = await api.post(API_BASE_PATH, userData);
  return response.data;
};

// Actualizar un usuario
const updateUser = async (id, userData) => {
  const response = await api.put(`${API_BASE_PATH}/${id}`, userData);
  return response.data;
};

// Eliminar un usuario
const deleteUser = async (id) => {
  const response = await api.delete(`${API_BASE_PATH}/${id}`);
  return response.data;
};

// --- Funciones para la gestión de permisos de página ---

// Obtener todas las páginas disponibles
const getAllPages = async () => {
  const response = await api.get(`${API_BASE_PATH}/pages`);
  return response.data;
};

// Asignar/desasignar páginas a un usuario
const assignPagesToUser = async (userId, pageIds) => {
    // Asegúrate de que pageIds sea un array de números
    if (!Array.isArray(pageIds)) {
      console.error('Error: pageIds debe ser un array.');
      throw new Error('pageIds debe ser un array para asignar permisos.');
    }
    // Si estás enviando un objeto con una propiedad 'pagesToAssign', asegúrate de que coincida con el backend
    const response = await api.put(`${API_BASE_PATH}/${userId}/assign-pages`, { pagesToAssign: pageIds });
    return response.data;
  };

const userService = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllPages,
  assignPagesToUser,
};

export default userService;