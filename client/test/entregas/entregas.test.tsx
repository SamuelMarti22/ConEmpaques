import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EntregasApp from '../../src/apps/entregas/Entregas.app'
import { visualizarRutasEnMapa } from '../../src/components/visualizacionRutasMapa.auxiliar'

const actualizarInflexionRutaMock = vi.fn()
let exponerMapaRef = true

vi.mock('../../src/components/MapaInteractivo', () => ({
  __esModule: true,
  default: (() => {
    const React = require('react') as typeof import('react')
    return React.forwardRef((_props: unknown, ref: React.ForwardedRef<{ actualizarInflexionRuta: typeof actualizarInflexionRutaMock }>) => {
      React.useImperativeHandle(
        ref,
        () => (exponerMapaRef ? { actualizarInflexionRuta: actualizarInflexionRutaMock } : null),
        [exponerMapaRef],
      )
      return <div>Mapa mock</div>
    })
  })(),
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
  const originalAlert = window.alert

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    actualizarInflexionRutaMock.mockReset()
    exponerMapaRef = true
  })

  afterEach(() => {
    global.fetch = originalFetch
    window.alert = originalAlert
  })

  function respuestaJson(payload: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      json: async () => payload,
    } as Response
  }

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

    expect(visualizarRutasEnMapa).toHaveBeenCalledWith(
      expect.objectContaining({ rutaSeleccionadaId: null, limpiarSiVacio: true }),
    )
  })

  it('inicia simulacion para la ruta seleccionada', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(
            respuestaJson({ rutasGuardadas: [crearRuta(101), crearRuta(202)] }),
          )
        }

        if (url.endsWith('/api/tracking/simulacion/iniciar/202')) {
          return Promise.resolve(
            respuestaJson({
              data: {
                ubicacionInicial: { lat: 4.6, lng: -74.1, timestamp: 123 },
              },
            }),
          )
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(
            respuestaJson({ data: { lat: 4.61, lng: -74.11, timestamp: 124, simulado: true } }),
          )
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    await user.click(screen.getByRole('button', { name: 'Ruta activa #202' }))
    await user.click(screen.getByRole('button', { name: 'Simular tracking' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/tracking/simulacion/iniciar/202',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervaloMs: 5000 }),
        }),
      )
    })
  })

  it('usa la primera ruta activa al simular sin seleccion previa', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101), crearRuta(202)] }))
        }

        if (url.endsWith('/api/tracking/simulacion/iniciar/101')) {
          return Promise.resolve(respuestaJson({ data: { ubicacionInicial: null } }))
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    await user.click(screen.getByRole('button', { name: 'Simular tracking' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/tracking/simulacion/iniciar/101',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('muestra alerta al simular si no hay rutas activas', async () => {
    const user = userEvent.setup()
    const alertMock = vi.fn()
    window.alert = alertMock

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuestaJson({ rutasGuardadas: [crearRuta(303, 'finalizado')] }),
      ),
    )

    render(<EntregasApp />)

    await screen.findByText('No hay rutas activas para hoy.')
    await user.click(screen.getByRole('button', { name: 'Simular tracking' }))

    expect(alertMock).toHaveBeenCalledWith('No hay rutas activas para simular.')
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/simulacion/iniciar/'),
      expect.anything(),
    )
  })

  it('detiene simulacion para ruta seleccionada', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101), crearRuta(202)] }))
        }

        if (url.endsWith('/api/tracking/simulacion/detener/202')) {
          return Promise.resolve(respuestaJson({ mensaje: 'ok' }))
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        if (init?.method === 'POST') {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    await user.click(screen.getByRole('button', { name: 'Ruta activa #202' }))
    await user.click(screen.getByRole('button', { name: 'Detener simulación' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/tracking/simulacion/detener/202',
        { method: 'POST' },
      )
    })
  })

  it('muestra alerta al detener si no hay rutas activas', async () => {
    const user = userEvent.setup()
    const alertMock = vi.fn()
    window.alert = alertMock

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuestaJson({ rutasGuardadas: [crearRuta(303, 'finalizado')] }),
      ),
    )

    render(<EntregasApp />)

    await screen.findByText('No hay rutas activas para hoy.')
    await user.click(screen.getByRole('button', { name: 'Detener simulación' }))

    expect(alertMock).toHaveBeenCalledWith('No hay rutas activas para detener simulación.')
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/simulacion/detener/'),
      expect.anything(),
    )
  })

  it('reporta error cuando iniciar simulacion responde no ok', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101)] }))
        }

        if (url.endsWith('/api/tracking/simulacion/iniciar/101')) {
          return Promise.resolve(respuestaJson({ error: 'fallo sim' }, false, 500))
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    await user.click(screen.getByRole('button', { name: 'Simular tracking' }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No se pudo iniciar simulación de tracking',
        expect.any(Error),
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('reporta error cuando detener simulacion responde no ok', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101)] }))
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        if (url.endsWith('/api/tracking/simulacion/detener/101')) {
          return Promise.resolve(respuestaJson({ error: 'fallo detener' }, false, 500))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    await user.click(screen.getByRole('button', { name: 'Detener simulación' }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No se pudo detener simulación de tracking',
        expect.any(Error),
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('resetea la ruta seleccionada si deja de estar activa tras refresco', async () => {
    const user = userEvent.setup()
    const callbacksIntervalo: Array<() => void> = []

    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((cb: TimerHandler) => {
      callbacksIntervalo.push(cb as () => void)
      return callbacksIntervalo.length as unknown as number
    })
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined)

    let consultaRutas = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          consultaRutas += 1
          if (consultaRutas === 1) {
            return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101), crearRuta(202)] }))
          }

          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101), crearRuta(202, 'finalizado')] }))
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #202')
    await user.click(screen.getByRole('button', { name: 'Ruta activa #202' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ruta activa #202' })).toHaveAttribute('aria-pressed', 'true')
    })

    callbacksIntervalo[0]?.()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Ruta activa #202' })).not.toBeInTheDocument()
    })

    expect(visualizarRutasEnMapa).toHaveBeenCalledWith(
      expect.objectContaining({ rutaSeleccionadaId: null, limpiarSiVacio: true }),
    )

    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('actualiza inflexiones del mapa con y sin ubicacion de tracking', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101), crearRuta(202)] }))
        }

        if (url.endsWith('/api/tracking/ubicacion/101')) {
          return Promise.resolve(respuestaJson({ data: { lat: 4.6, lng: -74.1, timestamp: 100 } }))
        }

        if (url.endsWith('/api/tracking/ubicacion/202')) {
          return Promise.resolve(respuestaJson({}, false, 404))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')

    await waitFor(() => {
      expect(actualizarInflexionRutaMock).toHaveBeenCalledWith(0, [-74.1, 4.6])
      expect(actualizarInflexionRutaMock).toHaveBeenCalledWith(1, null)
    })
  })

  it('no intenta actualizar inflexiones cuando el mapa aun no expone referencia', async () => {
    exponerMapaRef = false

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/rutas')) {
          return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101)] }))
        }

        if (url.includes('/api/tracking/ubicacion/')) {
          return Promise.resolve(respuestaJson({ data: { lat: 4.6, lng: -74.1, timestamp: 100 } }))
        }

        return Promise.resolve(respuestaJson({}, false, 404))
      }),
    )

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    await waitFor(() => {
      expect(actualizarInflexionRutaMock).not.toHaveBeenCalled()
    })
  })

  it('continua refrescando ubicaciones por intervalo', async () => {
    const callbacksIntervalo: Array<() => void> = []

    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((cb: TimerHandler) => {
      callbacksIntervalo.push(cb as () => void)
      return callbacksIntervalo.length as unknown as number
    })
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined)

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/rutas')) {
        return Promise.resolve(respuestaJson({ rutasGuardadas: [crearRuta(101)] }))
      }

      if (url.endsWith('/api/tracking/ubicacion/101')) {
        return Promise.resolve(respuestaJson({ data: { lat: 4.6, lng: -74.1, timestamp: 100 } }))
      }

      return Promise.resolve(respuestaJson({}, false, 404))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<EntregasApp />)

    await screen.findByText('Ruta activa #101')
    const llamadasIniciales = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/api/tracking/ubicacion/')).length

    callbacksIntervalo.forEach((callback) => callback())

    await waitFor(() => {
      const llamadasPosteriores = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/api/tracking/ubicacion/')).length
      expect(llamadasPosteriores).toBeGreaterThan(llamadasIniciales)
    })

    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('ignora respuesta de rutas si la vista ya fue desmontada', async () => {
    let resolver!: (value: Response) => void
    const respuestaPendiente = new Promise<Response>((resolve) => {
      resolver = resolve
    })

    vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuestaPendiente))

    const { unmount } = render(<EntregasApp />)
    unmount()

    resolver(respuestaJson({ rutasGuardadas: [crearRuta(101)] }))

    await Promise.resolve()
    await Promise.resolve()

    expect(global.fetch).toHaveBeenCalled()
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
