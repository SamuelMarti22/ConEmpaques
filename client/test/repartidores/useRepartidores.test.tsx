import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRepartidores, type Repartidor } from '../../src/apps/repartidores/useRepartidores'

function responseMock(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('useRepartidores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('carga repartidores ordenados por id y limpia el error', async () => {
    const repartidoresDesordenados: Repartidor[] = [
      {
        id: 3,
        nombre: 'Ana',
        email: 'ana@test.com',
        capacidadVehiculo: 20,
        rol: 'REPARTIDOR',
        createdAt: '2026-04-21T10:00:00.000Z',
      },
      {
        id: 1,
        nombre: 'Carlos',
        email: 'carlos@test.com',
        capacidadVehiculo: 30,
        rol: 'REPARTIDOR',
        createdAt: '2026-04-21T09:00:00.000Z',
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce(responseMock(repartidoresDesordenados))

    const { result } = renderHook(() => useRepartidores())

    await act(async () => {
      await result.current.cargarRepartidores()
    })

    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/repartidores$/))
    expect(result.current.repartidores.map((repartidor) => repartidor.id)).toEqual([1, 3])
    expect(result.current.error).toBeNull()
    expect(result.current.cargando).toBe(false)
  })

  it('conserva error y finaliza carga cuando fetch responde error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudieron cargar' }, { ok: false, status: 503, statusText: 'Unavailable' }),
    )

    const { result } = renderHook(() => useRepartidores())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.error).toBe('No se pudieron cargar')
    expect(result.current.cargando).toBe(false)
  })

  it('crearRepartidor agrega el repartidor y desactiva procesando', async () => {
    const nuevoRepartidor: Repartidor = {
      id: 2,
      nombre: 'Laura',
      email: 'laura@test.com',
      capacidadVehiculo: 25,
      rol: 'REPARTIDOR',
      createdAt: '2026-04-21T11:00:00.000Z',
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock([{ ...nuevoRepartidor, id: 1 }]))
      .mockResolvedValueOnce(responseMock([{ ...nuevoRepartidor, id: 1 }]))
      .mockResolvedValueOnce(responseMock({ data: nuevoRepartidor }))

    const { result } = renderHook(() => useRepartidores())

    await act(async () => {
      await result.current.cargarRepartidores()
      await result.current.crearRepartidor({
        nombre: 'Laura',
        email: 'laura@test.com',
        password: 'secret',
        capacidadVehiculo: 25,
      })
    })

    expect(result.current.repartidores.map((repartidor) => repartidor.id)).toEqual([1, 2])
    expect(result.current.error).toBeNull()
    expect(result.current.procesando).toBe(false)
  })

  it('crearRepartidor lanza error y limpia procesando', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock([{ id: 1, nombre: 'Carlos', email: 'carlos@test.com', capacidadVehiculo: 30, rol: 'REPARTIDOR', createdAt: '2026-04-21T10:00:00.000Z' }]))
      .mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudo crear' }, { ok: false, status: 400, statusText: 'Bad Request' }),
    )

    const { result } = renderHook(() => useRepartidores())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.crearRepartidor({
          nombre: 'Laura',
          email: 'laura@test.com',
          password: 'secret',
          capacidadVehiculo: 25,
        })
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect((errorCapturado as Error).message).toBe('No se pudo crear')
    expect(result.current.procesando).toBe(false)
  })

  it('actualizarRepartidor reemplaza el registro por id', async () => {
    const inicial: Repartidor = {
      id: 1,
      nombre: 'Carlos',
      email: 'carlos@test.com',
      capacidadVehiculo: 30,
      rol: 'REPARTIDOR',
      createdAt: '2026-04-21T10:00:00.000Z',
    }
    const actualizado: Repartidor = {
      id: 1,
      nombre: 'Carlos Nuevo',
      email: 'carlos.nuevo@test.com',
      capacidadVehiculo: 35,
      rol: 'REPARTIDOR',
      createdAt: '2026-04-21T10:00:00.000Z',
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock([inicial]))
      .mockResolvedValueOnce(responseMock([inicial]))
      .mockResolvedValueOnce(responseMock({ data: actualizado }))

    const { result } = renderHook(() => useRepartidores())

    await act(async () => {
      await result.current.cargarRepartidores()
      await result.current.actualizarRepartidor(1, {
        nombre: 'Carlos Nuevo',
        email: 'carlos.nuevo@test.com',
        capacidadVehiculo: 35,
      })
    })

    expect(result.current.repartidores[0]).toEqual(actualizado)
    expect(result.current.error).toBeNull()
    expect(result.current.procesando).toBe(false)
  })

  it('actualizarRepartidor lanza error y finaliza procesando', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock([{ id: 1, nombre: 'Carlos', email: 'carlos@test.com', capacidadVehiculo: 30, rol: 'REPARTIDOR', createdAt: '2026-04-21T10:00:00.000Z' }]))
      .mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudo actualizar' }, { ok: false, status: 409, statusText: 'Conflict' }),
    )

    const { result } = renderHook(() => useRepartidores())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.actualizarRepartidor(1, { nombre: 'Carlos Nuevo' })
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect((errorCapturado as Error).message).toBe('No se pudo actualizar')
    expect(result.current.procesando).toBe(false)
  })

  it('eliminarRepartidor quita el registro del estado local', async () => {
    const inicial: Repartidor[] = [
      {
        id: 1,
        nombre: 'Carlos',
        email: 'carlos@test.com',
        capacidadVehiculo: 30,
        rol: 'REPARTIDOR',
        createdAt: '2026-04-21T10:00:00.000Z',
      },
      {
        id: 2,
        nombre: 'Laura',
        email: 'laura@test.com',
        capacidadVehiculo: 25,
        rol: 'REPARTIDOR',
        createdAt: '2026-04-21T11:00:00.000Z',
      },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock(inicial))
      .mockResolvedValueOnce(responseMock(inicial))
      .mockResolvedValueOnce(responseMock(undefined))

    const { result } = renderHook(() => useRepartidores())

    await act(async () => {
      await result.current.cargarRepartidores()
      await result.current.eliminarRepartidor(1)
    })

    expect(result.current.repartidores.map((repartidor) => repartidor.id)).toEqual([2])
    expect(result.current.error).toBeNull()
    expect(result.current.procesando).toBe(false)
  })

  it('eliminarRepartidor lanza error y finaliza procesando', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock([{ id: 1, nombre: 'Carlos', email: 'carlos@test.com', capacidadVehiculo: 30, rol: 'REPARTIDOR', createdAt: '2026-04-21T10:00:00.000Z' }]))
      .mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudo eliminar' }, { ok: false, status: 404, statusText: 'Not Found' }),
    )

    const { result } = renderHook(() => useRepartidores())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.eliminarRepartidor(999)
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect((errorCapturado as Error).message).toBe('No se pudo eliminar')
    expect(result.current.procesando).toBe(false)
  })
})
