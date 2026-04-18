import { useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext/AuthContext";
import "./VisionCliente.app.css";

type EstadoEntrega = 'EN_BODEGA' | 'PENDIENTE' | 'EN_CAMINO' | 'ENTREGADO' | 'FALLIDO' | undefined;

function normalizarEstadoEntrega(estado: string | undefined): EstadoEntrega {
    if (!estado) {
        return 'EN_BODEGA';
    }

    if (estado === 'EN_BODEGA') {
        return 'EN_BODEGA';
    }

    if (estado === 'PENDIENTE') {
        return 'PENDIENTE';
    }

    if (estado === 'EN_CAMINO' || estado === 'EN_ENTREGA') {
        return 'EN_CAMINO';
    }

    if (estado === 'ENTREGADO') {
        return 'ENTREGADO';
    }

    if (estado === 'FALLIDO') {
        return 'FALLIDO';
    }

    return 'EN_BODEGA';
}

function etiquetaEstadoEntrega(estado: EstadoEntrega): string {
    if (estado === 'EN_BODEGA') {
        return 'En bodega';
    }

    if (estado === 'PENDIENTE') {
        return 'Pendiente';
    }

    if (estado === 'EN_CAMINO') {
        return 'En camino';
    }

    if (estado === 'ENTREGADO') {
        return 'Entregado';
    }

    if (estado === 'FALLIDO') {
        return 'Fallido';
    }

    return 'En bodega';
}

function obtenerPasoActual(estado: EstadoEntrega): 1 | 2 | 3 | 4 {
    if (estado === 'PENDIENTE') {
        return 2;
    }

    if (estado === 'EN_CAMINO') {
        return 3;
    }

    if (estado === 'ENTREGADO') {
        return 4;
    }

    if (estado === 'FALLIDO') {
        return 4;
    }

    return 1;
}

export default function VisionCliente() {
    const { logout, usuario } = useAuth();
    const navigate = useNavigate();
    const estado = normalizarEstadoEntrega(usuario?.estadoEntrega);
    const pasoActual = obtenerPasoActual(estado);
    const esFallido = estado === 'FALLIDO';

    const esPasoActivo = (paso: number): boolean => paso <= pasoActual;

    const etapas = [
        { paso: 1, titulo: 'En bodega' },
        { paso: 2, titulo: 'Pendiente' },
        { paso: 3, titulo: 'En camino' },
        { paso: 4, titulo: 'Entregado' },
    ] as const;

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="clienteTrack">
            <header className="clienteTrack__header">
                <div>
                    <h1 className="clienteTrack__titulo">ConEmpaques | Seguimiento</h1>
                    <p className="clienteTrack__subtitulo">Hola {usuario?.nombre ?? 'cliente'}, aqui va tu pedido en tiempo real.</p>
                </div>
                <button onClick={handleLogout} className="clienteTrack__logout" title="Cerrar sesion">
                    Salir
                </button>
            </header>

            <main className="clienteTrack__contenido">
                <section className="clienteTrack__card">
                    <div className="clienteTrack__metaGrid">
                        <div className="clienteTrack__metaItem">
                            <span>Codigo</span>
                            <strong>{usuario?.codigoEntrega ?? 'No disponible'}</strong>
                        </div>
                        <div className="clienteTrack__metaItem">
                            <span>Ruta</span>
                            <strong>{usuario?.rutaId ?? 'No disponible'}</strong>
                        </div>
                        <div className="clienteTrack__metaItem">
                            <span>Estado</span>
                            <strong className={esFallido ? 'clienteTrack__estado clienteTrack__estado--fallido' : 'clienteTrack__estado'}>
                                {etiquetaEstadoEntrega(estado)}
                            </strong>
                        </div>
                    </div>

                    <div className="clienteTrack__progreso">
                        <div className="clienteTrack__lineaBase" />
                        <div
                            className={esFallido ? 'clienteTrack__lineaActiva clienteTrack__lineaActiva--fallido' : 'clienteTrack__lineaActiva'}
                            style={{ width: `${(pasoActual - 1) * 33.3333}%` }}
                        />

                        <div className="clienteTrack__nodos">
                            {etapas.map((etapa) => {
                                const activo = esPasoActivo(etapa.paso);
                                const actual = pasoActual === etapa.paso;

                                return (
                                    <div key={etapa.paso} className="clienteTrack__nodoWrap">
                                        <div
                                            className={[
                                                'clienteTrack__nodo',
                                                activo ? 'clienteTrack__nodo--activo' : '',
                                                actual ? 'clienteTrack__nodo--actual' : '',
                                            ].join(' ').trim()}
                                        >
                                            {etapa.paso}
                                        </div>
                                        <p className="clienteTrack__nodoLabel">{etapa.titulo}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <p className="clienteTrack__nota">
                        Referencia: 1 en bodega, 2 pendiente, 3 en camino, 4 entregado.
                    </p>
                </section>
            </main>
        </div>
    );
}