import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bookmark, Download, Eraser, NotebookPen, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BulletList, CopyButton, EmptyState, ErrorState, LoadingBlock } from "@/components/ui-bits";
import { usePreferences } from "@/hooks/use-app-data";
import { summarizeMeeting } from "@/lib/ai.functions";
import type { ActionItem, MeetingResult } from "@/lib/ai-types";
import {
  download,
  itemToText,
  loadItems,
  newId,
  upsertItem,
  type MeetingItemData,
  type StoredItem,
} from "@/lib/storage";

export const Route = createFileRoute("/meetings")({
  validateSearch: (search: Record<string, unknown>) => ({
    load: typeof search.load === "string" ? search.load : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Meeting Note Summarizer — AI Productivity Suite" },
      {
        name: "description",
        content:
          "Paste meeting notes or a transcript and get an executive summary, decisions and action items with owners and deadlines.",
      },
      { property: "og:title", content: "Meeting Note Summarizer — AI Productivity Suite" },
      {
        property: "og:description",
        content: "Turn raw meeting notes into decisions, owners and deadlines.",
      },
    ],
  }),
  component: MeetingsPage,
});

const sampleNotes = `Sarah opened by reviewing Q3 priorities. Onboarding drop-off is worst on step three of the setup wizard.
Thabo shared pricing experiment results: annual plan variant lifted conversion 6% over control, no churn signal yet.
Priya said the platform team is at capacity; two roadmap items are blocked.
Agreed: Q3 theme is onboarding activation, integrations wait a quarter. Roll pricing variant to 100%.
Sarah will open one platform engineer role this week. Priya rebuilds wizard step three by mid September.`;

const statusLabels: Record<ActionItem["status"], string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done",
};

