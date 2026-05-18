/**
 * DashboardRecentService.ts
 * Servicio para entregas recientes con paginación
 */

import { prisma } from '../../../databases/prisma/lib/prisma.js';
import { RutaEntregaModel } from '../../../databases/mongoDB/models/rutaEntrega.model.js';
import {
  mapearEstadoFrontend,
  formatearHoraLocal,
} from '../dashboard.mapper.js';
import type { RecentResponse, EntregaReciente } from '../../../types/dashboard.types.js';

export class DashboardRecentService {
  /**
   * GET /dashboard/recent
   * Entregas recientes con paginación
   */
  async obtenerEntregasRecientes(
    pagina: number,
    porPagina: number
  ): Promise<RecentResponse> {
    try {
      // Obtener rutas con paginación en MongoDB
      const skip = (pagina - 1) * porPagina;
      const rutasEntrega = await RutaEntregaModel.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(porPagina);

      // Obtener total de entregas
      const totalEntregas = await RutaEntregaModel.countDocuments({});

      // Obtener todas las rutas MySQL para mapear repartidores
      const todasLasRutas = await prisma.ruta.findMany({
        include: { repartidor: true },
      });

      // Procesar entregas recientes
      const entregas: EntregaReciente[] = [];

      rutasEntrega.forEach((ruta) => {
        const rutaMySQL = todasLasRutas.find((r) => r.id === ruta.rutaId);
        const repartidorNombre = rutaMySQL?.repartidor.nombre || 'N/A';

        if (ruta.puntosEntrega) {
          ruta.puntosEntrega.forEach((punto, index) => {
            const horaEntrega = punto.fechaHoraEntrega
              ? (formatearHoraLocal(punto.fechaHoraEntrega) ?? undefined)
              : undefined;

            const entrega: EntregaReciente = {
              id: `${ruta._id}-${index}`,
              codigoSeguimiento: punto.codigo,
              cliente: punto.nombreCliente,
              direccion: punto.direccion,
              estado: mapearEstadoFrontend(punto.estadoEntrega),
              repartidor: repartidorNombre,
              ...(punto.fechaHoraEntrega ? { fechaEntrega: punto.fechaHoraEntrega } : {}),
              ...(horaEntrega ? { horaEntrega } : {}),
            };

            entregas.push(entrega);
          });
        }
      });

      return {
        entregas,
        total: totalEntregas,
        pagina,
        porPagina,
      };
    } catch (error) {
      console.error('Error en obtenerEntregasRecientes:', error);
      throw new Error('Error al obtener entregas recientes');
    }
  }
}

export const dashboardRecentService = new DashboardRecentService();
