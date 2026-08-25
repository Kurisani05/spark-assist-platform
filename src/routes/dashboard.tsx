import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bookmark,
  Mail,
  Microscope,
  NotebookPen,
  Clock,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui-bits";
import { useItems } from "@/hooks/use-app-data";
import type { ItemKind, StoredItem } from "@/lib/storage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Productivity Suite" },
      {
        name: "description",
        content:
          "Your AI workspace home: quick actions, recent activity, saved items and usage statistics.",
      },
      { property: "og:title", content: "Dashboard — AI Productivity Suite" },
      {
        property: "og:description",
        content: "Quick actions, recent activity, saved items and usage statistics.",
      },
    ],
  }),
  component: Dashboard,
});

const kindMeta: Record<ItemKind, { label: string; icon: typeof Mail; to: string }> = {
  email: { label: "Email", icon: Mail, to: "/email" },
  meeting: { label: "Meeting", icon: NotebookPen, to: "/meetings" },
  research: { label: "Research", icon: Microscope, to: "/research" },
};

const quickActions = [
  {
    to: "/email" as const,
    title: "Generate an Email",
    body: "Turn a one-line brief into a polished, ready-to-send email.",
    icon: Mail,
  },
  {
    to: "/meetings" as const,
    title: "Summarize a Meeting",
    body: "Paste notes and get decisions, owners and deadlines.",
    icon: NotebookPen,
  },
  {
    to: "/research" as const,
    title: "Start Research",
    body: "Get findings, evidence and sources on any topic.",
    icon: Microscope,
  },
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ItemRow({ item }: { item: StoredItem }) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  return (
    <Link
      to="/history"
      search={{ open: item.id }}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-accent/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="block text-xs text-muted-foreground">
          {meta.label} · {formatDate(item.updatedAt)}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function Dashboard() {
  const { items, ready } = useItems();
  const counts = {
    email: items.filter((i) => i.kind === "email").length,
    meeting: items.filter((i) => i.kind === "meeting").length,
    research: items.filter((i) => i.kind === "research").length,
  };
  const recent = items.slice(0, 5);
  const saved = items.filter((i) => i.favorite).slice(0, 5);

  const stats = [
    { label: "Emails generated", value: counts.email, icon: Mail },
    { label: "Meetings summarized", value: counts.meeting, icon: NotebookPen },
    { label: "Research projects completed", value: counts.research, icon: Microscope },
    { label: "Saved items", value: items.filter((i) => i.favorite).length, icon: Bookmark },
  ];

  return (
    <AppShell title="Dashboard" description="Your AI workspace at a glance">
      <section className="surface hero-glow p-6 md:p-8">
        <Badge variant="secondary" className="mb-3">
          <Sparkles className="size-3.5" aria-hidden /> No account needed
        </Badge>
        <h2 className="text-2xl font-semibold md:text-3xl">Welcome back to your AI workspace</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Draft an email, turn messy meeting notes into action items, or research a topic in depth —
          then save it all locally for later.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="text-lg font-semibold">
          Quick actions
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {quickActions.map(({ to, title, body, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="surface group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Open
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="usage-stats">
        <h2 id="usage-stats" className="text-lg font-semibold">
          Usage statistics
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="surface p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {ready ? value : <Skeleton className="h-8 w-12" />}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface p-6" aria-labelledby="recent-activity">
          <div className="flex items-center justify-between">
            <h2 id="recent-activity" className="text-lg font-semibold">
              Recent activity
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/history">
                <Clock className="size-4" aria-hidden />
                History
              </Link>
            </Button>
          </div>
          <div className="mt-4 space-y-2.5">
            {!ready ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : recent.length ? (
              recent.map((item) => <ItemRow key={item.id} item={item} />)
            ) : (
              <EmptyState
                title="No activity yet"
                description="Generate your first email, summary or research report and it will show up here."
                action={
                  <Button asChild>
                    <Link to="/email">Generate an Email</Link>
                  </Button>
                }
              />
            )}
          </div>
        </section>

        <section className="surface p-6" aria-labelledby="saved-items">
          <div className="flex items-center justify-between">
            <h2 id="saved-items" className="text-lg font-semibold">
              Saved items
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/saved">
                <Bookmark className="size-4" aria-hidden />
                All saved
              </Link>
            </Button>
          </div>
          <div className="mt-4 space-y-2.5">
            {!ready ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : saved.length ? (
              saved.map((item) => <ItemRow key={item.id} item={item} />)
            ) : (
              <EmptyState
                icon={<Bookmark className="size-5" aria-hidden />}
                title="Nothing saved yet"
                description="Favourite anything you generate to keep it one click away."
              />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
