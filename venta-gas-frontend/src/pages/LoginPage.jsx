import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, TextField, Button, Typography, Box, Paper, CircularProgress,
  InputAdornment, IconButton, Alert, Slide
} from '@mui/material';
import { AccountCircle, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import LoginIcon from '@mui/icons-material/Login'; // Ícono para el botón de ingresar

import api from '../services/api';
import { useAuth } from '../auth/useAuth';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [credenciales, setCredenciales] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Nuevo estado para el indicador de carga
  const [showPassword, setShowPassword] = useState(false); // Nuevo estado para mostrar/ocultar contraseña

  const handleChange = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
    // Limpiar el error cuando el usuario empieza a escribir de nuevo
    if (error) setError('');
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Limpiar errores previos al intentar iniciar sesión
    setLoading(true); // Activar el indicador de carga

    // Validación básica en el cliente antes de enviar la petición
    if (!credenciales.usuario || !credenciales.password) {
      setError('Por favor, ingresa tu usuario y contraseña.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/login', credenciales);
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      // Mensajes de error más específicos si la API los proporciona, sino un genérico
      const errorMessage = err.response?.data?.message || 'Credenciales inválidas. Por favor, verifica tu usuario y contraseña.';
      setError(errorMessage);
    } finally {
      setLoading(false); // Desactivar el indicador de carga
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh', // Ocupa toda la altura de la vista
        backgroundColor: '#f0f2f5', // Un fondo suave
        p: 2, // Pequeño padding general
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={6} // Mayor elevación para un aspecto más premium
          sx={{
            p: 4,
            borderRadius: '12px', // Bordes más redondeados
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.1)', // Sombra más pronunciada
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main" gutterBottom sx={{ mb: 3 }}>
            Bienvenido
          </Typography>
          <Typography variant="h6" align="center" gutterBottom sx={{ mb: 3, color: 'text.secondary' }}>
            Inicia sesión para continuar
          </Typography>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <TextField
              fullWidth
              margin="normal"
              label="Usuario"
              name="usuario"
              value={credenciales.usuario}
              onChange={handleChange}
              disabled={loading} // Deshabilitar mientras carga
              required // Campo requerido
              error={!!error} // Muestra error si hay mensaje de error
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }} // Margen inferior para separar
            />

            <TextField
              fullWidth
              margin="normal"
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={credenciales.password}
              onChange={handleChange}
              disabled={loading} // Deshabilitar mientras carga
              required // Campo requerido
              error={!!error} // Muestra error si hay mensaje de error
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large" // Botón más grande
              sx={{ mt: 2, py: 1.5, borderRadius: '8px' }} // Padding y bordes más suaves
              disabled={loading} // Deshabilitar durante la carga
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />} // Icono dinámico
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>

            {error && (
              <Slide direction="up" in={!!error} mountOnEnter unmountOnExit>
                <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                  {error}
                </Alert>
              </Slide>
            )}
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;

