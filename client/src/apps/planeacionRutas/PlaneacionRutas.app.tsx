import { useEffect, useRef, useState } from 'react'
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

import './PlaneacionRutas.css';

interface RepartidorDisponibleHoyResponse {
    id: number;
    capacidad: number;
}

type VistaLateralActiva = 'puntos' | 'rutas';

export default function PlaneacionRutas() {

    const mapaRef = useRef<MapaInteractivoFunciones>(null);
    const puntosEntregaRef = useRef<PuntosEntregaAtributos>(null);
    const [capacidadesRepartidores, setCapacidadesRepartidores] = useState<CapacidadRepartidor[]>([]);
    const [rutasGeneradas, setRutasGeneradas] = useState<RutaRepartidorGeoJSON[]>([]);
    const [rutasGuardadas, setRutasGuardadas] = useState<RutaGuardadaUI[]>([]);
    const [eliminandoRutaId, setEliminandoRutaId] = useState<number | null>(null);
    const [rutaGuardadaSeleccionadaId, setRutaGuardadaSeleccionadaId] = useState<number | null>(null);
    const [fechaReparto, setFechaReparto] = useState<Date>(new Date());
    const [vistaLateralActiva, setVistaLateralActiva] = useState<VistaLateralActiva>('puntos');

    useEffect(() => {
        setFechaReparto(new Date());
    }, []);

    useEffect(() => {
        const cargarCapacidadesRepartidores = async (): Promise<void> => {
            try {
                const response = await fetch(`${URL_REPARTIDORES}/disponibles-hoy`);

                if (!response.ok) {
                    throw new Error(await obtenerMensajeErrorHttp(response));
                }

                const repartidoresDisponibles = (await response.json()) as RepartidorDisponibleHoyResponse[];
                const capacidadesFormateadas = repartidoresDisponibles.map((repartidor) => ({
                    id: repartidor.id,
                    capacidad: repartidor.capacidad,
                }));
                setCapacidadesRepartidores(capacidadesFormateadas);
            } catch (errorOperacion) {
                console.error('No se pudo obtener la lista de repartidores disponibles de hoy', errorOperacion);
                setCapacidadesRepartidores([]);
            }
        };

        void cargarCapacidadesRepartidores();
    }, []);

    useEffect(() => {
        console.log('✅ Rutas generadas:', rutasGeneradas[0]?.getGeometria());
    }, [rutasGeneradas]);

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

        const rutasGuardadasConGeometria = rutasGuardadas.filter((ruta) => {
            const coordenadas = ruta.geometria?.geometry?.coordinates;
            return Array.isArray(coordenadas) && coordenadas.length > 0;
        });

        const rutasGuardadasParaPintar = rutaGuardadaSeleccionadaId === null
            ? rutasGuardadasConGeometria.map((ruta) => ruta.geometria)
            : rutasGuardadasConGeometria
                .filter((ruta) => ruta.rutaId === rutaGuardadaSeleccionadaId)
                .map((ruta) => ruta.geometria);

        if (rutasGuardadasParaPintar.length === 0) {
            mapaRef.current?.limpiarRutas();
            mapaRef.current?.limpiarPuntosEntrega();
            return;
        }

        mapaRef.current?.pintarRutasGeoJSON(rutasGuardadasParaPintar);

        // Mostrar puntos de entrega asociados
        const puntosAMostrar = rutaGuardadaSeleccionadaId === null
            ? rutasGuardadasConGeometria.flatMap((ruta) => ruta.detalleParadas)
            : rutasGuardadasConGeometria
                .filter((ruta) => ruta.rutaId === rutaGuardadaSeleccionadaId)
                .flatMap((ruta) => ruta.detalleParadas);

        mapaRef.current?.limpiarPuntosEntrega();
        mapaRef.current?.pintarPuntosEntrega(puntosAMostrar);
    }, [vistaLateralActiva, rutasGeneradas, rutasGuardadas, rutaGuardadaSeleccionadaId]);

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

    const cargarRutasGuardadas = async (): Promise<void> => {
        try {
            const respuesta = await fetch('http://localhost:3000/api/rutas');

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
    };

    useEffect(() => {
        void cargarRutasGuardadas();
    }, []);

    const eliminarRutaGuardada = async (rutaId: number): Promise<void> => {
        setEliminandoRutaId(rutaId);

        try {
            const respuesta = await fetch(`http://localhost:3000/api/rutas/${rutaId}`, {
                method: 'DELETE',
            });

            if (!respuesta.ok) {
                const errorText = await respuesta.text();
                throw new Error(`Error ${respuesta.status}: ${errorText}`);
            }

            await cargarRutasGuardadas();
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
                title: '❌ Error',
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
                <div className="seccionMapaInteractivo">
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

                    {vistaLateralActiva === 'puntos' && (
                        <>
                            <div className="seccionPuntos">
                                <PuntosEntrega
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
                                    onRutasGuardadas={(nuevasRutasGuardadas) => {
                                        setRutasGuardadas(nuevasRutasGuardadas);
                                        setRutaGuardadaSeleccionadaId(nuevasRutasGuardadas[0]?.rutaId ?? null);
                                        setVistaLateralActiva('rutas');
                                    }}
                                    onMensajeRutaGuardada={(mensaje) => {
                                        void cargarRutasGuardadas();
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
                                            title: '❌ Error',
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
                        <ResumenRutasGuardadas
                            rutasGuardadas={rutasGuardadas}
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
                    )}
                </div>
            </div>
        </>
    )
}