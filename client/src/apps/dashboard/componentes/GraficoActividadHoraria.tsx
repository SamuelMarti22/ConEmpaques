import { useMemo, useState, type ComponentProps } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

type PuntoGrafico = {
  hora: number;
  etiqueta: string;
  actual: number;
};

type EstadoClickArea = Parameters<NonNullable<ComponentProps<typeof AreaChart>['onClick']>>[0];

function obtenerHoraDeEntrega(registro: RegistroEntrega): number {
  const iso = registro.entregadoEn || registro.creadoEn;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours();
}

/** Franjas con carga alta: siempre incluye la(s) hora(s) del máximo; el resto supera el 55 % del máximo. */
function resumenPicosOperativos(puntos: PuntoGrafico[]): string {
  const max = Math.max(0, ...puntos.map(p => p.actual));
  if (max === 0) return 'N/A';
  const umbral = Math.max(1, Math.ceil(max * 0.55));
  const candidatos = puntos
    .filter(p => p.actual >= umbral)
    .sort((a, b) => b.actual - a.actual || a.hora - b.hora);
  return candidatos.map(p => `${p.etiqueta} (${p.actual})`).join(', ');
}

export default function GraficoActividadHoraria({ registros }: { registros: RegistroEntrega[] }) {
  const [horaDetalle, setHoraDetalle] = useState<number | null>(null);

  const datosGrafico = useMemo<PuntoGrafico[]>(() => {
    const conteosPorHora = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      conteosPorHora.set(h, 0);
    }

    for (const registro of registros) {
      const hora = obtenerHoraDeEntrega(registro);
      conteosPorHora.set(hora, (conteosPorHora.get(hora) ?? 0) + 1);
    }

    return Array.from({ length: 24 }, (_, i) => ({
      hora: i,
      etiqueta: `${String(i).padStart(2, '0')}:00`,
      actual: conteosPorHora.get(i) ?? 0,
    }));
  }, [registros]);

  const textoPicos = useMemo(() => resumenPicosOperativos(datosGrafico), [datosGrafico]);

  const entremedioPromedio = useMemo(() => {
    const total = datosGrafico.reduce((sum, p) => sum + p.actual, 0);
    return total > 0 ? Math.round(total / 24) : 0;
  }, [datosGrafico]);

  const maximoEntregas = useMemo(() => Math.max(...datosGrafico.map(p => p.actual), 0), [datosGrafico]);

  const manejarClickArea = (estado: EstadoClickArea): void => {
    const carga = estado.activePayload?.[0]?.payload as PuntoGrafico | undefined;
    if (!carga) {
      return;
    }
    setHoraDetalle(carga.hora);
  };

  const registrosDetalle = useMemo(() => {
    if (horaDetalle === null) return [];
    return registros.filter(r => obtenerHoraDeEntrega(r) === horaDetalle);
  }, [horaDetalle, registros]);

  return (
    <div className="dashboard__panel dashboard__panel--wide">
      <div className="dashboard__panelHeader">
        <div>
          <p className="dashboard__panelLabel">{'An\u00e1lisis temporal'}</p>
          <h2>Actividad por hora</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Picos operativos</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1f7a67',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {textoPicos}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
            {'Hora local de entrega; franjas con conteo ≥ 55% del máximo (siempre incluye la hora pico).'}
          </div>
        </div>
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{'M\u00e1x. entregas/hora'}</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#b42318' }}>{maximoEntregas}</div>
        </div>
        <div style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Promedio/hora</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#556' }}>{entremedioPromedio}</div>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={datosGrafico} onClick={manejarClickArea}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f7a67" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#1f7a67" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="etiqueta" angle={-45} textAnchor="end" height={80} />
            <YAxis allowDecimals={false} />
            <Tooltip
              contentStyle={estiloContenedorTooltip}
              labelFormatter={label => `Franja horaria: ${String(label)}`}
              formatter={(valor: number, nombre: string) => {
                const etiquetas: Record<string, string> = {
                  actual: 'Entregas (conteo)',
                };
                return [valor, etiquetas[nombre] || nombre];
              }}
            />
            <Legend />
            <ReferenceLine
              y={entremedioPromedio}
              stroke="#999"
              strokeDasharray="5 5"
              label={{ value: `Promedio: ${entremedioPromedio}`, position: 'right', fill: '#666', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#1f7a67"
              fillOpacity={1}
              fill="url(#colorActual)"
              name="Entregas"
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {horaDetalle !== null ? (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, margin: '6px 0', marginBottom: 12 }}>
            Entregas en {String(horaDetalle).padStart(2, '0')}:00 ({registrosDetalle.length} registros)
          </h3>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            <table className="dashboard__table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Repartidor</th>
                  <th>Zona</th>
                  <th>Estado</th>
                  <th>Hora exacta</th>
                </tr>
              </thead>
              <tbody>
                {registrosDetalle.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.conductor}</td>
                    <td>{r.zona}</td>
                    <td>{r.estado}</td>
                    <td>{new Date(r.creadoEn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setHoraDetalle(null)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Volver
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
