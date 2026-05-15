import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { estiloContenedorTooltip } from '../utilidades/chartTooltip';

type RegistroEntrega = {
  id: string;
  conductor: string;
  zona: string;
  estado: string;
  creadoEn: string;
  asignadoEn: string;
  recogidoEn: string;
  entregadoEn: string;
};

type TipoMétrica = 'total' | 'completado' | 'fallido' | 'tasaÉxito';

type PuntoGráfico = {
  dia: string;
  etiqueta: string;
  total: number;
  completado: number;
  fallido: number;
  tasaÉxito: number;
  predicción?: number;
  esPredicción?: boolean;
};

function inicioDelDía(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function obtenerClaveDía(fecha: Date): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const día = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${día}`;
}

function formatearEtiquetaDía(claveDía: string): string {
  const [año, mes, día] = claveDía.split('-').map(Number);
  const fecha = new Date(año, mes - 1, día);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(fecha);
}

function obtenerDíasDelMesActual(hasta: Date): string[] {
  const inicio = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
  const fin = inicioDelDía(hasta);
  const días: string[] = [];
  let actual = new Date(inicio);
  while (actual <= fin) {
    días.push(obtenerClaveDía(actual));
    actual = new Date(actual.getFullYear(), actual.getMonth(), actual.getDate() + 1);
  }
  return días;
}

function predecirTendenciaDiaria(valores: number[], díasFuturos: number): number[] {
  if (valores.length < 2) return Array(díasFuturos).fill(0);

  const n = valores.length;
  const valoresX = Array.from({ length: n }, (_, i) => i);
  const sumaX = valoresX.reduce((a, b) => a + b, 0);
  const sumaY = valores.reduce((a, b) => a + b, 0);
  const sumaXY = valoresX.reduce((sum, x, i) => sum + x * valores[i], 0);
  const sumaX2 = valoresX.reduce((sum, x) => sum + x * x, 0);

  const pendiente = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
  const intersección = (sumaY - pendiente * sumaX) / n;

  const predicciones: number[] = [];
  for (let i = 1; i <= díasFuturos; i++) {
    predicciones.push(Math.max(0, Math.round(intersección + pendiente * (n - 1 + i))));
  }
  return predicciones;
}

function etiquetaMesEnCurso(fecha: Date): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(fecha);
}

export default function GráficoTendenciaMensual({ registros }: { registros: RegistroEntrega[] }) {
  const [métricaSeleccionada, setMétricaSeleccionada] = useState<TipoMétrica>('total');
  const [mostrarPredicción, setMostrarPredicción] = useState(false);

  const hoy = useMemo(() => new Date(), []);
  const díasDelMes = useMemo(() => obtenerDíasDelMesActual(hoy), [hoy]);
  const claveMesActual = useMemo(() => {
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [hoy]);

  const datosDiarios = useMemo<PuntoGráfico[]>(() => {
    const conteosPorDía = new Map<string, { total: number; completado: number; fallido: number }>();
    for (const día of díasDelMes) {
      conteosPorDía.set(día, { total: 0, completado: 0, fallido: 0 });
    }

    for (const registro of registros) {
      const fecha = new Date(registro.creadoEn);
      if (Number.isNaN(fecha.getTime())) continue;
      const claveDía = obtenerClaveDía(fecha);
      const mesRegistro = claveDía.slice(0, 7);
      if (mesRegistro !== claveMesActual || !conteosPorDía.has(claveDía)) continue;

      const conteos = conteosPorDía.get(claveDía)!;
      conteos.total++;
      if (registro.estado === 'Completado') conteos.completado++;
      if (registro.estado === 'Fallido') conteos.fallido++;
    }

    return díasDelMes.map(día => {
      const conteos = conteosPorDía.get(día) || { total: 0, completado: 0, fallido: 0 };
      const tasaÉxito = conteos.total > 0 ? (conteos.completado / conteos.total) * 100 : 0;
      return {
        dia: día,
        etiqueta: formatearEtiquetaDía(día),
        total: conteos.total,
        completado: conteos.completado,
        fallido: conteos.fallido,
        tasaÉxito: Math.round(tasaÉxito * 10) / 10,
      };
    });
  }, [registros, díasDelMes, claveMesActual]);

  const datosGráfico = useMemo<PuntoGráfico[]>(() => {
    let datos = datosDiarios.map(punto => ({ ...punto }));

    if (mostrarPredicción && datosDiarios.length >= 2) {
      const valoresActuales = datosDiarios.map(p => {
        switch (métricaSeleccionada) {
          case 'total':
            return p.total;
          case 'completado':
            return p.completado;
          case 'fallido':
            return p.fallido;
          case 'tasaÉxito':
            return p.tasaÉxito;
        }
      });

      const predicciones = predecirTendenciaDiaria(valoresActuales, 3);
      const [año, mes, día] = díasDelMes[díasDelMes.length - 1].split('-').map(Number);
      let cursor = new Date(año, mes - 1, día);

      for (let i = 0; i < predicciones.length; i++) {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
        if (cursor.getMonth() !== hoy.getMonth()) break;

        const claveDía = obtenerClaveDía(cursor);
        datos.push({
          dia: claveDía,
          etiqueta: formatearEtiquetaDía(claveDía),
          total: 0,
          completado: 0,
          fallido: 0,
          tasaÉxito: 0,
          predicción: predicciones[i],
          esPredicción: true,
        });
      }
    }

    return datos;
  }, [datosDiarios, mostrarPredicción, métricaSeleccionada, díasDelMes, hoy]);

  const tendenciaDíaADía = useMemo(() => {
    if (datosDiarios.length < 2) return 0;
    const último = datosDiarios[datosDiarios.length - 1];
    const anterior = datosDiarios[datosDiarios.length - 2];

    const leer = (p: PuntoGráfico) => {
      switch (métricaSeleccionada) {
        case 'total':
          return p.total;
        case 'completado':
          return p.completado;
        case 'fallido':
          return p.fallido;
        case 'tasaÉxito':
          return p.tasaÉxito;
      }
    };

    const últimoVal = leer(último);
    const valAnterior = leer(anterior);
    if (valAnterior === 0) return últimoVal === 0 ? 0 : 100;
    return ((últimoVal - valAnterior) / valAnterior) * 100;
  }, [datosDiarios, métricaSeleccionada]);

  const etiquetasMétrica: Record<TipoMétrica, string> = {
    total: 'Total de entregas',
    completado: 'Entregas completadas',
    fallido: 'Entregas fallidas',
    tasaÉxito: 'Tasa de éxito (%)',
  };

  const obtenerValorMétrica = (punto: PuntoGráfico): number => {
    switch (métricaSeleccionada) {
      case 'total':
        return punto.total;
      case 'completado':
        return punto.completado;
      case 'fallido':
        return punto.fallido;
      case 'tasaÉxito':
        return punto.tasaÉxito;
    }
  };

  const formatearValorMétricamente = (valor: number): string => {
    return métricaSeleccionada === 'tasaÉxito' ? `${valor.toFixed(1)}%` : String(valor);
  };

  const valorActual = datosDiarios.length > 0 ? obtenerValorMétrica(datosDiarios[datosDiarios.length - 1]) : 0;
  const valorPromedio =
    datosDiarios.length > 0
      ? Math.round(datosDiarios.reduce((sum, p) => sum + obtenerValorMétrica(p), 0) / datosDiarios.length)
      : 0;

  const totalMes = datosDiarios.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="dashboard__panel dashboard__panel--wide">
      <div className="dashboard__panelHeader">
        <div>
          <p className="dashboard__panelLabel">Mes en curso</p>
          <h2>Tendencia del mes ({etiquetaMesEnCurso(hoy)})</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#58706b' }}>
            Evolución día a día. Solo datos del mes actual (alineado con retención ~30 días en rutas).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={métricaSeleccionada}
            onChange={e => setMétricaSeleccionada(e.target.value as TipoMétrica)}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              border: '1px solid #ddd',
              borderRadius: 4,
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            {Object.entries(etiquetasMétrica).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, color: '#556', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={mostrarPredicción} onChange={() => setMostrarPredicción(s => !s)} />
            Proyección (próx. días)
          </label>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}
      >
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Hoy / último día</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1f7a67' }}>
            {formatearValorMétricamente(valorActual)}
          </div>
        </div>
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Promedio diario (mes)</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#556' }}>
            {formatearValorMétricamente(valorPromedio)}
          </div>
        </div>
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total acumulado mes</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1f7a67' }}>{totalMes}</div>
        </div>
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Variación día a día</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: tendenciaDíaADía >= 0 ? '#1f7a67' : '#b42318',
            }}
          >
            {tendenciaDíaADía >= 0 ? '+' : ''}
            {tendenciaDíaADía.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer>
          <LineChart data={datosGráfico} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="etiqueta" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
            <YAxis allowDecimals={métricaSeleccionada !== 'tasaÉxito'} />
            <Tooltip
              contentStyle={estiloContenedorTooltip}
              formatter={(valor: unknown, nombre: string) => {
                if (valor === undefined || valor === null) return ['N/A', nombre];
                if (typeof valor === 'number') {
                  return [formatearValorMétricamente(valor), nombre];
                }
                return [String(valor), nombre];
              }}
              labelFormatter={(etiqueta: string) => `Día: ${etiqueta}`}
            />
            <Legend />
            <ReferenceLine
              y={valorPromedio}
              stroke="#999"
              strokeDasharray="5 5"
              label={{
                value: `Promedio diario: ${formatearValorMétricamente(valorPromedio)}`,
                position: 'right',
                fill: '#666',
                fontSize: 12,
              }}
            />
            {mostrarPredicción && (
              <ReferenceLine
                x={datosGráfico.find(p => p.esPredicción)?.etiqueta}
                stroke="#ddd"
                strokeDasharray="3 3"
                label={{ value: 'Proyección →', position: 'top', fill: '#999', fontSize: 11 }}
              />
            )}
            <Line
              type="monotone"
              dataKey={métricaSeleccionada}
              stroke="#1f7a67"
              strokeWidth={2}
              dot={{ fill: '#1f7a67', r: 3 }}
              activeDot={{ r: 5 }}
              name={etiquetasMétrica[métricaSeleccionada]}
              isAnimationActive={true}
            />
            {mostrarPredicción && (
              <Line
                type="monotone"
                dataKey="predicción"
                stroke="#1f7a67"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#b42318', r: 3 }}
                name="Proyección"
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
