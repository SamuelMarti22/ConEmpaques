import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginApp from '../../src/apps/login/Login.app'

const mockNavigate = vi.fn()
const mockAuth = {
  loginLogistico: vi.fn<(...args: [string, string]) => Promise<void>>(),
  loginCliente: vi.fn<(...args: [string]) => Promise<void>>(),
  cargando: false,
  error: null as string | null,
}

vi.mock('../../src/authContext/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Login module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.cargando = false
    mockAuth.error = null
    mockAuth.loginLogistico.mockResolvedValue(undefined)
    mockAuth.loginCliente.mockResolvedValue(undefined)
  })

  it('permite alternar entre cliente y usuario', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Consultar entrega' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Soy usuario' }))
    expect(screen.getByRole('heading', { name: 'Inicia sesion' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Soy cliente' }))
    expect(screen.getByRole('heading', { name: 'Consultar entrega' })).toBeInTheDocument()
  })

  it('muestra estado de carga y error en modo usuario', async () => {
    mockAuth.cargando = true
    mockAuth.error = 'Credenciales bloqueadas'

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Soy usuario' }))

    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Contrasena')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Iniciando...' })).toBeDisabled()
    expect(screen.getByText('Credenciales bloqueadas')).toBeInTheDocument()
  })

  it('valida codigo vacio para cliente', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Ver mi entrega' }))

    expect(screen.getByText('Ingresa un codigo de entrega valido')).toBeInTheDocument()
    expect(mockAuth.loginCliente).not.toHaveBeenCalled()
  })

  it('autentica usuario cliente y navega a /client', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Codigo de entrega'), '  PE-8K2J4M1Q9B  ')
    await user.click(screen.getByRole('button', { name: 'Ver mi entrega' }))

    await waitFor(() => {
      expect(mockAuth.loginCliente).toHaveBeenCalledWith('PE-8K2J4M1Q9B')
      expect(mockNavigate).toHaveBeenCalledWith('/client')
    })
  })

  it('autentica usuario logistico y navega a logis', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Soy usuario' }))
    await user.type(screen.getByLabelText('Email'), 'log@test.com')
    await user.type(screen.getByLabelText('Contrasena'), '123456')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    await waitFor(() => {
      expect(mockAuth.loginLogistico).toHaveBeenCalledWith('log@test.com', '123456')
      expect(mockNavigate).toHaveBeenCalledWith('/logis')
    })
  })

  it('registra error si login logistico falla', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockAuth.loginLogistico.mockRejectedValue(new Error('Login fallido'))

    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Soy usuario' }))
    await user.type(screen.getByLabelText('Email'), 'log@test.com')
    await user.type(screen.getByLabelText('Contrasena'), '123456')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error))
    })
    expect(mockNavigate).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('registra error si login de cliente falla', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockAuth.loginCliente.mockRejectedValue(new Error('Codigo invalido'))

    render(
      <MemoryRouter>
        <LoginApp />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Codigo de entrega'), 'PE-8K2J4M1Q9B')
    await user.click(screen.getByRole('button', { name: 'Ver mi entrega' }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error))
    })
    expect(mockNavigate).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
