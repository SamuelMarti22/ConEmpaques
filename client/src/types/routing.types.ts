export interface CapacidadRepartidor{
    id: number;
    capacidad: number;
}

export interface PuntoEntregaFormateado{
    id: number;
    latitud: number;
    longitud: number;
    peso: number;
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