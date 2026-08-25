import { AlertTriangle, Check, Copy, Inbox, RefreshCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
}: {
  text: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied to clipboard");
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Your browser blocked clipboard access");
        }
      }}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {label}
    </Button>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-destructive" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-destructive">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="size-4" aria-hidden />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ lines = 5, label }: { lines?: number; label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label ?? "Generating with AI"}</span>
      {label ? (
        <p className="text-sm text-muted-foreground">
          <span className="inline-block animate-pulse">{label}</span>
        </p>
      ) : null}
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-4" style={{ width: `${95 - index * 7}%` }} />
      ))}
    </div>
  );
}

export function BulletList({ items, empty }: { items?: string[]; empty?: string }) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">{empty ?? "Nothing captured here."}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
