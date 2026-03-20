import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
    direccion: string;
    latitud: number;
    longitud: number;
    confianza: number;
    tipoResultado: string;
}

export async function geocodificarDireccion(direccion: string): Promise<GeocodeResult | null> {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: `${direccion}, Colombia`,
                key: GOOGLE_MAPS_API_KEY,
                language: 'es',
                region: 'co'
            }
        });

        if (response.data.results.length === 0) {
            return null;
        }

        const resultado = response.data.results[0];
        const { lat, lng } = resultado.geometry.location;

        // Calcular confianza según tipo de resultado
        const nivelPrecision: { [key: string]: number } = {
            'ROOFTOP': 1.0,
            'RANGE_INTERPOLATED': 0.9,
            'GEOMETRIC_CENTER': 0.8,
            'APPROXIMATE': 0.6
        };

        const confianza = nivelPrecision[resultado.geometry.location_type] || 0.5;

        return {
            direccion: resultado.formatted_address,
            latitud: lat,
            longitud: lng,
            confianza,
            tipoResultado: resultado.geometry.location_type
        };
    } catch (error) {
        console.error('Error geocodificando dirección:', error);
        return null;
    }
}

interface PlacesPrediccion {
    id: string;
    descripcion: string;
    mainText: string;
    secondaryText: string;
}

export async function obtenerPredicciones(input: string): Promise<PlacesPrediccion[]> {
    try {
        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/autocomplete/json',
            {
                params: {
                    input,
                    key: GOOGLE_MAPS_API_KEY,
                    language: 'es',
                    region: 'co',
                    components: 'country:co'
                }
            }
        );

        return response.data.predictions.map((pred: any) => ({
            id: pred.place_id,
            descripcion: pred.description,
            mainText: pred.structured_formatting?.main_text,
            secondaryText: pred.structured_formatting?.secondary_text
        }));
    } catch (error) {
        console.error('Error obteniendo predicciones:', error);
        return [];
    }
}