import { createTheme } from '@mui/material/styles';

const customTheme = createTheme({
  palette: {
    primary: {
      main: '#2C3E50', // Azul Oscuro (casi negro) para elementos principales
      light: '#34495E',
      dark: '#1A242F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1ABC9C', // Verde Turquesa para acentos y elementos secundarios
      light: '#48C9B0',
      dark: '#15967E',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E74C3C', // Rojo para errores y alertas críticas
      light: '#EC7063',
      dark: '#C0392B',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F39C12', // Naranja para advertencias y atención
      light: '#F5B041',
      dark: '#D68910',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#3498DB', // Azul claro para información
      light: '#5DADE2',
      dark: '#2874A6',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2ECC71', // Verde esmeralda para éxito y confirmaciones
      light: '#58D68D',
      dark: '#239B56',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#ECF0F1', // Gris muy claro para el fondo general de la página
      paper: '#FFFFFF', // Blanco puro para tarjetas, AppBar, Drawer
    },
    text: {
      primary: '#34495E', // Texto principal (oscuro, casi el primary.main)
      secondary: '#7F8C8D', // Texto secundario (gris medio)
      disabled: '#BDC3C7',
    },
  },
  typography: {
    fontFamily: [
      'Roboto', // Fuente principal
      'Arial',
      'sans-serif',
    ].join(','),
    h3: {
      fontWeight: 700, // Por ejemplo, h3 más negrita
      fontSize: '2.5rem',
    },
    h5: {
      fontWeight: 600, // h5 un poco más negrita
    },
    h6: {
      fontWeight: 600,
    },
    // Puedes personalizar más variantes de tipografía aquí
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px', // Botones con bordes más suaves
          textTransform: 'none', // Evitar mayúsculas automáticas en botones
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // Bordes redondeados para las tarjetas
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', // Sombra sutil
        },
      },
    },
    MuiDrawer: { // Estilos globales para el Drawer (si quieres anular los del componente)
      styleOverrides: {
        paper: {
          // Si quieres un fondo por defecto aquí en el tema, pero ya lo tienes en Layout.jsx
          // backgroundColor: '#2C3E50', // Ejemplo: Fondo oscuro para el drawer
        },
      },
    },
    // Puedes añadir más componentes aquí para estilos globales
  },
});

export default customTheme;