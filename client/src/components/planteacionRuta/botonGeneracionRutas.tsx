import { useState } from "react";
import type { PuntoEntregaFormateado, CapacidadRepartidor, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGeneracionRutasProps {
    obtenerPuntosFormateados: () => PuntoEntregaFormateado[];
    capacidadesRepartidores: CapacidadRepartidor[];
    onRutasGeneradas: (rutas: RutaRepartidorGeoJSON[]) => void;
}

export default function BotonGeneracionRutas({obtenerPuntosFormateados,capacidadesRepartidores,onRutasGeneradas}: BotonGeneracionRutasProps) {
    const [cargando, setCargando] = useState(false);

    const generarRutas = async () => {
        setCargando(true);
        const puntosEntrega = obtenerPuntosFormateados();
        console.log('Puntos de entrega al backend:', puntosEntrega);
        console.log('Capacidades de repartidores a enviar al backend:', capacidadesRepartidores);
        try {
            const respuesta = await fetch('http://localhost:3000/api/routing/optimizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntosEntrega, capacidadesRepartidores })
            });
            
            if (!respuesta.ok) {
                const errorText = await respuesta.text();
                throw new Error(`Error ${respuesta.status}: ${errorText}`);
            }
            
            const rutas: RutaRepartidorGeoJSON[] = await respuesta.json();
            onRutasGeneradas(rutas);
        } catch (error) {
            console.error('Error al generar rutas:', error);
        } finally {
            setCargando(false);
        }
    };

    return (
        <button onClick={generarRutas} disabled={cargando}>
            {cargando ? '⏳ Generando rutas...' : '🗺️ Generar rutas'}
        </button>
    );
}