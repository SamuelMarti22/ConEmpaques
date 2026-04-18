import { useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext/AuthContext";
import "./VisionCliente.app.css";

type EstadoEntrega = 'PENDIENTE' | 'EN_ENTREGA' | 'ENTREGADO' | 'FALLIDO' | undefined;

function normalizarEstadoEntrega(estado: string | undefined): EstadoEntrega {
    if (!estado) {
        return 'PENDIENTE';
    }

    if (estado === 'EN_ENTREGA') {
        return 'EN_ENTREGA';
    }

    if (estado === 'ENTREGADO') {
        return 'ENTREGADO';
    }

    if (estado === 'FALLIDO') {
        return 'FALLIDO';
    }

    return 'PENDIENTE';
}

function etiquetaEstadoEntrega(estado: EstadoEntrega): string {
    if (estado === 'EN_ENTREGA') {
        return 'En entrega';
    }

    if (estado === 'ENTREGADO') {
        return 'Entregado';
    }

    if (estado === 'FALLIDO') {
        return 'Fallido';
    }

    return 'Pendiente';
}

function obtenerPasoActual(estado: EstadoEntrega): 1 | 2 | 3 {
    if (estado === 'EN_ENTREGA') {
        return 2;
    }

    if (estado === 'ENTREGADO' || estado === 'FALLIDO') {
        return 3;
    }

    return 1;
}

export default function VisionCliente() {
    const { logout, usuario } = useAuth();
    const navigate = useNavigate();
    const estado = normalizarEstadoEntrega(usuario?.estadoEntrega);
    const pasoActual = obtenerPasoActual(estado);
    const esFallido = estado === 'FALLIDO';
    const etapas = [
        { paso: 1, titulo: 'Pendiente' },
        { paso: 2, titulo: 'En entrega' },
        { paso: 3, titulo: esFallido ? 'Fallido' : 'Entregado' },
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
                            style={{ width: `${(pasoActual - 1) * 50}%` }}
                        />

                        <div className="clienteTrack__nodos">
                            {etapas.map((etapa) => {
                                const activo = pasoActual >= etapa.paso;
                                const actual = pasoActual === etapa.paso;
                                const fallidoFinal = esFallido && etapa.paso === 3;

                                return (
                                    <div key={etapa.paso} className="clienteTrack__nodoWrap">
                                        <div
                                            className={[
                                                'clienteTrack__nodo',
                                                activo ? 'clienteTrack__nodo--activo' : '',
                                                actual ? 'clienteTrack__nodo--actual' : '',
                                                fallidoFinal ? 'clienteTrack__nodo--fallido' : '',
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
                        Referencia: 1 de 3 (pendiente), 2 de 3 (en entrega), 3 de 3 (entregado o fallido).
                    </p>
                </section>
            </main>
        </div>
    );
}