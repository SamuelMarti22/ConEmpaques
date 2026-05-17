import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardStatsService } from '../../src/modules/dashboard/services/dashboard-stats.service.js';
import { dashboardWeeklyService } from '../../src/modules/dashboard/services/dashboard-weekly.service.js';
import { dashboardMonthlyService } from '../../src/modules/dashboard/services/dashboard-monthly.service.js';
import { dashboardDriversService } from '../../src/modules/dashboard/services/dashboard-drivers.service.js';
import { dashboardRecentService } from '../../src/modules/dashboard/services/dashboard-recent.service.js';
import { dashboardMetricsService } from '../../src/modules/dashboard/services/dashboard-metrics.service.js';

const mockFind = vi.fn();
const mockCountDocuments = vi.fn();
const mockPrismaUsuarioFindMany = vi.fn();
const mockPrismaRutaFindMany = vi.fn();

vi.mock('../../src/databases/mongoDB/models/rutaEntrega.model.js', () => ({
  RutaEntregaModel: {
    find: (...args: any[]) => {
      const result = mockFind(...args);
      if (!result) return result;
      const chainable = {
        sort: () => chainable,
        skip: () => chainable,
        limit: () => result,
      };
      if (Array.isArray(result)) {
        return Object.assign(result, chainable);
      }
      return result;
    },
    countDocuments: (...args: any[]) => mockCountDocuments(...args),
  },
}));

vi.mock('../../src/databases/prisma/lib/prisma.js', () => ({
  prisma: {
    ruta: {
      findMany: (...args: any[]) => mockPrismaRutaFindMany(...args),
    },
    usuario: {
      findMany: (...args: any[]) => mockPrismaUsuarioFindMany(...args),
    }
  },
}));

