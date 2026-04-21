import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HorariosRepartidorApp from '../../src/apps/horarios/HorariosRepartidor.app'
import type { HorarioRepartidor } from '../../src/apps/horarios/useHorariosRepartidor'

const { mockSwalFire } = vi.hoisted(() => ({
  mockSwalFire: vi.fn(),
}))

const { mockSwalShowValidationMessage } = vi.hoisted(() => ({
  mockSwalShowValidationMessage: vi.fn(),
}))

vi.mock('sweetalert2', () => ({
  default: {
    fire: mockSwalFire,
    showValidationMessage: mockSwalShowValidationMessage,
  },
}))

const horarioLunesMock: HorarioRepartidor = {
  id: 1,
  usuarioId: 10,
  diaSemana: 1,
  horaInicio: '08:00',
  horaFin: '12:00',
  activo: true,
}

const horarioMiercolesInactivoMock: HorarioRepartidor = {
  id: 2,
  usuarioId: 10,
  diaSemana: 3,
  horaInicio: '14:00',
  horaFin: '18:00',
  activo: false,
}

const repartidorLauraMock = {
  id: 10,
  nombre: 'Laura',
  email: 'laura@test.com',
  capacidadVehiculo: 20,
  rol: 'REPARTIDOR' as const,
  createdAt: '2026-04-21T10:00:00.000Z',
}

const repartidorMarioMock = {
  id: 11,
  nombre: 'Mario',
  email: 'mario@test.com',
  capacidadVehiculo: 15,
  rol: 'REPARTIDOR' as const,
  createdAt: '2026-04-21T10:00:00.000Z',
}

const mockHook = {
  horarios: [horarioLunesMock] as HorarioRepartidor[],
  cargandoHorarios: false,
  procesandoHorarios: false,
  errorHorarios: null as string | null,
  cargarHorarios: vi.fn().mockResolvedValue(undefined),
  crearHorario: vi.fn().mockResolvedValue(horarioLunesMock),
  actualizarHorario: vi.fn().mockResolvedValue({ ...horarioLunesMock, activo: false }),
  eliminarHorario: vi.fn().mockResolvedValue(undefined),
  limpiarHorarios: vi.fn(),
}

vi.mock('../../src/apps/horarios/useHorariosRepartidor', () => ({
  useHorariosRepartidor: () => mockHook,
}))

function renderApp(props?: { repartidor?: typeof repartidorLauraMock; onVolver?: () => void }) {
  const onVolver = props?.onVolver ?? vi.fn()
  const repartidor = props?.repartidor ?? repartidorLauraMock

  render(<HorariosRepartidorApp repartidor={repartidor} onVolver={onVolver} />)

  return { onVolver }
}

async function abrirDialogoNuevoHorario() {
  const user = userEvent.setup()
  renderApp()

  await user.click(screen.getByRole('button', { name: '+ Nuevo horario' }))

  return mockSwalFire.mock.calls[0][0] as {
    preConfirm: () => { diaSemana: number; horaInicio: string; horaFin: string; activo: boolean } | false
  }
}

function cargarCamposHorario(campos: { diaSemana: string; horaInicio: string; horaFin: string; activo: boolean }) {
  document.body.innerHTML = `
    <select id="swal-dia"><option value="${campos.diaSemana}" selected>${campos.diaSemana}</option></select>
    <input id="swal-hora-inicio" value="${campos.horaInicio}" />
    <input id="swal-hora-fin" value="${campos.horaFin}" />
    <input id="swal-activo" type="checkbox" ${campos.activo ? 'checked' : ''} />
  `
}

