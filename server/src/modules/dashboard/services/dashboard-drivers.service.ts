/**
 * DashboardDriversService.ts
 * Servicio para estadísticas por repartidor
 */

import { prisma } from '../../../databases/prisma/lib/prisma.js';
import { RutaEntregaModel } from '../../../databases/mongoDB/models/rutaEntrega.model.js';
import { mapearEstadoFrontend } from '../dashboard.mapper.js';
import type { DriversResponse, RepartidorStats } from '../../../types/dashboard.types.js';

export class DashboardDriversService {
  /**
   * GET /dashboard/drivers
   * Estadísticas por repartidor
   */
  async obtenerEstadisticasRepartidores(): Promise<DriversResponse> {
    try {
      // Obtener todos los repartidores con rol REPARTIDOR
      const repartidores = await prisma.usuario.findMany({
        where: { rol: 'REPARTIDOR' },
      });

      // Obtener todas las rutas
      const todasLasRutas = await prisma.ruta.findMany({
        include: {
          repartidor: true,
        },
      });

      // Obtener entregas de MongoDB
      const rutasEntrega = await RutaEntregaModel.find({});

      // Construir mapa de entregas por repartidor
      const entregasXRepartidor = new Map<
        number,
        typeof rutasEntrega[0]['puntosEntrega']
      >();

      rutasEntrega.forEach((ruta) => {
        const rutaMySQL = todasLasRutas.find((r) => r.id === ruta.rutaId);
        if (rutaMySQL && ruta.puntosEntrega) {
          const entregas = entregasXRepartidor.get(rutaMySQL.repartidorId) || [];
          entregasXRepartidor.set(rutaMySQL.repartidorId, [
            ...entregas,
            ...ruta.puntosEntrega,
          ]);
        }
      });

      // Construir estadísticas por repartidor
      const estadisticasRepartidores: RepartidorStats[] = repartidores
        .map((rep) => {
          const entregas = entregasXRepartidor.get(rep.id) || [];
          let exitosas = 0;
          let fallidas = 0;

          entregas.forEach((entrega) => {
            const estado = mapearEstadoFrontend(entrega.estadoEntrega);
            if (estado === 'DELIVERED') exitosas++;
            if (estado === 'FAILED') fallidas++;
          });

          // Obtener rutas del repartidor para distancia y tiempo
          const rutasRepartidor = todasLasRutas.filter(
            (r) => r.repartidorId === rep.id
          );
          const distanciaTotal = rutasRepartidor.reduce(
            (sum, r) => sum + (r.distanciaTotal || 0),
            0
          );
          const tiempoPromedio =
            rutasRepartidor.length > 0
              ? Math.round(
                  rutasRepartidor.reduce((sum, r) => sum + (r.tiempoEstimado || 0), 0) /
                    rutasRepartidor.length
                )
              : 0;

          const tasaExito =
            entregas.length > 0
              ? Math.round((exitosas / entregas.length) * 100)
              : 0;

          // Determinar estado actual
          const rutaActual = rutasRepartidor.find((r) => r.estadoRuta === 'EN_PROCESO');
          let estado: 'disponible' | 'en ruta' | 'finalizado' = 'disponible';
          if (rutaActual) estado = 'en ruta';
          else if (rutasRepartidor.some((r) => r.estadoRuta === 'ENTREGADA'))
            estado = 'finalizado';

          // Última actividad
          let ultimaActividad: Date | undefined;
          if (rutasRepartidor.length > 0) {
            const tiempos = rutasRepartidor.map((r) => r.createdAt.getTime());
            const maxTime = Math.max(...tiempos);
            if (maxTime > 0) {
              ultimaActividad = new Date(maxTime);
            }
          }

          return {
            id: rep.id,
            nombre: rep.nombre,
            email: rep.email,
            totalEntregas: entregas.length,
            exitosas,
            fallidas,
            distanciaTotal: Math.round(distanciaTotal),
            tiempoPromedio,
            tasaExito,
            estado,
            ...(ultimaActividad ? { ultimaActividad } : {}),
          };
        });

      const disponibles = estadisticasRepartidores.filter(
        (r) => r.estado === 'disponible'
      ).length;
      const enRuta = estadisticasRepartidores.filter(
        (r) => r.estado === 'en ruta'
      ).length;

      return {
        repartidores: estadisticasRepartidores,
        total: repartidores.length,
        disponibles,
        enRuta,
      };
    } catch (error) {
      console.error('Error en obtenerEstadisticasRepartidores:', error);
      throw new Error('Error al obtener estadísticas de repartidores');
    }
  }
}

export const dashboardDriversService = new DashboardDriversService();
