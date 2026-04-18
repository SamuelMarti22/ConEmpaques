export interface Posicion {
  lat: number
  lng: number
  timestamp: number
}

export interface DriverSession {
  idRepartidor: number
  puntos: string[]
  posiciones: Posicion[]  
}
