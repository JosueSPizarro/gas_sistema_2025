// src/components/common/PageSelectionCards.jsx
import React from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CircularProgress, Alert,
  Checkbox, FormControlLabel, useTheme, Tooltip, Skeleton, Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  Info as InfoIcon,
  Public as PublicIcon,
  LockOutlined as PrivateIcon,
  Category as CategoryIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const getPageIcon = (pageType) => {
  switch(pageType?.toLowerCase()) {
    case 'dashboard':
      return <DashboardIcon />;
    case 'settings':
      return <SettingsIcon />;
    case 'public':
      return <PublicIcon />;
    case 'private':
      return <PrivateIcon />;
    default:
      return <CategoryIcon />;
  }
};

const PageSelectionCards = ({
  allPages,
  selectedPageIds,
  onTogglePage,
  loading,
  error,
  isMasterUser
}) => {
  const theme = useTheme();

  // Estilos dinámicos basados en el tema
  const styles = {
    container: {
      p: 3,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '12px',
      bgcolor: theme.palette.background.default,
      boxShadow: theme.shadows[1]
    },
    title: {
      mb: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      color: theme.palette.text.primary,
      fontWeight: 600
    },
    card: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.25s ease',
      borderWidth: 2,
      position: 'relative',
      overflow: 'hidden',
      '&.selected': {
        borderColor: theme.palette.primary.main,
        bgcolor: theme.palette.primary.lighter,
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: theme.palette.primary.main
        }
      },
      '&:hover': {
        transform: 'translateY(-2px)'
      }
    },
    checkboxLabel: {
      width: '100%',
      m: 0,
      justifyContent: 'space-between',
      flexDirection: 'row-reverse',
      alignItems: 'flex-start'
    },
    pageInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      mb: 1
    },
    pagePath: {
      mt: 1,
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      color: theme.palette.text.secondary,
      wordBreak: 'break-all',
      display: 'flex',
      alignItems: 'center',
      gap: 0.5
    },
    typeBadge: {
      ml: 1,
      height: 20,
      fontSize: '0.65rem',
      '& .MuiChip-icon': {
        fontSize: '0.75rem',
        ml: 0.5
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, gap: 2 }}>
        <CircularProgress size={24} />
        <Typography variant="body1">Cargando páginas disponibles...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <strong>Error al cargar páginas:</strong> {error}
      </Alert>
    );
  }

  if (!allPages || allPages.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No hay páginas disponibles para asignar.
      </Alert>
    );
  }

  return (
    <Box sx={styles.container}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={styles.title}>
          <DashboardIcon color="primary" />
          Permisos de Páginas
        </Typography>
        {isMasterUser && (
          <Chip
            icon={<LockIcon />}
            label="Acceso Total"
            color="warning"
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      <Grid container spacing={2}>
        {allPages.map((page) => {
          const isSelected = selectedPageIds.has(page.id);
          const pageIcon = getPageIcon(page.type);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={page.id}>
              <Card
                variant="outlined"
                sx={{
                  ...styles.card,
                  cursor: isMasterUser ? 'default' : 'pointer',
                  opacity: isMasterUser ? 0.8 : 1,
                  borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
                  bgcolor: isSelected ? theme.palette.primary.lighter : theme.palette.background.paper,
                }}
                className={isSelected ? 'selected' : ''}
                onClick={() => !isMasterUser && onTogglePage(page.id)}
              >
                <CardContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onTogglePage(page.id)}
                        icon={<RadioButtonUncheckedIcon />}
                        checkedIcon={<CheckCircleIcon color="primary" />}
                        disabled={isMasterUser}
                        sx={{ 
                          mr: 0,
                          '&.Mui-checked': {
                            color: theme.palette.primary.main
                          }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={styles.pageInfo}>
                          <Box sx={{ color: isSelected ? theme.palette.primary.dark : 'inherit' }}>
                            {React.cloneElement(pageIcon, {
                              fontSize: 'small',
                              color: isSelected ? 'primary' : 'action'
                            })}
                          </Box>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 500,
                              color: isSelected ? theme.palette.primary.dark : 'inherit'
                            }}
                          >
                            {page.name}
                          </Typography>
                          {page.type && (
                            <Chip
                              label={page.type}
                              size="small"
                              variant="outlined"
                              sx={styles.typeBadge}
                              icon={getPageIcon(page.type)}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" sx={styles.pagePath}>
                          <VpnKeyIcon fontSize="inherit" />
                          {page.path}
                        </Typography>
                      </Box>
                    }
                    sx={styles.checkboxLabel}
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default PageSelectionCards;