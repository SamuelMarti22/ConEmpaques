import { RutaRepartidor, RutaRepartidorGeoJSON } from './../../types/routing.types.js';

export class GeoJSONService {

    convertirRutaRepartidorAGeoJSON(rutaRepartidor: RutaRepartidor): RutaRepartidorGeoJSON {
        
        if (!rutaRepartidor.geometria || rutaRepartidor.geometria.length === 0) {
            return {
                repartidor_id: rutaRepartidor.repartidor_id,
                ruta: rutaRepartidor.ruta,
                distancia_total: rutaRepartidor.distancia_total,
                tiempo_estimado: rutaRepartidor.tiempo_estimado,
                geometria: {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [[0, 0]]
                    }
                }
            };
        }

        return {
            repartidor_id: rutaRepartidor.repartidor_id,
            ruta: rutaRepartidor.ruta,
            distancia_total: rutaRepartidor.distancia_total,
            tiempo_estimado: rutaRepartidor.tiempo_estimado,
            geometria: {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: rutaRepartidor.geometria
                }
            }
        };
    }
}

export const geoJSONService = new GeoJSONService();