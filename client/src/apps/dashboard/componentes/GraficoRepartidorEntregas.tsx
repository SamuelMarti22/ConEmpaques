import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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

const MAX_REPARTIDORES = 14;

function truncarNombre(nombre: string, max = 26): string {
  const t = nombre.trim() || 'Sin asignar';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}\u2026`;
}

export default function GráficoRepartidorEntregas({ registros }: { registros: RegistroEntrega[] }) {
  const datos = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const r of registros) {
      const clave = (r.conductor || 'Sin asignar').trim() || 'Sin asignar';
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
    }
    return Array.from(conteo.entries())
      .map(([repartidor, entregas]) => ({
        repartidor: truncarNombre(repartidor, 28),
        repartidorCompleto: repartidor,
        entregas,
      }))
      .sort((a, b) => b.entregas - a.entregas)
      .slice(0, MAX_REPARTIDORES);
  }, [registros]);

  const altura = Math.min(520, Math.max(220, datos.length * 36 + 80));

  return (
    <div className="dashboard__panel dashboard__panel--wide">
      <div className="dashboard__panelHeader">
        <div>
          <p className="dashboard__panelLabel">Equipo de reparto</p>
          <h2>Entregas por repartidor</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#58706b' }}>
            {'Relación repartidor × volumen de entregas en el conjunto cargado.'}
          </p>
        </div>
      </div>

      {datos.length === 0 ? (
        <p style={{ margin: 0, color: '#58706b', fontSize: 14 }}>No hay entregas para agrupar.</p>
      ) : (
        <div style={{ width: '100%', height: altura }}>
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={datos}
              margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="repartidor"
                width={148}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: 'rgba(31, 122, 103, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as {
                    repartidorCompleto: string;
                    entregas: number;
                  };
                  return (
                    <div style={{ ...estiloContenedorTooltip, padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{row.repartidorCompleto}</div>
                      <div style={{ fontSize: 13, color: '#556' }}>{row.entregas} entregas</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="entregas" name="Entregas" fill="#1f7a67" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
