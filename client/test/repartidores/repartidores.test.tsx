import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RepartidoresApp from '../../src/apps/repartidores/Repartidores.app'

const mockUseRepartidores = {
  repartidores: [
    {
      id: 1,
      nombre: 'Carlos',
      email: 'carlos@test.com',
      capacidadVehiculo: 30,
      rol: 'REPARTIDOR' as const,
      createdAt: '2026-04-21T10:00:00.000Z',
    },
  ],
  cargando: false,
  procesando: false,
  error: null as string | null,
  crearRepartidor: vi.fn(),
  actualizarRepartidor: vi.fn(),
  eliminarRepartidor: vi.fn(),
}

const { mockSwalFire } = vi.hoisted(() => ({
  mockSwalFire: vi.fn(),
}))

const { mockSwalShowValidationMessage } = vi.hoisted(() => ({
  mockSwalShowValidationMessage: vi.fn(),
}))

vi.mock('../../src/apps/repartidores/useRepartidores', () => ({
  useRepartidores: () => mockUseRepartidores,
}))

vi.mock('sweetalert2', () => ({
  default: {
    fire: mockSwalFire,
    showValidationMessage: mockSwalShowValidationMessage,
  },
}))

async function abrirDialogoRepartidor(accion: 'nuevo' | 'editar') {
  const user = userEvent.setup()
  render(<RepartidoresApp />)

  await user.click(screen.getByRole('button', { name: accion === 'nuevo' ? '+ Nuevo repartidor' : 'Editar' }))

  return mockSwalFire.mock.calls[0][0] as { preConfirm: () => unknown }
}

function cargarCamposSwal(campos: { nombre: string; email: string; password: string; capacidadVehiculo: string }) {
  document.body.innerHTML = `
    <input id="swal-nombre" value="${campos.nombre}" />
    <input id="swal-email" value="${campos.email}" />
    <input id="swal-password" value="${campos.password}" />
    <input id="swal-capacidad" value="${campos.capacidadVehiculo}" />
  `
}

