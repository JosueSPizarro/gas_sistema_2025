// src/pages/UsersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import userService from '../api/userService';
import {
    Typography, Box, Button, CircularProgress, Alert, Container,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
    Paper, useTheme, Tooltip, Skeleton
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Lock as LockIcon,
    Close as CloseIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    Group as GroupIcon,
    Shield as AdminIcon
} from '@mui/icons-material';

import UserTable from '../components/users/UserTable';
import UserFormModal from '../components/users/UserFormModal';
import UserPermissionsModal from '../components/users/UserPermissionsModal';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from '../components/Layout';

const UsersPage = () => {
    const theme = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error al obtener usuarios:', err);
            setError('No se pudieron cargar los usuarios. Por favor, intente nuevamente.');
            toast.error('Error al cargar usuarios', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true,
                icon: () => <ErrorIcon /> // <-- CORRECCIÓN: Envolver el icono en una función
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = () => {
        setSelectedUser(null);
        setIsFormModalOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (userId) => {
        setUserToDelete(userId);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await userService.deleteUser(userToDelete);
            toast.success('Usuario eliminado exitosamente', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true,
                icon: () => <SuccessIcon /> // <-- CORRECCIÓN: Envolver el icono en una función
            });
            fetchUsers();
        } catch (err) {
            console.error('Error al eliminar usuario:', err);
            const errorMessage = err.response?.data?.error || 'Error al eliminar el usuario.';
            toast.error(errorMessage, {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true,
                icon: () => <ErrorIcon /> // <-- CORRECCIÓN: Envolver el icono en una función
            });
            setError(errorMessage);
        } finally {
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    const handleManagePermissions = (user) => {
        setSelectedUser(user);
        setIsPermissionsModalOpen(true);
    };

    const handleFormModalClose = () => {
        setIsFormModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
    };

    const handlePermissionsModalClose = () => {
        setIsPermissionsModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
    };

    // Estilos reutilizables
    const styles = {
        pageHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            gap: 2,
            [theme.breakpoints.down('sm')]: {
                flexDirection: 'column',
                alignItems: 'flex-start'
            }
        },
        titleContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: 2
        },
        createButton: {
            borderRadius: 2,
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: theme.shadows[2],
            '&:hover': {
                boxShadow: theme.shadows[4]
            }
        },
        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
            flexDirection: 'column',
            gap: 3
        },
        errorContainer: {
            mt: 4,
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3
        },
        confirmDialog: {
            borderRadius: 3,
            maxWidth: 500,
            mx: 'auto'
        }
    };

    if (loading) {
        return (
            <Layout>
                <Container maxWidth="lg">
                    <Box sx={styles.loadingContainer}>
                        <CircularProgress size={80} thickness={4} />
                        <Typography variant="h6" color="text.secondary">
                            Cargando lista de usuarios...
                        </Typography>
                    </Box>
                </Container>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <Container maxWidth="lg">
                    <Box sx={styles.errorContainer}>
                        <ErrorIcon color="error" sx={{ fontSize: 60 }} />
                        <Typography variant="h6" color="error" align="center" gutterBottom>
                            {error}
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<RefreshIcon />}
                            onClick={fetchUsers}
                            sx={styles.createButton}
                        >
                            Reintentar
                        </Button>
                    </Box>
                </Container>
            </Layout>
        );
    }

    return (
        <Layout>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Box sx={styles.pageHeader}>
                    <Box sx={styles.titleContainer}>
                        <GroupIcon color="primary" sx={{ fontSize: 40 }} />
                        <Typography variant="h4" component="h1" fontWeight="bold">
                            Gestión de Usuarios
                            <Typography variant="body1" color="text.secondary" mt={1}>
                                Administra los usuarios y sus permisos
                            </Typography>
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleCreateUser}
                        sx={styles.createButton}
                    >
                        Nuevo Usuario
                    </Button>
                </Box>

                <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <UserTable
                        users={users}
                        onEdit={handleEditUser}
                        onDelete={handleDeleteClick}
                        onManagePermissions={handleManagePermissions}
                    />
                </Paper>

                {/* Modales */}
                <UserFormModal
                    isOpen={isFormModalOpen}
                    onClose={handleFormModalClose}
                    user={selectedUser}
                />

                <UserPermissionsModal
                    isOpen={isPermissionsModalOpen}
                    onClose={handlePermissionsModalClose}
                    user={selectedUser}
                />

                {/* Dialogo de confirmación de eliminación */}
                <Dialog
                    open={deleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    PaperProps={{ sx: styles.confirmDialog }}
                >
                    <DialogTitle sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <ErrorIcon />
                            <Typography variant="h6" fontWeight="bold">
                                Confirmar Eliminación
                            </Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body1" gutterBottom>
                            ¿Estás seguro que deseas eliminar este usuario permanentemente?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Esta acción no puede deshacerse y el usuario perderá acceso al sistema.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, gap: 2 }}>
                        <Button
                            onClick={() => setDeleteConfirmOpen(false)}
                            variant="outlined"
                            color="inherit"
                            sx={{ borderRadius: 1 }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            sx={{ borderRadius: 1 }}
                        >
                            Eliminar
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Layout>
    );
};

export default UsersPage;
