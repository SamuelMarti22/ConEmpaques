import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHorariosRepartidor, type HorarioRepartidor } from '../../src/apps/horarios/useHorariosRepartidor'

function responseMock(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('useHorariosRepartidor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('cargarHorarios ordena por diaSemana, horaInicio e id', async () => {
    const desordenados: HorarioRepartidor[] = [
      { id: 3, usuarioId: 10, diaSemana: 2, horaInicio: '09:00', horaFin: '12:00', activo: true },
      { id: 2, usuarioId: 10, diaSemana: 1, horaInicio: '10:00', horaFin: '12:00', activo: true },
      { id: 1, usuarioId: 10, diaSemana: 1, horaInicio: '08:00', horaFin: '10:00', activo: true },
    ]

    vi.mocked(fetch).mockResolvedValueOnce(responseMock(desordenados))

    const { result } = renderHook(() => useHorariosRepartidor())

    await act(async () => {
      await result.current.cargarHorarios(10)
    })

    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/10\/horarios$/))
    expect(result.current.horarios.map((h) => h.id)).toEqual([1, 2, 3])
    expect(result.current.errorHorarios).toBeNull()
    expect(result.current.cargandoHorarios).toBe(false)
  })

  it('cargarHorarios guarda error y relanza cuando la API responde error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      responseMock({ mensaje: 'Servicio de horarios no disponible' }, { ok: false, status: 503, statusText: 'Unavailable' }),
    )

    const { result } = renderHook(() => useHorariosRepartidor())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.cargarHorarios(10)
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect(errorCapturado).toBeInstanceOf(Error)
    expect((errorCapturado as Error).message).toBe('Servicio de horarios no disponible')
    expect(result.current.errorHorarios).toBe('Servicio de horarios no disponible')
    expect(result.current.cargandoHorarios).toBe(false)
  })

  it('crearHorario agrega la franja y resetea error', async () => {
    const cargados: HorarioRepartidor[] = [
      { id: 5, usuarioId: 10, diaSemana: 3, horaInicio: '11:00', horaFin: '14:00', activo: true },
    ]
    const creado: HorarioRepartidor = {
      id: 4,
      usuarioId: 10,
      diaSemana: 1,
      horaInicio: '08:00',
      horaFin: '12:00',
      activo: true,
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock({ mensaje: 'fallo' }, { ok: false, status: 500, statusText: 'Error' }))
      .mockResolvedValueOnce(responseMock(cargados))
      .mockResolvedValueOnce(responseMock({ data: creado }))

    const { result } = renderHook(() => useHorariosRepartidor())

    await act(async () => {
      try {
        await result.current.cargarHorarios(10)
      } catch {
        // Forzar error previo para verificar limpieza posterior
      }
      await result.current.cargarHorarios(10)
      await result.current.crearHorario(10, {
        diaSemana: 1,
        horaInicio: '08:00',
        horaFin: '12:00',
        activo: true,
      })
    })

    expect(result.current.horarios.map((h) => h.id)).toEqual([4, 5])
    expect(result.current.errorHorarios).toBeNull()
    expect(result.current.procesandoHorarios).toBe(false)
  })

  it('crearHorario lanza error y desactiva estado de procesamiento', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudo crear' }, { ok: false, status: 400, statusText: 'Bad Request' }),
    )

    const { result } = renderHook(() => useHorariosRepartidor())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.crearHorario(10, {
          diaSemana: 1,
          horaInicio: '08:00',
          horaFin: '12:00',
          activo: true,
        })
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect((errorCapturado as Error).message).toBe('No se pudo crear')
    expect(result.current.procesandoHorarios).toBe(false)
  })

  it('actualizarHorario reemplaza la franja existente por id', async () => {
    const inicial: HorarioRepartidor[] = [
      { id: 1, usuarioId: 10, diaSemana: 1, horaInicio: '08:00', horaFin: '12:00', activo: true },
      { id: 2, usuarioId: 10, diaSemana: 2, horaInicio: '09:00', horaFin: '13:00', activo: true },
    ]
    const actualizado: HorarioRepartidor = {
      id: 2,
      usuarioId: 10,
      diaSemana: 2,
      horaInicio: '10:00',
      horaFin: '14:00',
      activo: false,
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock(inicial))
      .mockResolvedValueOnce(responseMock({ data: actualizado }))

    const { result } = renderHook(() => useHorariosRepartidor())

    await act(async () => {
      await result.current.cargarHorarios(10)
      await result.current.actualizarHorario(10, 2, { activo: false, horaInicio: '10:00', horaFin: '14:00' })
    })

    expect(result.current.horarios.find((h) => h.id === 2)).toEqual(actualizado)
    expect(result.current.errorHorarios).toBeNull()
    expect(result.current.procesandoHorarios).toBe(false)
  })

  it('actualizarHorario lanza error y conserva procesandoHorarios en false al finalizar', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudo actualizar' }, { ok: false, status: 409, statusText: 'Conflict' }),
    )

    const { result } = renderHook(() => useHorariosRepartidor())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.actualizarHorario(10, 1, { activo: false })
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect((errorCapturado as Error).message).toBe('No se pudo actualizar')
    expect(result.current.procesandoHorarios).toBe(false)
  })

  it('eliminarHorario remueve la franja del estado local', async () => {
    const inicial: HorarioRepartidor[] = [
      { id: 1, usuarioId: 10, diaSemana: 1, horaInicio: '08:00', horaFin: '12:00', activo: true },
      { id: 2, usuarioId: 10, diaSemana: 2, horaInicio: '09:00', horaFin: '13:00', activo: true },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock(inicial))
      .mockResolvedValueOnce(responseMock({ ok: true }))

    const { result } = renderHook(() => useHorariosRepartidor())

    await act(async () => {
      await result.current.cargarHorarios(10)
      await result.current.eliminarHorario(10, 1)
    })

    expect(result.current.horarios.map((h) => h.id)).toEqual([2])
    expect(result.current.errorHorarios).toBeNull()
    expect(result.current.procesandoHorarios).toBe(false)
  })

  it('eliminarHorario lanza error y deja procesandoHorarios en false', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      responseMock({ mensaje: 'No se pudo eliminar' }, { ok: false, status: 404, statusText: 'Not Found' }),
    )

    const { result } = renderHook(() => useHorariosRepartidor())

    let errorCapturado: unknown = null

    await act(async () => {
      try {
        await result.current.eliminarHorario(10, 999)
      } catch (errorOperacion) {
        errorCapturado = errorOperacion
      }
    })

    expect((errorCapturado as Error).message).toBe('No se pudo eliminar')
    expect(result.current.procesandoHorarios).toBe(false)
  })

  it('limpiarHorarios restablece el estado inicial', async () => {
    const cargados: HorarioRepartidor[] = [
      { id: 1, usuarioId: 10, diaSemana: 1, horaInicio: '08:00', horaFin: '12:00', activo: true },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce(responseMock({ mensaje: 'fallo' }, { ok: false, status: 500, statusText: 'Error' }))
      .mockResolvedValueOnce(responseMock(cargados))

    const { result } = renderHook(() => useHorariosRepartidor())

    await act(async () => {
      try {
        await result.current.cargarHorarios(10)
      } catch {
        // Intencional para dejar error y luego limpiar
      }
      await result.current.cargarHorarios(10)
    })

    expect(result.current.horarios.length).toBe(1)
    expect(result.current.errorHorarios).toBeNull()

    act(() => {
      result.current.limpiarHorarios()
    })

    expect(result.current.horarios).toEqual([])
    expect(result.current.errorHorarios).toBeNull()
    expect(result.current.cargandoHorarios).toBe(false)
    expect(result.current.procesandoHorarios).toBe(false)
  })
})
