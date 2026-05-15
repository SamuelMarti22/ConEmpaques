import '@testing-library/jest-dom/vitest';
import './vitest.recharts.mock';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardApp from '../../src/apps/dashboard/Dashboard.app';

const exportarEntregasExcelMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/apps/dashboard/utilidades/exportarEntregasExcel', async importOriginal => {
  const mod = await importOriginal<typeof import('../../src/apps/dashboard/utilidades/exportarEntregasExcel')>();
  return {
    ...mod,
    exportarEntregasExcel: exportarEntregasExcelMock,
  };
});
import {
  respuestaMuchasFallidas,
  respuestaRecientesConDatos,
  respuestaRecientesVacia,
} from './fixtures';

describe('DashboardApp', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(respuestaRecientesConDatos()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    exportarEntregasExcelMock.mockClear();
  });

  it('renderiza el panel principal, filtros y gráficos', async () => {
    render(<DashboardApp />);

    expect(screen.getByRole('heading', { name: 'Panel general de entregas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Filtros y acciones del panel')).toBeInTheDocument();

    expect(await screen.findByText('Entregas semanales')).toBeInTheDocument();
    expect(screen.getByText('Actividad por hora')).toBeInTheDocument();
    expect(screen.getByText(/Tendencia del mes/i)).toBeInTheDocument();
    expect(screen.getByText('Distribución por estado')).toBeInTheDocument();
  });

  it('muestra error y permite reintentar', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('fallo red'));

    render(<DashboardApp />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(respuestaRecientesVacia()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText(/Vista actualizada: 0 entrega\(s\) cargada\(s\) de 0 en servidor/),
    ).toBeInTheDocument();
  });

  it('aplica filtros y limpia la selección', async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await screen.findByText(/entrega\(s\) filtrada\(s\)/);

    await user.selectOptions(screen.getByLabelText('Repartidor'), 'Ana López');
    await user.selectOptions(screen.getByLabelText('Estado'), 'Completado');

    expect(screen.getByText(/entrega\(s\) filtrada\(s\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByLabelText('Repartidor')).toHaveValue('');
    expect(screen.getByLabelText('Estado')).toHaveValue('todos');
  });

  it('muestra alerta cuando hay muchas entregas fallidas', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(respuestaMuchasFallidas(8, 40)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<DashboardApp />);

    expect(await screen.findByText(/están fallidas/i)).toBeInTheDocument();
  });

  it('refresca datos y habilita cargar más cuando hay total en servidor', async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await screen.findByText(/entrega\(s\) filtrada\(s\)/);

    const cargarMas = screen.getByRole('button', { name: /Cargar más/i });
    expect(cargarMas).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Refrescar ahora' }));
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  it('exporta Excel cuando hay registros', async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await screen.findByText(/entrega\(s\) filtrada\(s\)/);
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(exportarEntregasExcelMock).toHaveBeenCalled();
    expect(exportarEntregasExcelMock.mock.calls[0]?.[0]?.length).toBeGreaterThan(0);
  });
});
