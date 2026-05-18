import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { dashboardController } from '../../src/modules/dashboard/dashboard.controller.js';
import { dashboardStatsService } from '../../src/modules/dashboard/services/dashboard-stats.service.js';
import { dashboardWeeklyService } from '../../src/modules/dashboard/services/dashboard-weekly.service.js';
import { dashboardMonthlyService } from '../../src/modules/dashboard/services/dashboard-monthly.service.js';
import { dashboardDriversService } from '../../src/modules/dashboard/services/dashboard-drivers.service.js';
import { dashboardRecentService } from '../../src/modules/dashboard/services/dashboard-recent.service.js';
import { dashboardMetricsService } from '../../src/modules/dashboard/services/dashboard-metrics.service.js';
import * as dashboardRequest from '../../src/modules/dashboard/dashboard.request.js';

// Mocks de los servicios que exportan un objeto instanciado
vi.mock('../../src/modules/dashboard/services/dashboard-stats.service.js', () => ({
  dashboardStatsService: { obtenerEstadisticas: vi.fn() },
}));
vi.mock('../../src/modules/dashboard/services/dashboard-weekly.service.js', () => ({
  dashboardWeeklyService: { obtenerEstadisticasSemanales: vi.fn() },
}));
vi.mock('../../src/modules/dashboard/services/dashboard-monthly.service.js', () => ({
  dashboardMonthlyService: { obtenerEstadisticasMensuales: vi.fn() },
}));
vi.mock('../../src/modules/dashboard/services/dashboard-drivers.service.js', () => ({
  dashboardDriversService: { obtenerEstadisticasRepartidores: vi.fn() },
}));
vi.mock('../../src/modules/dashboard/services/dashboard-recent.service.js', () => ({
  dashboardRecentService: { obtenerEntregasRecientes: vi.fn() },
}));
vi.mock('../../src/modules/dashboard/services/dashboard-metrics.service.js', () => ({
  dashboardMetricsService: { obtenerMetricas: vi.fn() },
}));

describe('Dashboard Controller', () => {
  const crearRespuesta = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('obtenerEstadisticas', () => {
    it('retorna 200 y las estadisticas', async () => {
      const statsMock = { metricas: [] };
      vi.mocked(dashboardStatsService.obtenerEstadisticas).mockResolvedValue(statsMock as any);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticas(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(statsMock);
    });

    it('retorna 500 en caso de error instance', async () => {
      vi.mocked(dashboardStatsService.obtenerEstadisticas).mockRejectedValue(new Error('error test'));
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'error test' });
    });

    it('retorna 500 en caso de error string', async () => {
      vi.mocked(dashboardStatsService.obtenerEstadisticas).mockRejectedValue('error string');
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    });
  });

  describe('obtenerEstadisticasSemanales', () => {
    it('retorna 200 y las estadisticas', async () => {
      const mock = { data: [] };
      vi.mocked(dashboardWeeklyService.obtenerEstadisticasSemanales).mockResolvedValue(mock as any);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticasSemanales(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mock);
    });

    it('retorna 500 en caso de error', async () => {
      vi.mocked(dashboardWeeklyService.obtenerEstadisticasSemanales).mockRejectedValue(new Error('error test'));
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticasSemanales(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('retorna 500 en caso de error string', async () => {
      vi.mocked(dashboardWeeklyService.obtenerEstadisticasSemanales).mockRejectedValue('error string');
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticasSemanales(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerEstadisticasMensuales', () => {
    it('retorna 200 y las estadisticas', async () => {
      const mock = { data: [] };
      vi.mocked(dashboardMonthlyService.obtenerEstadisticasMensuales).mockResolvedValue(mock as any);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticasMensuales(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 en caso de error', async () => {
      vi.mocked(dashboardMonthlyService.obtenerEstadisticasMensuales).mockRejectedValue(new Error('error test'));
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticasMensuales(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('retorna 500 en caso de error string', async () => {
      vi.mocked(dashboardMonthlyService.obtenerEstadisticasMensuales).mockRejectedValue('error string');
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEstadisticasMensuales(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerRepartidores', () => {
    it('retorna 200 y las estadisticas', async () => {
      const mock = { data: [] };
      vi.mocked(dashboardDriversService.obtenerEstadisticasRepartidores).mockResolvedValue(mock as any);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerRepartidores(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 en caso de error instance', async () => {
      vi.mocked(dashboardDriversService.obtenerEstadisticasRepartidores).mockRejectedValue(new Error('error test'));
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerRepartidores(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('retorna 500 en caso de error', async () => {
      vi.mocked(dashboardDriversService.obtenerEstadisticasRepartidores).mockRejectedValue('error generico');
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerRepartidores(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    });
  });

  describe('obtenerEntregasRecientes', () => {
    it('retorna 200 si la paginacion es valida', async () => {
      const mockPaginacion = { pagina: 1, porPagina: 10 };
      vi.spyOn(dashboardRequest, 'validarPaginacion').mockReturnValue(mockPaginacion);
      const mockDatos = { data: [] };
      vi.mocked(dashboardRecentService.obtenerEntregasRecientes).mockResolvedValue(mockDatos as any);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEntregasRecientes(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDatos);
    });

    it('no hace nada si la paginacion es invalida', async () => {
      vi.spyOn(dashboardRequest, 'validarPaginacion').mockReturnValue(null);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEntregasRecientes(req, res);
      expect(dashboardRecentService.obtenerEntregasRecientes).not.toHaveBeenCalled();
    });

    it('retorna 500 si falla el servicio instance', async () => {
      const mockPaginacion = { pagina: 1, porPagina: 10 };
      vi.spyOn(dashboardRequest, 'validarPaginacion').mockReturnValue(mockPaginacion);
      vi.mocked(dashboardRecentService.obtenerEntregasRecientes).mockRejectedValue(new Error('fail'));
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEntregasRecientes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('retorna 500 si falla el servicio string', async () => {
      const mockPaginacion = { pagina: 1, porPagina: 10 };
      vi.spyOn(dashboardRequest, 'validarPaginacion').mockReturnValue(mockPaginacion);
      vi.mocked(dashboardRecentService.obtenerEntregasRecientes).mockRejectedValue('error string');
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerEntregasRecientes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerMetricas', () => {
    it('retorna 200 y metricas', async () => {
      const mock = { kpis: [] };
      vi.mocked(dashboardMetricsService.obtenerMetricas).mockResolvedValue(mock as any);
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerMetricas(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mock);
    });

    it('retorna 500 en caso de error', async () => {
      vi.mocked(dashboardMetricsService.obtenerMetricas).mockRejectedValue(new Error('error test'));
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerMetricas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('retorna 500 en caso de error string', async () => {
      vi.mocked(dashboardMetricsService.obtenerMetricas).mockRejectedValue('error string');
      const req = {} as Request;
      const res = crearRespuesta();
      await dashboardController.obtenerMetricas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
