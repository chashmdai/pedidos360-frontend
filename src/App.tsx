import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import type { AuthClient } from "./auth";
import { createApi, type Order, type Product } from "./api";
import { SessionPage } from "./SessionPage";
import "./style.css";

type Api = ReturnType<typeof createApi>;
const ApiContext = createContext<Api>(async () => {
  throw new Error("API no inicializada");
});
const Session = createContext<string | null>(null);
const money = (value: number, currency = "CLP") =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(value);
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No fue posible conectar. Revisa los servicios locales.";

function Protected({ children }: { children: ReactNode }) {
  return useContext(Session) ? children : <Navigate to="/" replace />;
}

function useLoad<T>(path: string) {
  const api = useContext(ApiContext);
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason) => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [api, path]);
  return { data, error };
}

function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="error">
      <span className="error-mark" aria-hidden="true">
        !
      </span>
      <span>{message}</span>
    </p>
  ) : null;
}

function Catalog() {
  const { data: products, error } = useLoad<Product[]>("/productos");
  return (
    <section className="page page-catalog">
      <div className="section-title">
        <div className="section-heading">
          <p className="eyebrow">
            <span>01</span> ELIGE A TU RITMO
          </p>
          <h1>Catálogo</h1>
          <p className="section-lead">
            Una selección simple, presentada con todo lo necesario para decidir
            sin ruido.
          </p>
        </div>
        <Link className="button button-primary" to="/nuevo">
          <span>Crear pedido</span>
          <span className="button-arrow" aria-hidden="true">
            ↗
          </span>
        </Link>
      </div>

      <div className="section-rule">
        <p className="muted">
          Productos disponibles para registrar tu solicitud. El stock es
          referencial y no implica una reserva.
        </p>
        <span className="rule-label">PEDIDOS360 / CATÁLOGO</span>
      </div>

      <ErrorMessage message={error} />
      {!products && !error && (
        <p role="status" className="loading-state">
          <span className="loading-dot" />
          Cargando productos…
        </p>
      )}

      <div className="product-grid">
        {products?.map((product, index) => (
          <article className="product" key={product.id}>
            <div className={"product-art art-" + index}>
              <span className="art-grid" aria-hidden="true" />
              <span className="art-orbit" aria-hidden="true" />
              <span className="art-symbol" aria-hidden="true">
                {index === 0 ? "☕" : "◡"}
              </span>
              <div className="art-caption">
                <small>PEDIDOS360 / SELECCIÓN</small>
                <span aria-hidden="true">P360</span>
              </div>
            </div>

            <div className="product-copy">
              <div className="product-topline">
                <span className="product-code">PRODUCTO / PEDIDOS360</span>
                <span
                  className={
                    "badge " +
                    (product.disponible ? "badge-success" : "badge-muted")
                  }
                >
                  <i aria-hidden="true" />
                  {product.disponible ? "Disponible" : "No disponible"}
                </span>
              </div>

              <h2>{product.nombre}</h2>
              <p>{product.descripcion}</p>

              <div className="product-meta">
                <div>
                  <small>Precio referencial</small>
                  <strong className="price">
                    {money(product.precio, product.moneda)}
                  </strong>
                </div>
                <div className="stock">
                  <small>Stock</small>
                  <strong>{product.stock}</strong>
                  <span className="muted">unidades</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Orders({ administration = false }: { administration?: boolean }) {
  const { data: orders, error } = useLoad<Order[]>(administration ? "/admin/pedidos" : "/pedidos");
  return (
    <section className="page page-orders">
      <div className="section-title">
        <div className="section-heading">
          <p className="eyebrow">
            <span>02</span> TODO EN UN LUGAR
          </p>
          <h1>{administration ? "Pedidos del tenant" : "Mis pedidos"}</h1>
          <p className="section-lead">
            {administration ? "Consulta administrativa autorizada por tu rol y permisos." : "Tu historial, ordenado para que cada solicitud se entienda de un vistazo."}
          </p>
        </div>
        <Link className="button button-primary" to="/nuevo">
          <span>Nuevo pedido</span>
          <span className="button-arrow" aria-hidden="true">
            ＋
          </span>
        </Link>
      </div>

      <ErrorMessage message={error} />
      {!orders && !error && (
        <p role="status" className="loading-state">
          <span className="loading-dot" />
          Cargando pedidos…
        </p>
      )}

      {administration && orders?.length === 0 && <p className="empty">No hay pedidos registrados en este tenant.</p>}
      {!administration && orders?.length === 0 && (
        <div className="empty">
          <div className="empty-visual" aria-hidden="true">
            <span>+</span>
          </div>
          <div>
            <p className="eyebrow">AÚN NO HAY MOVIMIENTO</p>
            <h2>Tu primer pedido empieza aquí</h2>
            <p>Explora el catálogo y registra una solicitud.</p>
            <Link to="/catalogo">
              Ver catálogo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}

      <div className="order-list">
        {orders?.map((order) => (
          <article className="order" key={order.id}>
            <div className="order-accent" aria-hidden="true" />

            <div className="order-header">
              <div>
                <small className="order-code">
                  PEDIDO / {order.id.slice(0, 8).toUpperCase()}
                </small>
                <h2>{new Date(order.fechaCreacion).toLocaleString("es-CL")}</h2>
              </div>
              <span className="badge badge-success">
                <i aria-hidden="true" />
                Registrado
              </span>
            </div>

            <div className="order-body">
              <p className="order-label">Detalle de la solicitud</p>
              <ul>
                {order.items.map((item) => (
                  <li key={item.productoId}>
                    <span>
                      <em>{item.cantidad}×</em>
                      {item.nombre}
                    </span>
                    <strong>{money(item.subtotal, order.moneda)}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="order-total">
              <span>
                <small>Total registrado</small>
                <span>Valor confirmado al crear la solicitud</span>
              </span>
              <strong>{money(order.total, order.moneda)}</strong>
            </div>

            <small className="order-disclaimer">
              Solicitud registrada. No incluye pago ni reserva de existencias.
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function CreateOrder() {
  const { data: products, error } = useLoad<Product[]>("/productos");
  const api = useContext(ApiContext),
    navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [failure, setFailure] = useState(""),
    [pending, setPending] = useState(false);
  const selected = products?.filter((p) => (quantities[p.id] ?? 0) > 0) ?? [];

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) {
      setFailure("Elige al menos un producto.");
      return;
    }
    setPending(true);
    setFailure("");
    try {
      await api<Order>("/pedidos", {
        items: selected.map((p) => ({
          productoId: p.id,
          cantidad: quantities[p.id],
        })),
      });
      navigate("/pedidos");
    } catch (reason) {
      setFailure(errorText(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page page-create">
      <div className="create-intro">
        <div>
          <p className="eyebrow">
            <span>03</span> UN PASO MÁS
          </p>
          <h1>Crear pedido</h1>
          <p className="section-lead">
            Define las cantidades y revisa el estimado antes de registrar tu
            solicitud.
          </p>
        </div>
        <div className="create-seal" aria-hidden="true">
          <span>P360</span>
          <small>SOLICITUD</small>
        </div>
      </div>

      <ErrorMessage message={error || failure} />
      {!products && !error && (
        <p role="status" className="loading-state">
          <span className="loading-dot" />
          Cargando catálogo…
        </p>
      )}

      <form onSubmit={submit} className="create-form">
        <div className="form-heading">
          <div>
            <small>PEDIDOS360 / NUEVA SOLICITUD</small>
            <h2>Selecciona tus productos</h2>
          </div>
          <span className="form-step">01 / 01</span>
        </div>

        <div className="quantity-list">
          {products?.map((product) => (
            <label className="quantity-row" key={product.id}>
              <span className="quantity-product">
                <span className="quantity-mark" aria-hidden="true" />
                <span>
                  <strong>{product.nombre}</strong>
                  <small>
                    {money(product.precio, product.moneda)} por unidad
                  </small>
                </span>
              </span>

              <span className="quantity-control">
                <small>CANTIDAD</small>
                <input
                  aria-label={"Cantidad de " + product.nombre}
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  disabled={!product.disponible || pending}
                  value={quantities[product.id] ?? 0}
                  onChange={(event) =>
                    setQuantities({
                      ...quantities,
                      [product.id]: Math.max(0, Number(event.target.value)),
                    })
                  }
                />
              </span>
            </label>
          ))}
        </div>

        <div className="form-summary">
          <div>
            <small>Total estimado</small>
            <p>Se confirma al registrar la solicitud.</p>
          </div>
          <strong>
            {money(
              selected.reduce((sum, p) => sum + p.precio * quantities[p.id], 0),
            )}
          </strong>
        </div>

        <div className="form-footer">
          <p className="muted">
            <span aria-hidden="true">◇</span> Registrar un pedido no descuenta
            stock ni confirma una compra.
          </p>
          <button
            className="button button-primary button-submit"
            disabled={pending || !products || !selected.length}
          >
            <span>{pending ? "Registrando…" : "Registrar pedido"}</span>
            <span className="button-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}

export default function App({ auth }: { auth: AuthClient }) {
  const [user, setUser] = useState(auth.user()),
    [error, setError] = useState("");
  const api = useMemo(
    () =>
      createApi(
        import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8180/api/v1",
        () => auth.token(),
      ),
    [auth],
  );

  async function session(action: "login" | "logout") {
    try {
      setError("");
      await auth[action]();
      setUser(auth.user());
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  return (
    <BrowserRouter>
      <Session value={user}>
        <ApiContext value={api}>
          {auth.mode === "local" && (
            <div className="dev-notice">
              <span className="dev-pulse" aria-hidden="true" />
              <span>Entorno local de demostración</span>
              <i aria-hidden="true" />
              <span>JWT de prueba</span>
              <i aria-hidden="true" />
              <span>Emisor de pruebas; sin identidad Microsoft</span>
            </div>
          )}

          <header className="site-header">
            <div className="header-shell">
              <Link className="brand" to="/" aria-label="Pedidos360, inicio">
                <span className="brand-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="brand-word">
                  pedidos<span>360</span>
                </span>
              </Link>

              <nav aria-label="Principal">
                <NavLink to="/catalogo">
                  <span>Catálogo</span>
                </NavLink>
                <NavLink to="/pedidos">
                  <span>Mis pedidos</span>
                </NavLink>
                {user && <NavLink to="/sesion"><span>Mi sesión</span></NavLink>}
              </nav>

              <div className="account">
                {user && (
                  <span className="account-name">
                    <i aria-hidden="true" />
                    {user}
                  </span>
                )}
                <button
                  className="text-button"
                  disabled={auth.mode === "unconfigured"}
                  onClick={() => session(user ? "logout" : "login")}
                >
                  <span>
                    {user
                      ? "Cerrar sesión"
                      : auth.mode === "local"
                        ? "Iniciar sesión local"
                        : "Iniciar sesión"}
                  </span>
                  <span aria-hidden="true">{user ? "↗" : "→"}</span>
                </button>
              </div>
            </div>
          </header>

          <main>
            <ErrorMessage message={error} />
            <Routes>
              <Route
                path="/"
                element={
                  <section className="hero">
                    <div className="hero-aura" aria-hidden="true" />
                    <div className="hero-grid" aria-hidden="true" />

                    <div className="hero-copy">
                      <p className="eyebrow">
                        <span>00</span> SIMPLE, DE PRINCIPIO A FIN
                      </p>
                      <h1>
                        Tus pedidos.
                        <br />
                        <span>Todo más claro.</span>
                      </h1>
                      <p className="hero-lead">
                        Explora productos, registra tu solicitud y consulta cada
                        detalle en un solo lugar.
                      </p>

                      <div className="hero-actions">
                        {user ? (
                          <Link
                            className="button button-primary button-hero"
                            to="/catalogo"
                          >
                            <span>Explorar catálogo</span>
                            <span className="button-arrow" aria-hidden="true">
                              ↗
                            </span>
                          </Link>
                        ) : (
                          <button
                            className="button button-primary button-hero"
                            disabled={auth.mode === "unconfigured"}
                            onClick={() => session("login")}
                          >
                            <span>
                              {auth.mode === "local"
                                ? "Entrar a la demostración"
                                : "Iniciar sesión"}
                            </span>
                            <span className="button-arrow" aria-hidden="true">
                              →
                            </span>
                          </button>
                        )}
                        <span className="hero-caption">
                          Una interfaz mínima.
                          <br />
                          Una experiencia precisa.
                        </span>
                      </div>

                      {auth.mode === "unconfigured" && (
                        <p role="status" className="config-status">
                          La configuración de identidad aún no está disponible
                          para esta compilación.
                        </p>
                      )}
                    </div>

                    <aside className="hero-visual" aria-hidden="true">
                      <div className="visual-window">
                        <div className="visual-topbar">
                          <span>PEDIDOS360 / LIVE</span>
                          <span className="visual-dots">
                            <i />
                            <i />
                            <i />
                          </span>
                        </div>

                        <div className="visual-stage">
                          <div className="visual-ring ring-one" />
                          <div className="visual-ring ring-two" />
                          <div className="visual-core">
                            <span>360°</span>
                            <small>VISIBILIDAD</small>
                          </div>
                          <div className="floating-card card-a">
                            <small>01 / EXPLORA</small>
                            <strong>Catálogo</strong>
                            <span>→</span>
                          </div>
                          <div className="floating-card card-b">
                            <small>02 / REGISTRA</small>
                            <strong>Solicitud</strong>
                            <span>＋</span>
                          </div>
                          <div className="floating-card card-c">
                            <small>03 / CONSULTA</small>
                            <strong>Historial</strong>
                            <span>✓</span>
                          </div>
                        </div>

                        <div className="visual-footer">
                          <span>
                            <i /> Sistema disponible
                          </span>
                          <span>P360 — 2026</span>
                        </div>
                      </div>
                    </aside>

                    <div className="hero-note">
                      <span>
                        <b>01</b>
                        <small>Explora</small>
                      </span>
                      <span>
                        <b>02</b>
                        <small>Registra</small>
                      </span>
                      <span>
                        <b>03</b>
                        <small>Consulta</small>
                      </span>
                      <span className="hero-note-line" aria-hidden="true" />
                      <span className="hero-note-tag">FLUJO / PEDIDOS360</span>
                    </div>
                  </section>
                }
              />

              <Route
                path="/catalogo"
                element={
                  <Protected>
                    <Catalog />
                  </Protected>
                }
              />
              <Route
                path="/pedidos"
                element={
                  <Protected>
                    <Orders key="own" />
                  </Protected>
                }
              />
              <Route
                path="/nuevo"
                element={
                  <Protected>
                    <CreateOrder />
                  </Protected>
                }
              />
              <Route path="/sesion" element={<Protected><SessionPage auth={auth} api={api} /></Protected>} />
              <Route path="/administracion" element={<Protected><Orders key="admin" administration /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="site-footer">
            <div className="footer-brand">
              <span className="brand-mark brand-mark-small" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>Pedidos360</strong>
            </div>
            <span className="footer-line" aria-hidden="true" />
            <span>Solicitudes claras, de principio a fin.</span>
            <small>INTERFAZ / 2026</small>
          </footer>
        </ApiContext>
      </Session>
    </BrowserRouter>
  );
}
