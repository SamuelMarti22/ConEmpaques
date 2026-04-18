import { useEffect, useRef, useState } from 'react';
import InputGeoCodificacion, { type PuntoGeocodificado } from './geoCodificacion/inputGeoCodificacion';
import './modalNuevoPunto.css';

export interface DatosNuevoPunto {
    cliente: string;
    latitud: number;
    longitud: number;
    peso: number;
    direccion: string;
    descripcion?: string;
    celular: string;
    confianza?: number;
    tipoResultado?: string;
}

interface ModalNuevoPuntoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (datos: DatosNuevoPunto) => void;
    modo?: 'crear' | 'editar';
    datosIniciales?: DatosNuevoPunto;
}

export default function ModalNuevoPunto({ isOpen, onClose, onConfirm, modo = 'crear', datosIniciales }: ModalNuevoPuntoProps) {
    const [clienteManual, setClienteManual] = useState('');
    const [peso, setPeso] = useState('');
    const [celular, setCelular] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<PuntoGeocodificado | null>(null);
    const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const inputClienteRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        if (modo === 'editar' && datosIniciales) {
            setClienteManual(datosIniciales.cliente);
            setPeso(String(datosIniciales.peso));
            setCelular(datosIniciales.celular);
            setDescripcion(datosIniciales.descripcion ?? '');
            setUbicacionSeleccionada({
                cliente: datosIniciales.cliente,
                direccion: datosIniciales.direccion,
                latitud: datosIniciales.latitud,
                longitud: datosIniciales.longitud,
                confianza: datosIniciales.confianza ?? 1,
                tipoResultado: datosIniciales.tipoResultado ?? 'manual'
            });
            return;
        }

        setClienteManual('');
        setPeso('');
        setCelular('');
        setDescripcion('');
        setUbicacionSeleccionada(null);
        setErrorValidacion(null);
    }, [isOpen, modo, datosIniciales]);

    const handleSeleccionarUbicacion = (data: PuntoGeocodificado) => {
        setUbicacionSeleccionada(data);
        setErrorValidacion(null);
    };

    const handleConfirmar = async () => {
        setErrorValidacion(null);

        // Validaciones
        const cliente = clienteManual.trim() || ubicacionSeleccionada?.cliente || '';
        const celularNormalizado = celular.trim();
        const pesoNum = parseFloat(peso);

        if (!cliente) {
            setErrorValidacion('El nombre del cliente es obligatorio');
            return;
        }

        if (!celularNormalizado) {
            setErrorValidacion('El número de celular es obligatorio');
            return;
        }

        if (!ubicacionSeleccionada) {
            setErrorValidacion('Debes seleccionar una dirección');
            return;
        }

        if (isNaN(pesoNum) || pesoNum <= 0) {
            setErrorValidacion('El peso debe ser un número válido mayor a 0');
            return;
        }

        setCargando(true);

        // Simular pequeño delay para mejor UX
        setTimeout(() => {
            onConfirm({
                cliente,
                latitud: ubicacionSeleccionada.latitud,
                longitud: ubicacionSeleccionada.longitud,
                peso: pesoNum,
                direccion: ubicacionSeleccionada.direccion,
                celular: celularNormalizado,
                descripcion: descripcion.trim() || undefined,
                confianza: ubicacionSeleccionada.confianza,
                tipoResultado: ubicacionSeleccionada.tipoResultado
            });

            // Reset
            setClienteManual('');
            setPeso('');
            setCelular('');
            setDescripcion('');
            setUbicacionSeleccionada(null);
            setErrorValidacion(null);
            setCargando(false);
            onClose();
        }, 300);
    };

    const handleCerrar = () => {
        setClienteManual('');
        setPeso('');
        setCelular('');
        setDescripcion('');
        setUbicacionSeleccionada(null);
        setErrorValidacion(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-titulo">
                        <i className={`bi ${modo === 'editar' ? 'bi-pencil-square' : 'bi-geo-alt'}`} aria-hidden="true"></i>
                        {modo === 'editar' ? 'Editar Punto de Entrega' : 'Nuevo Punto de Entrega'}
                    </h2>
                    <button
                        className="modal-cerrar"
                        onClick={handleCerrar}
                        aria-label="Cerrar modal"
                        disabled={cargando}
                    >
                        <i className="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-seccion">
                        <label className="modal-label" htmlFor="modal-cliente">
                            <i className="bi bi-building" aria-hidden="true"></i> Nombre del Cliente
                        </label>
                        <input
                            id="modal-cliente"
                            ref={inputClienteRef}
                            type="text"
                            placeholder="Ej: Empresa XYZ"
                            value={clienteManual}
                            onChange={(e) => setClienteManual(e.target.value)}
                            className="modal-input"
                            disabled={cargando}
                        />
                    </div>

                    <div className="modal-seccion">
                        <label className="modal-label" htmlFor="modal-celular">
                            <i className="bi bi-telephone" aria-hidden="true"></i> Celular de contacto
                        </label>
                        <input
                            id="modal-celular"
                            type="text"
                            placeholder="Ej: 300 123 4567"
                            value={celular}
                            onChange={(e) => setCelular(e.target.value)}
                            className="modal-input"
                            disabled={cargando}
                        />
                    </div>

                    <div className="modal-seccion">
                        <label className="modal-label" htmlFor="modal-descripcion">
                            <i className="bi bi-card-text" aria-hidden="true"></i> Descripción
                        </label>
                        <input
                            id="modal-descripcion"
                            type="text"
                            placeholder="Ej: Empresa XYZ"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="modal-input"
                            disabled={cargando}
                        />
                    </div>

                    <div className="modal-seccion">
                        <InputGeoCodificacion
                            cliente={clienteManual || 'Cliente'}
                            onSeleccionarUbicacion={handleSeleccionarUbicacion}
                            placeholder="Buscar dirección en Colombia"
                            disabled={cargando}
                        />
                    </div>

                    <div className="modal-seccion">
                        <label className="modal-label" htmlFor="modal-peso">
                            <i className="bi bi-speedometer2" aria-hidden="true"></i> Peso (kg)
                        </label>
                        <input
                            id="modal-peso"
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Ej: 5.5"
                            value={peso}
                            onChange={(e) => setPeso(e.target.value)}
                            className="modal-input"
                            disabled={cargando}
                        />
                    </div>

                    {errorValidacion && (
                        <div className="modal-error">
                            <i className="bi bi-exclamation-circle" aria-hidden="true"></i> {errorValidacion}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="modal-btn modal-btn--cancelar"
                        onClick={handleCerrar}
                        disabled={cargando}
                    >
                        Cancelar
                    </button>
                    <button
                        className="modal-btn modal-btn--confirmar"
                        onClick={handleConfirmar}
                        disabled={cargando || !ubicacionSeleccionada}
                    >
                        {cargando ? (modo === 'editar' ? 'Guardando...' : 'Agregando...') : (modo === 'editar' ? 'Guardar cambios' : 'Agregar Punto')}
                    </button>
                </div>
            </div>
        </div>
    );
}