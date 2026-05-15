/**
 * DashboardDataMapper.ts
 * Utilidades para mapeo de datos y transformaciones entre BD y frontend
 */

import type { EstadoEntregaFrontend } from '../../types/dashboard.types.js';

const MAPEO_ESTADOS = {
  'EN_BODEGA': 'PENDING',
  'PENDIENTE': 'PENDING',
  'EN_ENTREGA': 'ASSIGNED',
  'EN_CAMINO': 'IN_TRANSIT',
  'ENTREGADO': 'DELIVERED',
  'FALLIDO': 'FAILED',
} as const;

/**
 * Mapea estado de MongoDB al estado del frontend
 */
export function mapearEstadoFrontend(estadoMongo: string): EstadoEntregaFrontend {
  const estado = MAPEO_ESTADOS[estadoMongo as keyof typeof MAPEO_ESTADOS];
  return (estado || 'PENDING') as EstadoEntregaFrontend;
}

/**
 * Calcula la variación porcentual entre dos valores
 */
export function calcularVariacion(actual: number, anterior: number): number {
  if (anterior === 0) return 0;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/**
 * Determina la tendencia basada en variación
 */
export function determinarTendencia(variacion: number): 'ascendente' | 'descendente' | 'estable' {
  if (variacion > 5) return 'ascendente';
  if (variacion < -5) return 'descendente';
  return 'estable';
}

/**
 * Obtiene nombre de día de la semana desde índice
 */
export function obtenerNombreDia(fecha: Date): string {
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
  return diasSemana[fecha.getDay()] || 'Lun';
}

/**
 * Obtiene nombre de mes desde índice
 */
export function obtenerNombreMes(mesIndex: number): string {
  const mesesAno = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  return mesesAno[mesIndex] || 'Ene';
}

/**
 * Formato de hora local (HH:MM:SS)
 */
export function formatearHoraLocal(fecha: Date | null | undefined): string | null {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    return null;
  }

  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');

  return `${horas}:${minutos}:${segundos}`;
}
