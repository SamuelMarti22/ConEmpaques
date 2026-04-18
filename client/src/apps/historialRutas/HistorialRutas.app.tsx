import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component';
import RutaResumenCard from '../../components/rutaResumenCard/RutaResumenCard';
import './HistorialRutas.css';

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

export default function HistorialRutasApp() {
  const [rutas, setRutas] = useState<RutaGuardadaUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroRepartidor, setFiltroRepartidor] = useState('');
  const [vista, setVista] = useState<VistaHistorial>('grid');

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const respuesta = await fetch('http://localhost:3000/api/rutas');

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

  const rutasFiltradas = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda.trim());

    return rutas.filter((ruta) => {
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

      const clientesRuta = ruta.detalleParadas
        .map((parada, indice) => nombreParada(parada, indice))
        .join(' ');

      return normalizarTexto(clientesRuta).includes(textoBusqueda);
    });
  }, [rutas, busqueda, filtroFecha, filtroRepartidor]);

  return (
    <section className="historialRutas">
      <div className="historialRutas__encabezado">
        <div>
          <h2><i className="bi bi-clock-history" aria-hidden="true"></i> Historial de rutas</h2>
          <p>Listado completo de rutas registradas en base de datos.</p>
        </div>

        <button type="button" className="historialRutas__botonRecargar" onClick={() => void cargarHistorial()}>
          <i className={`bi bi-arrow-clockwise${cargando ? ' historialRutas__iconoGirando' : ''}`} aria-hidden="true"></i> Recargar
        </button>
      </div>

      <div className="historialRutas__filtros">
        <label className="historialRutas__campo">
          <span>Buscar cliente</span>
          <div className="historialRutas__inputIcono">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Nombre del cliente"
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

        <button
          type="button"
          className="historialRutas__botonLimpiar"
          onClick={() => {
            setBusqueda('');
            setFiltroFecha('');
            setFiltroRepartidor('');
          }}
          disabled={!busqueda && !filtroFecha && !filtroRepartidor}
        >
          <i className="bi bi-eraser" aria-hidden="true"></i> Limpiar filtros
        </button>
      </div>

      <p className="historialRutas__resultado">{rutasFiltradas.length} rutas encontradas</p>

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

      {!cargando && !error && rutasFiltradas.length === 0 && (
        <p className="historialRutas__estado">No hay rutas registradas.</p>
      )}

      {!cargando && !error && rutasFiltradas.length > 0 && (
        <div className={`historialRutas__lista ${vista === 'lista' ? 'historialRutas__lista--lista' : ''}`}>
          {rutasFiltradas.map((ruta) => (
            <RutaResumenCard key={ruta.rutaId} ruta={ruta} />
          ))}
        </div>
      )}
    </section>
  );
}
