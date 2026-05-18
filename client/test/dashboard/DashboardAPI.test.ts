import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboardAPI } from '../../src/apps/dashboard/servicios/DashboardAPI';

describe('dashboardAPI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('obtenerEntregasRecientes devuelve datos del API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          entregas: [{ id: '1', codigoSeguimiento: 'X', cliente: 'C', direccion: 'Z', estado: 'ENTREGADO', repartidor: 'A' }],
          total: 1,
          pagina: 1,
          porPagina: 10,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await dashboardAPI.obtenerEntregasRecientes(1, 10);
    expect(res.total).toBe(1);
    expect(res.entregas[0].codigoSeguimiento).toBe('X');
  });

  it('lanza error cuando la respuesta HTTP falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Servidor caído' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(dashboardAPI.obtenerEntregasRecientes()).rejects.toThrow('Servidor caído');
  });

  it('lanza error cuando fetch falla por red', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(dashboardAPI.obtenerEntregasRecientes()).rejects.toThrow('Network error');
  });
});
