import { useMemo, useState, type ComponentProps } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
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

type RangoFechas = { inicio: Date; fin: Date };

type PuntoGráfico = {
  fecha: string;
  etiqueta: string;
  exitosas: number;
  fallidas: number;
  diaIncidencia: boolean;
};

type EstadoClickGráfico = Parameters<NonNullable<ComponentProps<typeof BarChart>['onClick']>>[0];

function inicioDelDía(fecha: Date) {
  const siguiente = new Date(fecha);
  siguiente.setHours(0, 0, 0, 0);
  return siguiente;
}

function finDelDía(fecha: Date) {
  const siguiente = new Date(fecha);
  siguiente.setHours(23, 59, 59, 999);
  return siguiente;
}

function formatearEtiquetaDía(fecha: Date) {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric' }).format(fecha);
}

function rangoDelDías(inicio: Date, fin: Date) {
  const días: Date[] = [];
  let actual = inicioDelDía(inicio);
  const último = inicioDelDía(fin);
  while (actual <= último) {
    días.push(new Date(actual));
    actual = new Date(actual.getTime() + 24 * 60 * 60 * 1000);
  }
  return días;
}

export default function GráficoEntregasSemanales({
  registros,
  rango,
}: {
  registros: RegistroEntrega[];
  rango: RangoFechas;
}) {
  const [fechaDetalle, setFechaDetalle] = useState<string | null>(null);

  const datos = useMemo<PuntoGráfico[]>(() => {
    const días = rangoDelDías(rango.inicio, rango.fin);

    return días.map(d => {
      const inicioDay = inicioDelDía(d);
      const finDay = finDelDía(d);
      const etiqueta = formatearEtiquetaDía(d);
      const registrosDía = registros.filter(r => {
        const creado = new Date(r.creadoEn);
        return creado >= inicioDay && creado <= finDay;
      });
      const exitosas = registrosDía.filter(r => r.estado === 'Completado').length;
      const fallidas = registrosDía.filter(r => r.estado === 'Fallido').length;
      const diaIncidencia = fallidas >= 3 && fallidas >= Math.max(1, exitosas) * 0.25;
      return {
        fecha: inicioDay.toISOString(),
        etiqueta,
        exitosas,
        fallidas,
        diaIncidencia,
      };
    });
  }, [registros, rango]);

  const diasConIncidencia = useMemo(() => datos.filter(d => d.diaIncidencia).length, [datos]);

  const manejarClickBarra = (estado: EstadoClickGráfico): void => {
    const carga = estado.activePayload?.[0]?.payload as PuntoGráfico | undefined;
    if (!carga) {
      return;
    }

    setFechaDetalle(carga.fecha);
  };

  const registrosDetalle = useMemo(() => {
    if (!fechaDetalle) return [];
    const inicioDay = new Date(fechaDetalle);
    const finDay = finDelDía(inicioDay);
    return registros.filter(r => {
      const creado = new Date(r.creadoEn);
      return creado >= inicioDay && creado <= finDay;
    });
  }, [fechaDetalle, registros]);

  return (
    <div className="dashboard__panel">
      <div className="dashboard__panelHeader">
        <div>
          <p className="dashboard__panelLabel">Entregas semanales</p>
          <h2>Entregas por día (Exitosas vs Fallidas)</h2>
          {diasConIncidencia > 0 ? (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7a4a05', fontWeight: 600 }}>
              {diasConIncidencia} día(s) con umbral alto de fallidas (barra más oscura).
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={datos} onClick={manejarClickBarra}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="etiqueta" />
            <YAxis allowDecimals={false} />
            <Tooltip
              contentStyle={estiloContenedorTooltip}
              formatter={(value: number, name: string) => [`${value} pedidos`, name]}
              labelFormatter={label => `Día: ${String(label)}`}
            />
            <Legend />
            <Bar dataKey="exitosas" name="Exitosas" fill="#1f7a67" />
            <Bar dataKey="fallidas" name="Fallidas" fill="#b42318">
              {datos.map((d, i) => (
                <Cell key={`cell-fall-${i}`} fill={d.diaIncidencia ? '#7f1d1d' : '#b42318'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {fechaDetalle ? (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 14, margin: '6px 0' }}>Detalles del día</h3>
          <div style={{ maxHeight: 160, overflow: 'auto' }}>
            <table className="dashboard__table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Repartidor</th>
                  <th>Zona</th>
                  <th>Estado</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {registrosDetalle.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.conductor}</td>
                    <td>{r.zona}</td>
                    <td>{r.estado}</td>
                    <td>{new Date(r.creadoEn).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
