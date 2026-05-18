/**
 * DashboardWeeklyService.ts
 * Servicio para estadísticas semanales
 */

import { RutaEntregaModel } from '../../../databases/mongoDB/models/rutaEntrega.model.js';
import { mapearEstadoFrontend, obtenerNombreDia } from '../dashboard.mapper.js';
import type { WeeklyResponse } from '../../../types/dashboard.types.js';

export class DashboardWeeklyService {
  /**
   * GET /dashboard/weekly
   * Estadísticas semanales de entregas
   */
  async obtenerEstadisticasSemanales(): Promise<WeeklyResponse> {
    try {
      const ahora = new Date();
      const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Obtener rutas de los últimos 7 días
      const rutasRecientes = await RutaEntregaModel.find({
        createdAt: { $gte: hace7Dias, $lte: ahora },
      });

      // Agrupar por día de la semana
      const datosXDia = new Map<
        string,
        { exitosas: number; fallidas: number; pendientes: number }
      >();

      // Inicializar días
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(hace7Dias.getTime() + i * 24 * 60 * 60 * 1000);
        const dia = obtenerNombreDia(fecha);
        datosXDia.set(dia, { exitosas: 0, fallidas: 0, pendientes: 0 });
      }

      // Procesar entregas
      let totalExitosas = 0;
      let totalFallidas = 0;
      let totalEntregas = 0;
      let distanciaTotal = 0;

      rutasRecientes.forEach((ruta) => {
        if (!ruta.puntosEntrega) return;

        ruta.puntosEntrega.forEach((punto) => {
          const estado = mapearEstadoFrontend(punto.estadoEntrega);
          const fecha = punto.fechaHoraEntrega || ruta.createdAt;
          const dia = obtenerNombreDia(fecha);
          const datoDia = datosXDia.get(dia);

          if (datoDia) {
            if (estado === 'DELIVERED') {
              datoDia.exitosas++;
              totalExitosas++;
            } else if (estado === 'FAILED') {
              datoDia.fallidas++;
              totalFallidas++;
            } else {
              datoDia.pendientes++;
            }

            totalEntregas++;
          }
        });

        // Agregar distancia
        if (ruta.geometria && Array.isArray(ruta.geometria)) {
          distanciaTotal += ruta.geometria.length;
        }
      });

      // Construir array de respuesta
      const datos = Array.from(datosXDia.entries()).map(
        ([dia, { exitosas, fallidas, pendientes }]) => ({
          dia,
          exitosas,
          fallidas,
          pendientes,
        })
      );

      const tasaExito =
        totalEntregas > 0 ? Math.round((totalExitosas / totalEntregas) * 100) : 0;
      const distanciaPromedio = Math.round(
        distanciaTotal / Math.max(1, rutasRecientes.length)
      );

      return {
        datos,
        resumen: {
          totalEntregas,
          tasaExito,
          distanciaPromedio,
        },
      };
    } catch (error) {
      console.error('Error en obtenerEstadisticasSemanales:', error);
      throw new Error('Error al obtener estadísticas semanales');
    }
  }
}

export const dashboardWeeklyService = new DashboardWeeklyService();
