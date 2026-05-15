import '@testing-library/jest-dom/vitest';
import './vitest.recharts.mock';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import GraficoActividadHoraria from '../../src/apps/dashboard/componentes/GraficoActividadHoraria';
import GraficoDistribucionEstados from '../../src/apps/dashboard/componentes/GraficoDistribucionEstados';
import GraficoEntregasSemanales from '../../src/apps/dashboard/componentes/GraficoEntregasSemanales';
import GraficoRepartidorEntregas from '../../src/apps/dashboard/componentes/GraficoRepartidorEntregas';
import GraficoTendenciaMensual from '../../src/apps/dashboard/componentes/GraficoTendenciaMensual';
import { registroEntregaBase } from './fixtures';

const registrosVarios = [
  registroEntregaBase,
  {
    ...registroEntregaBase,
    id: 'ENT-2',
    conductor: 'Luis Pérez',
    estado: 'Fallido',
    entregadoEn: '2026-05-14T14:30:00.000Z',
    creadoEn: '2026-05-13T09:00:00.000Z',
  },
  {
    ...registroEntregaBase,
    id: 'ENT-3',
    estado: 'En camino',
    entregadoEn: '2026-05-14T23:00:00.000Z',
  },
];

describe('Gráficos del dashboard', () => {
  it('GraficoActividadHoraria muestra métricas y detalle al interactuar', async () => {
    const user = userEvent.setup();
    render(<GraficoActividadHoraria registros={registrosVarios} />);

    expect(screen.getByText('Actividad por hora')).toBeInTheDocument();
    expect(screen.getByText('Picos operativos')).toBeInTheDocument();
    expect(screen.getByText(/Máx\. entregas\/hora/i)).toBeInTheDocument();

    await user.click(screen.getByTestId('recharts-chart'));
    expect(await screen.findByText(/Entregas en \d{2}:\d{2}/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument();
  });

  it('GraficoActividadHoraria sin datos muestra N/A en picos', () => {
    render(<GraficoActividadHoraria registros={[]} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('GraficoDistribuciónEstados agrupa estados', () => {
    render(<GraficoDistribucionEstados registros={registrosVarios} />);
    expect(screen.getByText('Estados de entregas')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-pie')).toBeInTheDocument();
  });

  it('GraficoEntregasSemanales muestra barras y detalle del día', async () => {
    const user = userEvent.setup();
    const fin = new Date('2026-05-14T12:00:00.000Z');
    const inicio = new Date(fin);
    inicio.setDate(fin.getDate() - 6);

    render(
      <GraficoEntregasSemanales
        registros={registrosVarios}
        rango={{ inicio, fin }}
      />,
    );

    expect(screen.getByText('Entregas semanales')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Entregas por día/i })).toBeInTheDocument();
    await user.click(screen.getByTestId('recharts-chart'));
    expect(await screen.findByText('Detalles del día')).toBeInTheDocument();
  });

  it('GraficoRepartidorEntregas lista repartidores', () => {
    render(<GraficoRepartidorEntregas registros={registrosVarios} />);
    expect(screen.getByRole('heading', { name: 'Entregas por repartidor' })).toBeInTheDocument();
    expect(screen.getByTestId('recharts-chart')).toBeInTheDocument();
  });

  it('GraficoRepartidorEntregas vacío muestra mensaje', () => {
    render(<GraficoRepartidorEntregas registros={[]} />);
    expect(screen.getByText('No hay entregas para agrupar.')).toBeInTheDocument();
  });

  it('GraficoTendenciaMensual permite cambiar métrica y predicción', async () => {
    const user = userEvent.setup();
    render(<GraficoTendenciaMensual registros={registrosVarios} />);

    expect(screen.getByText(/Tendencia del mes/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox'), 'fallido');
    await user.click(screen.getByLabelText(/Proyección/i));
    expect(screen.getByText('Total acumulado mes')).toBeInTheDocument();
  });
});
