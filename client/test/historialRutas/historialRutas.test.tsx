import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HistorialRutasApp from '../../src/apps/historialRutas/HistorialRutas.app'
import type { RutaGuardadaUI } from '../../src/components/guardadoRuta/botonGuardarRuta.component'

// ---------------------------------------------------------------------------
// Mock del componente hijo para aislar el comportamiento del app
// ---------------------------------------------------------------------------
vi.mock('../../src/components/rutaResumenCard/RutaResumenCard', () => ({
  default: ({
    ruta,
    seleccionada,
    alSeleccionar,
  }: {
    ruta: RutaGuardadaUI
    seleccionada?: boolean
    alSeleccionar?: (rutaId: number) => void
  }) => (
    <button
      type="button"
      data-testid={`ruta-card-${ruta.rutaId}`}
      data-seleccionada={seleccionada ? 'true' : 'false'}
      onClick={() => alSeleccionar?.(ruta.rutaId)}
    >
      Ruta mock #{ruta.rutaId}
    </button>
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const rutaBaseMock: RutaGuardadaUI = {
  rutaId: 101,
  fechaReparto: '2026-04-21',
  repartidor: { id: 1, nombre: 'Ana', estado: 'en ruta', capacidad: 25 },
  resumen: {
    numeroPedidos: 2,
    cargaActualKg: 8,
    distanciaTotal: 12.4,
    tiempoEstimado: 1200,
    horaInicioEstimada: '2026-04-21T08:00:00.000Z',
    horaFinEstimada: '2026-04-21T09:00:00.000Z',
  },
  detalleParadas: [
    {
      orden: 1,
      puntoId: 11,
      codigoSeguimiento: 'PE-101-A',
      direccion: 'Calle 1',
      cliente: 'Cliente A',
      estadoEntrega: 'Pendiente',
      tiempoEstimadoParada: 600,
      latitud: 6.2,
      longitud: -75.5,
    },
    {
      orden: 2,
      puntoId: 12,
      codigoSeguimiento: 'PE-101-B',
      direccion: 'Calle 2',
      cliente: 'Cliente B',
      estadoEntrega: 'En camino',
      tiempoEstimadoParada: 600,
      latitud: 6.21,
      longitud: -75.51,
    },
  ],
  geometria: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[-75.5, 6.2], [-75.51, 6.21]],
    },
  },
}

const rutaSegundaMock: RutaGuardadaUI = {
  rutaId: 202,
  fechaReparto: '2026-04-22',
  repartidor: { id: 2, nombre: 'Carlos', estado: 'disponible', capacidad: 30 },
  resumen: {
    numeroPedidos: 1,
    cargaActualKg: 5,
    distanciaTotal: 7.0,
    tiempoEstimado: 800,
    horaInicioEstimada: '2026-04-22T09:00:00.000Z',
    horaFinEstimada: '2026-04-22T09:30:00.000Z',
  },
  detalleParadas: [
    {
      orden: 1,
      puntoId: 21,
      codigoSeguimiento: 'PE-202-A',
      direccion: 'Avenida 10',
      cliente: 'Cliente C',
      estadoEntrega: 'Entregado',
      tiempoEstimadoParada: 800,
      latitud: 6.25,
      longitud: -75.55,
    },
  ],
  geometria: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[-75.55, 6.25]],
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetchOk(rutas: RutaGuardadaUI[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rutasGuardadas: rutas }),
    }),
  )
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({}),
    }),
  )
}

