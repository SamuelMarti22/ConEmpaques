import { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { PuntoEntrega } from '../classes/PuntoEntrega';
import ModalNuevoPunto, { type DatosNuevoPunto } from './modalNuevoPunto';
import './PuntosEntrega.css';

interface PuntosEntregaProps {
    onAgregarMarcadorMapa: (punto: PuntoEntrega) => void;
    onEliminarMarcadorMapa: (index: number) => void;
    onVaciarMarcadoresMapa: () => void;
}

export interface PuntosEntregaAtributos {
    obtenerPuntosActuales: () => PuntoEntrega[];
    obtenerPuntosFormateadosBackend: () => { id: number; latitud: number; longitud: number, peso: number }[];
}

const PuntosEntrega = forwardRef<PuntosEntregaAtributos, PuntosEntregaProps>(({ onAgregarMarcadorMapa, onEliminarMarcadorMapa, onVaciarMarcadoresMapa }, ref) => {

    const [puntosActuales, setPuntosActuales] = useState<PuntoEntrega[]>([]);
    const [isOpenModal, setIsOpenModal] = useState(false);
    const nextId = useRef(1); //Variable para asignar IDs automáticos a los puntos, ya que el backend no los genera al ser solo un mock

    const agregarPunto = (datosNuevoPunto: DatosNuevoPunto) => {
        const idAutomatico = nextId.current;
        const nuevoPunto = new PuntoEntrega(idAutomatico, datosNuevoPunto.cliente, datosNuevoPunto.latitud, datosNuevoPunto.longitud, datosNuevoPunto.peso);
        setPuntosActuales(prev => [...prev, nuevoPunto]);
        onAgregarMarcadorMapa(nuevoPunto);
        nextId.current++;
    };
    const EliminarMarcadorMapa = (index: number) => {
        setPuntosActuales(prev => prev.filter((_, i) => i !== index));
        onEliminarMarcadorMapa(index);
    };
    const vaciarListaPuntos = () => {
        setPuntosActuales([]);
        onVaciarMarcadoresMapa();
        nextId.current = 1;
    };
    
    useImperativeHandle(ref, () => ({
        obtenerPuntosActuales: () => puntosActuales,
        obtenerPuntosFormateadosBackend: () => puntosActuales.map(
            ({ id, latitud, longitud, peso }) => ({ id, latitud, longitud, peso })
        )
    }));

    return (
        <>
            <ModalNuevoPunto 
                isOpen={isOpenModal}
                onClose={() => setIsOpenModal(false)}
                onConfirm={agregarPunto}
            />
            <div className="puntosMapa">
                <div className="puntosMapa__header">
                    <h3>📍 Agregar Punto de Entrega</h3>
                    <p>Haz clic en el mapa para agregar un punto de entrega</p>
                </div>

                <div className="puntosMapa__acciones">
                    <button className="btn btn--agregar" onClick={() => setIsOpenModal(true)}>+ Agregar punto</button>
                    <button className="btn btn--eliminar" onClick={vaciarListaPuntos}>🗑 Eliminar todos</button>
                </div>

            <div className="puntosMapa__lista">
                <h4>Puntos Agregados ({puntosActuales.length})</h4>
                {puntosActuales.length === 0 ? (
                    <p className="puntosMapa__vacio">No hay puntos agregados</p>
                ) : (
                    puntosActuales.map((punto, index) => (
                        <div key={index} className="puntosMapa__tarjeta">
                            <div className="puntosMapa__tarjeta__titulo">
                                <span>📦</span>
                                <strong>{punto.cliente}</strong> - <strong>ID: {punto.getId()}</strong>
                            </div>
                            <div className="puntosMapa__tarjeta__coords">
                                <span>🌐 Lat: {punto.getLatitud().toFixed(4)}</span>
                                <span>🌐 Lng: {punto.getLongitud().toFixed(4)}</span>
                                <span>⚖️ Peso: {punto.getPeso()} kg</span>
                            </div>
                            <button className="btn btn--eliminar btn--eliminar-uno" onClick={() => EliminarMarcadorMapa(index)}>🗑</button>
                        </div>
                    ))
                )}
            </div>
        </div>
        </>
    );
})

export default PuntosEntrega;
