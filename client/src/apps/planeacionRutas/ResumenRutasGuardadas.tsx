import type { RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component';
import RutaResumenCard from '../../components/rutaResumenCard/RutaResumenCard';

interface ResumenRutasGuardadasProps {
  rutasGuardadas: RutaGuardadaUI[];
  onEliminarRuta: (rutaId: number) => void;
  eliminandoRutaId: number | null;
  rutaSeleccionadaId: number | null;
  onSeleccionarRuta: (rutaId: number) => void;
}

export default function ResumenRutasGuardadas({
  rutasGuardadas,
  onEliminarRuta,
  eliminandoRutaId,
  rutaSeleccionadaId,
  onSeleccionarRuta,
}: ResumenRutasGuardadasProps) {
  return (
    <section className="panelRutasGuardadas">
      <h3>Rutas asignadas</h3>

      {rutasGuardadas.length === 0 && (
        <p className="panelRutasGuardadas__vacio">No hay rutas asignadas a repartidores todavía.</p>
      )}

      {rutasGuardadas.map((ruta) => (
        <div key={ruta.rutaId}>
          <RutaResumenCard
            ruta={ruta}
            seleccionada={rutaSeleccionadaId === ruta.rutaId}
            alSeleccionar={(rutaId) => onSeleccionarRuta(rutaId)}
            mostrarBotonEliminar
            posicionBotonEliminar="abajo-derecha"
            eliminando={eliminandoRutaId === ruta.rutaId}
            alEliminar={(rutaId) => onEliminarRuta(rutaId)}
          />
        </div>
      ))}
    </section>
  );
}
