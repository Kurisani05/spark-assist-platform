import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Mail,
  NotebookPen,
  Microscope,
  History,
  Bookmark,
  Settings,
  Menu,
  Moon,
  Sun,
  Sparkles,
  HardDrive,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePreferences } from "@/hooks/use-app-data";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Smart Email Generator", icon: Mail },
  { to: "/meetings", label: "Meeting Note Summarizer", icon: NotebookPen },
  { to: "/research", label: "AI Research Assistant", icon: Microscope },
  { to: "/history", label: "History", icon: History },
  { to: "/saved", label: "Saved Items", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">AI Productivity Suite</span>
        <span className="block text-xs text-muted-foreground">One workspace, three tools</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function NewTaskMenu({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className}>
          <Sparkles className="size-4" aria-hidden />
          New AI Task
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/email" onClick={onNavigate}>
            <Mail className="size-4" aria-hidden /> Generate an Email
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/meetings" onClick={onNavigate}>
            <NotebookPen className="size-4" aria-hidden /> Summarize a Meeting
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/research" onClick={onNavigate}>
            <Microscope className="size-4" aria-hidden /> Start Research
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand />
      <NewTaskMenu className="w-full justify-start" onNavigate={onNavigate} />
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        <HardDrive className="mb-1.5 size-4" aria-hidden />
        Your work is stored on this browser only — no account, no cloud sync.
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const { prefs, update } = usePreferences();
  const next = prefs.theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} mode`}
      onClick={() => update({ theme: next })}
    >
      {prefs.theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r bg-sidebar lg:block">
        <SidebarInner />
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-4" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarInner onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold md:text-lg">{title}</h1>
            {description ? (
              <p className="hidden truncate text-sm text-muted-foreground md:block">{description}</p>
            ) : null}
          </div>

          <NewTaskMenu className="hidden md:inline-flex" />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
