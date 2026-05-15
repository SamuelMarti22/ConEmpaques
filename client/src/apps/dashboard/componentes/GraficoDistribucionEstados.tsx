import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
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

const ORDEN_ESTADOS = [
  'pendiente',
  'asignado',
  'en camino',
  'entregado',
  'fallido',
  'cancelado',
];

const COLORES: Record<string, string> = {
  pendiente: '#f59e0b',
  asignado: '#06b6d4',
  'en camino': '#3b82f6',
  entregado: '#10b981',
  fallido: '#ef4444',
  cancelado: '#6b7280',
};

function normalizarEstado(estado: string) {
  if (!estado) return 'pendiente';
  const minúscula = estado.toLowerCase();
  if (minúscula.includes('deliver') || minúscula.includes('entreg')) return 'entregado';
  if (minúscula.includes('fail') || minúscula.includes('fall')) return 'fallido';
  if (minúscula.includes('transit') || minúscula.includes('camino')) return 'en camino';
  if (minúscula.includes('assign') || minúscula.includes('asign')) return 'asignado';
  if (minúscula.includes('entreg')) return 'entregado';
  if (minúscula.includes('fall')) return 'fallido';
  if (minúscula.includes('cancel')) return 'cancelado';
  if (minúscula.includes('camino')) return 'en camino';
  if (minúscula.includes('asign')) return 'asignado';
  if (minúscula.includes('pend')) return 'pendiente';
  return minúscula as string;
}

export default function GráficoDistribuciónEstados({ registros }: { registros: RegistroEntrega[] }) {
  const total = registros.length;

  const datos = useMemo(() => {
    const conteos: Record<string, number> = {};
    ORDEN_ESTADOS.forEach(s => (conteos[s] = 0));
    for (const r of registros) {
      const estado = normalizarEstado(r.estado);
      if (!conteos[estado]) conteos[estado] = 0;
      conteos[estado]++;
    }
    return ORDEN_ESTADOS.map(estado => ({
      nombre: estado,
      valor: conteos[estado] || 0,
      color: COLORES[estado] || '#ccc',
      porcentaje: total > 0 ? Math.round(((conteos[estado] || 0) / total) * 1000) / 10 : 0,
    }));
  }, [registros, total]);

  return (
    <div className="dashboard__panel">
      <div className="dashboard__panelHeader">
        <div>
          <p className="dashboard__panelLabel">Distribución por estado</p>
          <h2>Estados de entregas</h2>
        </div>
      </div>

      <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="nombre"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              label={({ name, value, payload }) => {
                const porcentaje = payload && typeof payload.porcentaje === 'number' ? payload.porcentaje : 0;
                const valor = typeof value === 'number' ? value : 0;

                if (valor === 0) {
                  return '';
                }

                return `${name}: ${valor} (${porcentaje}%)`;
              }}
            >
              {datos.map(d => (
                <Cell key={d.nombre} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={estiloContenedorTooltip}
              formatter={(valor: number, _n: string, item) => {
                const p = item?.payload as { porcentaje?: number } | undefined;
                const pct = p?.porcentaje ?? 0;
                return [`${valor} entregas (${pct}%)`, 'Total'];
              }}
            />
            <Legend
              formatter={(valor) => {
                const elemento = datos.find(d => d.nombre === valor);
                return `${valor} — ${elemento?.valor ?? 0} (${elemento?.porcentaje ?? 0}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
