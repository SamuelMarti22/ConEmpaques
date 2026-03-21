import { useState } from "react";
import type { PuntoEntregaFormateado, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGuardarRutaProps {
    obtenerPuntosActuales: () => PuntoEntregaFormateado[];
    rutaRepartidorGeoJSON: RutaRepartidorGeoJSON[];
    fechaReparto: Date;
    onMensajeRutaGuardada: (mensaje: string[]) => void;
    onErrorRutaGuardada?: (error: string) => void;
}

export default function BotonGuardarRuta({obtenerPuntosActuales,rutaRepartidorGeoJSON,fechaReparto,onMensajeRutaGuardada, onErrorRutaGuardada}: BotonGuardarRutaProps) {
    const [cargando, setCargando] = useState(false);

    const guardarRutas = async () => {
        setCargando(true);
        const puntosEntrega = obtenerPuntosActuales();
        const rutasRepartidorGeoJSON = rutaRepartidorGeoJSON;

        console.log('Puntos de entrega al backend:', puntosEntrega);
        console.log('Rutas de repartidores a enviar al backend:', rutasRepartidorGeoJSON);
        console.log('Fecha de reparto a enviar al backend:', fechaReparto);
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
            
            const mensaje: string = await respuesta.json();
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