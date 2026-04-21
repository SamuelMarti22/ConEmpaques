import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisionCliente from '../../src/apps/visionClientes/VisionCliente.app'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()

type MockUsuarioCliente = {
  nombre: string
  codigoEntrega: string
  rutaId: number
  estadoEntrega: string | undefined
  rol: 'cliente'
}

const mockAuthState = vi.hoisted(() => ({
  usuario: {
    nombre: 'Paula',
    codigoEntrega: 'PE-123',
    rutaId: 50,
    estadoEntrega: 'EN_ENTREGA' as string | undefined,
    rol: 'cliente' as const,
  } as MockUsuarioCliente | null,
}))

vi.mock('../../src/authContext/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout,
    usuario: mockAuthState.usuario,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('VisionCliente module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState.usuario = {
      nombre: 'Paula',
      codigoEntrega: 'PE-123',
      rutaId: 50,
      estadoEntrega: 'EN_ENTREGA',
      rol: 'cliente',
    }
  })

  it('normaliza EN_ENTREGA como En camino y muestra el estado', () => {
    render(<VisionCliente />)

    expect(
      screen.getByText('Hola Paula, aqui va tu pedido en tiempo real.')
    ).toBeInTheDocument()

    expect(
      screen.getByText('En camino', { selector: 'strong' })
    ).toBeInTheDocument()

    expect(screen.getByText('PE-123')).toBeInTheDocument()
  })

  it('muestra el progreso completo cuando el pedido está entregado', () => {
    mockAuthState.usuario = {
      nombre: 'Paula',
      codigoEntrega: 'PE-123',
      rutaId: 50,
      estadoEntrega: 'ENTREGADO',
      rol: 'cliente',
    }

    render(<VisionCliente />)

    expect(screen.getByText('Entregado', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('4', { selector: '.clienteTrack__nodo--actual' })).toBeInTheDocument()
  })

  it('muestra estado pendiente con el paso activo correcto', () => {
    mockAuthState.usuario = {
      nombre: 'Paula',
      codigoEntrega: 'PE-123',
      rutaId: 50,
      estadoEntrega: 'PENDIENTE',
      rol: 'cliente',
    }

    render(<VisionCliente />)

    expect(screen.getByText('Pendiente', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('2', { selector: '.clienteTrack__nodo--actual' })).toBeInTheDocument()
  })

  it('muestra estado fallido con estilos de error', () => {
    mockAuthState.usuario = {
      nombre: 'Paula',
      codigoEntrega: 'PE-123',
      rutaId: 50,
      estadoEntrega: 'FALLIDO',
      rol: 'cliente',
    }

    render(<VisionCliente />)

    expect(screen.getByText('Fallido', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('4', { selector: '.clienteTrack__nodo--actual' })).toBeInTheDocument()
    expect(screen.getByText('Fallido', { selector: '.clienteTrack__estado--fallido' })).toBeInTheDocument()
  })

  it('muestra estado base y nombre genérico cuando no hay usuario', () => {
    mockAuthState.usuario = null

    render(<VisionCliente />)

    expect(screen.getByText('Hola cliente, aqui va tu pedido en tiempo real.')).toBeInTheDocument()
    expect(screen.getByText('En bodega', { selector: 'strong' })).toBeInTheDocument()
  })

  it('cierra sesion y navega a login', async () => {
    const user = userEvent.setup()
    render(<VisionCliente />)

    await user.click(screen.getByRole('button', { name: 'Salir' }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})