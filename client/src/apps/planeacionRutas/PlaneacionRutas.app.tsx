import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { PuntoEntrega } from '../../classes/PuntoEntrega'
import type { MapaInteractivoFunciones } from '../../components/MapaInteractivo'
import MapaInteractivo from '../../components/MapaInteractivo'
import type { PuntosEntregaAtributos } from '../../components/PuntosEntrega'
import PuntosEntrega from '../../components/PuntosEntrega'
import { URL_REPARTIDORES, obtenerMensajeErrorHttp } from '../estilosCompartidosRepartidores/repartidores.compartido'
import type { CapacidadRepartidor, PuntoEntregaFormateado } from './../../types/routing.types'
import BotonGeneracionRutas from '../../components/planteacionRuta/botonGeneracionRutas'
import {RutaRepartidorGeoJSON} from './../../classes/RutaRepartidorGeoJSON'
import BotonGuardarRuta, { type RutaGuardadaUI } from '../../components/guardadoRuta/botonGuardarRuta.component'
import ResumenRutasGuardadas from './ResumenRutasGuardadas'
import { filtrarRutasDesdeFecha, filtrarRutasPorFecha, visualizarRutasEnMapa } from '../../components/visualizacionRutasMapa.auxiliar'

import './PlaneacionRutas.css';
const VITE_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000';
const API_BASE = VITE_API_URL.replace(/\/$/, '');

interface RepartidorParaAsignacionResponse {
    id: number;
    capacidadVehiculo: number;
}

interface HorarioRepartidorResponse {
    puedeRecibirRuta: boolean;
    mensaje?: string;
}

const DIAS_SELECCIONABLES = 7;

function agregarDias(fechaBase: Date, dias: number): Date {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + dias);
    fecha.setHours(12, 0, 0, 0);
    return fecha;
}

function normalizarFechaMediodiaLocal(fechaBase: Date): Date {
    const fecha = new Date(fechaBase);
    fecha.setHours(12, 0, 0, 0);
    return fecha;
}

function formatearValorFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function fechaDesdeValor(valor: string): Date {
    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

function obtenerOpcionesSieteDiasConHoy(): Date[] {
    const hoy = new Date();
    return Array.from({ length: DIAS_SELECCIONABLES }, (_valor, indice) => agregarDias(hoy, indice));
}

function formatearEtiquetaFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-CO', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
    });
}

type VistaLateralActiva = 'puntos' | 'rutas';

