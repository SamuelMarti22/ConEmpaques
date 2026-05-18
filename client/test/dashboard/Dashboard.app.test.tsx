import '@testing-library/jest-dom/vitest';
import './vitest.recharts.mock';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
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
  respuestaRecientesConCasosBorde,
  respuestaMuchasFallidas,
  respuestaRecientesConDatos,
  respuestaRecientesVacia,
  respuestaRecientesPorFechas,
} from './fixtures';

describe('DashboardApp', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(respuestaRecientesConDatos()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
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

  it('mapea estados y datos incompletos antes de exportar', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(respuestaRecientesConCasosBorde()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const user = userEvent.setup();
    render(<DashboardApp />);

    await screen.findByText(/entrega\(s\) filtrada\(s\)/);
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    const registrosExportados = exportarEntregasExcelMock.mock.calls[0]?.[0] ?? [];
    expect(registrosExportados).toHaveLength(3);
    expect(registrosExportados).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ENT-1',
          conductor: 'Sin asignar',
          zona: 'Sin zona',
          estadoSistema: 'CANCELLED',
          estado: 'Retrasado',
        }),
        expect.objectContaining({
          id: '2',
          conductor: 'Ana López',
          zona: 'Centro',
          estadoSistema: 'ASSIGNED',
          estado: 'En camino',
        }),
        expect.objectContaining({
          id: 'ENT-003',
          conductor: 'Luis Pérez',
          zona: 'Envigado',
          estadoSistema: 'PENDING',
          estado: 'Retrasado',
        }),
      ]),
    );
  });

  it('filtra por rango de fechas y conserva el conteo visible', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(respuestaRecientesPorFechas()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const user = userEvent.setup();
    render(<DashboardApp />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Exportar Excel' })).not.toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText('Entrega desde'), { target: { value: '2026-05-15' } });
    fireEvent.change(screen.getByLabelText('Entrega hasta'), { target: { value: '2026-05-15' } });

    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    const registrosFiltrados = exportarEntregasExcelMock.mock.calls.at(-1)?.[0] ?? [];
    expect(registrosFiltrados).toHaveLength(1);
    expect(registrosFiltrados[0]).toEqual(
      expect.objectContaining({
        id: 'ENT-012',
        estado: 'Completado',
        estadoSistema: 'DELIVERED',
      }),
    );
  });

  it('muestra la actualización silenciosa cuando falla el refresco automático', async () => {
    let resolverActualizacion!: (response: Response) => void;
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(respuestaRecientesConDatos()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>(resolve => {
            resolverActualizacion = resolve;
          }),
      );

    const intervalos: Array<() => void> = [];
    vi.spyOn(window, 'setInterval').mockImplementation(((callback: TimerHandler) => {
      intervalos.push(callback as () => void);
      return intervalos.length as unknown as number;
    }) as typeof window.setInterval);
    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);

    render(<DashboardApp />);

    await screen.findByText(/entrega\(s\) filtrada\(s\)/);

    await act(async () => {
      intervalos[1]?.();
    });

    expect(screen.getByText(/Actualizando…/)).toBeInTheDocument();

    await act(async () => {
      resolverActualizacion(
        new Response(JSON.stringify({ error: 'actualizacion silenciosa' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      await Promise.resolve();
    });

    expect(await screen.findByText(/No se pudo actualizar en segundo plano/)).toBeInTheDocument();
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
    await user.click(cargarMas);

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

  it('interactúa con los gráficos y muestra los detalles', async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await screen.findByText(/entrega\(s\) filtrada\(s\)/);

    const graficos = screen.getAllByTestId('recharts-chart');
    for (const grafico of graficos) {
      fireEvent.click(grafico);
    }

    const botonesVolver = screen.queryAllByRole('button', { name: 'Volver' });
    console.log('BOTONES VOLVER ENCONTRADOS:', botonesVolver.length);
    for (const boton of botonesVolver) {
      await user.click(boton);
    }
  });
});
