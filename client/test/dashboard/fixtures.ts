import type { RecentDeliveriesResponse } from '../../src/apps/dashboard/servicios/DashboardAPI';

export const registroEntregaBase = {
  id: 'ENT-1',
  conductor: 'Ana López',
  zona: 'Centro',
  estado: 'Completado',
  estadoSistema: 'DELIVERED',
  creadoEn: '2026-05-14T08:00:00.000Z',
  asignadoEn: '2026-05-14T08:10:00.000Z',
  recogidoEn: '2026-05-14T08:20:00.000Z',
  entregadoEn: '2026-05-14T10:00:00.000Z',
};

export function respuestaRecientesVacia(): RecentDeliveriesResponse {
  return { entregas: [], total: 0, pagina: 1, porPagina: 50 };
}

export function respuestaRecientesConDatos(): RecentDeliveriesResponse {
  const base = new Date('2026-05-14T12:00:00.000Z');
  return {
    entregas: [
      {
        id: '1',
        codigoSeguimiento: 'ENT-001',
        cliente: 'Cliente A',
        direccion: 'Centro, Medellín',
        estado: 'ENTREGADO',
        repartidor: 'Ana López',
        fechaEntrega: base.toISOString(),
      },
      {
        id: '2',
        codigoSeguimiento: 'ENT-002',
        cliente: 'Cliente B',
        direccion: 'Poblado, Medellín',
        estado: 'FALLIDO',
        repartidor: 'Luis Pérez',
        fechaEntrega: new Date(base.getTime() + 3600000).toISOString(),
      },
      {
        id: '3',
        codigoSeguimiento: '',
        cliente: 'Cliente C',
        direccion: 'Envigado',
        estado: 'EN_CAMINO',
        repartidor: '',
        fechaEntrega: new Date(base.getTime() + 7200000).toISOString(),
      },
    ],
    total: 120,
    pagina: 1,
    porPagina: 50,
  };
}

export function respuestaMuchasFallidas(cantidadFallidas: number, total: number): RecentDeliveriesResponse {
  const entregas = Array.from({ length: total }, (_, i) => ({
    id: String(i),
    codigoSeguimiento: `ENT-${i}`,
    cliente: `C${i}`,
    direccion: `Zona ${i}`,
    estado: i < cantidadFallidas ? 'FALLIDO' : 'ENTREGADO',
    repartidor: i % 2 === 0 ? 'Ana López' : 'Luis Pérez',
    fechaEntrega: new Date(2026, 4, 10 + (i % 20), 10, 0, 0).toISOString(),
  }));
  return { entregas, total, pagina: 1, porPagina: total };
}

export function respuestaRecientesConCasosBorde(): RecentDeliveriesResponse {
  return {
    entregas: [
      {
        id: '',
        codigoSeguimiento: '',
        cliente: 'Cliente D',
        direccion: '',
        estado: 'CANCELADO',
        repartidor: '',
        fechaEntrega: undefined as unknown as string,
      },
      {
        id: '2',
        codigoSeguimiento: '',
        cliente: 'Cliente E',
        direccion: 'Centro, Medellín',
        estado: 'ASIGNADO',
        repartidor: 'Ana López',
        fechaEntrega: 'fecha-invalida',
      },
      {
        id: '3',
        codigoSeguimiento: 'ENT-003',
        cliente: 'Cliente F',
        direccion: 'Envigado',
        estado: 'OTRO_ESTADO',
        repartidor: 'Luis Pérez',
        fechaEntrega: '2026-05-15T10:00:00.000Z',
      },
    ],
    total: 3,
    pagina: 1,
    porPagina: 50,
  };
}

export function respuestaRecientesPorFechas(): RecentDeliveriesResponse {
  return {
    entregas: [
      {
        id: '11',
        codigoSeguimiento: 'ENT-011',
        cliente: 'Cliente G',
        direccion: 'Centro, Medellín',
        estado: 'ENTREGADO',
        repartidor: 'Ana López',
        fechaEntrega: '2026-05-14T10:00:00.000Z',
      },
      {
        id: '12',
        codigoSeguimiento: 'ENT-012',
        cliente: 'Cliente H',
        direccion: 'Poblado, Medellín',
        estado: 'ENTREGADO',
        repartidor: 'Ana López',
        fechaEntrega: '2026-05-15T10:00:00.000Z',
      },
      {
        id: '13',
        codigoSeguimiento: 'ENT-013',
        cliente: 'Cliente I',
        direccion: 'Envigado',
        estado: 'ENTREGADO',
        repartidor: 'Ana López',
        fechaEntrega: '2026-05-16T10:00:00.000Z',
      },
    ],
    total: 3,
    pagina: 1,
    porPagina: 50,
  };
}
