export class RutaRepartidorGeoJSON {
    repartidor_id: number;
    ruta: number[];
    distancia_total: number;
    tiempo_estimado: number;
    geometria: {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: number[][]
        }
    };

    constructor(repartidor_id: number, ruta: number[], distancia_total: number, tiempo_estimado: number, geometria: { type: "Feature", geometry: { type: "LineString", coordinates: number[][] } }) {
        this.repartidor_id = repartidor_id;
        this.ruta = ruta;
        this.distancia_total = distancia_total;
        this.tiempo_estimado = tiempo_estimado;
        this.geometria = geometria;
    }

    getRepartidorId(): number {
        return this.repartidor_id;
    }
    
    getRuta(): number[] {
        return this.ruta;
    }

    getDistanciaTotal(): number {
        return this.distancia_total;
    }

    getTiempoEstimado(): number {
        return this.tiempo_estimado;
    }
    
    getGeometria(): { type: "Feature", geometry: { type: "LineString", coordinates: number[][] } } {
        return this.geometria;
    }
    
}