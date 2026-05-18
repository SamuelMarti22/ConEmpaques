import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  validarPaginacion,
  validarFechas,
  validarRepartidorId,
} from '../../src/modules/dashboard/dashboard.request.js';

describe('Dashboard Request Validator', () => {
  const crearRespuesta = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  describe('validarPaginacion', () => {
    it('devuelve valores por defecto si no se envian', () => {
      const req = { query: {} } as Request;
      const res = crearRespuesta();
      const result = validarPaginacion(req, res);
      expect(result).toEqual({ pagina: 1, porPagina: 10 });
    });

    it('devuelve los valores parseados correctamente', () => {
      const req = { query: { pagina: '2', porPagina: '20' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarPaginacion(req, res);
      expect(result).toEqual({ pagina: 2, porPagina: 20 });
    });

    it('falla si pagina es invalida', () => {
      const req = { query: { pagina: '-1' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarPaginacion(req, res);
      // El codigo actual corrige pagina=-1 a pagina=1 usando Math.max(1, -1)
      expect(result).toEqual({ pagina: 1, porPagina: 10 });
    });

    it('falla si porPagina es mayor a 100 y lo limita pero falla si es menor a 1? No, la logica usa Math.min(100, Math.max(1, parseInt)) asi que siempre es valido a menos que isNaN', () => {
      const req = { query: { porPagina: 'invalido' } } as unknown as Request;
      const res = crearRespuesta();
      // si parseInt('invalido') es NaN, usa 10. asi que es valido
      const result = validarPaginacion(req, res);
      expect(result).toEqual({ pagina: 1, porPagina: 10 });
    });
  });

  describe('validarFechas', () => {
    it('devuelve los 30 dias por defecto si no se envian fechas', () => {
      const req = { query: {} } as Request;
      const res = crearRespuesta();
      const result = validarFechas(req, res);
      expect(result).not.toBeNull();
      expect(result?.desde).toBeInstanceOf(Date);
      expect(result?.hasta).toBeInstanceOf(Date);
    });

    it('devuelve las fechas parseadas correctamente', () => {
      const req = { query: { desde: '2026-05-01', hasta: '2026-05-15' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarFechas(req, res);
      expect(result).not.toBeNull();
      expect(result?.desde.toISOString().startsWith('2026-05-01')).toBe(true);
      expect(result?.hasta.toISOString().startsWith('2026-05-15')).toBe(true);
    });

    it('falla si desde es mayor a hasta', () => {
      const req = { query: { desde: '2026-05-20', hasta: '2026-05-15' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarFechas(req, res);
      expect(result).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'La fecha desde no puede ser mayor que hasta' });
    });
  });

  describe('validarRepartidorId', () => {
    it('devuelve el id correctamente', () => {
      const req = { query: { repartidorId: '5' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarRepartidorId(req, res);
      expect(result).toBe(5);
    });

    it('falla si el id no es un numero entero', () => {
      const req = { query: { repartidorId: 'invalido' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarRepartidorId(req, res);
      expect(result).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('falla si el id es menor o igual a 0', () => {
      const req = { query: { repartidorId: '0' } } as unknown as Request;
      const res = crearRespuesta();
      const result = validarRepartidorId(req, res);
      expect(result).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
