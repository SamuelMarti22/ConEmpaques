export interface RutaResumen {
  id: number;
  dia: string;
  fecha: string;
  estado: string;
  cantidadPuntos: number;
  tiempoPromedio: string;
  distancia: number;
}

export interface DetalleParada {
  orden: number;
  codigo: string;
  direccion: string;
  cliente: string;
  contactoCliente: string;
  estadoEntrega: 'Pendiente' | 'Entregado' | 'Fallido';
  pesoProducto: number;
  descripcionEntrega: string;
  latitud: number;
  longitud: number;
}

export interface RutaGuardada {
  rutaId: number;
  fechaReparto: string;
  repartidor: {
    id: number;
    nombre: string | null;
    estado: string;
    capacidad: number | null;
  };
  resumen: {
    numeroPedidos: number;
    cargaActualKg: number;
    distanciaTotal: number;
    tiempoEstimado: number | null;
    horaInicioEstimada: string | null;
    horaFinEstimada: string | null;
  };
  detalleParadas: DetalleParada[];
  geometria: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: number[][];
    };
  };
}