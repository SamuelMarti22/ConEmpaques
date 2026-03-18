import './PlaneacionRutas.css'
import MapaInteractivo from '../../components/MapaInteractivo'
import PuntosEntrega from '../../components/PuntosEntrega'
import type { MapaInteractivoFunciones } from '../../components/MapaInteractivo'
import { useEffect, useRef } from 'react'
import { PuntoEntrega } from '../../classes/PuntoEntrega';
import type { PuntosEntregaAtributos } from '../../components/PuntosEntrega';
import { URL_REPARTIDORES, obtenerMensajeErrorHttp } from '../estilosCompartidosRepartidores/repartidores.compartido'

interface RepartidorDisponibleHoyResponse {
    id: number;
    capacidad: number;
}

export interface CapacidadRepartidorPlaneacion {
    idRepartidor: number;
    capacidadRepartidor: number;
}

export let capacidadesRepartidores: CapacidadRepartidorPlaneacion[] = [];

export default function PlaneacionRutas() {

    const mapaRef = useRef<MapaInteractivoFunciones>(null);
    const puntosEntregaRef = useRef<PuntosEntregaAtributos>(null);

    useEffect(() => {
        const cargarCapacidadesRepartidores = async (): Promise<void> => {
            try {
                const response = await fetch(`${URL_REPARTIDORES}/disponibles-hoy`);

                if (!response.ok) {
                    throw new Error(await obtenerMensajeErrorHttp(response));
                }

                const repartidoresDisponibles = (await response.json()) as RepartidorDisponibleHoyResponse[];

                capacidadesRepartidores = repartidoresDisponibles.map((repartidor) => ({
                    idRepartidor: repartidor.id,
                    capacidadRepartidor: repartidor.capacidad,
                }));
            } catch (errorOperacion) {
                console.error('No se pudo obtener la lista de repartidores disponibles de hoy', errorOperacion);
                capacidadesRepartidores = [];
            }
        };

        void cargarCapacidadesRepartidores();
    }, []);

    const agregarPunto = (punto: PuntoEntrega) => {
        mapaRef.current?.agregarPunto(punto);
    };

    const vaciarPuntos = () => {
        mapaRef.current?.vaciarPuntos();
    };

    const eliminarPunto = (index: number) => {
        mapaRef.current?.eliminarPunto(index);
    };

    const obtenerPuntosFormateadosBackend = (): { id: number; latitud: number; longitud: number; peso: number }[] => {
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
                <button className="btn btn--guardar" onClick={() => console.log(obtenerPuntosFormateadosBackend())}>💾 Guardar puntos (ver en consola)</button>
            </div>
        </>
    )
}