describe('HorariosRepartidor — módulo completo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHook.horarios = [horarioLunesMock]
    mockHook.cargandoHorarios = false
    mockHook.procesandoHorarios = false
    mockHook.errorHorarios = null
    mockHook.cargarHorarios.mockResolvedValue(undefined)
    mockHook.crearHorario.mockResolvedValue(horarioLunesMock)
    mockHook.actualizarHorario.mockResolvedValue({ ...horarioLunesMock, activo: false })
    mockHook.eliminarHorario.mockResolvedValue(undefined)
    mockSwalShowValidationMessage.mockReset()
    mockSwalFire.mockResolvedValue({ isConfirmed: false, value: undefined })
  })

  it('llama a cargarHorarios con el id del repartidor al montar', async () => {
    renderApp()

    await waitFor(() => {
      expect(mockHook.cargarHorarios).toHaveBeenCalledWith(repartidorLauraMock.id)
    })
  })

  it('muestra el nombre del repartidor correcto cuando cambia el prop', () => {
    renderApp({ repartidor: repartidorMarioMock })
    expect(screen.getByRole('heading', { name: 'Horarios de Mario' })).toBeInTheDocument()
  })

  it('muestra carga, vacío y banner de error', () => {
    const { rerender } = render(<HorariosRepartidorApp repartidor={repartidorLauraMock} onVolver={vi.fn()} />)

    mockHook.cargandoHorarios = true
    mockHook.horarios = []
    rerender(<HorariosRepartidorApp repartidor={repartidorLauraMock} onVolver={vi.fn()} />)
    expect(screen.getByText('Cargando horarios...')).toBeInTheDocument()

    mockHook.cargandoHorarios = false
    mockHook.horarios = []
    rerender(<HorariosRepartidorApp repartidor={repartidorLauraMock} onVolver={vi.fn()} />)
    expect(screen.getByText('Este repartidor no tiene horarios registrados.')).toBeInTheDocument()

    mockHook.errorHorarios = 'Servicio no disponible'
    rerender(<HorariosRepartidorApp repartidor={repartidorLauraMock} onVolver={vi.fn()} />)
    expect(screen.getByText('Servicio no disponible')).toBeInTheDocument()
  })

  it('llama a limpiarHorarios al desmontar el componente', () => {
    const { unmount } = render(<HorariosRepartidorApp repartidor={repartidorLauraMock} onVolver={vi.fn()} />)
    unmount()
    expect(mockHook.limpiarHorarios).toHaveBeenCalledTimes(1)
  })

  it('muestra el nombre correcto del día para cada valor diaSemana', () => {
    const diasEsperados = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    diasEsperados.forEach((nombreDia, indice) => {
      mockHook.horarios = [{ ...horarioLunesMock, id: indice, diaSemana: indice }]
      const { unmount } = render(<HorariosRepartidorApp repartidor={repartidorLauraMock} onVolver={vi.fn()} />)
      expect(screen.getByText(nombreDia)).toBeInTheDocument()
      unmount()
    })
  })

  it('abre el diálogo de Swal al hacer click', async () => {
    await abrirDialogoNuevoHorario()

    expect(mockSwalFire).toHaveBeenCalledWith(
      expect.objectContaining({ title: `Nuevo horario para ${repartidorLauraMock.nombre}` }),
    )
  })

  it('valida los campos del nuevo horario y retorna payload válido', async () => {
    const config = await abrirDialogoNuevoHorario()

    cargarCamposHorario({ diaSemana: '9', horaInicio: '08:00', horaFin: '12:00', activo: true })
    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('Selecciona un día de semana válido')

    mockSwalShowValidationMessage.mockReset()
    cargarCamposHorario({ diaSemana: '1', horaInicio: '', horaFin: '12:00', activo: true })
    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('Las horas de inicio y fin son obligatorias')

    mockSwalShowValidationMessage.mockReset()
    cargarCamposHorario({ diaSemana: '1', horaInicio: '12:00', horaFin: '12:00', activo: true })
    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('La hora de inicio debe ser menor que la hora de fin')

    mockSwalShowValidationMessage.mockReset()
    mockHook.horarios = [horarioLunesMock]
    cargarCamposHorario({ diaSemana: '1', horaInicio: '11:00', horaFin: '13:00', activo: true })
    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith(
      'La franja se solapa con otro horario ya registrado para ese día',
    )

    mockSwalShowValidationMessage.mockReset()
    cargarCamposHorario({ diaSemana: '1', horaInicio: '12:00', horaFin: '14:00', activo: false })
    expect(config.preConfirm()).toEqual({
      diaSemana: 1,
      horaInicio: '12:00',
      horaFin: '14:00',
      activo: false,
    })
  })

  it('crea, cancela y falla al crear horario', async () => {
    const user = userEvent.setup()
    const nuevoHorario = { diaSemana: 2, horaInicio: '09:00', horaFin: '13:00', activo: true }

    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false, value: undefined })
    renderApp()
    await user.click(screen.getAllByRole('button', { name: '+ Nuevo horario' }).at(-1)!)
    expect(mockHook.crearHorario).not.toHaveBeenCalled()

    cleanup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true, value: nuevoHorario }).mockResolvedValueOnce({ isConfirmed: true })
    renderApp()
    await user.click(screen.getAllByRole('button', { name: '+ Nuevo horario' }).at(-1)!)
    await waitFor(() => {
      expect(mockHook.crearHorario).toHaveBeenCalledWith(repartidorLauraMock.id, nuevoHorario)
    })

    cleanup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true, value: nuevoHorario })
    mockHook.crearHorario.mockRejectedValueOnce(new Error('Error al crear'))
    renderApp()
    await user.click(screen.getAllByRole('button', { name: '+ Nuevo horario' }).at(-1)!)
    await waitFor(() => {
      expect(mockSwalFire).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'No se pudo crear el horario' }),
      )
    })
  })

  it('alterna y elimina horarios', async () => {
    const user = userEvent.setup()

    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Inactivar' }).at(-1)!)
    expect(mockHook.actualizarHorario).toHaveBeenCalledWith(repartidorLauraMock.id, horarioLunesMock.id, { activo: false })

    cleanup()
    mockHook.horarios = [horarioMiercolesInactivoMock]
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Activar' }).at(-1)!)
    expect(mockHook.actualizarHorario).toHaveBeenCalledWith(
      repartidorLauraMock.id,
      horarioMiercolesInactivoMock.id,
      { activo: true },
    )

    cleanup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false })
    cleanup()
    mockHook.horarios = [horarioLunesMock]
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Eliminar' }).at(-1)!)
    expect(mockHook.eliminarHorario).not.toHaveBeenCalled()

    cleanup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true }).mockResolvedValueOnce({ isConfirmed: true })
    mockHook.horarios = [horarioLunesMock]
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Eliminar' }).at(-1)!)
    await waitFor(() => {
      expect(mockHook.eliminarHorario).toHaveBeenCalledWith(repartidorLauraMock.id, horarioLunesMock.id)
    })
  })
})