function MeetingsPage() {
  const { load } = Route.useSearch();
  const navigate = useNavigate();
  const { prefs } = usePreferences();

  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!load) return;
    const item = loadItems().find((i) => i.id === load && i.kind === "meeting");
    if (!item) return;
    const data = item.data as MeetingItemData;
    setTitle(data.title);
    setParticipants(data.participants);
    setNotes(data.notes);
    setResult(data);
    setItemId(item.id);
  }, [load]);

  const persist = (next: MeetingResult) => {
    const id = itemId ?? newId();
    const existing = loadItems().find((i) => i.id === id);
    const item: StoredItem = {
      id,
      kind: "meeting",
      title: title || "Untitled meeting",
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      favorite: existing?.favorite ?? false,
      data: { title, participants, notes, ...next },
    };
    upsertItem(item);
    setItemId(id);
    return item;
  };

  const run = async () => {
    if (notes.trim().length < 20) {
      toast.error("Paste a few more lines of notes to summarize");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const raw = (await summarizeMeeting({
        data: { title, participants, notes },
      })) as unknown as MeetingResult;
      const normalized: MeetingResult = {
        executiveSummary: raw.executiveSummary ?? "",
        keyPoints: raw.keyPoints ?? [],
        decisions: raw.decisions ?? [],
        actionItems: (raw.actionItems ?? []).map((a) => ({
          task: a.task ?? "",
          owner: a.owner || "Unassigned",
          deadline: a.deadline || "No date",
          status: a.status ?? "not-started",
        })),
        followUpQuestions: raw.followUpQuestions ?? [],
      };
      setResult(normalized);
      if (prefs.autoSave) persist(normalized);
      toast.success("Meeting summarized");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The AI request failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const updateActionItem = (index: number, patch: Partial<ActionItem>) => {
    if (!result) return;
    const actionItems = result.actionItems.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    setResult({ ...result, actionItems });
  };

  const clear = () => {
    setTitle("");
    setParticipants("");
    setNotes("");
    setResult(null);
    setItemId(null);
    setError(null);
    navigate({ to: "/meetings", search: {} });
  };

  const exportText = result
    ? itemToText({
        id: itemId ?? "draft",
        kind: "meeting",
        title: title || "Meeting summary",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        favorite: false,
        data: { title, participants, notes, ...result },
      })
    : "";

  return (
    <AppShell
      title="Meeting Note Summarizer"
      description="Notes in, decisions and action items out"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form
          className="surface h-fit space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Meeting title</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Q3 Product Planning Sync"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participants">Participants</Label>
            <Input
              id="participants"
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="Sarah, Thabo, Priya"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes or transcript</Label>
            <Textarea
              id="notes"
              rows={14}
              required
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste raw notes or a full transcript…"
            />
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => {
                setTitle("Q3 Product Planning Sync");
                setParticipants("Sarah Nkosi, Thabo Dlamini, Priya Menon");
                setNotes(sampleNotes);
              }}
            >
              Load sample notes
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              <Sparkles className="size-4" aria-hidden />
              {busy ? "Summarizing…" : "Summarize"}
            </Button>
            <Button type="button" variant="outline" onClick={clear} disabled={busy}>
              <Eraser className="size-4" aria-hidden />
              Clear
            </Button>
          </div>
        </form>

        <section className="surface p-6" aria-live="polite">
          {error ? (
            <div className="mb-5">
              <ErrorState message={error} onRetry={() => void run()} />
            </div>
          ) : null}

          {busy && !result ? (
            <LoadingBlock lines={8} label="Reading the notes and extracting action items…" />
          ) : result ? (
            <div className="space-y-8">
              <div className="flex flex-wrap gap-2">
                <CopyButton text={exportText} label="Copy summary" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    download(
                      `${(title || "meeting-summary").replace(/[^\w -]+/g, "").slice(0, 50)}.txt`,
                      exportText,
                    )
                  }
                >
                  <Download className="size-4" aria-hidden /> Export
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    persist(result);
                    toast.success("Saved to your history");
                  }}
                >
                  <Bookmark className="size-4" aria-hidden /> Save
                </Button>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Executive summary</h2>
                <Textarea
                  className="mt-3 leading-relaxed"
                  rows={5}
                  aria-label="Executive summary"
                  value={result.executiveSummary}
                  onChange={(event) =>
                    setResult({ ...result, executiveSummary: event.target.value })
                  }
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="text-base font-semibold">Key discussion points</h2>
                  <div className="mt-3">
                    <BulletList items={result.keyPoints} />
                  </div>
                </div>
                <div>
                  <h2 className="text-base font-semibold">Decisions</h2>
                  <div className="mt-3">
                    <BulletList items={result.decisions} empty="No decisions were recorded." />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold">Action items</h2>
                {result.actionItems.length ? (
                  <div className="mt-3 overflow-x-auto rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[220px]">Task</TableHead>
                          <TableHead className="min-w-[140px]">Owner</TableHead>
                          <TableHead className="min-w-[130px]">Deadline</TableHead>
                          <TableHead className="min-w-[150px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.actionItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                aria-label={`Task ${index + 1}`}
                                value={item.task}
                                onChange={(event) =>
                                  updateActionItem(index, { task: event.target.value })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                aria-label={`Owner for task ${index + 1}`}
                                value={item.owner}
                                onChange={(event) =>
                                  updateActionItem(index, { owner: event.target.value })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                aria-label={`Deadline for task ${index + 1}`}
                                value={item.deadline}
                                onChange={(event) =>
                                  updateActionItem(index, { deadline: event.target.value })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.status}
                                onValueChange={(value) =>
                                  updateActionItem(index, {
                                    status: value as ActionItem["status"],
                                  })
                                }
                              >
                                <SelectTrigger
                                  size="sm"
                                  aria-label={`Status for task ${index + 1}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(statusLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No action items were identified in these notes.
                  </p>
                )}
              </div>

              <div>
                <h2 className="text-base font-semibold">Follow-up questions</h2>
                <div className="mt-3">
                  <BulletList items={result.followUpQuestions} empty="No open questions." />
                </div>
              </div>

              <Badge variant="secondary">Edits are saved when you press Save</Badge>
            </div>
          ) : (
            <EmptyState
              icon={<NotebookPen className="size-5" aria-hidden />}
              title="No summary yet"
              description="Paste your meeting notes or transcript on the left and press Summarize."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
