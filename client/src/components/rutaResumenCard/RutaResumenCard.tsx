import type { RutaGuardadaUI } from '../guardadoRuta/botonGuardarRuta.component';
import './RutaResumenCard.css';

interface RutaResumenCardProps {
  ruta: RutaGuardadaUI;
  seleccionada?: boolean;
  alSeleccionar?: (rutaId: number) => void;
  mostrarBotonEliminar?: boolean;
  posicionBotonEliminar?: 'encabezado' | 'abajo-derecha';
  eliminando?: boolean;
  alEliminar?: (rutaId: number) => void;
}

function formatearTiempo(segundos: number | null): string {
  if (segundos === null || segundos <= 0) {
    return 'No calculado';
  }

  return `${Math.round(segundos / 60)} min`;
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

function formatearCargaCapacidad(cargaActualKg: number, capacidadKg: number | null): string {
  if (!Number.isFinite(cargaActualKg) || capacidadKg === null || !Number.isFinite(capacidadKg) || capacidadKg <= 0) {
    return 'No calculado';
  }

  return `${cargaActualKg}kg/${capacidadKg}kg`;
}

function nombreParada(parada: RutaGuardadaUI['detalleParadas'][number], indiceParada: number): string {
  return parada.cliente?.trim() || `Parada ${indiceParada + 1}`;
}

function textoEstado(estado: RutaGuardadaUI['repartidor']['estado']): string {
  if (estado === 'en ruta') return 'En progreso';
  if (estado === 'finalizado') return 'Completada';
  return 'Pendiente';
}

function claseEstado(estado: RutaGuardadaUI['repartidor']['estado']): string {
  if (estado === 'en ruta') return 'rutaResumenCard__estado--enRuta';
  if (estado === 'finalizado') return 'rutaResumenCard__estado--finalizado';
  return 'rutaResumenCard__estado--pendiente';
}

export default function RutaResumenCard({
  ruta,
  seleccionada = false,
  alSeleccionar,
  mostrarBotonEliminar = false,
  posicionBotonEliminar = 'encabezado',
  eliminando = false,
  alEliminar,
}: RutaResumenCardProps) {
  const botonEliminar = (
    <button
      type="button"
      className="rutaResumenCard__botonEliminar"
      disabled={eliminando}
      onClick={(evento) => {
        evento.stopPropagation();
        alEliminar?.(ruta.rutaId);
      }}
    >
      {eliminando ? 'Eliminando...' : 'Eliminar ruta'}
    </button>
  );

  return (
    <article
      className={`rutaResumenCard ${seleccionada ? 'rutaResumenCard--seleccionada' : ''}`}
      onClick={() => alSeleccionar?.(ruta.rutaId)}
    >
      <header className="rutaResumenCard__header">
        <strong className="rutaResumenCard__titulo">Ruta #{ruta.rutaId}</strong>
        <span className="rutaResumenCard__fecha">
          <i className="bi bi-calendar-event" aria-hidden="true"></i>
          {ruta.fechaReparto ?? 'Sin fecha'}
        </span>

        {mostrarBotonEliminar && posicionBotonEliminar === 'encabezado' && botonEliminar}
      </header>

      <div className="rutaResumenCard__principal">
        <span className="rutaResumenCard__repartidor">
          <i className="bi bi-person" aria-hidden="true"></i>
          {ruta.repartidor.nombre?.trim() || 'Sin nombre'}
        </span>
        <span className={`rutaResumenCard__estado ${claseEstado(ruta.repartidor.estado)}`}>
          {textoEstado(ruta.repartidor.estado)}
        </span>
      </div>

      <div className="rutaResumenCard__chips">
        <span className="rutaResumenCard__chip rutaResumenCard__chip--pedidos">
          <i className="bi bi-box-seam" aria-hidden="true"></i>
          {ruta.resumen.numeroPedidos} pedidos
        </span>
        <span className="rutaResumenCard__chip rutaResumenCard__chip--tiempo">
          <i className="bi bi-stopwatch" aria-hidden="true"></i>
          {formatearTiempo(ruta.resumen.tiempoEstimado)}
        </span>
      </div>

      <div className="rutaResumenCard__detalles">
        <span><i className="bi bi-speedometer2" aria-hidden="true"></i> {formatearCargaCapacidad(ruta.resumen.cargaActualKg, ruta.repartidor.capacidad)}</span>
        <span><i className="bi bi-sign-turn-right" aria-hidden="true"></i> {ruta.resumen.distanciaTotal.toFixed(2)} km</span>
      </div>

      <div className="rutaResumenCard__tiempos">
        <h4>Tiempos</h4>
        <p><i className="bi bi-play-circle" aria-hidden="true"></i> Inicio: {formatearFechaHora(ruta.resumen.horaInicioEstimada)}</p>
        <p><i className="bi bi-stop-circle" aria-hidden="true"></i> Fin: {formatearFechaHora(ruta.resumen.horaFinEstimada)}</p>
      </div>

      <div className="rutaResumenCard__paradas">
        <h4>Paradas</h4>
        {ruta.detalleParadas.length === 0 ? (
          <p>Sin paradas registradas</p>
        ) : (
          <ol>
            {ruta.detalleParadas.map((parada, indice) => (
              <li key={`${ruta.rutaId}-${parada.orden}-${parada.puntoId}`}>
                <i className="bi bi-geo-alt" aria-hidden="true"></i>
                {nombreParada(parada, indice)}
                <span className="rutaResumenCard__codigoSeguimiento"> - Código: {parada.codigoSeguimiento}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {mostrarBotonEliminar && posicionBotonEliminar === 'abajo-derecha' && (
        <div className="rutaResumenCard__acciones">
          {botonEliminar}
        </div>
      )}
    </article>
  );
}
