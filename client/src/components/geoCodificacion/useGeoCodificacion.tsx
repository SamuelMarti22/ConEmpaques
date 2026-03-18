import { useState } from 'react';

interface ResultadoGeocodificacion {
    direccion: string;
    latitud: number;
    longitud: number;
    confianza: number;
    tipoResultado: string;
}

interface Prediccion {
    id: string;
    descripcion: string;
    mainText: string;
    secondaryText: string;
}

export function useGeocodificacion() {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const geocodificar = async (direccion: string): Promise<ResultadoGeocodificacion | null> => {
        setCargando(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/api/geocoding/geocodificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direccion })
            });

            if (!response.ok) {
                throw new Error('No se encontró la dirección');
            }

            return await response.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            return null;
        } finally {
            setCargando(false);
        }
    };

    const obtenerPredicciones = async (placeId: string): Promise<Prediccion[]> => {
        if (!placeId.trim()) return [];
        try {
            const response = await fetch(`http://localhost:3000/api/geocoding/predicciones?placeId=${encodeURIComponent(placeId)}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (err) {
            console.error('Error obteniendo predicciones:', err);
            return [];
        }
    };

    return { geocodificar, obtenerPredicciones, cargando, error };
}