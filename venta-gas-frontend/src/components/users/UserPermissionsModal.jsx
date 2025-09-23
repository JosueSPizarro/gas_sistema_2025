// src/components/users/UserPermissionsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, CircularProgress, Alert, IconButton
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon, LockOpen as LockOpenIcon } from '@mui/icons-material';
import userService from '../../api/userService';
import { toast } from 'react-toastify';
import PageSelectionCards from '../common/PageSelectionCards';

const UserPermissionsModal = ({ isOpen, onClose, user }) => {
  const [allPages, setAllPages] = useState([]);
  const [userPageIds, setUserPageIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const fetchPagesAndPermissions = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const pagesData = await userService.getAllPages();
      setAllPages(pagesData);

      if (user) {
        if (user.isMaster) {
          setUserPageIds(new Set(user.pages.map(userPageRelation => userPageRelation.page.id)));
        } else if (user.pages) {
          setUserPageIds(new Set(user.pages.map(userPageRelation => userPageRelation.page.id)));
        } else {
          setUserPageIds(new Set());
        }
      } else {
        setUserPageIds(new Set()); // No debería haber caso sin usuario aquí
      }
    } catch (err) {
      console.error('Error al cargar páginas o permisos:', err);
      setFetchError('Error al cargar la información de permisos. Inténtalo de nuevo.');
      toast.error('Error al cargar permisos.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchPagesAndPermissions();
    }
  }, [isOpen, user, fetchPagesAndPermissions]);

  const handleTogglePage = (pageId) => {
    // Si el usuario es master, las selecciones de cards no tienen efecto real, son solo visuales.
    if (user?.isMaster) return;

    setUserPageIds((prevIds) => {
      const newIds = new Set(prevIds);
      if (newIds.has(pageId)) {
        newIds.delete(pageId);
      } else {
        newIds.add(pageId);
      }
      return newIds;
    });
  };

  const handleSavePermissions = async () => {
    if (!user || user.isMaster) {
      // Si el usuario es master, no tiene sentido guardar permisos individuales.
      // Ya tiene acceso a todo.
      if (user?.isMaster) {
        toast.info('Los usuarios Master tienen acceso a todas las páginas. No se requieren cambios de permisos específicos.');
      }
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const pagesToAssign = Array.from(userPageIds);
      await userService.assignPagesToUser(user.id, pagesToAssign);

      toast.success('Permisos actualizados exitosamente.');
      onClose();
    } catch (err) {
      console.error('Error al guardar permisos:', err.response?.data || err);
      const errorMessage = err.response?.data?.error || 'Error al guardar los permisos.';
      setSaveError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          <LockOpenIcon sx={{ mr: 1 }} /> Gestionar Permisos para: {user?.nombre || user?.usuario || 'Cargando...'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'secondary.contrastText' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        {user?.isMaster && (
            <Alert severity="info" sx={{ mb: 2 }}>
                Este usuario es Master. Tiene acceso a todas las páginas, la selección de abajo es solo informativa.
            </Alert>
        )}
        <PageSelectionCards
          allPages={allPages}
          selectedPageIds={userPageIds}
          onTogglePage={handleTogglePage}
          loading={loading}
          error={fetchError}
          isMasterUser={user?.isMaster} // Pasa el estado isMaster
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSavePermissions}
          disabled={saving || loading || !user || user?.isMaster} // Deshabilita si es master o cargando
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        >
          {saving ? 'Guardando...' : 'Guardar Permisos'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserPermissionsModal;