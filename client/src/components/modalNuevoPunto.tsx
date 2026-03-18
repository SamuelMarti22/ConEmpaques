import { useRef, useState } from 'react';
import InputGeoCodificacion, { type PuntoGeocodificado } from './geoCodificacion/inputGeoCodificacion';
import './modalNuevoPunto.css';

export interface DatosNuevoPunto {
    cliente: string;
    latitud: number;
    longitud: number;
    peso: number;
    direccion: string;
    confianza: number;
    tipoResultado: string;
}

interface ModalNuevoPuntoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (datos: DatosNuevoPunto) => void;
}

export default function ModalNuevoPunto({ isOpen, onClose, onConfirm }: ModalNuevoPuntoProps) {
    const [clienteManual, setClienteManual] = useState('');
    const [peso, setPeso] = useState('');
    const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<PuntoGeocodificado | null>(null);
    const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const inputClienteRef = useRef<HTMLInputElement>(null);

    const handleSeleccionarUbicacion = (data: PuntoGeocodificado) => {
        setUbicacionSeleccionada(data);
        setErrorValidacion(null);
    };

    const handleConfirmar = async () => {
        setErrorValidacion(null);

        // Validaciones
        const cliente = clienteManual.trim() || ubicacionSeleccionada?.cliente || '';
        const pesoNum = parseFloat(peso);

        if (!cliente) {
            setErrorValidacion('El nombre del cliente es obligatorio');
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
                confianza: ubicacionSeleccionada.confianza,
                tipoResultado: ubicacionSeleccionada.tipoResultado
            });

            // Reset
            setClienteManual('');
            setPeso('');
            setUbicacionSeleccionada(null);
            setErrorValidacion(null);
            setCargando(false);
            onClose();
        }, 300);
    };

    const handleCerrar = () => {
        setClienteManual('');
        setPeso('');
        setUbicacionSeleccionada(null);
        setErrorValidacion(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-titulo">📍 Nuevo Punto de Entrega</h2>
                    <button
                        className="modal-cerrar"
                        onClick={handleCerrar}
                        aria-label="Cerrar modal"
                        disabled={cargando}
                    >
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-seccion">
                        <label className="modal-label" htmlFor="modal-cliente">
                            🏢 Nombre del Cliente
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
                        <InputGeoCodificacion
                            cliente={clienteManual || 'Cliente'}
                            onSeleccionarUbicacion={handleSeleccionarUbicacion}
                            placeholder="Buscar dirección en Colombia"
                            disabled={cargando}
                        />
                    </div>

                    <div className="modal-seccion">
                        <label className="modal-label" htmlFor="modal-peso">
                            ⚖️ Peso (kg)
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
                            ❌ {errorValidacion}
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
                        {cargando ? '⏳ Agregando...' : '✓ Agregar Punto'}
                    </button>
                </div>
            </div>
        </div>
    );
}