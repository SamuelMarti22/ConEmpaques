export interface PuntoEntrega{
    id: number;
    latitud: number;
    longitud: number;
    peso: number;
}

export interface Deposito{
    latitud: number;
    longitud: number;
}

export interface CapacidadRepartidor{
    id: number;
    capacidad: number;
}

export interface RutaRepartidor{
    repartidor_id: number;
    ruta: number[];
    geometria: number[][];
    distancia_total: number;
    tiempo_estimado: number;
}

export interface RutaRepartidorGeoJSON {
  repartidor_id: number
  ruta: number[]
  distancia_total: number
  tiempo_estimado: number
  geometria: {
    type: "Feature"
    geometry: {
      type: "LineString"
      coordinates: number[][]
    }
  }
}