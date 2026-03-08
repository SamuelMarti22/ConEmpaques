import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import PlaneacionRutas from './planeacionRutas/PlaneacionRutas.app';
import Header from '../components/Header';
import type { Vista } from '../components/Header';
import { useState } from 'react';

function renderVista(vista: Vista) {
  switch (vista) {
    case 'agregar':
      return <PlaneacionRutas />;
    case 'entregas':
      return <div>Vista de Entregas (próximamente)</div>;
    case 'dashboard':
      return <div>Dashboard (próximamente)</div>;
  }
}

function App() {
  const [vistaActiva, setVistaActiva] = useState<Vista>('agregar');

  return (
    <>
      <Header vistaActiva={vistaActiva} onCambiarVista={setVistaActiva} />
      <div id="vistaActual">
        {renderVista(vistaActiva)}
      </div>
    </>
  )
}

export default App
