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
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import ResponsiveSidebar from "@/components/ui/ResponsiveSidebar";

const RootLayout = () => {
  const { pathname, href } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [navigationOpen, setNavigationOpen] = useState(false);

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
    setNavigationOpen(false);
    useAuthStore.getState().clearAuth();
    navigate({ to: loginRoute.to });
  };

  const initIngredients = useIngredientsStore((s) => s.initIngredients);

  useEffect(() => {
    initIngredients();
  }, [initIngredients]);

  return (
    <div className="flex min-h-dvh [--app-header-height:4rem] md:[--app-header-height:0rem]">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4 md:hidden">
        <button
          type="button"
          aria-label="Открыть навигацию"
          aria-expanded={navigationOpen}
          aria-controls="main-navigation"
          onClick={() => setNavigationOpen(true)}
          className="rounded-xl p-2 text-primary hover:bg-secondary focus-visible:outline-2"
        >
          <Menu size={24} />
        </button>
        <span className="font-semibold">CookMate</span>
      </header>
      <ResponsiveSidebar
        id="main-navigation"
        title="Навигация"
        breakpoint="md"
        open={navigationOpen}
        onOpenChange={setNavigationOpen}
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
      </ResponsiveSidebar>

      {/* Main content */}
      <main
        className="min-h-dvh min-w-0 flex-1 pt-16 md:ml-[240px] md:pt-0"
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
