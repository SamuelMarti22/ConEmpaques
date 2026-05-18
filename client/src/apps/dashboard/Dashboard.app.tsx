import { useCallback, useEffect, useMemo, useState } from 'react';
import './Dashboard.app.css';
import GraficoEntregasSemanales from './componentes/GraficoEntregasSemanales';
import GraficoDistribucionEstados from './componentes/GraficoDistribucionEstados';
import GraficoActividadHoraria from './componentes/GraficoActividadHoraria';
import GraficoTendenciaMensual from './componentes/GraficoTendenciaMensual';
import GraficoRepartidorEntregas from './componentes/GraficoRepartidorEntregas';
import { dashboardAPI } from './servicios/DashboardAPI';
import type { RecentDeliveriesResponse } from './servicios/DashboardAPI';
import {
  exportarEntregasExcel,
  nombreArchivoExportEntregas,
} from './utilidades/exportarEntregasExcel';

type RegistroEntregaVista = {
  id: string;
  conductor: string;
  zona: string;
  estado: string;
  estadoSistema: string;
  creadoEn: string;
  asignadoEn: string;
  recogidoEn: string;
  entregadoEn: string;
};

function normalizarEstadoBackend(estado: string | undefined): string {
  const valor = (estado ?? '').toUpperCase().trim();
  if (valor.includes('DELIVERED') || valor.includes('ENTREG')) return 'DELIVERED';
  if (valor.includes('FAILED') || valor.includes('FALL')) return 'FAILED';
  if (valor.includes('CANCEL')) return 'CANCELLED';
  if (valor.includes('TRANSIT') || valor.includes('CAMINO')) return 'IN_TRANSIT';
  if (valor.includes('ASSIGN') || valor.includes('ASIGN')) return 'ASSIGNED';
  return 'PENDING';
}

function estadoParaVista(estado: string): string {
  switch (estado) {
    case 'DELIVERED':
      return 'Completado';
    case 'FAILED':
      return 'Fallido';
    case 'IN_TRANSIT':
      return 'En camino';
    case 'CANCELLED':
      return 'Retrasado';
    case 'ASSIGNED':
      return 'En camino';
    default:
      return 'Retrasado';
  }
}

function extraerZona(direccion: string | undefined): string {
  if (!direccion || direccion.trim().length === 0) return 'Sin zona';
  const zona = direccion.split(',')[0]?.trim();
  return zona && zona.length > 0 ? zona : 'Sin zona';
}

function crearFechasOperativas(fechaEntrega: Date): {
  creadoEn: string;
  asignadoEn: string;
  recogidoEn: string;
  entregadoEn: string;
} {
  const creado = new Date(fechaEntrega.getTime() - 45 * 60 * 1000);
  const asignado = new Date(fechaEntrega.getTime() - 35 * 60 * 1000);
  const recogido = new Date(fechaEntrega.getTime() - 20 * 60 * 1000);

  return {
    creadoEn: creado.toISOString(),
    asignadoEn: asignado.toISOString(),
    recogidoEn: recogido.toISOString(),
    entregadoEn: fechaEntrega.toISOString(),
  };
}

function mapearRespuestaARegistros(respuesta: RecentDeliveriesResponse): RegistroEntregaVista[] {
  const base = respuesta.entregas.map((entrega, indice) => {
    const estadoSistema = normalizarEstadoBackend(entrega.estado);
    const fechaEntrega = entrega.fechaEntrega ? new Date(entrega.fechaEntrega) : new Date();
    const fechaSegura = Number.isNaN(fechaEntrega.getTime()) ? new Date() : fechaEntrega;
    const fechas = crearFechasOperativas(fechaSegura);

    return {
      id: entrega.codigoSeguimiento || entrega.id || `ENT-${indice + 1}`,
      conductor: entrega.repartidor || 'Sin asignar',
      zona: extraerZona(entrega.direccion),
      estadoSistema,
      ...fechas,
    };
  });

  return base.map(registro => ({
    ...registro,
    estado: estadoParaVista(registro.estadoSistema),
  }));
}

function aplicarFiltrosLocales(
  lista: RegistroEntregaVista[],
  conductor: string,
  estado: string,
  desde: string,
  hasta: string,
): RegistroEntregaVista[] {
  return lista.filter(r => {
    if (conductor && r.conductor !== conductor) return false;
    if (estado !== 'todos' && r.estado !== estado) return false;
    const te = new Date(r.entregadoEn).getTime();
    if (Number.isNaN(te)) return false;
    if (desde) {
      const d = new Date(`${desde}T00:00:00`);
      if (te < d.getTime()) return false;
    }
    if (hasta) {
      const h = new Date(`${hasta}T23:59:59.999`);
      if (te > h.getTime()) return false;
    }
    return true;
  });
}

const ESTADOS_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos los estados' },
  { valor: 'Completado', etiqueta: 'Completado' },
  { valor: 'Fallido', etiqueta: 'Fallido' },
  { valor: 'En camino', etiqueta: 'En camino' },
  { valor: 'Retrasado', etiqueta: 'Retrasado / pendiente' },
];

export default function DashboardApp() {
  const [cargando, setCargando] = useState(true);
  const [cargandoSilencioso, setCargandoSilencioso] = useState(false);
  const [registrosBruto, setRegistrosBruto] = useState<RegistroEntregaVista[]>([]);
  const [totalRemoto, setTotalRemoto] = useState(0);
  const [tamanoLote, setTamanoLote] = useState(50);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null);
  const [relojCabecera, setRelojCabecera] = useState(() => new Date());
  const [mensajeEstado, setMensajeEstado] = useState('');

  const [filtroRepartidor, setFiltroRepartidor] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const repartidoresOpciones = useMemo(() => {
    const u = new Set(registrosBruto.map(r => r.conductor).filter(Boolean));
    return Array.from(u).sort((a, b) => a.localeCompare(b, 'es'));
  }, [registrosBruto]);

  const registrosFiltrados = useMemo(
    () => aplicarFiltrosLocales(registrosBruto, filtroRepartidor, filtroEstado, filtroDesde, filtroHasta),
    [registrosBruto, filtroRepartidor, filtroEstado, filtroDesde, filtroHasta],
  );

  const resumenAlertas = useMemo(() => {
    const n = registrosFiltrados.length;
    if (n === 0) return null;
    const fallos = registrosFiltrados.filter(r => r.estado === 'Fallido').length;
    const ratio = fallos / n;
    if (fallos >= 5 && ratio >= 0.12) {
      return {
        tipo: 'danger' as const,
        texto: `En la vista actual, ${fallos} de ${n} entregas están fallidas (${Math.round(ratio * 100)}%). Conviene revisar causas y reasignaciones.`,
      };
    }
    if (fallos >= 3 || ratio >= 0.08) {
      return {
        tipo: 'warn' as const,
        texto: `Incidencias: ${fallos} fallida(s) sobre ${n} entregas visibles (${Math.round(ratio * 100)}%).`,
      };
    }
    return null;
  }, [registrosFiltrados]);

  const fetchEntregas = useCallback(async (limite: number, opciones?: { silencioso?: boolean }) => {
    const silencioso = opciones?.silencioso === true;
    // Paginación por tamaño de lote: siempre página 1; "Cargar más" sube el límite hasta 500 o total en servidor.
    if (silencioso) {
      setCargandoSilencioso(true);
    } else {
      setCargando(true);
    }
    setErrorDatos(null);
    try {
      const respuesta = await dashboardAPI.obtenerEntregasRecientes(1, limite);
      const lista = mapearRespuestaARegistros(respuesta);
      setRegistrosBruto(lista);
      setTotalRemoto(respuesta.total);
      setUltimaSincronizacion(new Date());
      setMensajeEstado(
        `Vista actualizada: ${lista.length} entrega(s) cargada(s) de ${respuesta.total} en servidor.`,
      );
    } catch (error) {
      console.error('No se pudieron cargar entregas recientes del dashboard:', error);
      if (!silencioso) {
        setErrorDatos(
          'No se pudieron cargar los datos. Comprueba la conexión, que el servidor esté en ejecución y la URL del API (VITE_API_URL).',
        );
        setMensajeEstado('');
      } else {
        setMensajeEstado(
          'No se pudo actualizar en segundo plano; los datos en pantalla pueden estar desactualizados.',
        );
      }
    } finally {
      setCargando(false);
      setCargandoSilencioso(false);
    }
  }, []);

  useEffect(() => {
    void fetchEntregas(50);
  }, [fetchEntregas]);

  useEffect(() => {
    const id = window.setInterval(() => setRelojCabecera(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchEntregas(tamanoLote, { silencioso: true });
    }, 60000);
    return () => window.clearInterval(id);
  }, [fetchEntregas, tamanoLote]);

  const rangoSemanal = useMemo(() => {
    const fin = new Date();
    const inicio = new Date(fin);
    inicio.setDate(fin.getDate() - 6);
    return { inicio, fin };
  }, []);

  const etiquetaFecha = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(relojCabecera);

  const textoUltimaSync =
    ultimaSincronizacion !== null
      ? new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(ultimaSincronizacion)
      : '—';

  const hayMasEnServidor = totalRemoto > 0 && registrosBruto.length < totalRemoto;
  const puedeCargarMas = hayMasEnServidor && tamanoLote < 500;

  const manejarRefrescar = () => {
    setTamanoLote(50);
    void fetchEntregas(50);
  };

  const manejarCargarMas = () => {
    const siguiente = Math.min(tamanoLote + 50, 500, totalRemoto || 500);
    if (siguiente <= tamanoLote) return;
    setTamanoLote(siguiente);
    void fetchEntregas(siguiente);
  };

  const manejarExportarCsv = () => {
    exportarEntregasExcel(registrosFiltrados, nombreArchivoExportEntregas(), {
      generadoEn: new Date(),
      totalFiltradas: registrosFiltrados.length,
      totalCargadas: registrosBruto.length,
      totalServidor: totalRemoto,
      filtros: {
        repartidor: filtroRepartidor,
        estado: filtroEstado,
        entregaDesde: filtroDesde,
        entregaHasta: filtroHasta,
      },
    });
  };

  const manejarLimpiarFiltros = () => {
    setFiltroRepartidor('');
    setFiltroEstado('todos');
    setFiltroDesde('');
    setFiltroHasta('');
  };

  return (
    <section className="dashboard dashboard--compact">
      <div className="dashboard__workspace">
        <header className="dashboard__header">
          <div>
            <p className="dashboard__eyebrow">Dashboard administrativo / logístico</p>
            <h1>Panel general de entregas</h1>
            <p>
              Vista ejecutiva para controlar volumen de pedidos, cumplimiento, incidencias y capacidad operativa.
            </p>
          </div>

          <div className="dashboard__headerMeta">
            <div className="dashboard__dateChip">
              <i className="bi bi-calendar3" aria-hidden="true"></i>
              <span>{etiquetaFecha}</span>
            </div>
            <div className="dashboard__liveChip" title={`Reloj de cabecera: ${relojCabecera.toLocaleTimeString('es-CO')}`}>
              <span className="dashboard__liveDot"></span>
              <span>Actualización en vivo</span>
            </div>
            <div className="dashboard__syncChip" title="Momento en que terminó la última petición correcta al API">
              <i className="bi bi-arrow-repeat" aria-hidden="true"></i>
              <span>
                Última sync: <strong>{textoUltimaSync}</strong>
              </span>
            </div>
          </div>
        </header>

        <section className="dashboard__filtersBar" aria-label="Filtros y acciones del panel">
          <div className="dashboard__filterField">
            <label htmlFor="dash-filtro-repartidor">
              <span>Repartidor</span>
            </label>
            <select
              id="dash-filtro-repartidor"
              value={filtroRepartidor}
              onChange={e => setFiltroRepartidor(e.target.value)}
            >
              <option value="">Todos</option>
              {repartidoresOpciones.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="dashboard__filterField">
            <label htmlFor="dash-filtro-estado">
              <span>Estado</span>
            </label>
            <select
              id="dash-filtro-estado"
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              {ESTADOS_FILTRO.map(o => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="dashboard__filterField">
            <label htmlFor="dash-filtro-desde">
              <span>Entrega desde</span>
            </label>
            <input id="dash-filtro-desde" type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
          </div>
          <div className="dashboard__filterField">
            <label htmlFor="dash-filtro-hasta">
              <span>Entrega hasta</span>
            </label>
            <input id="dash-filtro-hasta" type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
          </div>

          <div className="dashboard__toolbarAcciones dashboard__filterField--full">
            <button type="button" className="dashboard__btn dashboard__btn--primary" onClick={manejarRefrescar}>
              Refrescar ahora
            </button>
            <button
              type="button"
              className="dashboard__btn"
              onClick={manejarCargarMas}
              disabled={!puedeCargarMas || cargando || cargandoSilencioso}
              title={!hayMasEnServidor ? 'No hay más registros en el servidor' : 'Trae más filas del API (máx. 500)'}
            >
              Cargar más ({registrosBruto.length}/{totalRemoto || '—'})
            </button>
            <button
              type="button"
              className="dashboard__btn"
              onClick={manejarExportarCsv}
              disabled={registrosFiltrados.length === 0}
            >
              Exportar Excel
            </button>
            <button type="button" className="dashboard__btn dashboard__btn--ghost" onClick={manejarLimpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </section>

        <p className="dashboard__mensajeEstado" aria-live="polite" aria-atomic="true">
          {mensajeEstado}
        </p>

        <section className="dashboard__body">
          {errorDatos ? (
            <div className="dashboard__errorCaja" role="alert" aria-live="assertive">
              <p className="dashboard__errorTitulo">{errorDatos}</p>
              <button type="button" className="dashboard__btn dashboard__btn--primary" onClick={manejarRefrescar}>
                Reintentar
              </button>
            </div>
          ) : null}

          {!errorDatos && resumenAlertas ? (
            <div className={`dashboard__alerta dashboard__alerta--${resumenAlertas.tipo}`} role="status">
              {resumenAlertas.texto}
            </div>
          ) : null}

          {!errorDatos && !cargando && (
            <p className="dashboard__contadorVista">
              Mostrando <strong>{registrosFiltrados.length}</strong> entrega(s) filtrada(s) de{' '}
              <strong>{registrosBruto.length}</strong> cargada(s)
              {totalRemoto > 0 ? (
                <>
                  {' '}
                  (total en servidor: <strong>{totalRemoto}</strong>)
                </>
              ) : null}
              . {cargandoSilencioso ? ' Actualizando…' : ''}
            </p>
          )}

          {cargando && registrosBruto.length === 0 ? (
            <div className="dashboard__skeletonGrid" aria-busy="true" aria-label="Cargando datos del panel">
              {[1, 2, 3, 4].map(k => (
                <div key={k} className="dashboard__skeletonCard" />
              ))}
            </div>
          ) : null}

          {!cargando || registrosBruto.length > 0 ? (
            <section className="dashboard__contentGrid">
              <article className="dashboard__panel dashboard__panel--wide">
                <GraficoEntregasSemanales registros={registrosFiltrados} rango={rangoSemanal} />
              </article>

              <article className="dashboard__panel dashboard__panel--wide">
                <GraficoActividadHoraria registros={registrosFiltrados} />
              </article>

              <article className="dashboard__panel dashboard__panel--wide">
                <GraficoRepartidorEntregas registros={registrosFiltrados} />
              </article>

              <article className="dashboard__panel dashboard__panel--wide">
                <GraficoTendenciaMensual registros={registrosFiltrados} />
              </article>

              <article className="dashboard__panel">
                <GraficoDistribucionEstados registros={registrosFiltrados} />
              </article>
            </section>
          ) : null}
        </section>
      </div>
    </section>
  );
}
