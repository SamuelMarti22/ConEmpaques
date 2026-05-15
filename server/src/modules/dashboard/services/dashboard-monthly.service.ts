/**
 * DashboardMonthlyService.ts
 * Servicio para estadísticas mensuales con predicción
 */

import { RutaEntregaModel } from '../../../databases/mongoDB/models/rutaEntrega.model.js';
import {
  mapearEstadoFrontend,
  obtenerNombreMes,
  calcularVariacion,
  determinarTendencia,
} from '../dashboard.mapper.js';
import type { MonthlyResponse } from '../../../types/dashboard.types.js';

export class DashboardMonthlyService {
  /**
   * GET /dashboard/monthly
   * Estadísticas mensuales con predicción
   */
  async obtenerEstadisticasMensuales(): Promise<MonthlyResponse> {
    try {
      const ahora = new Date();
      const hace12Meses = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);

      // Obtener rutas del último año
      const rutasAno = await RutaEntregaModel.find({
        createdAt: { $gte: hace12Meses, $lte: ahora },
      });

      // Agrupar por mes
      const datosXMes = new Map<
        string,
        { entregas: number; exitosas: number; fallidas: number }
      >();
      const mesesAno = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];

      // Inicializar meses
      for (let i = 0; i < 12; i++) {
        const mes = mesesAno[i]!;
        datosXMes.set(mes, { entregas: 0, exitosas: 0, fallidas: 0 });
      }

      // Procesar entregas
      let totalAno = 0;
      let totalExitosas = 0;

      rutasAno.forEach((ruta) => {
        if (!ruta.puntosEntrega) return;

        ruta.puntosEntrega.forEach((punto) => {
          const estado = mapearEstadoFrontend(punto.estadoEntrega);
          const fecha = punto.fechaHoraEntrega || ruta.createdAt;
          const mesIndex = fecha.getMonth();
          const mes = mesesAno[mesIndex];

          if (mes) {
            const datoMes = datosXMes.get(mes);

            if (datoMes) {
              datoMes.entregas++;
              totalAno++;

              if (estado === 'DELIVERED') {
                datoMes.exitosas++;
                totalExitosas++;
              } else if (estado === 'FAILED') {
                datoMes.fallidas++;
              }
            }
          }
        });
      });

      // Construir array
      const datos = mesesAno.map((mes) => {
        const dato = datosXMes.get(mes) || { entregas: 0, exitosas: 0, fallidas: 0 };
        return {
          mes,
          entregas: dato.entregas,
          exitosas: dato.exitosas,
          fallidas: dato.fallidas,
        };
      });

      // Calcular predicción (promedio simple para el próximo mes)
      const promedioMensual = Math.round(totalAno / 12);
      const mesActual = mesesAno[ahora.getMonth()] || 'Ene';
      const prediccion = {
        mes: mesActual,
        entregas: promedioMensual,
        exitosas:
          totalAno > 0
            ? Math.round((totalExitosas / totalAno) * promedioMensual)
            : 0,
        fallidas:
          totalAno > 0
            ? Math.round(((totalAno - totalExitosas) / totalAno) * promedioMensual)
            : 0,
      };

      // Determinar tendencia
      const primerMes = datos[0]?.entregas || 0;
      const ultimoMes = datos[11]?.entregas || 0;
      const tendencia = determinarTendencia(calcularVariacion(ultimoMes, primerMes));

      return {
        datos,
        prediccion,
        resumen: {
          totalAno,
          promedioMensual,
          tendencia,
        },
      };
    } catch (error) {
      console.error('Error en obtenerEstadisticasMensuales:', error);
      throw new Error('Error al obtener estadísticas mensuales');
    }
  }
}

export const dashboardMonthlyService = new DashboardMonthlyService();
