import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bookmark,
  HardDrive,
  Mail,
  Microscope,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Productivity Suite — One AI Workspace for Your Everyday Work" },
      {
        name: "description",
        content:
          "Write better emails, turn meetings into actionable notes, and research any topic faster with one intelligent workspace. No signup required.",
      },
      {
        property: "og:title",
        content: "AI Productivity Suite — One AI Workspace for Your Everyday Work",
      },
      {
        property: "og:description",
        content:
          "Write better emails, turn meetings into actionable notes, and research any topic faster. No account needed.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Mail,
    title: "Smart Email Generator",
    body: "Describe the situation once. Get a polished subject line and body you can tune by tone, length and language.",
    to: "/email" as const,
  },
  {
    icon: NotebookPen,
    title: "Meeting Note Summarizer",
    body: "Paste raw notes or a transcript and get an executive summary, decisions and action items with owners and deadlines.",
    to: "/meetings" as const,
  },
  {
    icon: Microscope,
    title: "AI Research Assistant",
    body: "Explore any topic with findings, evidence, sources and follow-up questions — then export the report.",
    to: "/research" as const,
  },
];

const highlights = [
  { icon: Zap, title: "No signup", body: "Open the app and start working immediately." },
  { icon: HardDrive, title: "Local-first", body: "History stays in your browser, on your device." },
  { icon: ShieldCheck, title: "No accounts", body: "Nothing to log into, nothing to leak." },
  { icon: Bookmark, title: "One workspace", body: "Save, search and revisit everything you make." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3.5 md:px-8">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <span className="flex-1 text-sm font-semibold">AI Productivity Suite</span>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/dashboard">Start Using AI</Link>
          </Button>
        </div>
      </header>

      <section className="hero-glow">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Three AI tools, one workspace
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] md:text-6xl">
            One AI Workspace for <span className="text-gradient">Your Everyday Work</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Write better emails, turn meetings into actionable notes, and research any topic faster
            with one intelligent workspace.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard">
                Start Using AI
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Explore Features</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No account, no signup — your work is saved locally in this browser.
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 pb-8 md:px-8">
        <h2 className="text-2xl font-semibold md:text-3xl">Everything in one place</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body, to }) => (
            <Link
              key={title}
              to={to}
              className="surface group flex flex-col p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Open tool
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card/60 p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>AI Productivity Suite — emails, meetings and research in one workspace.</p>
          <Link to="/dashboard" className="font-medium text-primary">
            Open the app
          </Link>
        </div>
      </footer>
    </div>
  );
}
