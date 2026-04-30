export interface Posicion {
  lat: number
  lng: number
  timestamp: number
  simulado?: boolean
}

export interface DriverSession {
  idRepartidor: number
  puntos: string[]
  posiciones: Posicion[]  
}
