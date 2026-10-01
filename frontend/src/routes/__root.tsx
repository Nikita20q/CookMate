import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import logo from "@/assets/logo.jpg";
import { NAV_ITEMS } from "@/lib/navigation";
import cn from "@/utils/classname-func";
import Hint from "@/components/ui/Hint";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import { Route as loginRoute } from "@/routes/auth/login";
import { Route as registerRoute } from "@/routes/auth/register";
import { useIngredientsStore } from "@/store/ingredients";
import { useEffect } from "react";

const RootLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore.getState().isAuthenticated();

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    navigate({ to: loginRoute.to });
  };

  const initIngredients = useIngredientsStore((s) => s.initIngredients);

  useEffect(() => {
    initIngredients();
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed top-0 left-0 h-full flex flex-col z-40 w-[240px] bg-card"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <div
          className="px-6 pt-8 pb-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Logo" className="w-15 h-15 rounded-xl" />
            <div>
              <p className="font-semibold text-lg leading-[1.1]">CookMate</p>
              <Hint text="Помощник в поиске рецептов" className="mt-3" />
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-3 pt-4 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            return (
              <Link key={to} to={to}>
                <span
                  className={cn(
                    "flex items-center gap-4 py-2 px-3 rounded-lg text-md",
                    {
                      "color-[var(--primary)] bg-[rgba(61,107,79,0.1)]":
                        pathname == to,
                      "color-[var(--muted-foreground)]": pathname != to,
                    },
                  )}
                >
                  <Icon size={18} />
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer hint */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {!isAuthenticated &&
            pathname != loginRoute.to &&
            pathname != registerRoute.to && (
              <div>
                <Link to={loginRoute.to}>
                  <Button text="Войти" />
                </Link>
              </div>
            )}
          {isAuthenticated && (
            <div>
              <Button text="Выйти" onClick={handleLogout} variant="secondary" />
            </div>
          )}
          <Hint text="Сфотографируйте ингредиенты в наличии или загрузите фотографию" />
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: "240px", minHeight: "100vh" }}
      >
        <Outlet />
        {/* <TanStackRouterDevtools /> */}
      </main>
    </div>
  );
};

export const Route = createRootRoute({ component: RootLayout });
