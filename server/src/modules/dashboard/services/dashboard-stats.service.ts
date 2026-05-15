/**
 * DashboardStatsService.ts
 * Servicio para estadísticas generales del sistema
 */

import { RutaEntregaModel } from '../../../databases/mongoDB/models/rutaEntrega.model.js';
import { mapearEstadoFrontend, calcularVariacion, determinarTendencia } from '../dashboard.mapper.js';
import type { StatsResponse } from '../../../types/dashboard.types.js';
import type { EstadoEntregaFrontend } from '../../../types/dashboard.types.js';

export class DashboardStatsService {
  /**
   * GET /dashboard/stats
   * Estadísticas generales del sistema
   */
  async obtenerEstadisticas(): Promise<StatsResponse> {
    try {
      // Obtener todas las rutas con sus entregas de MongoDB
      const rutasEntrega = await RutaEntregaModel.find({});

      if (!rutasEntrega || rutasEntrega.length === 0) {
        return {
          estadoActual: {
            exitosas: 0,
            fallidas: 0,
            enTransito: 0,
          },
          metricas: [],
          distribucion: [],
        };
      }

      // Agrupar entregas por estado
      const distribucion = new Map<EstadoEntregaFrontend, number>();
      let exitosas = 0;
      let fallidas = 0;
      let enTransito = 0;

      rutasEntrega.forEach((ruta) => {
        if (!ruta.puntosEntrega) return;

        ruta.puntosEntrega.forEach((punto) => {
          const estadoFrontend = mapearEstadoFrontend(punto.estadoEntrega);

          distribucion.set(
            estadoFrontend,
            (distribucion.get(estadoFrontend) || 0) + 1
          );

          if (estadoFrontend === 'DELIVERED') exitosas++;
          if (estadoFrontend === 'FAILED') fallidas++;
          if (estadoFrontend === 'IN_TRANSIT') enTransito++;
        });
      });

      // Calcular totales
      const total = Array.from(distribucion.values()).reduce((sum, val) => sum + val, 0);

      // Construir array de métricas
      const metricas = Array.from(distribucion.entries()).map(([estado, cantidad]) => ({
        estado,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 100),
        variacion: calcularVariacion(cantidad, cantidad),
        tendencia: determinarTendencia(0),
      }));

      // Construir respuesta
      return {
        estadoActual: {
          exitosas,
          fallidas,
          enTransito,
        },
        metricas,
        distribucion: metricas.map(({ estado, cantidad, porcentaje }) => ({
          estado,
          cantidad,
          porcentaje,
        })),
      };
    } catch (error) {
      console.error('Error en obtenerEstadisticas:', error);
      throw new Error('Error al obtener estadísticas del dashboard');
    }
  }
}

export const dashboardStatsService = new DashboardStatsService();
