import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Building2, LogOut, Menu, Repeat, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChatBubble } from "@/components/ChatBubble";

export interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-0.5 px-3">
      {items.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  space,
  items,
  children,
}: {
  space: "sinophra" | "dealer";
  items: NavItem[];
  children: ReactNode;
}) {
  const { session, dealers, switchToAdmin, switchToDealer, logout } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dealer = dealers.find((d) => d.id === session?.dealerId);

  const brand = (
    <div className="flex items-center gap-3 px-6 py-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        {space === "sinophra" ? <Building2 className="h-5 w-5" /> : <Store className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">
          {space === "sinophra" ? "SINOPHRA" : "MOTOPARK"}
        </p>
        <p className="truncate text-xs text-sidebar-foreground/60">
          {space === "sinophra" ? "Administration" : (dealer?.name ?? "Espace revendeur")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto pb-6">
          <NavList items={items} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {brand}
                <NavList items={items} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="truncate text-sm font-medium text-muted-foreground">
              {space === "sinophra" ? "Plateforme importateur / distributeur" : "Espace revendeur Motopark"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Repeat className="h-4 w-4" />
                  <span className="hidden sm:inline">Changer d'espace</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Démonstration</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    switchToAdmin();
                    navigate({ to: "/sinophra" });
                  }}
                >
                  <Building2 className="h-4 w-4" /> SINOPHRA — Administration
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Espaces revendeurs</DropdownMenuLabel>
                {dealers.map((d) => (
                  <DropdownMenuItem
                    key={d.id}
                    onClick={() => {
                      switchToDealer(d.id);
                      navigate({ to: "/revendeur" });
                    }}
                  >
                    <Store className="h-4 w-4" /> {d.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </Button>

            <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 sm:flex">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">{session?.role ?? "Invité"}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 pb-24 sm:p-6 sm:pb-24">{children}</main>
        <ChatBubble />
      </div>
    </div>
  );
}
