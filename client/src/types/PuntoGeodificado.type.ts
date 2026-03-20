export interface PuntoGeocodificado {
	cliente: string;
	direccion: string;
	latitud: number;
	longitud: number;
	confianza: number;
	tipoResultado: string;
}