describe('Repartidores module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRepartidores.repartidores = [
      {
        id: 1,
        nombre: 'Carlos',
        email: 'carlos@test.com',
        capacidadVehiculo: 30,
        rol: 'REPARTIDOR' as const,
        createdAt: '2026-04-21T10:00:00.000Z',
      },
    ]
    mockUseRepartidores.cargando = false
    mockUseRepartidores.procesando = false
    mockUseRepartidores.error = null
    mockSwalFire.mockReset()
    mockSwalFire.mockResolvedValue({ isConfirmed: false, value: undefined })
    mockSwalShowValidationMessage.mockReset()
  })

  it('renderiza lista de repartidores y acciones por fila', () => {
    render(<RepartidoresApp />)

    expect(screen.getByRole('heading', { name: 'Gestión de repartidores' })).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('carlos@test.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Nuevo repartidor' })).toBeInTheDocument()
  })

  it('muestra el estado de carga cuando cargando es true', () => {
    mockUseRepartidores.cargando = true
    mockUseRepartidores.repartidores = []

    render(<RepartidoresApp />)

    expect(screen.getByText('Cargando repartidores...')).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay repartidores', () => {
    mockUseRepartidores.repartidores = []

    render(<RepartidoresApp />)

    expect(screen.getByText('No hay repartidores registrados.')).toBeInTheDocument()
  })

  it('muestra el banner de error del hook', () => {
    mockUseRepartidores.error = 'Servicio no disponible'

    render(<RepartidoresApp />)

    expect(screen.getByText('Servicio no disponible')).toBeInTheDocument()
  })

  it('deshabilita acciones cuando procesando es true', () => {
    mockUseRepartidores.procesando = true

    render(<RepartidoresApp />)

    expect(screen.getByRole('button', { name: '+ Nuevo repartidor' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Horarios' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
  })

  it('abre el diálogo para registrar repartidor', async () => {
    await abrirDialogoRepartidor('nuevo')

    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Registrar repartidor' }))
  })

  it('valida campos vacíos al registrar repartidor', async () => {
    const config = await abrirDialogoRepartidor('nuevo')

    cargarCamposSwal({ nombre: '', email: '', password: '', capacidadVehiculo: '' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('El nombre es obligatorio')
  })

  it('valida correo repetido al registrar repartidor', async () => {
    const config = await abrirDialogoRepartidor('nuevo')

    cargarCamposSwal({ nombre: 'Nuevo', email: 'carlos@test.com', password: 'secret', capacidadVehiculo: '20' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('Ya existe un repartidor registrado con ese correo')
  })

  it('valida correo vacío al registrar repartidor', async () => {
    const config = await abrirDialogoRepartidor('nuevo')

    cargarCamposSwal({ nombre: 'Nuevo', email: '', password: 'secret', capacidadVehiculo: '20' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('El correo es obligatorio')
  })

  it('valida contraseña vacía al registrar repartidor', async () => {
    const config = await abrirDialogoRepartidor('nuevo')

    cargarCamposSwal({ nombre: 'Nuevo', email: 'nuevo@test.com', password: '', capacidadVehiculo: '20' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('La contraseña es obligatoria')
  })

  it('valida capacidad inválida al registrar repartidor', async () => {
    const config = await abrirDialogoRepartidor('nuevo')

    cargarCamposSwal({ nombre: 'Nuevo', email: 'nuevo@test.com', password: 'secret', capacidadVehiculo: '0' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('La capacidad del vehículo debe ser un entero mayor a 0')
  })

  it('no crea repartidor si el usuario cancela el diálogo', async () => {
    const user = userEvent.setup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false, value: undefined })

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: '+ Nuevo repartidor' }))

    expect(mockUseRepartidores.crearRepartidor).not.toHaveBeenCalled()
  })

  it('crea repartidor y muestra confirmación de éxito', async () => {
    const user = userEvent.setup()
    const nuevoRepartidor = { nombre: 'Ana', email: 'ana@test.com', password: 'secret', capacidadVehiculo: 25 }

    mockSwalFire
      .mockResolvedValueOnce({ isConfirmed: true, value: nuevoRepartidor })
      .mockResolvedValueOnce({ isConfirmed: true })

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: '+ Nuevo repartidor' }))

    await waitFor(() => {
      expect(mockUseRepartidores.crearRepartidor).toHaveBeenCalledWith(nuevoRepartidor)
    })
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success', title: 'Repartidor creado' }))
  })

  it('muestra error si crearRepartidor falla', async () => {
    const user = userEvent.setup()
    const nuevoRepartidor = { nombre: 'Ana', email: 'ana@test.com', password: 'secret', capacidadVehiculo: 25 }

    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true, value: nuevoRepartidor })
    mockUseRepartidores.crearRepartidor.mockRejectedValue(new Error('No se pudo crear'))

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: '+ Nuevo repartidor' }))

    await waitFor(() => {
      expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', title: 'No se pudo crear' }))
    })
  })

  it('permite editar y elimina campos sin cambios', async () => {
    const config = await abrirDialogoRepartidor('editar')

    cargarCamposSwal({ nombre: 'Carlos', email: 'carlos@test.com', password: '', capacidadVehiculo: '30' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('No hay cambios para actualizar')
  })

  it('retorna datos al confirmar cambios en la edición', async () => {
    const config = await abrirDialogoRepartidor('editar')

    cargarCamposSwal({ nombre: 'Carlos Nuevo', email: 'carlos.nuevo@test.com', password: 'secret', capacidadVehiculo: '35' })

    expect(config.preConfirm()).toEqual({
      nombre: 'Carlos Nuevo',
      email: 'carlos.nuevo@test.com',
      password: 'secret',
      capacidadVehiculo: 35,
    })
  })

  it('valida nombre vacío al editar repartidor', async () => {
    const config = await abrirDialogoRepartidor('editar')

    cargarCamposSwal({ nombre: '', email: 'carlos@test.com', password: '', capacidadVehiculo: '30' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('El nombre es obligatorio')
  })

  it('valida correo vacío al editar repartidor', async () => {
    const config = await abrirDialogoRepartidor('editar')

    cargarCamposSwal({ nombre: 'Carlos', email: '', password: '', capacidadVehiculo: '30' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('El correo es obligatorio')
  })

  it('valida correo duplicado al editar repartidor', async () => {
    const user = userEvent.setup()
    mockUseRepartidores.repartidores = [
      ...mockUseRepartidores.repartidores,
      {
        id: 2,
        nombre: 'Laura',
        email: 'laura@test.com',
        capacidadVehiculo: 25,
        rol: 'REPARTIDOR' as const,
        createdAt: '2026-04-21T10:00:00.000Z',
      },
    ]

    render(<RepartidoresApp />)

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    const config = mockSwalFire.mock.calls[0][0] as { preConfirm: () => unknown }

    document.body.innerHTML = `
      <input id="swal-nombre" value="Carlos" />
      <input id="swal-email" value="laura@test.com" />
      <input id="swal-password" value="" />
      <input id="swal-capacidad" value="30" />
    `

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('Ya existe otro repartidor registrado con ese correo')
  })

  it('valida capacidad inválida al editar repartidor', async () => {
    const config = await abrirDialogoRepartidor('editar')

    cargarCamposSwal({ nombre: 'Carlos', email: 'carlos@test.com', password: '', capacidadVehiculo: '-1' })

    expect(config.preConfirm()).toBe(false)
    expect(mockSwalShowValidationMessage).toHaveBeenCalledWith('La capacidad del vehículo debe ser un entero mayor a 0')
  })

  it('no actualiza repartidor si el usuario cancela el diálogo', async () => {
    const user = userEvent.setup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false, value: undefined })

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(mockUseRepartidores.actualizarRepartidor).not.toHaveBeenCalled()
  })

  it('actualiza repartidor y muestra confirmación', async () => {
    const user = userEvent.setup()
    const datosActualizados = { nombre: 'Carlos 2', email: 'carlos2@test.com', capacidadVehiculo: 35 }

    mockSwalFire
      .mockResolvedValueOnce({ isConfirmed: true, value: datosActualizados })
      .mockResolvedValueOnce({ isConfirmed: true })

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    await waitFor(() => {
      expect(mockUseRepartidores.actualizarRepartidor).toHaveBeenCalledWith(1, datosActualizados)
    })
    expect(mockSwalFire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'success', title: 'Repartidor actualizado' }),
    )
  })

  it('elimina repartidor tras confirmar', async () => {
    const user = userEvent.setup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true }).mockResolvedValueOnce({ isConfirmed: true })

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(mockUseRepartidores.eliminarRepartidor).toHaveBeenCalledWith(1)
    })
    expect(mockSwalFire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'success', title: 'Repartidor eliminado' }),
    )
  })

  it('muestra error si actualizarRepartidor falla', async () => {
    const user = userEvent.setup()
    const datosActualizados = { nombre: 'Carlos 2' }

    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true, value: datosActualizados })
    mockUseRepartidores.actualizarRepartidor.mockRejectedValue(new Error('No se pudo actualizar'))

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    await waitFor(() => {
      expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', title: 'No se pudo actualizar' }))
    })
  })

  it('muestra error si eliminarRepartidor falla', async () => {
    const user = userEvent.setup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: true })
    mockUseRepartidores.eliminarRepartidor.mockRejectedValue(new Error('No se pudo eliminar'))

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', title: 'No se pudo eliminar' }))
    })
  })

  it('no elimina repartidor si el usuario cancela', async () => {
    const user = userEvent.setup()
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false })

    render(<RepartidoresApp />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(mockUseRepartidores.eliminarRepartidor).not.toHaveBeenCalled()
  })
})
