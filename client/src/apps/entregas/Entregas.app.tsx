import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapaInteractivo, { type MapaInteractivoFunciones } from '../../components/MapaInteractivo';
import type { RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component';
import RutaResumenCard from '../../components/rutaResumenCard/RutaResumenCard';
import {
    filtrarRutasPorFecha,
    obtenerRutasActivasParaMapa,
    visualizarRutasEnMapa,
} from '../../components/visualizacionRutasMapa.auxiliar';

import './Entregas.app.css';

const VITE_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000';
const API_BASE = VITE_API_URL.replace(/\/$/, '');

type RutasResponse = {
    rutasGuardadas?: RutaGuardadaUI[];
};

const URL_RUTAS = `${API_BASE}/api/rutas`;
const URL_TRACKING_BASE = `${API_BASE}/api/tracking`;
const INTERVALO_ACTUALIZACION_MS = 3000;

type UbicacionTracking = {
    lat: number;
    lng: number;
    timestamp: number;
    simulado?: boolean;
};

export default function EntregasApp() {
    const mapaRef = useRef<MapaInteractivoFunciones>(null);
    const [rutasGuardadas, setRutasGuardadas] = useState<RutaGuardadaUI[]>([]);
    const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<number | null>(null);
    const [cargandoInicial, setCargandoInicial] = useState<boolean>(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
    const [ubicacionesTracking, setUbicacionesTracking] = useState<Record<number, UbicacionTracking>>({});
    const [simulacionProcesando, setSimulacionProcesando] = useState<boolean>(false);

    const rutasDelDiaActual = useMemo(() => filtrarRutasPorFecha(rutasGuardadas, new Date()), [rutasGuardadas]);
    const rutasActivas = useMemo(() => obtenerRutasActivasParaMapa(rutasDelDiaActual), [rutasDelDiaActual]);

    const resolverRutaObjetivo = (): number | null => {
        if (typeof rutaSeleccionadaId === 'number') {
            return rutaSeleccionadaId;
        }

        if (rutasActivas.length > 0) {
            const rutaPorDefecto = rutasActivas[0]?.rutaId ?? null;
            if (rutaPorDefecto !== null) {
                setRutaSeleccionadaId(rutaPorDefecto);
            }
            return rutaPorDefecto;
        }

        return null;
    };

    const cargarUbicacionesTracking = useCallback(async (): Promise<void> => {
        if (rutasActivas.length === 0) {
            setUbicacionesTracking({});
            return;
        }

        const resultados = await Promise.all(
            rutasActivas.map(async (ruta) => {
                try {
                    const response = await fetch(`${URL_TRACKING_BASE}/ubicacion/${ruta.rutaId}`);
                    if (!response.ok) {
                        return null;
                    }

                    const payload = await response.json();
                    const data = payload?.data;

                    if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
                        return null;
                    }

                    return {
                        rutaId: ruta.rutaId,
                        ubicacion: {
                            lat: data.lat,
                            lng: data.lng,
                            timestamp: Number(data.timestamp ?? Date.now()),
                            simulado: Boolean(data.simulado),
                        },
                    };
                } catch {
                    return null;
                }
            }),
        );

        const siguiente: Record<number, UbicacionTracking> = {};
        resultados.forEach((resultado) => {
            if (!resultado) return;
            siguiente[resultado.rutaId] = resultado.ubicacion;
        });

        setUbicacionesTracking(siguiente);
    }, [rutasActivas]);

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
            repintarRutas: true,
            ubicacionesRepartidores: ubicacionesTracking,
        });
    }, [rutasActivas, rutaSeleccionadaId]);

    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa) {
            return;
        }

        const rutasVisibles = rutaSeleccionadaId === null
            ? rutasActivas
            : rutasActivas.filter((ruta) => ruta.rutaId === rutaSeleccionadaId);

        rutasVisibles.forEach((ruta, indiceRuta) => {
            const ubicacionActual = ubicacionesTracking[ruta.rutaId];

            if (!ubicacionActual) {
                mapa.actualizarInflexionRuta(indiceRuta, null);
                return;
            }

            mapa.actualizarInflexionRuta(
                indiceRuta,
                [ubicacionActual.lng, ubicacionActual.lat],
            );
        });

        visualizarRutasEnMapa({
            mapa,
            rutasGuardadas: rutasActivas,
            rutaSeleccionadaId,
            limpiarSiVacio: false,
            repintarRutas: false,
            ubicacionesRepartidores: ubicacionesTracking,
        });
    }, [ubicacionesTracking, rutasActivas, rutaSeleccionadaId]);

    useEffect(() => {
        let cancelado = false;

        const cargarConGuardia = async () => {
            await cargarUbicacionesTracking();
            if (cancelado) {
                return;
            }
        };

        void cargarConGuardia();
        const intervalId = window.setInterval(() => {
            void cargarConGuardia();
        }, INTERVALO_ACTUALIZACION_MS);

        return () => {
            cancelado = true;
            window.clearInterval(intervalId);
        };
    }, [cargarUbicacionesTracking]);

    const iniciarSimulacion = async () => {
        const rutaObjetivoId = resolverRutaObjetivo();

        if (!rutaObjetivoId) {
            window.alert('No hay rutas activas para simular.');
            return;
        }

        setSimulacionProcesando(true);
        try {
            const response = await fetch(`${URL_TRACKING_BASE}/simulacion/iniciar/${rutaObjetivoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ intervaloMs: 5000 }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error ?? 'No se pudo iniciar la simulación');
            }

            const payload = await response.json().catch(() => ({}));
            const ubicacionInicial = payload?.data?.ubicacionInicial;

            if (
                ubicacionInicial
                && typeof ubicacionInicial.lat === 'number'
                && typeof ubicacionInicial.lng === 'number'
            ) {
                setUbicacionesTracking((anterior) => ({
                    ...anterior,
                    [rutaObjetivoId]: {
                        lat: ubicacionInicial.lat,
                        lng: ubicacionInicial.lng,
                        timestamp: Number(ubicacionInicial.timestamp ?? Date.now()),
                        simulado: true,
                    },
                }));
            }

            await cargarUbicacionesTracking();
            setUltimaActualizacion(new Date());
        } catch (error) {
            console.error('No se pudo iniciar simulación de tracking', error);
        } finally {
            setSimulacionProcesando(false);
        }
    };

    const detenerSimulacion = async () => {
        const rutaObjetivoId = resolverRutaObjetivo();

        if (!rutaObjetivoId) {
            window.alert('No hay rutas activas para detener simulación.');
            return;
        }

        setSimulacionProcesando(true);
        try {
            const response = await fetch(`${URL_TRACKING_BASE}/simulacion/detener/${rutaObjetivoId}`, {
                method: 'POST',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error ?? 'No se pudo detener la simulación');
            }

            await cargarUbicacionesTracking();

            setUbicacionesTracking((anterior) => {
                const siguiente = { ...anterior };
                delete siguiente[rutaObjetivoId];
                return siguiente;
            });
        } catch (error) {
            console.error('No se pudo detener simulación de tracking', error);
        } finally {
            setSimulacionProcesando(false);
        }
    };

    return (
        <div className="vistaEntregas">
            <section className="vistaEntregas__mapa mapaInteractivo__panel">
                <MapaInteractivo ref={mapaRef} />
            </section>

            <aside className="vistaEntregas__panel">
                <header className="vistaEntregas__encabezadoPanel">
                    <h3>Rutas activas de hoy</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            type="button"
                            className="vistaEntregas__botonFiltro"
                            onClick={iniciarSimulacion}
                            disabled={simulacionProcesando}
                            title="Inicia simulación de tracking para la ruta seleccionada"
                        >
                            Simular tracking
                        </button>
                        <button
                            type="button"
                            className="vistaEntregas__botonFiltro"
                            onClick={detenerSimulacion}
                            disabled={simulacionProcesando}
                            title="Detiene simulación de tracking para la ruta seleccionada"
                        >
                            Detener simulación
                        </button>
                        <button
                            type="button"
                            className="vistaEntregas__botonFiltro"
                            onClick={() => setRutaSeleccionadaId(null)}
                        >
                            Ver todas
                        </button>
                    </div>
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
                    <p className="vistaEntregas__mensaje">No hay rutas activas para hoy.</p>
                )}

                {!cargandoInicial && (
                    <div className="vistaEntregas__listaRutas">
                        {rutasActivas.map((ruta) => (
                            <RutaResumenCard
                                key={ruta.rutaId}
                                ruta={ruta}
                                seleccionada={rutaSeleccionadaId === ruta.rutaId}
                                alSeleccionar={(rutaId) => setRutaSeleccionadaId((anterior) => (anterior === rutaId ? null : rutaId))}
                            />
                        ))}
                    </div>
                )}
            </aside>
        </div>
    );
}
