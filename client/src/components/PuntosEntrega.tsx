import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PuntoEntrega } from '../classes/PuntoEntrega';
import ModalNuevoPunto, { type DatosNuevoPunto } from './modalNuevoPunto';
import './PuntosEntrega.css';
import { recuperarPuntosGuardados, STORAGE_KEY_PUNTOS } from './recuperarPuntosLS';

interface PuntosEntregaProps {
    onAgregarMarcadorMapa: (punto: PuntoEntrega) => void;
    onEliminarMarcadorMapa: (id: number) => void;
    onVaciarMarcadoresMapa: () => void;
}

export interface PuntosEntregaAtributos {
    obtenerPuntosActuales: () => PuntoEntrega[];
    obtenerPuntosFormateadosBackend: () => { id: number; latitud: number; longitud: number, peso: number }[];
}

const PuntosEntrega = forwardRef<PuntosEntregaAtributos, PuntosEntregaProps>(({ onAgregarMarcadorMapa, onEliminarMarcadorMapa, onVaciarMarcadoresMapa }, ref) => {

    const [puntosActuales, setPuntosActuales] = useState<PuntoEntrega[]>(() => recuperarPuntosGuardados());
    const [isOpenModal, setIsOpenModal] = useState(false);
    const nextId = useRef(1); //Variable para asignar IDs automáticos a los puntos, ya que el backend no los genera al ser solo un mock

    useEffect(() => {
        puntosActuales.forEach((punto) => onAgregarMarcadorMapa(punto));
        // Se ejecuta solo al montar para rehidratar marcadores desde localStorage.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const maxId = puntosActuales.reduce((maximo, punto) => Math.max(maximo, punto.getId()), 0);
        nextId.current = maxId + 1;
    }, [puntosActuales]);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY_PUNTOS, JSON.stringify(puntosActuales));
    }, [puntosActuales]);

    const agregarPunto = (datosNuevoPunto: DatosNuevoPunto) => {
        const idAutomatico = nextId.current;
        const codigoGenerado = `P-${idAutomatico}`;
        const nuevoPunto = new PuntoEntrega(
            idAutomatico,
            datosNuevoPunto.cliente,
            datosNuevoPunto.latitud,
            datosNuevoPunto.longitud,
            datosNuevoPunto.peso,
            datosNuevoPunto.direccion,
            codigoGenerado,
            datosNuevoPunto.celular,
            datosNuevoPunto.descripcion ?? ''
        );
        setPuntosActuales(prev => [...prev, nuevoPunto]);
        onAgregarMarcadorMapa(nuevoPunto);
        nextId.current++;
    };
    const EliminarMarcadorMapa = (index: number) => {
        const punto = puntosActuales[index];
        if (!punto) return;
        
        setPuntosActuales(prev => prev.filter((_, i) => i !== index));
        onEliminarMarcadorMapa(punto.getId());
    };
    const vaciarListaPuntos = () => {
        setPuntosActuales([]);
        onVaciarMarcadoresMapa();
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
                        <div key={punto.getId()} className="puntosMapa__tarjeta">
                            <div className="puntosMapa__tarjeta__titulo">
                                <span>📦</span>
                                <strong>{punto.cliente}</strong> - <strong>ID: {punto.getId()}</strong>
                            </div>
                            <div className="puntosMapa__tarjeta__coords">
                                <span>📍 Dirección: {punto.getDireccion() || 'Sin dirección'}</span>
                                <span>☎️ Celular: {punto.getContactoCliente() || 'Sin celular'}</span>
                                {punto.getDescripcionProducto() && (
                                    <span>🗒️ Descripción: {punto.getDescripcionProducto()}</span>
                                )}
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
