export type EstadoRuta = 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADA' | 'CANCELADA';

export interface RutaResumen {
  id: number;
  dia: string;
  fecha: string;
  estadoRuta: EstadoRuta | string;
  estado: string;
  cantidadPuntos: number;
  tiempoPromedio: string;
  distancia: number;
}

export interface DetalleParada {
  orden: number;
  puntoId: number;
  codigo: string;
  direccion: string;
  cliente: string;
  contactoCliente: string;
  estadoEntrega: 'Pendiente' | 'Entregado' | 'Fallido' | 'EN_BODEGA' | 'PENDIENTE' | 'EN_ENTREGA' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO';
  pesoProducto: number;
  descripcionEntrega: string;
  latitud: number;
  longitud: number;
  evidenciaImagen?: string;
}

export interface RutaGuardada {
  rutaId: number;
  fechaReparto: string;
  estadoRuta: EstadoRuta | string;
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