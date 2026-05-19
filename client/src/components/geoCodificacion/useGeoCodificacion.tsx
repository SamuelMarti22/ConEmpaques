import { useCallback, useState } from 'react';

const VITE_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000';
const API_BASE = VITE_API_URL.replace(/\/$/, '');

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

    const geocodificar = useCallback(async (direccion: string): Promise<ResultadoGeocodificacion | null> => {
        setCargando(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/geocoding/geocodificar`, {
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
    }, []);

    const obtenerPredicciones = useCallback(async (input: string): Promise<Prediccion[]> => {
        if (!input.trim()) return [];
        try {
            const response = await fetch(`${API_BASE}/api/geocoding/predicciones?input=${encodeURIComponent(input)}`);
            if (!response.ok) {
                setError('No fue posible obtener sugerencias de direccion.');
                return [];
            }
            return await response.json();
        } catch (err) {
            console.error('Error obteniendo predicciones:', err);
            setError('No fue posible obtener sugerencias de direccion.');
            return [];
        }
    }, []);

    return { geocodificar, obtenerPredicciones, cargando, error };
}