function mockFetchNetworkError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('HistorialRutas — módulo completo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // -------------------------------------------------------------------------
  describe('Carga inicial', () => {
    it('muestra skeletons de carga mientras espera la respuesta', () => {
      // fetch que nunca resuelve para mantener el estado de carga
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
      render(<HistorialRutasApp />)

      const skeletons = document.querySelectorAll('[aria-hidden="true"].historialRutas__card--skeleton')
      expect(skeletons.length).toBe(6)
    })

    it('muestra las rutas al recibir respuesta exitosa', async () => {
      mockFetchOk([rutaBaseMock])
      render(<HistorialRutasApp />)

      expect(await screen.findByText('Ruta mock #101')).toBeInTheDocument()
    })

    it('muestra mensaje de error cuando la API responde con status de error', async () => {
      mockFetchError(500)
      render(<HistorialRutasApp />)

      expect(await screen.findByText(/No se pudo consultar el historial \(500\)/i)).toBeInTheDocument()
    })

    it('muestra mensaje de error ante falla de red', async () => {
      mockFetchNetworkError()
      render(<HistorialRutasApp />)

      expect(await screen.findByText(/Network error/i)).toBeInTheDocument()
    })

    it('muestra mensaje vacío cuando la API devuelve lista vacía', async () => {
      mockFetchOk([])
      render(<HistorialRutasApp />)

      expect(await screen.findByText('No hay rutas registradas.')).toBeInTheDocument()
      expect(screen.getByText('0 rutas encontrados')).toBeInTheDocument()
    })

    it('llama a fetch con la URL correcta al montar', async () => {
      mockFetchOk([rutaBaseMock])
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://localhost:3000/api/rutas')
    })
  })

  // -------------------------------------------------------------------------
  describe('Contador de resultados', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock]))

    it('muestra 1 ruta encontrada al cargar', async () => {
      render(<HistorialRutasApp />)
      expect(await screen.findByText('1 rutas encontrados')).toBeInTheDocument()
    })

    it('el contador cambia a pedidos al cambiar de modo', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('1 rutas encontrados')
      await user.click(screen.getByRole('button', { name: /Pedidos/i }))

      expect(screen.getByText('2 pedidos encontrados')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  describe('Filtro de búsqueda', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock, rutaSegundaMock]))

    it('filtra rutas por nombre de repartidor', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      await user.type(screen.getByPlaceholderText(/cliente, codigo, repartidor/i), 'Carlos')

      expect(screen.queryByText('Ruta mock #101')).not.toBeInTheDocument()
      expect(screen.getByText('Ruta mock #202')).toBeInTheDocument()
      expect(screen.getByText('1 rutas encontrados')).toBeInTheDocument()
    })

    it('filtra rutas por código de seguimiento', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')
      await user.type(screen.getByPlaceholderText(/cliente, codigo, repartidor/i), 'PE-202')

      expect(screen.queryByText('Ruta mock #101')).not.toBeInTheDocument()
      expect(screen.getByText('Ruta mock #202')).toBeInTheDocument()
    })

    it('muestra "No hay rutas registradas" cuando ninguna coincide con la búsqueda', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')
      await user.type(screen.getByPlaceholderText(/cliente, codigo, repartidor/i), 'zzz-no-existe')

      expect(screen.getByText('No hay rutas registradas.')).toBeInTheDocument()
      expect(screen.getByText('0 rutas encontrados')).toBeInTheDocument()
    })

    it('filtra pedidos por estado de entrega', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')
      await user.click(screen.getByRole('button', { name: /Pedidos/i }))

      await user.type(screen.getByPlaceholderText(/codigo, cliente, direccion/i), 'Entregado')

      expect(screen.getByText('Pedido #PE-202-A')).toBeInTheDocument()
      expect(screen.queryByText('Pedido #PE-101-A')).not.toBeInTheDocument()
      expect(screen.queryByText('Pedido #PE-101-B')).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  describe('Filtro por fecha', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock, rutaSegundaMock]))

    it('filtra rutas por fecha seleccionada', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      await user.type(screen.getByLabelText(/fecha/i), '2026-04-22')

      expect(screen.queryByText('Ruta mock #101')).not.toBeInTheDocument()
      expect(screen.getByText('Ruta mock #202')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  describe('Filtro por repartidor (select)', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock, rutaSegundaMock]))

    it('el select de repartidor incluye a todos los repartidores cargados', async () => {
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      const select = screen.getByRole('combobox')
      expect(within(select).getByRole('option', { name: 'Todos' })).toBeInTheDocument()
      expect(within(select).getByRole('option', { name: 'Ana' })).toBeInTheDocument()
      expect(within(select).getByRole('option', { name: 'Carlos' })).toBeInTheDocument()
    })

    it('filtra rutas al seleccionar un repartidor específico', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      await user.selectOptions(screen.getByRole('combobox'), 'Ana')

      expect(screen.getByText('Ruta mock #101')).toBeInTheDocument()
      expect(screen.queryByText('Ruta mock #202')).not.toBeInTheDocument()
      expect(screen.getByText('1 rutas encontrados')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  describe('Selección de ruta → modo pedidos', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock]))

    it('al seleccionar ruta cambia a modo pedidos', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await user.click(await screen.findByRole('button', { name: 'Ruta mock #101' }))

      await waitFor(() => {
        expect(screen.getByText('2 pedidos encontrados')).toBeInTheDocument()
      })
    })

    it('muestra todos los pedidos de la ruta seleccionada', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await user.click(await screen.findByRole('button', { name: 'Ruta mock #101' }))

      await screen.findByText('Pedido #PE-101-A')
      expect(screen.getByText('Pedido #PE-101-B')).toBeInTheDocument()
    })

    it('muestra el botón "Limpiar filtros" cuando hay ruta seleccionada', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await user.click(await screen.findByRole('button', { name: 'Ruta mock #101' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Limpiar filtros/i })).toBeInTheDocument()
      })
    })

    it('al volver a rutas y seleccionar la misma ruta deselecciona y oculta el botón limpiar', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      const botonRuta = await screen.findByRole('button', { name: 'Ruta mock #101' })

      // Primer click: selecciona la ruta, aparece limpiar filtros
      await user.click(botonRuta)
      await screen.findByText('2 pedidos encontrados')
      expect(screen.getByRole('button', { name: /Limpiar filtros/i })).toBeInTheDocument()

      // Volver a rutas para interactuar de nuevo con la tarjeta de la ruta
      await user.click(screen.getByRole('button', { name: /^Rutas$/i }))
      await screen.findByRole('button', { name: 'Ruta mock #101' })

      // Segundo click sobre la misma ruta: deselecciona y desaparece limpiar filtros
      await user.click(screen.getByRole('button', { name: 'Ruta mock #101' }))

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Limpiar filtros/i })).not.toBeInTheDocument()
      })
    })

    it('los pedidos muestran la información correcta de cliente y dirección', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await user.click(await screen.findByRole('button', { name: 'Ruta mock #101' }))

      await screen.findByText('Cliente A')
      expect(screen.getByText('Calle 1')).toBeInTheDocument()
      expect(screen.getByText('Cliente B')).toBeInTheDocument()
      expect(screen.getByText('Calle 2')).toBeInTheDocument()
    })

    it('los pedidos muestran el nombre del repartidor', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await user.click(await screen.findByRole('button', { name: 'Ruta mock #101' }))

      await screen.findByText('Pedido #PE-101-A')

      const tarjetasAna = screen.getAllByText('Ana')
      expect(tarjetasAna.length).toBeGreaterThanOrEqual(1)
    })
  })

  // -------------------------------------------------------------------------
  describe('Selección de pedido → modo rutas', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock, rutaSegundaMock]))

    it('al hacer click en un pedido cambia a modo rutas mostrando sólo su ruta', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      // Ir a modo pedidos
      await screen.findByText('Ruta mock #101')
      await user.click(screen.getByRole('button', { name: /Pedidos/i }))
      await screen.findByText('Pedido #PE-101-A')

      // Seleccionar pedido
      await user.click(screen.getByText('Pedido #PE-101-A').closest('article')!)

      await waitFor(() => {
        expect(screen.getByText('1 rutas encontrados')).toBeInTheDocument()
      })
      expect(screen.getByText('Ruta mock #101')).toBeInTheDocument()
      expect(screen.queryByText('Ruta mock #202')).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  describe('Botón "Limpiar filtros"', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock, rutaSegundaMock]))

    it('no se muestra sin filtros activos', async () => {
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      expect(screen.queryByRole('button', { name: /Limpiar filtros/i })).not.toBeInTheDocument()
    })

    it('aparece al escribir en el buscador', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')
      await user.type(screen.getByPlaceholderText(/cliente, codigo, repartidor/i), 'Ana')

      expect(screen.getByRole('button', { name: /Limpiar filtros/i })).toBeInTheDocument()
    })

    it('limpiar reinicia la búsqueda y muestra todas las rutas', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')
      await user.type(screen.getByPlaceholderText(/cliente, codigo, repartidor/i), 'Carlos')

      expect(screen.getByText('1 rutas encontrados')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Limpiar filtros/i }))

      await waitFor(() => {
        expect(screen.getByText('2 rutas encontrados')).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: /Limpiar filtros/i })).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  describe('Cambio de vista Grid / Lista', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock]))

    it('botones de vista están presentes en la UI', async () => {
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      expect(screen.getByRole('button', { name: /Grid/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Lista/i })).toBeInTheDocument()
    })

    it('al cambiar a vista lista el contenedor recibe la clase --lista', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      await user.click(screen.getByRole('button', { name: /Lista/i }))

      const contenedor = document.querySelector('.historialRutas__lista')
      expect(contenedor?.classList.contains('historialRutas__lista--lista')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  describe('Botón Recargar', () => {
    it('llama a fetch de nuevo al hacer click en Recargar', async () => {
      mockFetchOk([rutaBaseMock])
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      const fetchMock = vi.mocked(fetch)
      const llamadasAntes = fetchMock.mock.calls.length

      await user.click(screen.getByRole('button', { name: /Recargar/i }))

      await waitFor(() => {
        expect(fetchMock.mock.calls.length).toBeGreaterThan(llamadasAntes)
      })
    })
  })

  // -------------------------------------------------------------------------
  describe('Switch de modo Rutas / Pedidos', () => {
    beforeEach(() => mockFetchOk([rutaBaseMock]))

    it('comienza en modo rutas por defecto', async () => {
      render(<HistorialRutasApp />)

      await screen.findByText('1 rutas encontrados')

      const botonRutas = screen.getByRole('button', { name: /Rutas/i })
      expect(botonRutas.className).toContain('--activo')
    })

    it('cambia el placeholder del buscador según el modo activo', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')

      expect(screen.getByPlaceholderText(/cliente, codigo, repartidor/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Pedidos/i }))

      expect(screen.getByPlaceholderText(/codigo, cliente, direccion/i)).toBeInTheDocument()
    })

    it('cambia la descripción del encabezado según el modo activo', async () => {
      const user = userEvent.setup()
      render(<HistorialRutasApp />)

      await screen.findByText('Ruta mock #101')
      expect(screen.getByText(/Listado completo de rutas registradas/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Pedidos/i }))

      expect(screen.getByText(/Listado completo de pedidos registrados/i)).toBeInTheDocument()
    })
  })
})