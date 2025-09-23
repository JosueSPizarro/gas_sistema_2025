// src/services/compraService.js
import api from './api';

const getAllCompras = () => {
    return api.get('/compras');
};

const createCompra = (compraData) => {
    return api.post('/compras', compraData);
};

const getCompraById = (id) => {
    return api.get(`/compras/${id}`);
};

export default {
    getAllCompras,
    createCompra,
    getCompraById,
};
