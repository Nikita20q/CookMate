import { useQueryClient } from "@tanstack/react-query";
import {
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
  const { pathname, href } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    return useAuthStore.subscribe((state, previous) => {
      if (state.accessToken === previous.accessToken) return;
      void queryClient.cancelQueries({ queryKey: ["favorites"] });
      queryClient.removeQueries({ queryKey: ["favorites"] });
    });
  }, [queryClient]);
  const isAuthenticated = useAuthStore((state) => state.status === "authenticated");

  const sessionExpired = useAuthStore((state) => state.status === "expired");

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    navigate({ to: loginRoute.to });
  };

  const initIngredients = useIngredientsStore((s) => s.initIngredients);

  useEffect(() => {
    initIngredients();
  }, [initIngredients]);

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed top-0 left-0 z-40 hidden h-dvh w-[240px] flex-col bg-card md:flex"
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
                <Link to={loginRoute.to} search={{ returnTo: href }}>
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
        className="min-h-dvh min-w-0 flex-1 md:ml-[240px]"
      >
        {sessionExpired && !pathname.startsWith("/auth/") && (
          <div role="alert" className="border-b bg-secondary px-6 py-4">
            Сессия истекла.{" "}
            <Link to="/auth/login" search={{ returnTo: href }} className="underline">
              Войти снова
            </Link>
          </div>
        )}
        <Outlet />
        {/* <TanStackRouterDevtools /> */}
      </main>
    </div>
  );
};

export default RootLayout;
