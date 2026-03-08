import './PlaneacionRutas.css'
import MapaInteractivo from '../../components/MapaInteractivo'
import PuntosEntrega from '../../components/PuntosMapa'
import type { MapaInteractivoFunciones } from '../../components/MapaInteractivo'
import { useRef } from 'react'

export default function PlaneacionRutas() {

    const mapaRef = useRef<MapaInteractivoFunciones>(null);

    const agregarPunto = (cliente: string, latitud: number, longitud: number) => {
        mapaRef.current?.agregarPunto(cliente, latitud, longitud);
    };

    const vaciarPuntos = () => {
        mapaRef.current?.vaciarPuntos();
    };

    const eliminarPunto = (index: number) => {
        mapaRef.current?.eliminarPunto(index);
    };

    return (
        <>
            <div className="vistaPlaneacion">
                <div className="seccionMapaInteractivo">
                    <MapaInteractivo ref={mapaRef} />
                </div>
                <div className="seccionPuntos">
                    <PuntosEntrega
                        onAgregarMarcadorMapa={agregarPunto}
                        onEliminarMarcadorMapa={eliminarPunto}
                        onVaciarMarcadoresMapa={vaciarPuntos}
                    />
                </div>
            </div>
        </>
    )
} 