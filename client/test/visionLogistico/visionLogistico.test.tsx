import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisionLogisticoApp from '../../src/apps/visionLogistico/VisionLogistico.app'

vi.mock('../../src/authContext/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('../../src/apps/planeacionRutas/PlaneacionRutas.app', () => ({
  __esModule: true,
  default: () => <div>Planeacion module</div>,
}))

vi.mock('../../src/apps/entregas/Entregas.app', () => ({
  __esModule: true,
  default: () => <div>Entregas module</div>,
}))

vi.mock('../../src/apps/repartidores/Repartidores.app', () => ({
  __esModule: true,
  default: () => <div>Repartidores module</div>,
}))

vi.mock('../../src/apps/historialRutas/HistorialRutas.app', () => ({
  __esModule: true,
  default: () => <div>Historial module</div>,
}))

vi.mock('../../src/apps/dashboard/Dashboard.app', () => ({
  __esModule: true,
  default: () => <div>Dashboard module</div>,
}))

describe('VisionLogistico module', () => {
  it('muestra planeacion por defecto y permite cambiar a repartidores', async () => {
    const user = userEvent.setup()
    render(<VisionLogisticoApp />)

    expect(screen.getByText('Planeacion module')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Repartidores' }))
    expect(screen.getByText('Repartidores module')).toBeInTheDocument()
  })

  it('permite navegar entre las vistas principales del header', async () => {
    const user = userEvent.setup()
    render(<VisionLogisticoApp />)

    await user.click(screen.getByRole('button', { name: 'Vista de Entregas' }))
    expect(screen.getByText('Entregas module')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByText('Dashboard module')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Historial de rutas' }))
    expect(screen.getByText('Historial module')).toBeInTheDocument()
  })
})
