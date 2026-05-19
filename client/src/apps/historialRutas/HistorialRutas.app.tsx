import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component';
import RutaResumenCard from '../../components/rutaResumenCard/RutaResumenCard';
import './HistorialRutas.css';
import { URL_API_BASE } from '../estilosCompartidosRepartidores/repartidores.compartido';

type HistorialRutasResponse = {
  rutasGuardadas?: RutaGuardadaUI[];
};

function nombreParada(
  parada: RutaGuardadaUI['detalleParadas'][number],
  indiceParada: number,
): string {
  return parada.cliente?.trim() || `Parada ${indiceParada + 1}`;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es-CO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type VistaHistorial = 'grid' | 'lista';
type ModoHistorial = 'rutas' | 'pedidos';

type PedidoHistorialUI = {
  id: string;
  rutaId: number;
  fechaReparto: string | null | undefined;
  repartidorNombre: string;
  pedido: RutaGuardadaUI['detalleParadas'][number];
};

export function resolverPedidoSeleccionadoParaRuta(
  anterior: string | null,
  pedidos: Array<{ id: string; rutaId: number }>,
  siguienteRuta: number,
): string | null {
  if (!anterior) return null;
  const pedidoActual = pedidos.find((pedido) => pedido.id === anterior);
  if (!pedidoActual || pedidoActual.rutaId !== siguienteRuta) {
    return null;
  }
  return anterior;
}

function textoBusquedaRuta(ruta: RutaGuardadaUI): string {
  const clientes = ruta.detalleParadas.map((parada, indice) => nombreParada(parada, indice)).join(' ');
  const codigos = ruta.detalleParadas.map((parada) => parada.codigoSeguimiento ?? '').join(' ');
  return `${ruta.rutaId} ${ruta.repartidor.nombre ?? ''} ${clientes} ${codigos}`;
}

function textoBusquedaPedido(pedidoHistorial: PedidoHistorialUI): string {
  const pedido = pedidoHistorial.pedido;
  return `${
    pedidoHistorial.rutaId
  } ${
    pedidoHistorial.repartidorNombre
  } ${
    pedido.codigoSeguimiento ?? ''
  } ${
    pedido.cliente ?? ''
  } ${
    pedido.direccion ?? ''
  } ${
    pedido.estadoEntrega
  }`;
}

function claseEstadoPedido(estado: RutaGuardadaUI['detalleParadas'][number]['estadoEntrega']): string {
  if (estado === 'Entregado') return 'historialRutas__badgeEstado--entregado';
  if (estado === 'En camino') return 'historialRutas__badgeEstado--enCamino';
  return 'historialRutas__badgeEstado--pendiente';
}

export default function HistorialRutasApp() {
  const [rutas, setRutas] = useState<RutaGuardadaUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroRepartidor, setFiltroRepartidor] = useState('');
  const [vista, setVista] = useState<VistaHistorial>('grid');
  const [modo, setModo] = useState<ModoHistorial>('rutas');
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<number | null>(null);
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const respuesta = await fetch(`${URL_API_BASE}/api/rutas`);

      if (!respuesta.ok) {
        throw new Error(`No se pudo consultar el historial (${respuesta.status})`);
      }

      const payload = (await respuesta.json()) as HistorialRutasResponse;
      setRutas(payload.rutasGuardadas ?? []);
    } catch (errorConsulta) {
      const mensajeError = errorConsulta instanceof Error
        ? errorConsulta.message
        : 'Error desconocido al consultar historial de rutas';
      setError(mensajeError);
      setRutas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  const repartidoresDisponibles = useMemo(
    () => Array.from(new Set(rutas.map((ruta) => ruta.repartidor.nombre?.trim() ?? '').filter((nombre) => nombre.length > 0))).sort((a, b) => a.localeCompare(b, 'es-CO')),
    [rutas],
  );

  const pedidos = useMemo<PedidoHistorialUI[]>(
    () => rutas.flatMap((ruta) =>
      ruta.detalleParadas.map((pedido) => ({
        id: `${ruta.rutaId}-${pedido.orden}-${pedido.puntoId}`,
        rutaId: ruta.rutaId,
        fechaReparto: ruta.fechaReparto,
        repartidorNombre: ruta.repartidor.nombre?.trim() ?? 'Sin nombre',
        pedido,
      })),
    ),
    [rutas],
  );

  const rutasFiltradas = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda.trim());

    return rutas.filter((ruta) => {
      if (pedidoSeleccionadoId) {
        const pedidoSeleccionadoRuta = pedidos.find((pedido) => pedido.id === pedidoSeleccionadoId);
        if (pedidoSeleccionadoRuta && ruta.rutaId !== pedidoSeleccionadoRuta.rutaId) {
          return false;
        }
      }

      if (filtroFecha && (ruta.fechaReparto ?? '') !== filtroFecha) {
        return false;
      }

      const nombreRepartidor = ruta.repartidor.nombre?.trim() ?? '';
      if (filtroRepartidor && nombreRepartidor !== filtroRepartidor) {
        return false;
      }

      if (!textoBusqueda) {
        return true;
      }

      return normalizarTexto(textoBusquedaRuta(ruta)).includes(textoBusqueda);
    });
  }, [rutas, pedidos, pedidoSeleccionadoId, busqueda, filtroFecha, filtroRepartidor]);

  const pedidosFiltrados = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda.trim());

    return pedidos.filter((pedidoHistorial) => {
      if (rutaSeleccionadaId !== null && pedidoHistorial.rutaId !== rutaSeleccionadaId) {
        return false;
      }

      if (filtroFecha && (pedidoHistorial.fechaReparto ?? '') !== filtroFecha) {
        return false;
      }

      if (filtroRepartidor && pedidoHistorial.repartidorNombre !== filtroRepartidor) {
        return false;
      }

      if (!textoBusqueda) {
        return true;
      }

      return normalizarTexto(textoBusquedaPedido(pedidoHistorial)).includes(textoBusqueda);
    });
  }, [pedidos, busqueda, filtroFecha, filtroRepartidor, rutaSeleccionadaId]);

  const rutaSeleccionada = useMemo(
    () => (rutaSeleccionadaId === null ? null : rutas.find((ruta) => ruta.rutaId === rutaSeleccionadaId) ?? null),
    [rutas, rutaSeleccionadaId],
  );

  const pedidoSeleccionado = useMemo(
    () => (pedidoSeleccionadoId ? pedidos.find((pedido) => pedido.id === pedidoSeleccionadoId) ?? null : null),
    [pedidos, pedidoSeleccionadoId],
  );

  const etiquetaBusqueda = modo === 'rutas' ? 'Buscar en rutas' : 'Buscar en pedidos';
  const placeholderBusqueda =
    modo === 'rutas'
      ? 'Cliente, codigo, repartidor o #ruta'
      : 'Codigo, cliente, direccion, estado o #ruta';

  const totalResultados = modo === 'rutas' ? rutasFiltradas.length : pedidosFiltrados.length;
  const hayFiltrosAplicados = Boolean(
    busqueda ||
    filtroFecha ||
    filtroRepartidor ||
    rutaSeleccionadaId !== null ||
    pedidoSeleccionadoId,
  );

  const seleccionarRuta = (rutaId: number) => {
    const siguienteRuta = rutaSeleccionadaId === rutaId ? null : rutaId;
    setRutaSeleccionadaId(siguienteRuta);

    if (siguienteRuta === null) {
      setPedidoSeleccionadoId(null);
      setModo('rutas');
      return;
    }

    setModo('pedidos');

    setPedidoSeleccionadoId((anterior) => resolverPedidoSeleccionadoParaRuta(anterior, pedidos, siguienteRuta));
  };

  const seleccionarPedido = (pedido: PedidoHistorialUI) => {
    const siguientePedido = pedidoSeleccionadoId === pedido.id ? null : pedido.id;
    setPedidoSeleccionadoId(siguientePedido);
    setRutaSeleccionadaId(siguientePedido ? pedido.rutaId : null);
    setModo(siguientePedido ? 'rutas' : 'pedidos');
  };

  return (
    <section className="historialRutas">
      <div className="historialRutas__encabezado">
        <div>
          <h2><i className="bi bi-clock-history" aria-hidden="true"></i> Historial</h2>
          <p>
            {modo === 'rutas'
              ? 'Listado completo de rutas registradas en base de datos.'
              : 'Listado completo de pedidos registrados dentro de las rutas.'}
          </p>
        </div>

        <button type="button" className="historialRutas__botonRecargar" onClick={() => void cargarHistorial()}>
          <i className={`bi bi-arrow-clockwise${cargando ? ' historialRutas__iconoGirando' : ''}`} aria-hidden="true"></i> Recargar
        </button>
      </div>

      <div className="historialRutas__filtros">
        <div className="historialRutas__modoSwitch" role="group" aria-label="Cambiar entre historial de rutas y pedidos">
          <button
            type="button"
            className={modo === 'rutas' ? 'historialRutas__modoBoton historialRutas__modoBoton--activo' : 'historialRutas__modoBoton'}
            onClick={() => setModo('rutas')}
          >
            <i className="bi bi-sign-turn-right" aria-hidden="true"></i> Rutas
          </button>
          <button
            type="button"
            className={modo === 'pedidos' ? 'historialRutas__modoBoton historialRutas__modoBoton--activo' : 'historialRutas__modoBoton'}
            onClick={() => setModo('pedidos')}
          >
            <i className="bi bi-box-seam" aria-hidden="true"></i> Pedidos
          </button>
        </div>

        <label className="historialRutas__campo">
          <span>{etiquetaBusqueda}</span>
          <div className="historialRutas__inputIcono">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={placeholderBusqueda}
            />
          </div>
        </label>

        <label className="historialRutas__campo">
          <span>Fecha</span>
          <input type="date" value={filtroFecha} onChange={(evento) => setFiltroFecha(evento.target.value)} />
        </label>

        <label className="historialRutas__campo">
          <span>Repartidor</span>
          <select value={filtroRepartidor} onChange={(evento) => setFiltroRepartidor(evento.target.value)}>
            <option value="">Todos</option>
            {repartidoresDisponibles.map((repartidor) => (
              <option key={repartidor} value={repartidor}>{repartidor}</option>
            ))}
          </select>
        </label>

        <div className="historialRutas__vistaSelector" role="group" aria-label="Cambiar vista de historial">
          <button
            type="button"
            className={vista === 'grid' ? 'historialRutas__vistaBoton historialRutas__vistaBoton--activa' : 'historialRutas__vistaBoton'}
            onClick={() => setVista('grid')}
          >
            <i className="bi bi-grid" aria-hidden="true"></i> Grid
          </button>
          <button
            type="button"
            className={vista === 'lista' ? 'historialRutas__vistaBoton historialRutas__vistaBoton--activa' : 'historialRutas__vistaBoton'}
            onClick={() => setVista('lista')}
          >
            <i className="bi bi-list" aria-hidden="true"></i> Lista
          </button>
        </div>

        {hayFiltrosAplicados && (
          <button
            type="button"
            className="historialRutas__botonLimpiar"
            onClick={() => {
              setBusqueda('');
              setFiltroFecha('');
              setFiltroRepartidor('');
              setRutaSeleccionadaId(null);
              setPedidoSeleccionadoId(null);
            }}
          >
            <i className="bi bi-eraser" aria-hidden="true"></i> Limpiar filtros
          </button>
        )}
      </div>

      <p className="historialRutas__resultado">
        {totalResultados} {modo === 'rutas' ? 'rutas' : 'pedidos'} encontrados
      </p>

      {cargando && (
        <div className={`historialRutas__lista ${vista === 'lista' ? 'historialRutas__lista--lista' : ''}`}>
          {Array.from({ length: 6 }, (_valor, indice) => (
            <article key={`skeleton-${indice}`} className="historialRutas__card historialRutas__card--skeleton" aria-hidden="true">
              <div className="historialRutas__skeleton historialRutas__skeleton--titulo"></div>
              <div className="historialRutas__skeleton historialRutas__skeleton--linea"></div>
              <div className="historialRutas__skeleton historialRutas__skeleton--linea"></div>
              <div className="historialRutas__skeleton historialRutas__skeleton--lineaCorta"></div>
            </article>
          ))}
        </div>
      )}

      {!cargando && error && (
        <p className="historialRutas__estado historialRutas__estado--error">
          <i className="bi bi-exclamation-circle" aria-hidden="true"></i> {error}
        </p>
      )}

      {!cargando && !error && totalResultados === 0 && (
        <p className="historialRutas__estado">
          {modo === 'rutas' ? 'No hay rutas registradas.' : 'No hay pedidos registrados.'}
        </p>
      )}

      {!cargando && !error && modo === 'rutas' && rutasFiltradas.length > 0 && (
        <div className={`historialRutas__lista ${vista === 'lista' ? 'historialRutas__lista--lista' : ''}`}>
          {rutasFiltradas.map((ruta) => (
            <RutaResumenCard
              key={ruta.rutaId}
              ruta={ruta}
              seleccionada={rutaSeleccionada?.rutaId === ruta.rutaId}
              alSeleccionar={seleccionarRuta}
            />
          ))}
        </div>
      )}

      {!cargando && !error && modo === 'pedidos' && pedidosFiltrados.length > 0 && (
        <div className={`historialRutas__lista ${vista === 'lista' ? 'historialRutas__lista--lista' : ''}`}>
          {pedidosFiltrados.map((pedidoHistorial) => (
            <article
              key={pedidoHistorial.id}
              className={`historialRutas__pedidoCard${pedidoSeleccionado?.id === pedidoHistorial.id ? ' historialRutas__pedidoCard--seleccionada' : ''}`}
              onClick={() => seleccionarPedido(pedidoHistorial)}
            >
              <header className="historialRutas__pedidoHeader">
                <strong>Pedido #{pedidoHistorial.pedido.codigoSeguimiento}</strong>
                <span>Ruta #{pedidoHistorial.rutaId}</span>
              </header>
              <p className="historialRutas__pedidoDato">
                <i className="bi bi-person" aria-hidden="true"></i> {pedidoHistorial.pedido.cliente ?? 'Sin cliente'}
              </p>
              <p className="historialRutas__pedidoDato">
                <i className="bi bi-geo-alt" aria-hidden="true"></i> {pedidoHistorial.pedido.direccion ?? 'Sin direccion'}
              </p>
              <p className="historialRutas__pedidoDato">
                <i className="bi bi-truck" aria-hidden="true"></i> {pedidoHistorial.repartidorNombre}
              </p>
              <div className="historialRutas__pedidoMeta">
                <span className={`historialRutas__badgeEstado ${claseEstadoPedido(pedidoHistorial.pedido.estadoEntrega)}`}>
                  {pedidoHistorial.pedido.estadoEntrega}
                </span>
                <span>
                  <i className="bi bi-calendar-event" aria-hidden="true"></i> {pedidoHistorial.fechaReparto ?? 'Sin fecha'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
