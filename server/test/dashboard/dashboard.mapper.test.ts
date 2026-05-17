import { describe, expect, it } from 'vitest';
import {
  mapearEstadoFrontend,
  calcularVariacion,
  determinarTendencia,
  obtenerNombreDia,
  obtenerNombreMes,
  formatearHoraLocal,
} from '../../src/modules/dashboard/dashboard.mapper.js';

describe('Dashboard Mapper', () => {
  describe('mapearEstadoFrontend', () => {
    it('mapea EN_BODEGA a PENDING', () => expect(mapearEstadoFrontend('EN_BODEGA')).toBe('PENDING'));
    it('mapea PENDIENTE a PENDING', () => expect(mapearEstadoFrontend('PENDIENTE')).toBe('PENDING'));
    it('mapea EN_ENTREGA a ASSIGNED', () => expect(mapearEstadoFrontend('EN_ENTREGA')).toBe('ASSIGNED'));
    it('mapea EN_CAMINO a IN_TRANSIT', () => expect(mapearEstadoFrontend('EN_CAMINO')).toBe('IN_TRANSIT'));
    it('mapea ENTREGADO a DELIVERED', () => expect(mapearEstadoFrontend('ENTREGADO')).toBe('DELIVERED'));
    it('mapea FALLIDO a FAILED', () => expect(mapearEstadoFrontend('FALLIDO')).toBe('FAILED'));
    it('mapea un valor desconocido a PENDING', () => expect(mapearEstadoFrontend('DESCONOCIDO')).toBe('PENDING'));
  });

  describe('calcularVariacion', () => {
    it('devuelve 0 si anterior es 0', () => expect(calcularVariacion(10, 0)).toBe(0));
    it('calcula la variacion positiva', () => expect(calcularVariacion(150, 100)).toBe(50));
    it('calcula la variacion negativa', () => expect(calcularVariacion(50, 100)).toBe(-50));
  });

  describe('determinarTendencia', () => {
    it('devuelve ascendente si es mayor a 5', () => expect(determinarTendencia(6)).toBe('ascendente'));
    it('devuelve descendente si es menor a -5', () => expect(determinarTendencia(-6)).toBe('descendente'));
    it('devuelve estable si esta entre -5 y 5', () => {
      expect(determinarTendencia(5)).toBe('estable');
      expect(determinarTendencia(-5)).toBe('estable');
      expect(determinarTendencia(0)).toBe('estable');
    });
  });

  describe('obtenerNombreDia', () => {
    it('devuelve el nombre del dia correcto', () => {
      expect(obtenerNombreDia(new Date('2026-05-17T12:00:00.000Z'))).toBe('Dom');
      expect(obtenerNombreDia(new Date('2026-05-18T12:00:00.000Z'))).toBe('Lun');
    });
  });

  describe('obtenerNombreMes', () => {
    it('devuelve el mes correcto', () => {
      expect(obtenerNombreMes(0)).toBe('Ene');
      expect(obtenerNombreMes(11)).toBe('Dic');
      expect(obtenerNombreMes(12)).toBe('Ene'); // default fallback is Ene
    });
  });

  describe('formatearHoraLocal', () => {
    it('devuelve null si es invalido', () => {
      expect(formatearHoraLocal(null)).toBeNull();
      expect(formatearHoraLocal(undefined)).toBeNull();
      expect(formatearHoraLocal(new Date('invalida'))).toBeNull();
    });

    it('formatea la hora correctamente', () => {
      const date = new Date('2026-05-17T14:05:09.000Z');
      date.setHours(14);
      date.setMinutes(5);
      date.setSeconds(9);
      expect(formatearHoraLocal(date)).toBe('14:05:09');
    });
  });
});
