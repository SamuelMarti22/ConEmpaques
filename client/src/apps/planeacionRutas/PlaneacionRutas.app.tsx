import './PlaneacionRutas.css'
import MapaInteractivo from '../../components/MapaInteractivo'
import PuntosEntrega from '../../components/PuntosEntrega'
import type { MapaInteractivoFunciones } from '../../components/MapaInteractivo'
import { useEffect, useRef, useState } from 'react'
import { PuntoEntrega } from '../../classes/PuntoEntrega';
import type { PuntosEntregaAtributos } from '../../components/PuntosEntrega';
import { URL_REPARTIDORES, obtenerMensajeErrorHttp } from '../estilosCompartidosRepartidores/repartidores.compartido'
import type { CapacidadRepartidor, PuntoEntregaFormateado, RutaRepartidorGeoJSON } from './../../types/routing.types'
import BotonGeneracionRutas from '../../components/planteacionRuta/botonGeneracionRutas'
import InputGeoCodificacion from '../../components/geoCodificacion/inputGeoCodificacion';

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
        console.log('✅ Rutas generadas:', rutasGeneradas);
    }, [rutasGeneradas]);
    const agregarPunto = (punto: PuntoEntrega) => {
        mapaRef.current?.agregarPunto(punto);
    };

    const vaciarPuntos = () => {
        mapaRef.current?.vaciarPuntos();
    };

    const eliminarPunto = (index: number) => {
        mapaRef.current?.eliminarPunto(index);
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
                    onRutasGeneradas={(rutas) => setRutasGeneradas(rutas)}
                />
            </div>
        </>
    )
}