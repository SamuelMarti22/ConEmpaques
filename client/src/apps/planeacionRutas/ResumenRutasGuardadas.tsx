import type { RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component';

interface ResumenRutasGuardadasProps {
  rutasGuardadas: RutaGuardadaUI[];
  onEliminarRuta: (rutaId: number) => void;
  eliminandoRutaId: number | null;
  rutaSeleccionadaId: number | null;
  onSeleccionarRuta: (rutaId: number) => void;
}

function formatearTiempo(segundos: number | null): string {
  if (segundos === null || segundos <= 0) {
    return 'No calculado';
  }

  const minutos = Math.round(segundos / 60);
  return `${minutos} min`;
}

function formatearCargaCapacidad(cargaActualKg: number, capacidadKg: number | null): string {
  if (!Number.isFinite(cargaActualKg) || capacidadKg === null || !Number.isFinite(capacidadKg) || capacidadKg <= 0) {
    return 'No calculado';
  }

  const capacidadDisponible = Math.max(0, capacidadKg - cargaActualKg);
  return `${capacidadDisponible}kg/${capacidadKg}kg`;
}

function textoEstadoRepartidor(estado: RutaGuardadaUI['repartidor']['estado']): string {
  if (estado === 'en ruta') {
    return 'En ruta';
  }

  if (estado === 'finalizado') {
    return 'Finalizado';
  }

  return 'Disponible';
}

function claseEstadoRepartidor(estado: RutaGuardadaUI['repartidor']['estado']): string {
  if (estado === 'en ruta') {
    return 'rutaGuardadaCard__estadoBadge--enRuta';
  }

  if (estado === 'finalizado') {
    return 'rutaGuardadaCard__estadoBadge--finalizado';
  }

  return 'rutaGuardadaCard__estadoBadge--disponible';
}

function nombreParada(
  parada: RutaGuardadaUI['detalleParadas'][number],
  indiceParada: number,
): string {
  return parada.cliente?.trim() || `Parada ${indiceParada + 1}`;
}

function formatearFechaHora(valor: string | null): string {
  if (!valor) {
    return 'No calculado';
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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
        <article
          key={ruta.rutaId}
          className={`rutaGuardadaCard ${rutaSeleccionadaId === ruta.rutaId ? 'rutaGuardadaCard--seleccionada' : ''}`}
          onClick={() => onSeleccionarRuta(ruta.rutaId)}
        >
          <div className="rutaGuardadaCard__encabezado">
            <div className="rutaGuardadaCard__encabezadoTop">
              <strong className="rutaGuardadaCard__titulo">Ruta #{ruta.rutaId}</strong>
              <button
                type="button"
                className="rutaGuardadaCard__btnEliminar"
                disabled={eliminandoRutaId === ruta.rutaId}
                onClick={(evento) => {
                  evento.stopPropagation();
                  onEliminarRuta(ruta.rutaId);
                }}
              >
                {eliminandoRutaId === ruta.rutaId ? 'Eliminando...' : 'Eliminar ruta'}
              </button>
            </div>

            <div className="rutaGuardadaCard__repartidorHeader">
              <span className="rutaGuardadaCard__repartidorNombre"><i className="bi bi-person" aria-hidden="true"></i> {ruta.repartidor.nombre?.trim() || 'Sin nombre'}</span>
              <span className={`rutaGuardadaCard__estadoBadge ${claseEstadoRepartidor(ruta.repartidor.estado)}`}>{textoEstadoRepartidor(ruta.repartidor.estado)}</span>
            </div>

            <div className="rutaGuardadaCard__resumenRapido">
              <span><i className="bi bi-box-seam" aria-hidden="true"></i> {ruta.resumen.numeroPedidos} pedidos</span>
              <span><i className="bi bi-stopwatch" aria-hidden="true"></i> {formatearTiempo(ruta.resumen.tiempoEstimado)}</span>
              <span><i className="bi bi-truck" aria-hidden="true"></i> Capacidad: {formatearCargaCapacidad(ruta.resumen.cargaActualKg, ruta.repartidor.capacidad)}</span>
              <span><i className="bi bi-calendar-event" aria-hidden="true"></i> {ruta.fechaReparto ?? 'Sin fecha'}</span>
              <span><i className="bi bi-play-circle" aria-hidden="true"></i> {formatearFechaHora(ruta.resumen.horaInicioEstimada)}</span>
              <span><i className="bi bi-stop-circle" aria-hidden="true"></i> {formatearFechaHora(ruta.resumen.horaFinEstimada)}</span>
            </div>
          </div>

          <div className="rutaGuardadaCard__bloque">
            <h4>Detalle de la ruta</h4>
            {ruta.detalleParadas.length === 0 ? (
              <p>Pendiente</p>
            ) : (
              <ol className="rutaGuardadaCard__listaParadas">
                {ruta.detalleParadas.map((parada, indice) => (
                  <li key={`${ruta.rutaId}-${parada.orden}-${parada.puntoId}`}>
                    <div className="rutaGuardadaCard__paradaLinea"><i className="bi bi-geo-alt" aria-hidden="true"></i> {nombreParada(parada, indice)}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
