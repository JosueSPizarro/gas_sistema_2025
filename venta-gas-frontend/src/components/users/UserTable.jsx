// src/components/users/UserTable.jsx
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, Box, Typography, Chip, Tooltip, IconButton, Avatar, useTheme, Badge
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Apps as PagesIcon
} from '@mui/icons-material';

const UserTable = ({ users, onEdit, onDelete, onManagePermissions }) => {
  const theme = useTheme();

  // Estilos reutilizables
  const styles = {
    tableContainer: {
      borderRadius: '12px',
      boxShadow: theme.shadows[3],
      mb: 4,
      overflow: 'hidden'
    },
    tableHeader: {
      bgcolor: theme.palette.primary.dark,
      '& th': {
        color: theme.palette.primary.contrastText,
        fontWeight: '600',
        fontSize: '0.875rem',
        py: 2
      }
    },
    emptyState: {
      py: 4,
      color: theme.palette.text.secondary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1
    },
    actionButton: {
      minWidth: '32px',
      px: 1,
      '&.MuiButton-contained': {
        boxShadow: 'none'
      }
    },
    roleChip: {
      fontWeight: '500',
      textTransform: 'capitalize'
    },
    masterRole: {
      bgcolor: theme.palette.warning.light,
      color: theme.palette.warning.contrastText
    },
    normalRole: {
      bgcolor: theme.palette.success.light,
      color: theme.palette.success.contrastText
    },
    pagesContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      maxHeight: '120px',
      overflowY: 'auto',
      p: 1,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '6px',
      bgcolor: theme.palette.background.paper
    },
    pageChip: {
      maxWidth: '100%',
      justifyContent: 'flex-start',
      '& .MuiChip-label': {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'block'
      }
    }
  };

  return (
    <TableContainer component={Paper} sx={styles.tableContainer}>
      <Table aria-label="tabla de usuarios" size="medium">
        <TableHead>
          <TableRow sx={styles.tableHeader}>
            <TableCell>Usuario</TableCell>
            <TableCell>Rol</TableCell>
            <TableCell>Páginas Asignadas</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={styles.emptyState}>
                <WarningIcon fontSize="large" color="disabled" />
                <Typography variant="body1">No hay usuarios registrados</Typography>
                <Typography variant="body2" color="text.secondary">
                  Utilice el botón "Nuevo Usuario" para agregar uno
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow 
                key={user.id} 
                hover
                sx={{ 
                  '&:last-child td': { borderBottom: 0 },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 36, height: 36 }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="500">
                        {user.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.telefono}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={user.isMaster ? 'Administrador' : 'Usuario'}
                    size="small"
                    sx={{
                      ...styles.roleChip,
                      ...(user.isMaster ? styles.masterRole : styles.normalRole)
                    }}
                    icon={user.isMaster ? 
                      <AdminIcon fontSize="small" /> : 
                      <PersonIcon fontSize="small" />
                    }
                  />
                </TableCell>
                
                <TableCell>
                  {user.pages && user.pages.length > 0 ? (
                    <Box sx={styles.pagesContainer}>
                      {user.pages.map(p => (
                        <Tooltip key={p.page.id} title={p.page.name} placement="left">
                          <Chip
                            label={p.page.name}
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={styles.pageChip}
                            icon={<PagesIcon fontSize="small" />}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin páginas asignadas
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Tooltip title="Gestionar permisos">
                      <IconButton
                        color="info"
                        size="small"
                        onClick={() => onManagePermissions(user)}
                        sx={styles.actionButton}
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Editar usuario">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => onEdit(user)}
                        sx={styles.actionButton}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Eliminar usuario">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onDelete(user.id)}
                        sx={styles.actionButton}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserTable;