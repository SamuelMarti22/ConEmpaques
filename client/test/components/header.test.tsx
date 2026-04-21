import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '../../src/components/Header'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockCambiarVista = vi.fn()

vi.mock('../../src/authContext/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra la barra de navegación y marca la vista activa', () => {
    render(<Header vistaActiva="agregar" onCambiarVista={mockCambiarVista} />)

    expect(screen.getByText('Sistema de Gestión de Domicilios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar Puntos' })).toHaveClass('header__tab--activo')
    expect(screen.getByRole('button', { name: 'Vista de Entregas' })).not.toHaveClass('header__tab--activo')
  })

  it('cambia de vista y ejecuta logout', async () => {
    const user = userEvent.setup()
    render(<Header vistaActiva="agregar" onCambiarVista={mockCambiarVista} />)

    await user.click(screen.getByRole('button', { name: 'Historial de rutas' }))
    expect(mockCambiarVista).toHaveBeenCalledWith('historial')

    await user.click(screen.getByTitle('Cerrar sesión'))
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})