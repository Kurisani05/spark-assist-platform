import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  BookmarkCheck,
  Download,
  Mail,
  Microscope,
  NotebookPen,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton, EmptyState } from "@/components/ui-bits";
import { useItems } from "@/hooks/use-app-data";
import {
  deleteItem,
  download,
  itemToText,
  patchItem,
  type ItemKind,
  type StoredItem,
} from "@/lib/storage";

const kindMeta: Record<
  ItemKind,
  { label: string; icon: typeof Mail; to: "/email" | "/meetings" | "/research" }
> = {
  email: { label: "Email", icon: Mail, to: "/email" },
  meeting: { label: "Meeting", icon: NotebookPen, to: "/meetings" },
  research: { label: "Research", icon: Microscope, to: "/research" },
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ItemLibrary({
  onlyFavorites = false,
  initialOpenId,
}: {
  onlyFavorites?: boolean;
  initialOpenId?: string;
}) {
  const { items, ready } = useItems();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | ItemKind>("all");
  const [openId, setOpenId] = useState<string | undefined>(initialOpenId);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => (onlyFavorites ? item.favorite : true))
      .filter((item) => (kind === "all" ? true : item.kind === kind))
      .filter((item) =>
        q ? `${item.title} ${itemToText(item)}`.toLowerCase().includes(q) : true,
      );
  }, [items, onlyFavorites, kind, query]);

  const open = items.find((item) => item.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search titles and content…"
            aria-label="Search stored items"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Tabs value={kind} onValueChange={(value) => setKind(value as "all" | ItemKind)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="email">Emails</TabsTrigger>
            <TabsTrigger value="meeting">Meetings</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!ready ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : filtered.length ? (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const meta = kindMeta[item.kind];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="surface p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                      <Badge variant="secondary">{meta.label}</Badge>
                      {item.favorite ? <Badge>Saved</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {formatDate(item.updatedAt)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {itemToText(item).replace(/\n+/g, " ").slice(0, 220)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpenId(item.id)}>
                      View
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={meta.to} search={{ load: item.id }}>
                        <Pencil className="size-4" aria-hidden /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={item.favorite ? "Remove from saved" : "Save item"}
                      onClick={() => patchItem(item.id, { favorite: !item.favorite })}
                    >
                      {item.favorite ? (
                        <BookmarkCheck className="size-4 text-primary" aria-hidden />
                      ) : (
                        <Bookmark className="size-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Rename item"
                      onClick={() => {
                        setRenameId(item.id);
                        setRenameValue(item.title);
                      }}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete item"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={onlyFavorites ? "No saved items yet" : "Nothing here yet"}
          description={
            query || kind !== "all"
              ? "No items match your search or filter. Try a different term."
              : onlyFavorites
                ? "Favourite an email, summary or research report and it will appear here."
                : "Everything you generate is stored on this device and listed here."
          }
          action={
            <Button asChild>
              <Link to="/email">Generate an Email</Link>
            </Button>
          }
        />
      )}

      <Dialog open={Boolean(open)} onOpenChange={(next) => !next && setOpenId(undefined)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
            <DialogDescription>
              {open ? `${kindMeta[open.kind].label} · ${formatDate(open.updatedAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 font-sans text-sm leading-relaxed">
            {open ? itemToText(open) : ""}
          </pre>
          <DialogFooter className="gap-2 sm:justify-start">
            {open ? (
              <>
                <CopyButton text={itemToText(open)} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    download(
                      `${open.title.replace(/[^\w -]+/g, "").slice(0, 50) || "item"}.txt`,
                      itemToText(open),
                    )
                  }
                >
                  <Download className="size-4" aria-hidden /> Export
                </Button>
                <Button asChild size="sm">
                  <Link to={kindMeta[open.kind].to} search={{ load: open.id }}>
                    Open in tool
                  </Link>
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameId)} onOpenChange={(next) => !next && setRenameId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename item</DialogTitle>
            <DialogDescription>Give this item a title you'll recognise later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">Title</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameId && renameValue.trim()) {
                  patchItem(renameId, { title: renameValue.trim() });
                  toast.success("Renamed");
                }
                setRenameId(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onOpenChange={(next) => !next && setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>
              It will be removed from this browser permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) {
                  deleteItem(deleteId);
                  toast.success("Item deleted");
                }
                setDeleteId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
