import React from 'react';
import { vi } from 'vitest';

vi.mock('recharts', () => {
  const contenedor = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-container', style: { width: 800, height: 400 } }, children);

  const grafico = ({ children, data, onClick }: { children?: React.ReactNode; data?: unknown[]; onClick?: (e: unknown) => void }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'recharts-chart',
        onClick: () => {
          const item = data?.find((d: any) => d.actual > 0 || d.exitosas > 0 || d.total > 0 || d.entregas > 0) || data?.[0];
          if (item) {
            onClick?.({ activePayload: [{ payload: item }] });
          }
        },
      },
      children,
    );

  const torta = ({
    children,
    data,
    label,
  }: {
    children?: React.ReactNode;
    data?: Array<{ nombre: string; valor: number; porcentaje: number }>;
    label?: (p: { name: string; value: number; payload: { porcentaje: number } }) => string;
  }) => {
    if (label && data?.length) {
      label({ name: data[0].nombre, value: data[0].valor, payload: data[0] });
      label({ name: 'otro', value: 0, payload: data[0] });
    }
    return React.createElement('div', { 'data-testid': 'recharts-pie' }, children);
  };

  const tooltip = ({
    content,
    formatter,
    labelFormatter,
  }: {
    content?: (p: { active: boolean; payload: Array<{ payload: Record<string, unknown> }> }) => React.ReactNode;
    formatter?: (valor: unknown, nombre: string, item: { payload?: { porcentaje?: number } }) => [string, string];
    labelFormatter?: (label: string) => React.ReactNode;
  }) => {
    if (content) {
      return content({
        active: true,
        payload: [{ payload: { repartidorCompleto: 'Ana López', entregas: 4 } }],
      });
    }
    if (formatter) {
      formatter(3, 'total', { payload: { porcentaje: 25 } });
      formatter('test', 'actual', { payload: {} });
      formatter(undefined, 'total', { payload: {} });
    }
    if (labelFormatter) {
      labelFormatter('2026-05-15');
    }
    return null;
  };

  const leyenda = ({ formatter }: { formatter?: (v: string) => string }) => {
    if (formatter) {
      formatter('entregado');
    }
    return null;
  };

  return {
    ResponsiveContainer: contenedor,
    BarChart: grafico,
    LineChart: grafico,
    AreaChart: grafico,
    PieChart: grafico,
    Bar: () => null,
    Line: () => null,
    Area: () => null,
    Pie: torta,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: tooltip,
    Legend: leyenda,
    CartesianGrid: () => null,
    ReferenceLine: () => null,
  };
});
