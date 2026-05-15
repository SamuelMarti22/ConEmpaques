// Tipos para estadísticas del dashboard
export type EstadoEntregaFrontend = 
  | 'PENDING' 
  | 'ASSIGNED' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'FAILED' 
  | 'CANCELLED';

export interface MetricaEstado {
  estado: EstadoEntregaFrontend;
  cantidad: number;
  porcentaje: number;
  variacion: number;
  tendencia: 'ascendente' | 'descendente' | 'estable';
}

export interface StatsResponse {
  estadoActual: {
    exitosas: number;
    fallidas: number;
    enTransito: number;
  };
  metricas: MetricaEstado[];
  distribucion: {
    estado: EstadoEntregaFrontend;
    cantidad: number;
    porcentaje: number;
  }[];
}

export interface DatosGraficoSemanal {
  dia: string;
  exitosas: number;
  fallidas: number;
  pendientes: number;
}

export interface WeeklyResponse {
  datos: DatosGraficoSemanal[];
  resumen: {
    totalEntregas: number;
    tasaExito: number;
    distanciaPromedio: number;
  };
}

export interface DatosGraficoMensual {
  mes: string;
  entregas: number;
  exitosas: number;
  fallidas: number;
}

export interface MonthlyResponse {
  datos: DatosGraficoMensual[];
  prediccion: DatosGraficoMensual | null;
  resumen: {
    totalAno: number;
    promedioMensual: number;
    tendencia: 'ascendente' | 'descendente' | 'estable';
  };
}

export interface RepartidorStats {
  id: number;
  nombre: string;
  email: string;
  totalEntregas: number;
  exitosas: number;
  fallidas: number;
  distanciaTotal: number;
  tiempoPromedio: number;
  tasaExito: number;
  estado: 'disponible' | 'en ruta' | 'finalizado';
  ultimaActividad?: Date;
}

export interface DriversResponse {
  repartidores: RepartidorStats[];
  total: number;
  disponibles: number;
  enRuta: number;
}

export interface EntregaReciente {
  id: string;
  codigoSeguimiento: string;
  cliente: string;
  direccion: string;
  estado: EstadoEntregaFrontend;
  repartidor: string;
  fechaEntrega?: Date;
  distancia?: number;
  horaEntrega?: string;
}

export interface RecentResponse {
  entregas: EntregaReciente[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface MetricasKPI {
  eficiencia: number;
  puntualidad: number;
  utilizacionFlota: number;
  satisfaccionCliente: number;
  costoPorEntrega: number;
  tiempoPromedioEntrega: number;
  distanciaPromedioRuta: number;
}

export interface MetricsResponse {
  metricas: MetricasKPI;
  comparacion: {
    eficiencia: { actual: number; anterior: number; variacion: number };
    puntualidad: { actual: number; anterior: number; variacion: number };
    satisfaccion: { actual: number; anterior: number; variacion: number };
  };
  alertas: string[];
}
