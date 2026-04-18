import { useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext/AuthContext';
import './Header.css';

type Vista = 'agregar' | 'entregas' | 'dashboard' | 'repartidores' | 'historial';

interface HeaderProps {
    vistaActiva: Vista;
    onCambiarVista: (vista: Vista) => void;
}

const tabs: { id: Vista; iconoClass: string; label: string }[] = [
    { id: 'agregar', iconoClass: 'bi bi-geo-alt', label: 'Agregar Puntos' },
    { id: 'entregas', iconoClass: 'bi bi-map', label: 'Vista de Entregas' },
    { id: 'dashboard', iconoClass: 'bi bi-grid', label: 'Dashboard' },
    { id: 'repartidores', iconoClass: 'bi bi-truck', label: 'Repartidores' },
    { id: 'historial', iconoClass: 'bi bi-clock-history', label: 'Historial de rutas' },
];

function Header({ vistaActiva, onCambiarVista }: HeaderProps) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="header__encabezado">
                <div className="header__marca">
                    <span className="header__titulo">Sistema de Gestión de Domicilios</span>
                    <span className="header__subtitulo">Organiza y rastrea tus entregas en tiempo real</span>
                </div>
                <button className="header__botonLogout" onClick={handleLogout} title="Cerrar sesión">
                    <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                </button>
            </div>

            <nav className="header__nav">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`header__tab${vistaActiva === tab.id ? ' header__tab--activo' : ''}`}
                        onClick={() => onCambiarVista(tab.id)}
                    >
                        <i className={`header__tab__icono ${tab.iconoClass}`} aria-hidden="true"></i>
                        {tab.label}
                    </button>
                ))}
            </nav>
        </header>
    );
}

export default Header;
export type { Vista };
