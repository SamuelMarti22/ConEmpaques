import { useState } from "react";
import Swal from "sweetalert2";
import type { PuntoEntregaFormateado, CapacidadRepartidor, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGeneracionRutasProps {
    obtenerPuntosFormateados: () => PuntoEntregaFormateado[];
    capacidadesRepartidores: CapacidadRepartidor[];
    cargandoDisponibilidad: boolean;
    motivoSinRepartidores?: string;
    onRutasGeneradas: (rutas: RutaRepartidorGeoJSON[]) => void;
}

export default function BotonGeneracionRutas({obtenerPuntosFormateados,capacidadesRepartidores,cargandoDisponibilidad,motivoSinRepartidores,onRutasGeneradas}: BotonGeneracionRutasProps) {
    const [cargando, setCargando] = useState(false);

    const generarRutas = async () => {
        const puntosEntrega = obtenerPuntosFormateados();

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

            if (!Array.isArray(rutas) || rutas.length === 0) {
                onRutasGeneradas([]);
                await Swal.fire({
                    icon: 'warning',
                    title: 'No se pudieron generar rutas',
                    text: 'No se generaron rutas para asignar con los datos actuales.',
                });
                return;
            }

            onRutasGeneradas(rutas);
        } catch (error) {
            console.error('Error al generar rutas:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error al generar rutas',
                text: error instanceof Error ? error.message : 'Ocurrió un error inesperado al generar rutas.',
            });
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