describe('Dashboard Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFind.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    mockPrismaRutaFindMany.mockResolvedValue([]);
    mockPrismaUsuarioFindMany.mockResolvedValue([]);
  });

  describe('dashboardStatsService', () => {
    it('retorna ceros cuando no hay rutas', async () => {
      const result = await dashboardStatsService.obtenerEstadisticas();
      expect(result.estadoActual.exitosas).toBe(0);
    });

    it('retorna metricas con puntos', async () => {
      mockFind.mockResolvedValue([
        {
          puntosEntrega: [
            { estadoEntrega: 'ENTREGADO' },
            { estadoEntrega: 'FALLIDO' },
            { estadoEntrega: 'EN_CAMINO' },
            { estadoEntrega: 'PENDIENTE' }
          ]
        },
        { puntosEntrega: null } // Branch coverage: !ruta.puntosEntrega
      ]);
      const result = await dashboardStatsService.obtenerEstadisticas();
      expect(result.estadoActual.exitosas).toBe(1);
    });

    it('lanza error si la bd falla', async () => {
      mockFind.mockRejectedValue(new Error('fail'));
      await expect(dashboardStatsService.obtenerEstadisticas()).rejects.toThrow('Error al obtener estadísticas del dashboard');
    });
  });

  describe('dashboardRecentService', () => {
    it('obtiene las entregas recientes', async () => {
      mockFind.mockReturnValue([
        {
          rutaId: 1,
          _id: 'r1',
          puntosEntrega: [
            { codigo: 'C1', nombreCliente: 'Cliente 1', direccion: 'Dir 1', estadoEntrega: 'ENTREGADO', fechaHoraEntrega: new Date() }
          ]
        }
      ]);
      mockCountDocuments.mockResolvedValue(1);
      mockPrismaRutaFindMany.mockResolvedValue([{ id: 1, repartidor: { nombre: 'Repartidor 1' } }]);

      const result = await dashboardRecentService.obtenerEntregasRecientes(1, 10);
      expect(result.entregas.length).toBe(1);
    });

    it('maneja puntos de entrega nulos y rutas inexistentes', async () => {
      mockFind.mockReturnValue([
        { rutaId: 999, _id: 'r1', puntosEntrega: [ { codigo: 'C1' } ] } // rutaMySQL no existirá
      ]);
      mockCountDocuments.mockResolvedValue(1);
      mockPrismaRutaFindMany.mockResolvedValue([]);
      
      const result = await dashboardRecentService.obtenerEntregasRecientes(1, 10);
      expect(result.entregas.length).toBe(1);
      expect(result.entregas[0].repartidor).toBe('N/A'); // Branch coverage: !rutaMySQL
    });

    it('lanza error si la bd falla', async () => {
      mockFind.mockImplementation(() => { throw new Error('fail'); });
      await expect(dashboardRecentService.obtenerEntregasRecientes(1, 10)).rejects.toThrow('Error al obtener entregas recientes');
    });
  });

  describe('dashboardWeeklyService', () => {
    it('obtiene las estadisticas', async () => {
      mockFind.mockResolvedValue([
        {
          createdAt: new Date(),
          puntosEntrega: [
            { estadoEntrega: 'ENTREGADO' },
            { estadoEntrega: 'FALLIDO' },
            { estadoEntrega: 'PENDIENTE' }
          ]
        }
      ]);
      const result = await dashboardWeeklyService.obtenerEstadisticasSemanales();
      expect(result.resumen.totalEntregas).toBe(3);
    });

    it('maneja rutas sin puntos de entrega y con geometria', async () => {
      mockFind.mockResolvedValue([
        { createdAt: new Date(), puntosEntrega: [], geometria: [1, 2] }, // Branch coverage: geometria
        { createdAt: new Date(), puntosEntrega: null } // Branch coverage: !puntosEntrega
      ]);
      const result = await dashboardWeeklyService.obtenerEstadisticasSemanales();
      expect(result.resumen.distanciaPromedio).toBe(1); // 2 / Math.max(1, 2 rutas) = 1
    });

    it('lanza error si la bd falla', async () => {
      mockFind.mockRejectedValue(new Error('fail'));
      await expect(dashboardWeeklyService.obtenerEstadisticasSemanales()).rejects.toThrow('Error al obtener estadísticas semanales');
    });
  });

  describe('dashboardMonthlyService', () => {
    it('obtiene las estadisticas', async () => {
      mockFind.mockResolvedValue([
        {
          createdAt: new Date(),
          puntosEntrega: [
            { estadoEntrega: 'ENTREGADO' },
            { estadoEntrega: 'FALLIDO' }
          ]
        }
      ]);
      const result = await dashboardMonthlyService.obtenerEstadisticasMensuales();
      expect(result.resumen.totalAno).toBe(2);
    });

    it('maneja rutas sin puntos de entrega', async () => {
      mockFind.mockResolvedValue([
        { createdAt: new Date(), puntosEntrega: null } // Branch coverage: !ruta.puntosEntrega
      ]);
      const result = await dashboardMonthlyService.obtenerEstadisticasMensuales();
      expect(result.prediccion?.exitosas).toBe(0);
    });

    it('lanza error si la bd falla', async () => {
      mockFind.mockRejectedValue(new Error('fail'));
      await expect(dashboardMonthlyService.obtenerEstadisticasMensuales()).rejects.toThrow('Error al obtener estadísticas mensuales');
    });
  });

  describe('dashboardDriversService', () => {
    it('obtiene las estadisticas con rutas en proceso', async () => {
      mockPrismaUsuarioFindMany.mockResolvedValue([{ id: 1, nombre: 'Ana', email: 'ana@test.com' }]);
      mockPrismaRutaFindMany.mockResolvedValue([
        { id: 10, repartidorId: 1, distanciaTotal: 5, tiempoEstimado: 30, estadoRuta: 'EN_PROCESO', createdAt: new Date() }
      ]);
      mockFind.mockResolvedValue([
        {
          rutaId: 10,
          puntosEntrega: [
            { estadoEntrega: 'ENTREGADO' },
            { estadoEntrega: 'FALLIDO' }
          ]
        }
      ]);

      const result = await dashboardDriversService.obtenerEstadisticasRepartidores();
      expect(result.repartidores[0].estado).toBe('en ruta');
    });

    it('maneja rutas finalizadas y sin rutas en mongodb', async () => {
      mockPrismaUsuarioFindMany.mockResolvedValue([{ id: 1, nombre: 'Ana', email: 'ana@test.com' }]);
      mockPrismaRutaFindMany.mockResolvedValue([
        { id: 10, repartidorId: 1, distanciaTotal: 5, tiempoEstimado: 30, estadoRuta: 'ENTREGADA', createdAt: new Date() }
      ]);
      mockFind.mockResolvedValue([]); // sin puntos de entrega en mongo

      const result = await dashboardDriversService.obtenerEstadisticasRepartidores();
      expect(result.repartidores[0].estado).toBe('finalizado');
      expect(result.repartidores[0].exitosas).toBe(0);
    });

    it('retorna sin metricas si no hay repartidores', async () => {
      const result = await dashboardDriversService.obtenerEstadisticasRepartidores();
      expect(result.repartidores.length).toBe(0);
    });

    it('lanza error si falla la bd', async () => {
      mockPrismaUsuarioFindMany.mockRejectedValue(new Error('fail'));
      await expect(dashboardDriversService.obtenerEstadisticasRepartidores()).rejects.toThrow('Error al obtener estadísticas de repartidores');
    });
  });

  describe('dashboardMetricsService', () => {
    it('obtiene las metricas', async () => {
      mockFind.mockResolvedValue([
        {
          puntosEntrega: [
            { estadoEntrega: 'ENTREGADO' },
            { estadoEntrega: 'FALLIDO' }
          ]
        }
      ]);
      const result = await dashboardMetricsService.obtenerMetricas();
      expect(result.metricas.eficiencia).toBeDefined();
    });

    it('maneja rutas nulas o vacias para disparar alertas', async () => {
      mockFind.mockResolvedValue([ { puntosEntrega: null } ]); // Branch coverage
      const result = await dashboardMetricsService.obtenerMetricas();
      expect(result.alertas).toContain('Sin entregas registradas en el período');
      expect(result.metricas.eficiencia).toBe(0);
    });

    it('maneja alertas de fallos y eficiencia baja', async () => {
      mockFind.mockResolvedValue([
        {
          puntosEntrega: Array(10).fill({ estadoEntrega: 'FALLIDO' })
        }
      ]);
      const result = await dashboardMetricsService.obtenerMetricas();
      expect(result.alertas).toContain('Tasa de fallos elevada');
      expect(result.alertas).toContain('Eficiencia por debajo de lo esperado');
    });

    it('lanza error si falla la bd', async () => {
      mockFind.mockRejectedValue(new Error('fail'));
      await expect(dashboardMetricsService.obtenerMetricas()).rejects.toThrow('Error al obtener métricas del sistema');
    });
  });
});
