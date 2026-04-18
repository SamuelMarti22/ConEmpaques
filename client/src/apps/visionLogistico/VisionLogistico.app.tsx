import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';
import type { Vista } from '../../components/Header';
import Header from '../../components/Header';
import PlaneacionRutas from '../planeacionRutas/PlaneacionRutas.app';
import RepartidoresApp from '../repartidores/Repartidores.app';
import EntregasApp from '../entregas/Entregas.app';
import DashboardApp from '../dashboard/Dashboard.app';
import HistorialRutasApp from '../historialRutas/HistorialRutas.app';
import '../App.css';

function renderVista(vista: Vista) {
  switch (vista) {
    case 'agregar':
      return <PlaneacionRutas />;
    case 'entregas':
      return <EntregasApp />;
    case 'dashboard':
      return <DashboardApp />;
    case 'repartidores':
      return <RepartidoresApp />;
    case 'historial':
      return <HistorialRutasApp />;
  }
}

export default function VisionLogisticoApp() {
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