export default function PlaneacionRutas() {

    const mapaRef = useRef<MapaInteractivoFunciones>(null);
    const puntosEntregaRef = useRef<PuntosEntregaAtributos>(null);
    const ultimaConsultaDisponibilidadRef = useRef(0);
    const [capacidadesRepartidores, setCapacidadesRepartidores] = useState<CapacidadRepartidor[]>([]);
    const [motivoSinRepartidores, setMotivoSinRepartidores] = useState<string>('');
    const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
    const [rutasGeneradas, setRutasGeneradas] = useState<RutaRepartidorGeoJSON[]>([]);
    const [rutasGuardadas, setRutasGuardadas] = useState<RutaGuardadaUI[]>([]);
    const [eliminandoRutaId, setEliminandoRutaId] = useState<number | null>(null);
    const [rutaGuardadaSeleccionadaId, setRutaGuardadaSeleccionadaId] = useState<number | null>(null);
    const [fechaReparto, setFechaReparto] = useState<Date>(() => normalizarFechaMediodiaLocal(new Date()));
    const [horaInicioRecorrido, setHoraInicioRecorrido] = useState<string>('08:00');
    const [vistaLateralActiva, setVistaLateralActiva] = useState<VistaLateralActiva>('puntos');
    const [mostrarTodasRutasAsignadas, setMostrarTodasRutasAsignadas] = useState(false);
    const opcionesSemana = useMemo(() => obtenerOpcionesSieteDiasConHoy(), []);
    const storageKeyPuntosPorFecha = useMemo(
        () => `conempaques:puntos-entrega:${formatearValorFecha(fechaReparto)}`,
        [fechaReparto],
    );
    const rutasGuardadasDesdeHoy = useMemo(
        () => filtrarRutasDesdeFecha(rutasGuardadas, normalizarFechaMediodiaLocal(new Date())),
        [rutasGuardadas],
    );
    const rutasGuardadasFiltradasPorDia = useMemo(
        () => filtrarRutasPorFecha(rutasGuardadasDesdeHoy, fechaReparto),
        [rutasGuardadasDesdeHoy, fechaReparto],
    );
    const rutasGuardadasVisibles = useMemo(
        () => (mostrarTodasRutasAsignadas ? rutasGuardadasDesdeHoy : rutasGuardadasFiltradasPorDia),
        [mostrarTodasRutasAsignadas, rutasGuardadasDesdeHoy, rutasGuardadasFiltradasPorDia],
    );
    const cargarCapacidadesRepartidores = useCallback(async (): Promise<void> => {
        const consultaId = ultimaConsultaDisponibilidadRef.current + 1;
        ultimaConsultaDisponibilidadRef.current = consultaId;
        setCargandoDisponibilidad(true);
        setCapacidadesRepartidores([]);
        setMotivoSinRepartidores('');

        try {
            const fechaSeleccionada = formatearValorFecha(fechaReparto);

            const responseRepartidores = await fetch(URL_REPARTIDORES);
            if (!responseRepartidores.ok) {
                throw new Error(await obtenerMensajeErrorHttp(responseRepartidores));
            }

            const repartidores = (await responseRepartidores.json()) as RepartidorParaAsignacionResponse[];
            const repIds = repartidores.map((repartidor) => repartidor.id);

            const validacionPorRepartidor = await Promise.allSettled(
                repIds.map(async (repartidorId) => {
                    const responseHorarios = await fetch(`${URL_REPARTIDORES}/${repartidorId}/validar-recepcion-ruta`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fecha: fechaSeleccionada,
                            hora: horaInicioRecorrido,
                        }),
                    });

                    if (!responseHorarios.ok) {
                        throw new Error(await obtenerMensajeErrorHttp(responseHorarios));
                    }

                    const validacion = (await responseHorarios.json()) as HorarioRepartidorResponse;
                    return { repartidorId, validacion };
                }),
            );

            const validacionesExitosas = validacionPorRepartidor
                .filter((resultado): resultado is PromiseFulfilledResult<{ repartidorId: number; validacion: HorarioRepartidorResponse }> =>
                    resultado.status === 'fulfilled',
                )
                .map((resultado) => resultado.value);

            const motivosNoDisponibles = validacionesExitosas
                .map((resultado) => resultado.validacion)
                .filter((validacion) => !validacion.puedeRecibirRuta)
                .map((validacion) => validacion.mensaje ?? '')
                .filter((mensaje) => mensaje.length > 0);

            const repartidoresDisponibles = repartidores.filter((repartidor) => {
                const validacion = validacionesExitosas.find((item) => item.repartidorId === repartidor.id)?.validacion;
                return Boolean(validacion?.puedeRecibirRuta);
            });

            const capacidadesFormateadas = repartidoresDisponibles
                .filter((repartidor) => typeof repartidor.capacidadVehiculo === 'number')
                .map((repartidor) => ({
                    id: repartidor.id,
                    capacidad: repartidor.capacidadVehiculo,
                }));

            if (consultaId !== ultimaConsultaDisponibilidadRef.current) {
                return;
            }

            setCapacidadesRepartidores(capacidadesFormateadas);
            if (capacidadesFormateadas.length === 0 && motivosNoDisponibles.length > 0) {
                setMotivoSinRepartidores(motivosNoDisponibles[0]);
            }
        } catch (errorOperacion) {
            console.error('No se pudo obtener la lista de repartidores disponibles para la fecha seleccionada', errorOperacion);
            if (consultaId === ultimaConsultaDisponibilidadRef.current) {
                setCapacidadesRepartidores([]);
                setMotivoSinRepartidores('No se pudo validar la disponibilidad de repartidores. Intenta nuevamente.');
            }
        } finally {
            if (consultaId === ultimaConsultaDisponibilidadRef.current) {
                setCargandoDisponibilidad(false);
            }
        }
    }, [fechaReparto, horaInicioRecorrido]);

    useEffect(() => {
        void cargarCapacidadesRepartidores();
    }, [cargarCapacidadesRepartidores]);

    useEffect(() => {
        if (vistaLateralActiva === 'puntos') {
            const rutasParaPintar = rutasGeneradas.map((ruta) => ruta.getGeometria());
            if (rutasParaPintar.length === 0) {
                mapaRef.current?.limpiarRutas();
                mapaRef.current?.limpiarPuntosEntrega();
                return;
            }

            mapaRef.current?.pintarRutasGeoJSON(rutasParaPintar);
            mapaRef.current?.limpiarPuntosEntrega();
            return;
        }

        visualizarRutasEnMapa({
            mapa: mapaRef.current,
            rutasGuardadas: rutasGuardadasVisibles,
            rutaSeleccionadaId: rutaGuardadaSeleccionadaId,
        });
    }, [vistaLateralActiva, rutasGeneradas, rutasGuardadasVisibles, rutaGuardadaSeleccionadaId]);

    useEffect(() => {
        if (rutaGuardadaSeleccionadaId === null) {
            return;
        }

        const existeRutaSeleccionada = rutasGuardadasVisibles.some((ruta) => ruta.rutaId === rutaGuardadaSeleccionadaId);
        if (!existeRutaSeleccionada) {
            setRutaGuardadaSeleccionadaId(null);
        }
    }, [rutaGuardadaSeleccionadaId, rutasGuardadasVisibles]);

    const agregarPunto = (punto: PuntoEntrega) => {
        mapaRef.current?.agregarPunto(punto);
    };

    const vaciarPuntos = () => {
        mapaRef.current?.vaciarPuntos();
    };

    const eliminarPunto = (id: number) => {
        mapaRef.current?.eliminarPunto(id);
    };

    const obtenerPuntosFormateadosBackend = (): PuntoEntregaFormateado[] => {
        return puntosEntregaRef.current?.obtenerPuntosFormateadosBackend() || [];
    };

    const obtenerPuntosActuales = (): PuntoEntrega[] => {
        return puntosEntregaRef.current?.obtenerPuntosActuales() || [];
    };

    const cargarRutasGuardadas = useCallback(async (): Promise<void> => {
        try {
            const respuesta = await fetch(`${API_BASE}/api/rutas`);

            if (!respuesta.ok) {
                throw new Error(`No se pudo consultar rutas guardadas (${respuesta.status})`);
            }

            const payload = (await respuesta.json()) as { rutasGuardadas?: RutaGuardadaUI[] };
            const rutas = payload.rutasGuardadas ?? [];
            setRutasGuardadas(rutas);

            if (rutaGuardadaSeleccionadaId !== null && !rutas.some((ruta) => ruta.rutaId === rutaGuardadaSeleccionadaId)) {
                setRutaGuardadaSeleccionadaId(null);
            }
        } catch (error) {
            console.error('No se pudieron cargar las rutas guardadas', error);
        }
    }, [rutaGuardadaSeleccionadaId]);

    useEffect(() => {
        void cargarRutasGuardadas();
    }, [cargarRutasGuardadas]);

    const eliminarRutaGuardada = async (rutaId: number): Promise<void> => {
        setEliminandoRutaId(rutaId);

        try {
            const respuesta = await fetch(`${API_BASE}/api/rutas/${rutaId}`, {
                method: 'DELETE',
            });

            if (!respuesta.ok) {
                const errorText = await respuesta.text();
                throw new Error(`Error ${respuesta.status}: ${errorText}`);
            }

            await cargarRutasGuardadas();
                        await cargarCapacidadesRepartidores();
            if (rutaGuardadaSeleccionadaId === rutaId) {
                setRutaGuardadaSeleccionadaId(null);
            }

            Swal.fire({
                title: 'Ruta eliminada',
                text: `La ruta ${rutaId} fue eliminada de la base de datos`,
                icon: 'success',
                confirmButtonText: 'Aceptar'
            });
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido al eliminar la ruta';
            Swal.fire({
                title: 'Error',
                text: mensajeError,
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
        } finally {
            setEliminandoRutaId(null);
        }
    };

    return (
        <>
            <div className="vistaPlaneacion">
                <div className="seccionMapaInteractivo mapaInteractivo__panel">
                    <MapaInteractivo ref={mapaRef} />
                </div>

                <div className="columnaLateralPlaneacion">
                    <div className="selectorVistaPlaneacion" role="tablist" aria-label="Cambiar vista lateral">
                        <button
                            type="button"
                            className={`selectorVistaPlaneacion__boton ${vistaLateralActiva === 'puntos' ? 'selectorVistaPlaneacion__boton--activo' : ''}`}
                            onClick={() => setVistaLateralActiva('puntos')}
                        >
                            Añadir puntos
                        </button>
                        <button
                            type="button"
                            className={`selectorVistaPlaneacion__boton ${vistaLateralActiva === 'rutas' ? 'selectorVistaPlaneacion__boton--activo' : ''}`}
                            onClick={() => setVistaLateralActiva('rutas')}
                        >
                            Rutas asignadas
                        </button>
                    </div>

                    <div className="selectorFechaPlaneacion">
                        <label className="selectorFechaPlaneacion__label" htmlFor="fechaReparto">
                            Día de reparto
                        </label>
                        <select
                            id="fechaReparto"
                            className="selectorFechaPlaneacion__select"
                            value={formatearValorFecha(fechaReparto)}
                            onChange={(evento) => {
                                const nuevaFecha = fechaDesdeValor(evento.target.value);
                                setFechaReparto(nuevaFecha);
                                setRutasGeneradas([]);
                            }}
                        >
                            {opcionesSemana.map((fecha) => (
                                <option key={formatearValorFecha(fecha)} value={formatearValorFecha(fecha)}>
                                    {formatearEtiquetaFecha(fecha)}
                                </option>
                            ))}
                        </select>
                        <p className="selectorFechaPlaneacion__ayuda">
                            Se consultan 7 días corridos contando hoy.
                        </p>

                        {vistaLateralActiva === 'puntos' && (
                            <>
                                <label className="selectorFechaPlaneacion__label" htmlFor="horaInicioRecorrido">
                                    Hora de inicio del recorrido
                                </label>
                                <input
                                    id="horaInicioRecorrido"
                                    type="time"
                                    className="selectorFechaPlaneacion__select"
                                    value={horaInicioRecorrido}
                                    onChange={(evento) => setHoraInicioRecorrido(evento.target.value)}
                                />
                            </>
                        )}
                    </div>

                    {vistaLateralActiva === 'puntos' && (
                        <>
                            <div className="seccionPuntos">
                                <PuntosEntrega
                                    storageKey={storageKeyPuntosPorFecha}
                                    ref={puntosEntregaRef}
                                    onAgregarMarcadorMapa={agregarPunto}
                                    onEliminarMarcadorMapa={eliminarPunto}
                                    onVaciarMarcadoresMapa={vaciarPuntos}
                                />
                            </div>

                            <div className="accionesPlaneacionRutas">
                                <BotonGeneracionRutas
                                    obtenerPuntosFormateados={obtenerPuntosFormateadosBackend}
                                    capacidadesRepartidores={capacidadesRepartidores}
                                    cargandoDisponibilidad={cargandoDisponibilidad}
                                    motivoSinRepartidores={motivoSinRepartidores}
                                    onRutasGeneradas={(rutas) => {
                                        const rutasInstanciadas = rutas.map(ruta => 
                                            new RutaRepartidorGeoJSON(
                                                ruta.repartidor_id,
                                                ruta.ruta,
                                                ruta.distancia_total,
                                                ruta.tiempo_estimado,
                                                ruta.geometria
                                            )
                                        );
                                        setRutasGeneradas(rutasInstanciadas);
                                    }}
                                    onError={(error) => {
                                        Swal.fire({
                                            title: ' No se pudieron generar rutas',
                                            text: error,
                                            icon: 'error',
                                            confirmButtonText: 'Aceptar'
                                        });
                                    }}
                                />

                                <BotonGuardarRuta
                                    obtenerPuntosActuales={obtenerPuntosActuales}
                                    rutaRepartidorGeoJSON={rutasGeneradas}
                                    fechaReparto={fechaReparto}
                                    horaInicioRecorrido={horaInicioRecorrido}
                                    onRutasGuardadas={(nuevasRutasGuardadas) => {
                                        setRutasGuardadas(nuevasRutasGuardadas);
                                        setRutaGuardadaSeleccionadaId(nuevasRutasGuardadas[0]?.rutaId ?? null);
                                        setVistaLateralActiva('rutas');
                                    }}
                                    onMensajeRutaGuardada={(mensaje) => {
                                        void cargarRutasGuardadas();
                                        void cargarCapacidadesRepartidores();
                                        setVistaLateralActiva('rutas');
                                        Swal.fire({
                                            title: '¡Éxito!',
                                            text: mensaje[0] ?? 'Rutas guardadas correctamente.',
                                            icon: 'success',
                                            confirmButtonText: 'Aceptar'
                                        });
                                    }}
                                    onErrorRutaGuardada={(error) => {
                                        Swal.fire({
                                            title: 'Error',
                                            text: error,
                                            icon: 'error',
                                            confirmButtonText: 'Aceptar'
                                        });
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {vistaLateralActiva === 'rutas' && (
                        <>
                            <div className="accionesRutasAsignadas">
                                <button
                                    type="button"
                                    className="accionesRutasAsignadas__boton"
                                    onClick={() => setMostrarTodasRutasAsignadas((valorActual) => !valorActual)}
                                >
                                    {mostrarTodasRutasAsignadas
                                        ? 'Ver solo día seleccionado'
                                        : 'Ver todas'}
                                </button>
                            </div>

                            <ResumenRutasGuardadas
                                rutasGuardadas={rutasGuardadasVisibles}
                                eliminandoRutaId={eliminandoRutaId}
                                rutaSeleccionadaId={rutaGuardadaSeleccionadaId}
                                onSeleccionarRuta={(rutaId) => {
                                    setRutaGuardadaSeleccionadaId((rutaSeleccionadaActual) =>
                                        rutaSeleccionadaActual === rutaId ? null : rutaId,
                                    );
                                }}
                                onEliminarRuta={(rutaId) => {
                                    void eliminarRutaGuardada(rutaId);
                                }}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    )
}