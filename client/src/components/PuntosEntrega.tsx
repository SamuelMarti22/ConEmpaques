import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PuntoEntrega } from '../classes/PuntoEntrega';
import ModalNuevoPunto, { type DatosNuevoPunto } from './modalNuevoPunto';
import './PuntosEntrega.css';
import { recuperarPuntosGuardados, STORAGE_KEY_PUNTOS } from './recuperarPuntosLS';

interface PuntosEntregaProps {
    onAgregarMarcadorMapa: (punto: PuntoEntrega) => void;
    onEliminarMarcadorMapa: (id: number) => void;
    onVaciarMarcadoresMapa: () => void;
    storageKey?: string;
}

export interface PuntosEntregaAtributos {
    obtenerPuntosActuales: () => PuntoEntrega[];
    obtenerPuntosFormateadosBackend: () => { id: number; latitud: number; longitud: number, peso: number }[];
}

const PuntosEntrega = forwardRef<PuntosEntregaAtributos, PuntosEntregaProps>(({ onAgregarMarcadorMapa, onEliminarMarcadorMapa, onVaciarMarcadoresMapa, storageKey = STORAGE_KEY_PUNTOS }, ref) => {

    const [puntosActuales, setPuntosActuales] = useState<PuntoEntrega[]>(() => recuperarPuntosGuardados(storageKey));
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null);
    const nextId = useRef(1); //Variable para asignar IDs automáticos a los puntos, ya que el backend no los genera al ser solo un mock
    const omitirPersistenciaRef = useRef(true);

    useEffect(() => {
        omitirPersistenciaRef.current = true;
        const puntosGuardados = recuperarPuntosGuardados(storageKey);
        setPuntosActuales(puntosGuardados);
        onVaciarMarcadoresMapa();
        puntosGuardados.forEach((punto) => onAgregarMarcadorMapa(punto));
        setIndiceEdicion(null);
    }, [onAgregarMarcadorMapa, onVaciarMarcadoresMapa, storageKey]);

    useEffect(() => {
        const maxId = puntosActuales.reduce((maximo, punto) => Math.max(maximo, punto.getId()), 0);
        nextId.current = maxId + 1;
    }, [puntosActuales]);

    useEffect(() => {
        if (omitirPersistenciaRef.current) {
            omitirPersistenciaRef.current = false;
            return;
        }

        window.localStorage.setItem(storageKey, JSON.stringify(puntosActuales));
    }, [puntosActuales, storageKey]);

    const agregarPunto = (datosNuevoPunto: DatosNuevoPunto) => {
        if (indiceEdicion !== null) {
            const puntoOriginal = puntosActuales[indiceEdicion];
            if (!puntoOriginal) return;

            const puntoActualizado = new PuntoEntrega(
                puntoOriginal.getId(),
                datosNuevoPunto.cliente,
                datosNuevoPunto.latitud,
                datosNuevoPunto.longitud,
                datosNuevoPunto.peso,
                datosNuevoPunto.direccion,
                puntoOriginal.getCodigo(),
                datosNuevoPunto.celular,
                datosNuevoPunto.descripcion ?? '',
                puntoOriginal.getEstadoEntrega(),
                puntoOriginal.getFechaHoraEntrega(),
                puntoOriginal.getFirmaUrl(),
                puntoOriginal.getMotivoFallido()
            );

            setPuntosActuales(prev => prev.map((punto, index) => index === indiceEdicion ? puntoActualizado : punto));
            onEliminarMarcadorMapa(puntoOriginal.getId());
            onAgregarMarcadorMapa(puntoActualizado);
            setIndiceEdicion(null);
            return;
        }

        const idAutomatico = nextId.current;
        const nuevoPunto = new PuntoEntrega(
            idAutomatico,
            datosNuevoPunto.cliente,
            datosNuevoPunto.latitud,
            datosNuevoPunto.longitud,
            datosNuevoPunto.peso,
            datosNuevoPunto.direccion,
            '',
            datosNuevoPunto.celular,
            datosNuevoPunto.descripcion ?? ''
        );
        setPuntosActuales(prev => [...prev, nuevoPunto]);
        onAgregarMarcadorMapa(nuevoPunto);
        nextId.current++;
    };

    const editarPunto = (index: number) => {
        setIndiceEdicion(index);
        setIsOpenModal(true);
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
        setIndiceEdicion(null);
    };

    const datosInicialesEdicion = indiceEdicion !== null ? (() => {
        const punto = puntosActuales[indiceEdicion];
        if (!punto) return undefined;

        return {
            cliente: punto.getCliente(),
            latitud: punto.getLatitud(),
            longitud: punto.getLongitud(),
            peso: punto.getPeso(),
            direccion: punto.getDireccion(),
            descripcion: punto.getDescripcionProducto(),
            celular: punto.getContactoCliente(),
            confianza: 1,
            tipoResultado: 'manual'
        };
    })() : undefined;
    
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
                onClose={() => {
                    setIsOpenModal(false);
                    setIndiceEdicion(null);
                }}
                onConfirm={agregarPunto}
                modo={indiceEdicion !== null ? 'editar' : 'crear'}
                datosIniciales={datosInicialesEdicion}
            />
            <div className="puntosMapa">
                <div className="puntosMapa__header">
                    <h3><i className="bi bi-geo-alt" aria-hidden="true"></i> Agregar Punto de Entrega</h3>
                    <p>Haz clic en el mapa para agregar un punto de entrega</p>
                </div>

                <div className="puntosMapa__acciones">
                    <button className="btn btn--agregar" onClick={() => {
                        setIndiceEdicion(null);
                        setIsOpenModal(true);
                    }}><i className="bi bi-plus-circle" aria-hidden="true"></i> Agregar punto</button>
                    <button className="btn btn--eliminar" onClick={vaciarListaPuntos}><i className="bi bi-trash" aria-hidden="true"></i> Eliminar todos</button>
                </div>

            <div className="puntosMapa__lista">
                <h4>Puntos Agregados ({puntosActuales.length})</h4>
                {puntosActuales.length === 0 ? (
                    <p className="puntosMapa__vacio">No hay puntos agregados</p>
                ) : (
                    puntosActuales.map((punto, index) => (
                        <div key={punto.getId()} className="puntosMapa__tarjeta">
                            <div className="puntosMapa__tarjeta__titulo">
                                <span><i className="bi bi-box-seam" aria-hidden="true"></i></span>
                                <strong>{punto.cliente}</strong> - <strong>ID: {punto.getId()}</strong>
                            </div>
                            <div className="puntosMapa__tarjeta__coords">
                                <span><i className="bi bi-geo" aria-hidden="true"></i> Dirección: {punto.getDireccion() || 'Sin dirección'}</span>
                                <span><i className="bi bi-telephone" aria-hidden="true"></i> Celular: {punto.getContactoCliente() || 'Sin celular'}</span>
                                {punto.getDescripcionProducto() && (
                                    <span><i className="bi bi-card-text" aria-hidden="true"></i> Descripción: {punto.getDescripcionProducto()}</span>
                                )}
                                <span><i className="bi bi-speedometer2" aria-hidden="true"></i> Peso: {punto.getPeso()} kg</span>
                            </div>
                            <div className="puntosMapa__tarjeta__acciones">
                                <button className="btn btn--editar-uno" onClick={() => editarPunto(index)}><i className="bi bi-pencil-square" aria-hidden="true"></i> Editar</button>
                                <button className="btn btn--eliminar btn--eliminar-uno" onClick={() => EliminarMarcadorMapa(index)} aria-label={`Eliminar punto ${punto.getId()}`}><i className="bi bi-trash" aria-hidden="true"></i></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
        </>
    );
})

export default PuntosEntrega;
