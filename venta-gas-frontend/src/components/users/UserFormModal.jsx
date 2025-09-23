// src/components/users/UserFormModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  FormControlLabel, Checkbox, Box, Typography, CircularProgress, Alert, 
  IconButton, Grid, InputAdornment, Slide, Divider, Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import userService from '../../api/userService';
import { toast } from 'react-toastify';
import PageSelectionCards from '../common/PageSelectionCards';
import { useTheme } from '@mui/material/styles';

const UserFormModal = ({ isOpen, onClose, user }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    isMaster: false,
    activo: true,
  });

  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [formError, setFormError] = useState(null);
  const [pagesError, setPagesError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [allPages, setAllPages] = useState([]);
  const [selectedPageIds, setSelectedPageIds] = useState(new Set());
  const [previousSelectedPageIds, setPreviousSelectedPageIds] = useState(new Set());

  // Estilos reutilizables
  const styles = {
    dialogTitle: {
      bgcolor: theme.palette.primary.main, 
      color: theme.palette.primary.contrastText,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: 2,
      px: 3
    },
    formField: {
      mt: 1.5,
      mb: 1
    },
    sectionTitle: {
      mt: 3,
      mb: 2,
      color: theme.palette.text.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: 1
    },
    actionButton: {
      borderRadius: 1,
      px: 3,
      py: 1
    }
  };

  const fetchAllPages = useCallback(async () => {
    setLoadingPages(true);
    setPagesError(null);
    try {
      const data = await userService.getAllPages();
      setAllPages(data);

      if (user) {
        const initialUserPages = new Set(user.pages.map(userPageRelation => userPageRelation.page.id));
        setSelectedPageIds(initialUserPages);
        setPreviousSelectedPageIds(initialUserPages);

        if (user.isMaster) {
          setSelectedPageIds(new Set(data.map(page => page.id)));
        }
      } else {
        setSelectedPageIds(new Set());
        setPreviousSelectedPageIds(new Set());
      }
    } catch (err) {
      console.error('Error al cargar todas las páginas en UserFormModal:', err);
      setPagesError('No se pudieron cargar las opciones de página. Por favor, intente nuevamente.');
    } finally {
      setLoadingPages(false);
    }
  }, [user]);

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          nombre: user.nombre || '',
          usuario: user.usuario || '',
          telefono: user.telefono || '',
          password: '',
          confirmPassword: '',
          isMaster: user.isMaster || false,
          activo: user.activo !== undefined ? user.activo : true,
        });
      } else {
        setFormData({
          nombre: '',
          usuario: '',
          telefono: '',
          password: '',
          confirmPassword: '',
          isMaster: false,
          activo: true,
        });
      }
      setFormError(null);
      fetchAllPages();
    }
  }, [user, isOpen, fetchAllPages]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prevData) => {
      const newData = {
        ...prevData,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'isMaster') {
        if (checked) {
          setPreviousSelectedPageIds(new Set(selectedPageIds));
          setSelectedPageIds(new Set(allPages.map(page => page.id)));
        } else {
          setSelectedPageIds(previousSelectedPageIds);
        }
      }
      return newData;
    });
  };

  const handleTogglePage = (pageId) => {
    if (formData.isMaster) return;

    setSelectedPageIds((prevIds) => {
      const newIds = new Set(prevIds);
      if (newIds.has(pageId)) {
        newIds.delete(pageId);
      } else {
        newIds.add(pageId);
      }
      return newIds;
    });
  };

  const validateForm = () => {
    const { nombre, usuario, telefono, password, confirmPassword } = formData;
    
    if (!nombre || !usuario || !telefono) {
      setFormError('Los campos Nombre, Usuario y telefono son obligatorios.');
      return false;
    }

    if (!user && (!password || password !== confirmPassword)) {
      setFormError('Las contraseñas no coinciden o están vacías para un nuevo usuario.');
      return false;
    }

    if (user && password && password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return false;
    }

    if (password && password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoadingForm(true);
    setFormError(null);

    const { nombre, usuario, telefono, password, confirmPassword, isMaster, activo } = formData;

    const dataToSend = {
      nombre,
      usuario,
      telefono,
      isMaster,
      activo,
      ...(password && { password }),
      pageIds: isMaster ? Array.from(allPages.map(p => p.id)) : Array.from(selectedPageIds),
    };

    try {
      if (user) {
        await userService.updateUser(user.id, dataToSend);
        toast.success('Usuario actualizado exitosamente', {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true
        });
      } else {
        await userService.createUser(dataToSend);
        toast.success('Usuario creado exitosamente', {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true
        });
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar usuario:', err.response?.data || err);
      const errorMessage = err.response?.data?.message || 'Error al procesar la solicitud. Por favor, intente nuevamente.';
      setFormError(errorMessage);
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[10]
        }
      }}
    >
      <DialogTitle sx={styles.dialogTitle}>
        <Box display="flex" alignItems="center">
          {user ? (
            <PersonIcon sx={{ mr: 1.5, fontSize: 28 }} />
          ) : (
            <PersonAddIcon sx={{ mr: 1.5, fontSize: 28 }} />
          )}
          <Typography variant="h6" fontWeight="medium">
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            color: 'inherit',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {formError && (
          <Slide direction="down" in={!!formError} mountOnEnter unmountOnExit>
            <Alert 
              severity="error" 
              sx={{ mb: 3 }} 
              onClose={() => setFormError(null)}
              icon={<ErrorOutlineIcon fontSize="inherit" />}
            >
              {formError}
            </Alert>
          </Slide>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="subtitle1" sx={styles.sectionTitle}>
            Información Básica
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre Completo"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                sx={styles.formField}
                variant="outlined"
                required
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  )
                }}
                disabled={loadingForm}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de Usuario"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                sx={styles.formField}
                variant="outlined"
                required
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon color="action" />
                    </InputAdornment>
                  )
                }}
                disabled={loadingForm}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                name="telefono"
                type="telefono"
                value={formData.telefono}
                onChange={handleChange}
                sx={styles.formField}
                variant="outlined"
                required
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  )
                }}
                disabled={loadingForm}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ ...styles.sectionTitle, mt: 4 }}>
            Seguridad
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                sx={styles.formField}
                variant="outlined"
                required={!user}
                helperText={user ? "Dejar en blanco para mantener la contraseña actual" : "Mínimo 6 caracteres"}
                disabled={loadingForm}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(prev => !prev)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirmar Contraseña"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                sx={styles.formField}
                variant="outlined"
                required={!user || !!formData.password}
                disabled={loadingForm}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(prev => !prev)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ ...styles.sectionTitle, mt: 4 }}>
            Permisos y Accesos
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isMaster}
                    onChange={handleChange}
                    name="isMaster"
                    color="primary"
                    disabled={loadingForm}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <AdminPanelSettingsIcon fontSize="small" color={formData.isMaster ? "primary" : "action"} />
                    <Typography variant="body1">
                      Usuario Administrador
                    </Typography>
                    <Tooltip title="Los usuarios administradores tienen acceso completo a todas las funcionalidades del sistema">
                      <InfoIcon fontSize="small" color="action" sx={{ opacity: 0.6 }} />
                    </Tooltip>
                  </Box>
                }
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.activo}
                    onChange={handleChange}
                    name="activo"
                    color="primary"
                    disabled={loadingForm}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircleIcon 
                      fontSize="small" 
                      color={formData.activo ? "success" : "action"} 
                    />
                    <Typography variant="body1">
                      Usuario Activo
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mt: 2 }}>
            {pagesError && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }} 
                onClose={() => setPagesError(null)}
                icon={<ErrorOutlineIcon fontSize="inherit" />}
              >
                {pagesError}
              </Alert>
            )}
            
            <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              Permisos de Páginas
              <Tooltip title="Seleccione las páginas a las que tendrá acceso este usuario">
                <InfoIcon fontSize="small" color="action" sx={{ opacity: 0.6 }} />
              </Tooltip>
            </Typography>
            
            <PageSelectionCards
              allPages={allPages}
              selectedPageIds={selectedPageIds}
              onTogglePage={handleTogglePage}
              loading={loadingPages}
              error={pagesError}
              isMasterUser={formData.isMaster}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: theme.palette.grey[50] }}>
        <Button
          onClick={onClose}
          disabled={loadingForm}
          sx={{ 
            ...styles.actionButton,
            color: theme.palette.text.secondary,
            '&:hover': {
              bgcolor: theme.palette.action.hover
            }
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loadingForm || loadingPages}
          startIcon={loadingForm ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={styles.actionButton}
        >
          {loadingForm ? 'Guardando...' : 'Guardar Usuario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserFormModal;