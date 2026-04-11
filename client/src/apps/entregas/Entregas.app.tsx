import { useEffect, useMemo, useRef, useState } from 'react';
import MapaInteractivo, { type MapaInteractivoFunciones } from '../../components/MapaInteractivo';
import type { RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component';
import {
    obtenerRutasActivasParaMapa,
    visualizarRutasEnMapa,
} from '../../components/visualizacionRutasMapa.auxiliar';

import './Entregas.app.css';

type RutasResponse = {
    rutasGuardadas?: RutaGuardadaUI[];
};

const URL_RUTAS = 'http://localhost:3000/api/rutas';
const INTERVALO_ACTUALIZACION_MS = 10000;

function formatearTiempo(segundos: number | null): string {
    if (segundos === null || segundos <= 0) return 'No calculado';
    return `${Math.round(segundos / 60)} min`;
}

function nombreParada(
    parada: RutaGuardadaUI['detalleParadas'][number],
    indiceParada: number,
): string {
    return parada.cliente?.trim() || `Parada ${indiceParada + 1}`;
}

export default function EntregasApp() {
    const mapaRef = useRef<MapaInteractivoFunciones>(null);
    const [rutasGuardadas, setRutasGuardadas] = useState<RutaGuardadaUI[]>([]);
    const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<number | null>(null);
    const [cargandoInicial, setCargandoInicial] = useState<boolean>(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

    const rutasActivas = useMemo(() => obtenerRutasActivasParaMapa(rutasGuardadas), [rutasGuardadas]);

    useEffect(() => {
        let vistaMontada = true;

        const cargarRutas = async (mostrarCargando: boolean): Promise<void> => {
            if (mostrarCargando) {
                setCargandoInicial(true);
            }

            try {
                const respuesta = await fetch(URL_RUTAS);
                if (!respuesta.ok) {
                    throw new Error(`No se pudo consultar rutas guardadas (${respuesta.status})`);
                }

                const payload = (await respuesta.json()) as RutasResponse;
                const rutas = payload.rutasGuardadas ?? [];

                if (!vistaMontada) {
                    return;
                }

                setRutasGuardadas(rutas);
                setUltimaActualizacion(new Date());
            } catch (error) {
                console.error('No se pudieron cargar las rutas de entregas', error);
                if (vistaMontada) {
                    setRutasGuardadas([]);
                }
            } finally {
                if (mostrarCargando && vistaMontada) {
                    setCargandoInicial(false);
                }
            }
        };

        void cargarRutas(true);
        const intervaloId = window.setInterval(() => {
            void cargarRutas(false);
        }, INTERVALO_ACTUALIZACION_MS);

        return () => {
            vistaMontada = false;
            window.clearInterval(intervaloId);
        };
    }, []);

    useEffect(() => {
        if (rutaSeleccionadaId === null) return;
        const existeRutaSeleccionada = rutasActivas.some((ruta) => ruta.rutaId === rutaSeleccionadaId);
        if (!existeRutaSeleccionada) {
            setRutaSeleccionadaId(null);
        }
    }, [rutaSeleccionadaId, rutasActivas]);

    useEffect(() => {
        visualizarRutasEnMapa({
            mapa: mapaRef.current,
            rutasGuardadas: rutasActivas,
            rutaSeleccionadaId,
            limpiarSiVacio: true,
        });
    }, [rutasActivas, rutaSeleccionadaId]);

    return (
        <div className="vistaEntregas">
            <section className="vistaEntregas__mapa mapaInteractivo__panel">
                <MapaInteractivo ref={mapaRef} />
            </section>

            <aside className="vistaEntregas__panel">
                <header className="vistaEntregas__encabezadoPanel">
                    <h3>Rutas activas</h3>
                    <button
                        type="button"
                        className="vistaEntregas__botonFiltro"
                        onClick={() => setRutaSeleccionadaId(null)}
                    >
                        Ver todas
                    </button>
                </header>

                <div className="vistaEntregas__leyendaEstados" aria-label="Leyenda de estados de entrega">
                    <span className="leyendaEstado leyendaEstado--pendiente">Pendiente</span>
                    <span className="leyendaEstado leyendaEstado--proceso">En proceso</span>
                    <span className="leyendaEstado leyendaEstado--entregado">Entregado</span>
                </div>

                <p className="vistaEntregas__actualizacion">
                    Última actualización: {ultimaActualizacion ? ultimaActualizacion.toLocaleTimeString() : 'Sin datos'}
                </p>

                {cargandoInicial && <p className="vistaEntregas__mensaje">Cargando rutas...</p>}

                {!cargandoInicial && rutasActivas.length === 0 && (
                    <p className="vistaEntregas__mensaje">No hay rutas activas para mostrar.</p>
                )}

                {!cargandoInicial && rutasActivas.map((ruta) => {
                    const inicio = ruta.detalleParadas[0];
                    const fin = ruta.detalleParadas[ruta.detalleParadas.length - 1];

                    return (
                        <article
                            key={ruta.rutaId}
                            className={`entregaRutaCard ${rutaSeleccionadaId === ruta.rutaId ? 'entregaRutaCard--seleccionada' : ''}`}
                            onClick={() => setRutaSeleccionadaId((anterior) => (anterior === ruta.rutaId ? null : ruta.rutaId))}
                        >
                            <div className="entregaRutaCard__tituloFila">
                                <strong>Ruta #{ruta.rutaId}</strong>
                                <span>{ruta.repartidor.nombre?.trim() || 'Sin nombre'}</span>
                            </div>

                            <div className="entregaRutaCard__metricas">
                                <span>Paradas: {ruta.detalleParadas.length}</span>
                                <span>Tiempo: {formatearTiempo(ruta.resumen.tiempoEstimado)}</span>
                            </div>

                            <div className="entregaRutaCard__inicioFin">
                                <p><strong>Inicio:</strong> {inicio ? nombreParada(inicio, 0) : 'No disponible'}</p>
                                <p><strong>Fin:</strong> {fin ? nombreParada(fin, ruta.detalleParadas.length - 1) : 'No disponible'}</p>
                            </div>
                        </article>
                    );
                })}
            </aside>
        </div>
    );
}
