import { useState } from "react";
import Swal from "sweetalert2";
import type { PuntoEntregaFormateado, CapacidadRepartidor, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGeneracionRutasProps {
    obtenerPuntosFormateados: () => PuntoEntregaFormateado[];
    capacidadesRepartidores: CapacidadRepartidor[];
    onRutasGeneradas: (rutas: RutaRepartidorGeoJSON[]) => void;
    onError?: (error: string) => void;
}

export default function BotonGeneracionRutas({obtenerPuntosFormateados, capacidadesRepartidores, onRutasGeneradas, onError}: BotonGeneracionRutasProps) {
    const [cargando, setCargando] = useState(false);

    const generarRutas = async () => {
        setCargando(true);
        const puntosEntrega = obtenerPuntosFormateados();
        console.log('Puntos de entrega al backend:', puntosEntrega);
        console.log('Capacidades de repartidores a enviar al backend:', capacidadesRepartidores);
        
        try {
            // Validaciones básicas en el cliente
            if (!puntosEntrega || puntosEntrega.length === 0) {
                throw new Error("Por favor, añade al menos un punto de entrega antes de generar rutas.");
            }
            
            if (!capacidadesRepartidores || capacidadesRepartidores.length === 0) {
                throw new Error("No hay repartidores disponibles. Intenta más tarde o verifica su disponibilidad.");
            }

            const respuesta = await fetch('http://localhost:3000/api/routing/optimizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntosEntrega, capacidadesRepartidores })
            });
            
            if (!respuesta.ok) {
                const datos = await respuesta.json();
                let mensajeError = `Error ${respuesta.status}`;
                
                if (datos.error) {
                    mensajeError = datos.error;
                }
                
                throw new Error(mensajeError);
            }
            
            const rutas: RutaRepartidorGeoJSON[] = await respuesta.json();
            
            if (!rutas || rutas.length === 0) {
                throw new Error("No se pudieron generar rutas válidas. Verifica que la capacidad total de los repartidores sea suficiente para todos los puntos de entrega.");
            }
            
            onRutasGeneradas(rutas);
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido al generar rutas';
            console.error('Error al generar rutas:', error);
            
            if (onError) {
                onError(mensajeError);
            } else {
                Swal.fire({
                    title: '❌ Error al generar rutas',
                    text: mensajeError,
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            }
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