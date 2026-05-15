import { Request, Response } from 'express';
import {
  validarPaginacion,
  validarFechas,
  validarRepartidorId,
} from './dashboard.request.js';
import { dashboardStatsService } from './services/dashboard-stats.service.js';
import { dashboardWeeklyService } from './services/dashboard-weekly.service.js';
import { dashboardMonthlyService } from './services/dashboard-monthly.service.js';
import { dashboardDriversService } from './services/dashboard-drivers.service.js';
import { dashboardRecentService } from './services/dashboard-recent.service.js';
import { dashboardMetricsService } from './services/dashboard-metrics.service.js';

export class DashboardController {
  /**
   * GET /api/dashboard/stats
   * Estadísticas generales del sistema
   */
  async obtenerEstadisticas(req: Request, res: Response): Promise<void> {
    try {
      const stats = await dashboardStatsService.obtenerEstadisticas();
      res.status(200).json(stats);
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('Error en obtenerEstadisticas:', error);
      res.status(500).json({ error: mensajeError });
    }
  }

  /**
   * GET /api/dashboard/weekly
   * Estadísticas semanales
   */
  async obtenerEstadisticasSemanales(req: Request, res: Response): Promise<void> {
    try {
      const datos = await dashboardWeeklyService.obtenerEstadisticasSemanales();
      res.status(200).json(datos);
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('Error en obtenerEstadisticasSemanales:', error);
      res.status(500).json({ error: mensajeError });
    }
  }

  /**
   * GET /api/dashboard/monthly
   * Estadísticas mensuales
   */
  async obtenerEstadisticasMensuales(req: Request, res: Response): Promise<void> {
    try {
      const datos = await dashboardMonthlyService.obtenerEstadisticasMensuales();
      res.status(200).json(datos);
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('Error en obtenerEstadisticasMensuales:', error);
      res.status(500).json({ error: mensajeError });
    }
  }

  /**
   * GET /api/dashboard/drivers
   * Estadísticas por repartidor
   */
  async obtenerRepartidores(req: Request, res: Response): Promise<void> {
    try {
      const stats = await dashboardDriversService.obtenerEstadisticasRepartidores();
      res.status(200).json(stats);
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('Error en obtenerRepartidores:', error);
      res.status(500).json({ error: mensajeError });
    }
  }

  /**
   * GET /api/dashboard/recent
   * Entregas recientes con paginación
   */
  async obtenerEntregasRecientes(req: Request, res: Response): Promise<void> {
    const paginacion = validarPaginacion(req, res);
    if (!paginacion) {
      return;
    }

    try {
      const datos = await dashboardRecentService.obtenerEntregasRecientes(
        paginacion.pagina,
        paginacion.porPagina
      );
      res.status(200).json(datos);
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('Error en obtenerEntregasRecientes:', error);
      res.status(500).json({ error: mensajeError });
    }
  }

  /**
   * GET /api/dashboard/metrics
   * KPIs y métricas del sistema
   */
  async obtenerMetricas(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await dashboardMetricsService.obtenerMetricas();
      res.status(200).json(metrics);
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('Error en obtenerMetricas:', error);
      res.status(500).json({ error: mensajeError });
    }
  }
}

export const dashboardController = new DashboardController();
