import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EntregasApp from '../../src/apps/entregas/Entregas.app'
import { visualizarRutasEnMapa } from '../../src/components/visualizacionRutasMapa.auxiliar'

vi.mock('../../src/components/MapaInteractivo', () => ({
  __esModule: true,
  default: () => <div>Mapa mock</div>,
}))

vi.mock('../../src/components/rutaResumenCard/RutaResumenCard', () => ({
  __esModule: true,
  default: ({ ruta, seleccionada, alSeleccionar }: { ruta: { rutaId: number }; seleccionada: boolean; alSeleccionar: (rutaId: number) => void }) => (
    <button type="button" aria-pressed={seleccionada} onClick={() => alSeleccionar(ruta.rutaId)}>
      Ruta activa #{ruta.rutaId}
    </button>
  ),
}))

vi.mock('../../src/components/visualizacionRutasMapa.auxiliar', () => ({
  filtrarRutasPorFecha: vi.fn((rutas) => rutas),
  obtenerRutasActivasParaMapa: vi.fn((rutas) => rutas.filter((ruta: { repartidor: { estado: string } }) => ruta.repartidor.estado === 'en ruta')),
  visualizarRutasEnMapa: vi.fn(),
}))

function crearRuta(rutaId: number, estado: 'en ruta' | 'finalizado' = 'en ruta') {
  return {
    rutaId,
    fechaReparto: '2026-04-21',
    repartidor: {
      id: rutaId,
      nombre: `Repartidor ${rutaId}`,
      estado,
      capacidad: 20,
    },
    resumen: {
      numeroPedidos: 2,
      cargaActualKg: 10,
      distanciaTotal: 5,
      tiempoEstimado: 30,
      horaInicioEstimada: '08:00',
      horaFinEstimada: '09:00',
    },
    detalleParadas: [
      {
        orden: 1,
        puntoId: rutaId * 10,
        codigoSeguimiento: `PE-${rutaId}`,
        direccion: `Calle ${rutaId}`,
        cliente: `Cliente ${rutaId}`,
        estadoEntrega: 'Pendiente' as const,
        tiempoEstimadoParada: 10,
        latitud: 1,
        longitud: 2,
      },
    ],
    geometria: {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    },
  }
}

describe('Entregas module', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('muestra carga inicial y luego las rutas activas', async () => {
    let resolver!: (value: Response) => void
    const respuestaPendiente = new Promise<Response>((resolve) => {
      resolver = resolve
    })

    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(respuestaPendiente))

    render(<EntregasApp />)

    expect(await screen.findByText('Cargando rutas...')).toBeInTheDocument()

    resolver({
      ok: true,
      json: async () => ({ rutasGuardadas: [crearRuta(101)] }),
    } as Response)

    await waitFor(() => {
      expect(screen.getByText('Ruta activa #101')).toBeInTheDocument()
    })

    expect(visualizarRutasEnMapa).toHaveBeenCalledWith(
      expect.objectContaining({ rutasGuardadas: expect.any(Array), rutaSeleccionadaId: null, limpiarSiVacio: true }),
    )
  })

  it('muestra mensaje y limpia la vista cuando no hay rutas activas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rutasGuardadas: [crearRuta(101, 'finalizado')] }),
      }),
    )

    render(<EntregasApp />)

    expect(await screen.findByText('No hay rutas activas para hoy.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver todas' })).toBeInTheDocument()
    expect(visualizarRutasEnMapa).toHaveBeenCalledWith(
      expect.objectContaining({ rutasGuardadas: [], rutaSeleccionadaId: null, limpiarSiVacio: true }),
    )
  })

  it('permite seleccionar, deseleccionar y volver a ver todas las rutas', async () => {
    const user = await import('@testing-library/user-event').then((modulo) => modulo.default.setup())

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rutasGuardadas: [crearRuta(101), crearRuta(202)] }),
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')

    await user.click(screen.getByRole('button', { name: 'Ruta activa #101' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ruta activa #101' })).toHaveAttribute('aria-pressed', 'true')
    })

    await user.click(screen.getByRole('button', { name: 'Ruta activa #101' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ruta activa #101' })).toHaveAttribute('aria-pressed', 'false')
    })

    await user.click(screen.getByRole('button', { name: 'Ruta activa #202' }))
    await user.click(screen.getByRole('button', { name: 'Ver todas' }))

    expect(visualizarRutasEnMapa).toHaveBeenLastCalledWith(
      expect.objectContaining({ rutaSeleccionadaId: null, limpiarSiVacio: true }),
    )
  })

  it('maneja error de fetch al cargar rutas', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    )

    render(<EntregasApp />)

    expect(await screen.findByText('No hay rutas activas para hoy.')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
