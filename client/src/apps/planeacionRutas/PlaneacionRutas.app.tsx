import { useEffect, useRef, useState } from 'react'
import { PuntoEntrega } from '../../classes/PuntoEntrega'
import type { MapaInteractivoFunciones } from '../../components/MapaInteractivo'
import MapaInteractivo from '../../components/MapaInteractivo'
import type { PuntosEntregaAtributos } from '../../components/PuntosEntrega'
import PuntosEntrega from '../../components/PuntosEntrega'
import { URL_REPARTIDORES, obtenerMensajeErrorHttp } from '../estilosCompartidosRepartidores/repartidores.compartido'
import type { CapacidadRepartidor, PuntoEntregaFormateado } from './../../types/routing.types'
import BotonGeneracionRutas from '../../components/planteacionRuta/botonGeneracionRutas'
import {RutaRepartidorGeoJSON} from './../../classes/RutaRepartidorGeoJSON'

import './PlaneacionRutas.css';

interface RepartidorDisponibleHoyResponse {
    id: number;
    capacidad: number;
}

export default function PlaneacionRutas() {

    const mapaRef = useRef<MapaInteractivoFunciones>(null);
    const puntosEntregaRef = useRef<PuntosEntregaAtributos>(null);
    const [capacidadesRepartidores, setCapacidadesRepartidores] = useState<CapacidadRepartidor[]>([]);
    const [rutasGeneradas, setRutasGeneradas] = useState<RutaRepartidorGeoJSON[]>([]);


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

    return (
        <>
            <div className="vistaPlaneacion">
                <div className="seccionMapaInteractivo">
                    <MapaInteractivo ref={mapaRef} />
                </div>
                <div className="seccionPuntos">
                    <PuntosEntrega
                        ref={puntosEntregaRef}
                        onAgregarMarcadorMapa={agregarPunto}
                        onEliminarMarcadorMapa={eliminarPunto}
                        onVaciarMarcadoresMapa={vaciarPuntos}
                    />
                </div>
                
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
                />
            </div>
        </>
    )
}