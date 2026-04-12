import { useState } from "react";
import type { PuntoEntregaFormateado, RutaRepartidorGeoJSON } from "../../types/routing.types";

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

interface BotonGuardarRutaProps {
    obtenerPuntosActuales: () => PuntoEntregaFormateado[];
    rutaRepartidorGeoJSON: RutaRepartidorGeoJSON[];
    fechaReparto: Date;
    onMensajeRutaGuardada: (mensaje: string[]) => void;
    onRutasGuardadas?: (rutas: RutaGuardadaUI[]) => void;
    onErrorRutaGuardada?: (error: string) => void;
}

export default function BotonGuardarRuta({obtenerPuntosActuales,rutaRepartidorGeoJSON,fechaReparto,onMensajeRutaGuardada, onRutasGuardadas, onErrorRutaGuardada}: BotonGuardarRutaProps) {
    const [cargando, setCargando] = useState(false);

    const guardarRutas = async () => {
        setCargando(true);
        const puntosEntrega = obtenerPuntosActuales();
        const rutasRepartidorGeoJSON = rutaRepartidorGeoJSON;

        try {
            const respuesta = await fetch('http://localhost:3000/api/rutas/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntosEntrega, rutasRepartidorGeoJSON, fechaReparto })
            });
            
            if (!respuesta.ok) {
                const errorText = await respuesta.text();
                throw new Error(`Error ${respuesta.status}: ${errorText}`);
            }
            
            const payload = (await respuesta.json()) as GuardarRutasResponse;
            const mensaje = payload.mensaje ?? payload.message ?? 'Rutas guardadas correctamente';
            onRutasGuardadas?.(payload.rutasGuardadas ?? []);
            onMensajeRutaGuardada([mensaje]);
        } catch (error) {
            console.error('Error al guardar rutas:', error);
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido al guardar rutas';
            onErrorRutaGuardada?.(mensajeError);
        } finally {
            setCargando(false);
        }
    };

    return (
        <button onClick={guardarRutas} disabled={cargando}>
            {cargando ? '⏳ Guardando rutas...' : '💾 Guardar rutas'}
        </button>
    );
}