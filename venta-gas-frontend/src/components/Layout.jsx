// src/components/Layout.js
import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton,
  Drawer, List, ListItemIcon, ListItemText,
  CssBaseline, Box, Divider, useTheme, Avatar, Tooltip,
  ListItemButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircle from '@mui/icons-material/AccountCircle';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaidIcon from '@mui/icons-material/Paid';
import CategoryIcon from '@mui/icons-material/Category';
import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const drawerWidth = 260;
const DRAWER_STATE_KEY = 'drawerOpen';

const Layout = ({ children }) => {
  const [open, setOpen] = useState(() => {
    const savedDrawerState = localStorage.getItem(DRAWER_STATE_KEY);
    return savedDrawerState ? JSON.parse(savedDrawerState) : true;
  });
  const { usuario, logout, isMaster, hasAccessToPage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  useEffect(() => {
    localStorage.setItem(DRAWER_STATE_KEY, JSON.stringify(open));
  }, [open]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Definición de items del menú con nuevos colores
  const allMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', requiredPath: '/dashboard', color: '#6A5ACD' },
    { text: 'Productos', icon: <InventoryIcon />, path: '/productos', requiredPath: '/productos', color: '#20B2AA' },
    { text: 'Registrar Venta', icon: <PointOfSaleIcon />, path: '/ventas', requiredPath: '/ventas', color: '#FF7F50' },
    { text: 'Reportes de Venta', icon: <PointOfSaleIcon />, path: '/reporte-ventas', requiredPath: '/reporte-ventas', color: '#994c30ff' },
    { text: 'Jornadas', icon: <PaidIcon />, path: '/jornada', requiredPath: '/jornada', color: '#3CB371' },
    { text: 'Corredores', icon: <CategoryIcon />, path: '/corredores', requiredPath: '/corredores', color: '#DA70D6' },
    { text: 'Gestion de Stock General', icon: <ReceiptIcon />, path: '/stockGeneral', requiredPath: '/stockGeneral', color: '#6495ED' },
    { text: 'Gestion de Proveedores', icon: <BarChartIcon />, path: '/proveedores', requiredPath: '/proveedores', color: '#9370DB' },
    { text: 'Recepción de Compras', icon: <ShoppingCartIcon />, path: '/compras', requiredPath: '/compras', color: '#FF6347' },
    { text: 'Cierre de Caja', icon: <SettingsIcon />, path: '/cierre-caja', requiredPath: '/cierre-caja', color: '#778899' },
    { text: 'Gestión Usuarios', icon: <PeopleIcon />, path: '/usuarios', requiredPath: '/usuarios', color: '#4682B4' },
  ];

  // Filtrar los items del menú basados en los permisos del usuario
  const filteredMenuItems = allMenuItems.filter(item => {
    if (isMaster) {
      return true;
    }
    if (!item.requiredPath) {
      return true;
    }
    return hasAccessToPage(item.requiredPath);
  });

  return (
    <Box sx={{ display: 'flex', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)', minHeight: '100vh' }}>
      <CssBaseline />

      {/* AppBar Superior Mejorado */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: 1201,
          background: 'linear-gradient(135deg, #2b83e7ff 0%, #131e2eff 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          borderRadius: open ? '0 0 12px 0' : '0'
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={handleDrawerToggle} 
            sx={{ 
              mr: 2,
              background: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 'bold', letterSpacing: '0.5px' }}>
            SISTEMA DE GAS MEJAMS
          </Typography>

          {/* Información del usuario */}
          {usuario && (
            <Box sx={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.15)', p: 1, borderRadius: '12px', mr: 2 }}>
              <Typography variant="body1" sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
                Hola, <Typography component="span" fontWeight="bold" sx={{ color: 'white' }}>{usuario.nombre}</Typography> 👋
              </Typography>
              <Tooltip title="Ver perfil">
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.3)', 
                    width: 36, 
                    height: 36,
                    border: '2px solid rgba(255, 255, 255, 0.5)'
                  }}
                >
                  {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : <AccountCircle />}
                </Avatar>
              </Tooltip>
            </Box>
          )}

          <Tooltip title="Cerrar sesión">
            <IconButton 
              color="inherit" 
              onClick={handleLogout}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'rgba(255, 0, 0, 0.3)',
                }
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Drawer Lateral Mejorado */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #2c3e50 0%, #3498db 100%)',
            color: 'white',
            boxShadow: '5px 0 15px rgba(0, 0, 0, 0.1)',
            border: 'none',
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', my: 1 }} />
        
        <List sx={{ px: 1 }}>
          {/* Mapeamos los ítems de menú FILTRADOS */}
          {filteredMenuItems.map((item) => (
            <ListItemButton
              key={item.text}
              onClick={() => navigate(item.path)}
              sx={{
                py: 1.2,
                px: 2,
                mx: 1,
                mb: 1,
                borderRadius: '12px',
                background: location.pathname === item.path
                  ? `linear-gradient(135deg, ${item.color} 0%, ${item.color}99 100%)`
                  : 'transparent',
                boxShadow: location.pathname === item.path 
                  ? '0 4px 12px rgba(0,0,0,0.2)' 
                  : 'none',
                '&:hover': {
                  background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}99 100%)`,
                  transform: 'translateX(5px)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                },
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer',
              }}
            >
              <ListItemIcon sx={{ minWidth: '50px' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: location.pathname === item.path ? 'white' : item.color, 
                    width: 40, 
                    height: 40,
                    boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {React.cloneElement(item.icon, { 
                    sx: { 
                      color: location.pathname === item.path ? item.color : 'white', 
                      fontSize: '1.4rem',
                      transition: 'all 0.3s ease'
                    } 
                  })}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 'bold' : 'medium',
                  fontSize: '0.95rem',
                  sx: { color: 'white' }
                }}
              />
            </ListItemButton>
          ))}
        </List>
        
        <Box sx={{ mt: 'auto' }}>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', mb: 1 }} />
          <List sx={{ px: 1 }}>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                py: 1.2,
                px: 2,
                mx: 1,
                mb: 1,
                borderRadius: '12px',
                background: 'transparent',
                '&:hover': {
                  background: 'linear-gradient(135deg, #FF4757 0%, #FF475799 100%)',
                  transform: 'translateX(5px)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                },
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer',
              }}
            >
              <ListItemIcon sx={{ minWidth: '50px' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    width: 40, 
                    height: 40,
                    boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <LogoutIcon sx={{ color: 'white', fontSize: '1.4rem' }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary="Cerrar Sesión"
                primaryTypographyProps={{
                  fontWeight: 'medium',
                  sx: { color: 'white' }
                }}
              />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Contenido Principal Mejorado */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Box 
          sx={{ 
            background: 'white', 
            borderRadius: '12px', 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            p: 3,
            minHeight: 'calc(100vh - 100px)'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;