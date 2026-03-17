import { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import Swal from 'sweetalert2';
import { PuntoEntrega } from '../classes/PuntoEntrega';
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
    const nextId = useRef(1); //Variable para asignar IDs automáticos a los puntos, ya que el backend no los genera al ser solo un mock

    const agregarPunto = async () => {
        const { value: valoresNuevoPunto, isConfirmed } = await Swal.fire({
            title: 'Nuevo punto de entrega',
            html: `
                <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
                    <label style="font-size:0.9rem;font-weight:600">Nombre del cliente</label>
                    <input id="swal-cliente" class="swal2-input" placeholder="Ej: Empresa XYZ" style="margin:0">
                    <label style="font-size:0.9rem;font-weight:600">Latitud</label>
                    <input id="swal-latitud" class="swal2-input" type="number" step="any" placeholder="Ej: 6.2442" style="margin:0">
                    <label style="font-size:0.9rem;font-weight:600">Longitud</label>
                    <input id="swal-longitud" class="swal2-input" type="number" step="any" placeholder="Ej: -75.5636" style="margin:0">
                    <label style="font-size:0.9rem;font-weight:600">Peso (kg)</label>
                    <input id="swal-peso" class="swal2-input" type="number" step="any" placeholder="Ej: 5.5" style="margin:0">
                </div>
            `,
            confirmButtonText: '📍 Agregar',
            confirmButtonColor: '#3b82f6',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const cliente = (document.getElementById('swal-cliente') as HTMLInputElement).value.trim();
                const latitud = parseFloat((document.getElementById('swal-latitud') as HTMLInputElement).value);
                const longitud = parseFloat((document.getElementById('swal-longitud') as HTMLInputElement).value);
                const peso = parseFloat((document.getElementById('swal-peso') as HTMLInputElement).value);

                if (!cliente) {
                    Swal.showValidationMessage('El nombre del cliente es obligatorio');
                    return false;
                }
                if (isNaN(latitud) || isNaN(longitud)) {
                    Swal.showValidationMessage('Las coordenadas deben ser números válidos');
                    return false;
                }
                if (isNaN(peso)) {
                    Swal.showValidationMessage('El peso debe ser un número válido');
                    return false;
                }
                return { cliente, latitud, longitud, peso };
            }
        });

        if (!isConfirmed || !valoresNuevoPunto) return;

        const idAutomatico = nextId.current;
        const nuevoPunto = new PuntoEntrega(idAutomatico, valoresNuevoPunto.cliente, valoresNuevoPunto.latitud, valoresNuevoPunto.longitud, valoresNuevoPunto.peso);
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
        <div className="puntosMapa">
            <div className="puntosMapa__header">
                <h3>📍 Agregar Punto de Entrega</h3>
                <p>Haz clic en el mapa para agregar un punto de entrega</p>
            </div>

            <div className="puntosMapa__acciones">
                <button className="btn btn--agregar" onClick={agregarPunto}>+ Agregar punto</button>
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
    );
})

export default PuntosEntrega;
