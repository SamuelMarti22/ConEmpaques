import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../authContext/AuthContext';
import ProtectedRoute from '../authContext/ProtectedRoutes';
import './App.css';
import LoginPage from './login/Login.app';
import VisionLogisticoApp from './visionLogistico/VisionLogistico.app';
import VisionCliente from './visionClientes/VisionCliente.app';

function AppRoutes() {
  const { isAuthenticated, cargando, usuario } = useAuth();

  if (cargando) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Cargando...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={usuario?.rol === 'logistico' ? '/logis' : '/client'} /> : <Navigate to="/login" />} />
      
      <Route path="/login" element={isAuthenticated ? <Navigate to={usuario?.rol === 'logistico' ? '/logis' : '/client'} /> : <LoginPage />} />
      
      <Route
        path="/logis"
        element={
          <ProtectedRoute allowedRoles={['logistico']}>
            <VisionLogisticoApp />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['cliente']}>
            <VisionCliente />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
