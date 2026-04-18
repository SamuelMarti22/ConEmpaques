import { useState } from "react";
import Swal from "sweetalert2";
import type { PuntoEntregaFormateado, CapacidadRepartidor, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGeneracionRutasProps {
    obtenerPuntosFormateados: () => PuntoEntregaFormateado[];
    capacidadesRepartidores: CapacidadRepartidor[];
    cargandoDisponibilidad: boolean;
    motivoSinRepartidores?: string;
    onRutasGeneradas: (rutas: RutaRepartidorGeoJSON[]) => void;
    onError?: (error: string) => void;
}

export default function BotonGeneracionRutas({
    obtenerPuntosFormateados,
    capacidadesRepartidores,
    cargandoDisponibilidad,
    motivoSinRepartidores,
    onRutasGeneradas,
    onError
}: BotonGeneracionRutasProps) {
    const [cargando, setCargando] = useState(false);

    const generarRutas = async () => {
        const puntosEntrega = obtenerPuntosFormateados();

        console.log('Puntos de entrega al backend:', puntosEntrega);
        console.log('Capacidades de repartidores a enviar al backend:', capacidadesRepartidores);
        
        if (puntosEntrega.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sin puntos de entrega',
                text: 'Debes registrar al menos un punto para generar rutas.',
            });
            return;
        }

        if (cargandoDisponibilidad) {
            await Swal.fire({
                icon: 'info',
                title: 'Actualizando disponibilidad',
                text: 'Espera un momento mientras validamos repartidores para el día y hora seleccionados.',
            });
            return;
        }

        if (capacidadesRepartidores.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sin repartidores disponibles',
                text: motivoSinRepartidores?.trim() || 'No hay repartidores disponibles para el día y hora seleccionados.',
            });
            return;
        }

        const pesoTotal = puntosEntrega.reduce((acumulado, punto) => acumulado + punto.peso, 0);
        const capacidadTotal = capacidadesRepartidores.reduce((acumulado, repartidor) => acumulado + repartidor.capacidad, 0);
        const capacidadMaximaIndividual = Math.max(...capacidadesRepartidores.map((repartidor) => repartidor.capacidad));
        const pesoMaximoIndividual = Math.max(...puntosEntrega.map((punto) => punto.peso));

        if (capacidadTotal < pesoTotal) {
            await Swal.fire({
                icon: 'error',
                title: 'Capacidad insuficiente',
                text: `La capacidad disponible (${capacidadTotal}) es menor al peso total a repartir (${pesoTotal}).`,
            });
            return;
        }

        if (pesoMaximoIndividual > capacidadMaximaIndividual) {
            await Swal.fire({
                icon: 'error',
                title: 'Peso por entrega no asignable',
                text: `Existe al menos un punto con peso (${pesoMaximoIndividual}) mayor que la capacidad máxima individual de un repartidor (${capacidadMaximaIndividual}).`,
            });
            return;
        }

        setCargando(true);

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
            if (!Array.isArray(rutas) || rutas.length === 0) {
                if (onError) onError("No se pudieron generar rutas válidas. Verifica que la capacidad total de los repartidores sea suficiente para todos los puntos de entrega.");
                await Swal.fire({
                    icon: 'warning',
                    title: 'No se pudieron generar rutas',
                    text: 'No se generaron rutas para asignar con los datos actuales.',
                });
                return;
            }
            onRutasGeneradas(rutas);
        } catch (error) {
            const mensajeError = error instanceof Error ? error.message : 'Error desconocido al generar rutas';
            console.error('Error al generar rutas:', error);
            if (onError) {
                onError(mensajeError);
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error al generar rutas',
                    text: mensajeError,
                });
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <button onClick={generarRutas} disabled={cargando || cargandoDisponibilidad}>
            {cargando
                ? (<><i className="bi bi-hourglass-split" aria-hidden="true"></i> Generando rutas...</>)
                : cargandoDisponibilidad
                    ? (<><i className="bi bi-arrow-repeat" aria-hidden="true"></i> Actualizando disponibilidad...</>)
                    : (<><i className="bi bi-map" aria-hidden="true"></i> Generar rutas</>)}
        </button>
    );
}