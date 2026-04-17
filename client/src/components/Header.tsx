import { useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext/AuthContext';
import './Header.css';

type Vista = 'agregar' | 'entregas' | 'dashboard' | 'repartidores';

interface HeaderProps {
    vistaActiva: Vista;
    onCambiarVista: (vista: Vista) => void;
}

const tabs: { id: Vista; icono: string; label: string }[] = [
    { id: 'agregar',    icono: '📍', label: 'Agregar Puntos' },
    { id: 'entregas',   icono: '🗺',  label: 'Vista de Entregas' },
    { id: 'dashboard',  icono: '⊞',  label: 'Dashboard' },
    { id: 'repartidores',  icono: '🚚',  label: 'Repartidores' },
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
                    X
                </button>
            </div>

            <nav className="header__nav">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`header__tab${vistaActiva === tab.id ? ' header__tab--activo' : ''}`}
                        onClick={() => onCambiarVista(tab.id)}
                    >
                        <span className="header__tab__icono">{tab.icono}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>
        </header>
    );
}

export default Header;
export type { Vista };
