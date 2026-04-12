import { useState } from "react";
import Swal from "sweetalert2";
import type { PuntoEntregaFormateado, CapacidadRepartidor, RutaRepartidorGeoJSON } from "../../types/routing.types";

interface BotonGeneracionRutasProps {
    obtenerPuntosFormateados: () => PuntoEntregaFormateado[];
    capacidadesRepartidores: CapacidadRepartidor[];
    onRutasGeneradas: (rutas: RutaRepartidorGeoJSON[]) => void;
}

export default function BotonGeneracionRutas({obtenerPuntosFormateados,capacidadesRepartidores,onRutasGeneradas}: BotonGeneracionRutasProps) {
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

        if (capacidadesRepartidores.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sin repartidores disponibles',
                text: 'No hay repartidores disponibles para el día seleccionado.',
            });
            return;
        }

        const pesoTotal = puntosEntrega.reduce((acumulado, punto) => acumulado + punto.peso, 0);
        const capacidadTotal = capacidadesRepartidores.reduce((acumulado, repartidor) => acumulado + repartidor.capacidad, 0);

        if (capacidadTotal < pesoTotal) {
            await Swal.fire({
                icon: 'error',
                title: 'Capacidad insuficiente',
                text: `La capacidad disponible (${capacidadTotal}) es menor al peso total a repartir (${pesoTotal}).`,
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