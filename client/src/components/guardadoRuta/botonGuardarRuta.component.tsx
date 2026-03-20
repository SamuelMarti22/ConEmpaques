import { useState } from "react";
import type { PuntoEntregaFormateado, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGuardarRutaProps {
    obtenerPuntosActuales: () => PuntoEntregaFormateado[];
    rutaRepartidorGeoJSON: RutaRepartidorGeoJSON[];
    fechaReparto: Date;
    onMensajeRutaGuardada: (rutas: RutaRepartidorGeoJSON[]) => void;
}

export default function BotonGuardarRuta({obtenerPuntosActuales,rutaRepartidorGeoJSON,fechaReparto,onMensajeRutaGuardada}: BotonGuardarRutaProps) {
    const [cargando, setCargando] = useState(false);

    const generarRutas = async () => {
        setCargando(true);
        const puntosEntrega = obtenerPuntosActuales();
        const rutasRepartidorGeoJSON = rutaRepartidorGeoJSON;

        console.log('Puntos de entrega al backend:', puntosEntrega);
        console.log('Rutas de repartidores a enviar al backend:', rutasRepartidorGeoJSON);
        try {
            const respuesta = await fetch('http://localhost:3000/api/routing/optimizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntosEntrega, rutasRepartidorGeoJSON, fechaReparto })
            });
            
            if (!respuesta.ok) {
                const errorText = await respuesta.text();
                throw new Error(`Error ${respuesta.status}: ${errorText}`);
            }
            
            const mensaje: RutaRepartidorGeoJSON[] = await respuesta.json();
            onMensajeRutaGuardada(mensaje);
        } catch (error) {
            console.error('Error al guardar rutas:', error);
        } finally {
            setCargando(false);
        }
    };

    return (
        <button onClick={generarRutas} disabled={cargando}>
            {cargando ? '⏳ Guardando rutas...' : '💾 Guardar rutas'}
        </button>
    );
}