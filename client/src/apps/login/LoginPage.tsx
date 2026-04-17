import { useState } from "react";
import { useAuth } from "../../authContext/AuthContext";
import "./LoginPage.css";

type ModoAcceso = "usuario" | "cliente";

export default function LoginPage() {
  const { loginLogistico, loginCliente, cargando, error } = useAuth();
  const [modoAcceso, setModoAcceso] = useState<ModoAcceso>("cliente");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigoEntrega, setCodigoEntrega] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const handleSubmitUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginLogistico(email, password);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleSubmitCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpio = codigoEntrega.trim();

    if (codigoLimpio.length === 0) {
      setErrorCodigo("Ingresa un codigo de entrega valido");
      return;
    }

    setErrorCodigo(null);
    try {
      await loginCliente(codigoLimpio);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginPage__contenedor">
        <div className="loginPage__marca">
          <h1 className="loginPage__titulo">ConEmpaques</h1>
          <p className="loginPage__descripcion">Sistema de Gestion de Domicilios</p>
        </div>

        <div className="loginPage__selector">
          <button
            type="button"
            className={`loginPage__selectorBoton ${modoAcceso === "usuario" ? "loginPage__selectorBoton--activo" : ""}`}
            onClick={() => setModoAcceso("usuario")}
          >
            Soy usuario
          </button>
          <button
            type="button"
            className={`loginPage__selectorBoton ${modoAcceso === "cliente" ? "loginPage__selectorBoton--activo" : ""}`}
            onClick={() => setModoAcceso("cliente")}
          >
            Soy cliente
          </button>
        </div>

        {modoAcceso === "usuario" ? (
          <form onSubmit={handleSubmitUsuario} className="loginPage__formulario">
            <h2 className="loginPage__formTitulo">Inicia sesion</h2>

            <div className="loginPage__campo">
              <label htmlFor="email" className="loginPage__label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="loginPage__input"
                disabled={cargando}
              />
            </div>

            <div className="loginPage__campo">
              <label htmlFor="password" className="loginPage__label">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="loginPage__input"
                disabled={cargando}
              />
            </div>

            {error && <div className="loginPage__error">{error}</div>}

            <button type="submit" className="loginPage__boton" disabled={cargando}>
              {cargando ? "Iniciando..." : "Iniciar sesion"}
            </button>

            <p className="loginPage__hint">
              Pista: usa "log@test.com" para logistico o "rep@test.com" para repartidor
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmitCodigo} className="loginPage__formulario">
            <h2 className="loginPage__formTitulo">Consultar entrega</h2>

            <p className="loginPage__textoSecundario">
              Ingresa el codigo que recibiste para revisar el estado de tu pedido.
            </p>

            <div className="loginPage__campo">
              <label htmlFor="codigo" className="loginPage__label">
                Codigo de entrega
              </label>
              <input
                id="codigo"
                type="text"
                placeholder="Ej: CEM-2026-0042"
                value={codigoEntrega}
                onChange={(e) => setCodigoEntrega(e.target.value)}
                className="loginPage__input"
              />
            </div>

            {errorCodigo && <div className="loginPage__error">{errorCodigo}</div>}

            <button type="submit" className="loginPage__boton">
              Ver mi entrega
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
