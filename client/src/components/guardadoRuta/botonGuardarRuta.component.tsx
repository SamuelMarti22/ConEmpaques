import { useEffect, useRef, useState } from "react";
import type { PuntoEntregaFormateado, RutaRepartidorGeoJSON } from "../../types/routing.types";

const VITE_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000';
const API_BASE = VITE_API_URL.replace(/\/$/, '');

export interface RutaGuardadaUI {
    rutaId: number;
    fechaReparto?: string | null;
    repartidor: {
        id: number;
        nombre: string | null;
        estado: 'disponible' | 'en ruta' | 'finalizado';
        capacidad: number | null;
    };
    resumen: {
        numeroPedidos: number;
        cargaActualKg: number;
        distanciaTotal: number;
        tiempoEstimado: number | null;
        horaInicioEstimada: string | null;
        horaFinEstimada: string | null;
    };
    detalleParadas: {
        orden: number;
        puntoId: number;
        codigoSeguimiento: string;
        direccion: string | null;
        cliente: string | null;
        estadoEntrega: 'Pendiente' | 'En camino' | 'Entregado';
        tiempoEstimadoParada: number | null;
        latitud: number;
        longitud: number;
    }[];
    geometria: {
        type: 'Feature';
        geometry: {
            type: 'LineString';
            coordinates: number[][];
        };
    };
}

interface GuardarRutasResponse {
    mensaje?: string;
    message?: string;
    rutasGuardadas?: RutaGuardadaUI[];
}

function formatearFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

interface BotonGuardarRutaProps {
    obtenerPuntosActuales: () => PuntoEntregaFormateado[];
    rutaRepartidorGeoJSON: RutaRepartidorGeoJSON[];
    fechaReparto: Date;
    horaInicioRecorrido: string;
    onMensajeRutaGuardada: (mensaje: string[]) => void;
    onRutasGuardadas?: (rutas: RutaGuardadaUI[]) => void;
    onErrorRutaGuardada?: (error: string) => void;
}

export default function BotonGuardarRuta({obtenerPuntosActuales,rutaRepartidorGeoJSON,fechaReparto,horaInicioRecorrido,onMensajeRutaGuardada, onRutasGuardadas, onErrorRutaGuardada}: BotonGuardarRutaProps) {
    const [cargando, setCargando] = useState(false);
    const guardandoRef = useRef(false);
    const ultimoLoteGuardadoRef = useRef<string | null>(null);

    const construirFirmaLote = (): string => {
        const rutas = rutaRepartidorGeoJSON
            .map((ruta) => {
                const repartidorId = typeof ruta.repartidor_id === 'number' ? ruta.repartidor_id : 0;
                const puntos = Array.isArray(ruta.ruta) ? ruta.ruta.join(',') : '';
                return `${repartidorId}:${puntos}`;
            })
            .sort()
            .join('|');

        const fecha = Number.isNaN(fechaReparto.getTime()) ? '' : formatearFechaLocal(fechaReparto);
        return `${fecha}#${horaInicioRecorrido}#${rutas}`;
    };

    useEffect(() => {
        // Cualquier cambio en lote/fecha/hora habilita un nuevo guardado.
        ultimoLoteGuardadoRef.current = null;
    }, [rutaRepartidorGeoJSON, fechaReparto, horaInicioRecorrido]);

    const guardarRutas = async () => {
        if (guardandoRef.current) {
            return;
        }

        const firmaLote = construirFirmaLote();
        if (ultimoLoteGuardadoRef.current === firmaLote) {
            onErrorRutaGuardada?.('Este lote ya fue guardado. Genera rutas nuevas o cambia fecha/hora antes de volver a guardar.');
            return;
        }

        guardandoRef.current = true;
        const rutasRepartidorGeoJSON = rutaRepartidorGeoJSON;

        if (!Array.isArray(rutasRepartidorGeoJSON) || rutasRepartidorGeoJSON.length === 0) {
            onErrorRutaGuardada?.('No hay rutas generadas para guardar. Primero genera rutas con repartidores disponibles.');
            guardandoRef.current = false;
            return;
        }

        setCargando(true);
        const puntosEntrega = obtenerPuntosActuales();
        const fechaRepartoPayload = formatearFechaLocal(fechaReparto);

        try {
            const respuesta = await fetch(`${API_BASE}/api/rutas/guardar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puntosEntrega,
                    rutasRepartidorGeoJSON,
                    fechaReparto: fechaRepartoPayload,
                    horaInicioRecorrido,
                })
            });
            
            if (!respuesta.ok) {
                const errorText = await respuesta.text();
                throw new Error(`Error ${respuesta.status}: ${errorText}`);
            }
            
            const payload = (await respuesta.json()) as GuardarRutasResponse;
            const mensaje = payload.mensaje ?? payload.message ?? 'Rutas guardadas correctamente';
            ultimoLoteGuardadoRef.current = firmaLote;
            onRutasGuardadas?.(payload.rutasGuardadas ?? []);
            onMensajeRutaGuardada([mensaje]);
        } catch (error) {
            console.error('Error al guardar rutas:', error);
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido al guardar rutas';
            onErrorRutaGuardada?.(mensajeError);
        } finally {
            setCargando(false);
            guardandoRef.current = false;
        }
    };

    return (
        <button onClick={guardarRutas} disabled={cargando}>
            {cargando
                ? (<><i className="bi bi-hourglass-split" aria-hidden="true"></i> Guardando rutas...</>)
                : (<><i className="bi bi-save" aria-hidden="true"></i> Guardar rutas</>)}
        </button>
    );
}