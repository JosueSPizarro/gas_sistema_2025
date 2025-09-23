// src/pages/NoAutorizado.jsx
import { 
  Typography, 
  Container, 
  Box, 
  Button, 
  useTheme,
  Paper,
  Divider
} from '@mui/material';
import {
  Lock as LockIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function NoAutorizado() {
  const theme = useTheme();
  const navigate = useNavigate();

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      textAlign: 'center',
      gap: 3
    },
    paper: {
      p: 4,
      maxWidth: 600,
      borderRadius: 3,
      boxShadow: theme.shadows[10],
      borderLeft: `6px solid ${theme.palette.error.main}`
    },
    icon: {
      fontSize: 80,
      color: theme.palette.error.main,
      mb: 2
    },
    buttonGroup: {
      display: 'flex',
      gap: 2,
      mt: 3,
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  };

  return (
    <Container maxWidth="lg" sx={styles.container}>
      <Paper elevation={3} sx={styles.paper}>
        <SecurityIcon sx={styles.icon} />
        
        <Typography variant="h3" gutterBottom color="error.main" fontWeight="bold">
          Acceso no autorizado
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" color="text.secondary" paragraph>
          <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          No tienes los permisos necesarios para acceder a esta página.
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Si crees que esto es un error, por favor contacta al administrador del sistema.
        </Typography>
        
        <Box sx={styles.buttonGroup}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            size="large"
          >
            Volver atrás
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            size="large"
          >
            Ir al inicio
          </Button>
          
          <Button
            variant="text"
            color="error"
            startIcon={<LockIcon />}
            onClick={() => navigate('/login')}
            size="large"
          >
            Iniciar sesión
          </Button>
        </Box>
      </Paper>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          Código de error: 403 - Prohibido
        </Typography>
      </Box>
    </Container>
  );
}

export default NoAutorizado;