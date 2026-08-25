import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Download,
  Eraser,
  ExternalLink,
  Microscope,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
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
import { Textarea } from "@/components/ui/textarea";
import { BulletList, CopyButton, EmptyState, ErrorState, LoadingBlock } from "@/components/ui-bits";
import { usePreferences } from "@/hooks/use-app-data";
import { askResearchFollowUp, researchTopic } from "@/lib/ai.functions";
import type { FollowUpAnswer, ResearchResult } from "@/lib/ai-types";
import {
  download,
  itemToText,
  loadItems,
  newId,
  upsertItem,
  type ResearchItemData,
  type StoredItem,
} from "@/lib/storage";

export const Route = createFileRoute("/research")({
  validateSearch: (search: Record<string, unknown>) => ({
    load: typeof search.load === "string" ? search.load : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Research Assistant — AI Productivity Suite" },
      {
        name: "description",
        content:
          "Research any topic and get an overview, key findings, evidence, sources, related questions and next steps.",
      },
      { property: "og:title", content: "AI Research Assistant — AI Productivity Suite" },
      {
        property: "og:description",
        content: "Findings, evidence, sources and follow-up questions on any topic.",
      },
    ],
  }),
  component: ResearchPage,
});

const depths = [
  { value: "quick", label: "Quick scan" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep dive" },
];

function Section({ heading, items }: { heading: string; items?: string[] }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{heading}</h2>
      <div className="mt-3">
        <BulletList items={items} />
      </div>
    </div>
  );
}

function ResearchPage() {
  const { load } = Route.useSearch();
  const navigate = useNavigate();
  const { prefs } = usePreferences();

  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState("");
  const [depth, setDepth] = useState(prefs.defaultDepth);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpAnswer[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askBusy, setAskBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!load) return;
    const item = loadItems().find((i) => i.id === load && i.kind === "research");
    if (!item) return;
    const data = item.data as ResearchItemData;
    setTopic(data.topic);
    setQuestions(data.questions);
    setDepth(data.depth);
    setResult(data);
    setFollowUps(data.followUps ?? []);
    setItemId(item.id);
  }, [load]);

  const persist = (next: ResearchResult, nextFollowUps: FollowUpAnswer[], id?: string) => {
    const useId = id ?? itemId ?? newId();
    const existing = loadItems().find((i) => i.id === useId);
    const item: StoredItem = {
      id: useId,
      kind: "research",
      title: topic || "Untitled research",
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      favorite: existing?.favorite ?? false,
      data: { topic, questions, depth, followUps: nextFollowUps, ...next },
    };
    upsertItem(item);
    setItemId(useId);
    return item;
  };

  const run = async () => {
    if (topic.trim().length < 3) {
      toast.error("Enter a research topic first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const raw = (await researchTopic({
        data: { topic, questions, depth: depth as "quick" | "standard" | "deep" },
      })) as unknown as ResearchResult;
      const normalized: ResearchResult = {
        overview: raw.overview ?? "",
        keyFindings: raw.keyFindings ?? [],
        importantFacts: raw.importantFacts ?? [],
        supportingEvidence: raw.supportingEvidence ?? [],
        sources: raw.sources ?? [],
        relatedQuestions: raw.relatedQuestions ?? [],
        nextSteps: raw.nextSteps ?? [],
      };
      setResult(normalized);
      setFollowUps([]);
      if (prefs.autoSave) persist(normalized, []);
      toast.success("Research complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The AI request failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const ask = async () => {
    if (!result || followUp.trim().length < 3) return;
    setAskBusy(true);
    setError(null);
    const question = followUp;
    setFollowUp("");
    try {
      const answer = await askResearchFollowUp({
        data: { topic, question, context: itemToTextContext(result) },
      });
      const next = [...followUps, answer];
      setFollowUps(next);
      if (prefs.autoSave) persist(result, next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The follow-up failed. Please retry.");
    } finally {
      setAskBusy(false);
    }
  };

  const startNew = () => {
    setTopic("");
    setQuestions("");
    setResult(null);
    setFollowUps([]);
    setItemId(null);
    setError(null);
    navigate({ to: "/research", search: {} });
  };

  const exportText = result
    ? itemToText({
        id: itemId ?? "draft",
        kind: "research",
        title: topic || "Research report",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        favorite: false,
        data: { topic, questions, depth, followUps, ...result },
      })
    : "";

  return (
    <AppShell title="AI Research Assistant" description="Structured research with clear sources">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form
          className="surface h-fit space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="topic">Research topic</Label>
            <Input
              id="topic"
              required
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="AI adoption in small professional-services firms"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="questions">Research questions</Label>
            <Textarea
              id="questions"
              rows={5}
              value={questions}
              onChange={(event) => setQuestions(event.target.value)}
              placeholder="What drives adoption? What blocks it? Where are the fastest returns?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depth">Research depth</Label>
            <Select value={depth} onValueChange={setDepth}>
              <SelectTrigger id="depth">
                <SelectValue placeholder="Depth" />
              </SelectTrigger>
              <SelectContent>
                {depths.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              <Sparkles className="size-4" aria-hidden />
              {busy ? "Researching…" : "Start Research"}
            </Button>
            <Button type="button" variant="outline" onClick={startNew} disabled={busy}>
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
            <LoadingBlock lines={9} label="Gathering findings, evidence and sources…" />
          ) : result ? (
            <div className="space-y-8">
              <div className="flex flex-wrap gap-2">
                <CopyButton text={exportText} label="Copy report" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    download(
                      `${(topic || "research-report").replace(/[^\w -]+/g, "").slice(0, 50)}.txt`,
                      exportText,
                    )
                  }
                >
                  <Download className="size-4" aria-hidden /> Export
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    persist(result, followUps);
                    toast.success("Findings saved");
                  }}
                >
                  <Bookmark className="size-4" aria-hidden /> Save findings
                </Button>
                <Button variant="outline" size="sm" onClick={startNew}>
                  <Plus className="size-4" aria-hidden /> New research
                </Button>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Executive overview</h2>
                <p className="mt-3 text-sm leading-relaxed">{result.overview}</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Section heading="Key findings" items={result.keyFindings} />
                <Section heading="Important facts" items={result.importantFacts} />
              </div>

              <Section heading="Supporting evidence" items={result.supportingEvidence} />

              <div>
                <h2 className="text-base font-semibold">Sources &amp; references</h2>
                {result.sources.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {result.sources.map((source, index) => (
                      <li key={index} className="rounded-xl border p-3.5">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          {source.title || source.url}
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                        {source.note ? (
                          <p className="mt-1 text-sm text-muted-foreground">{source.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No sources were returned. Verify key claims independently.
                  </p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Section heading="Related questions" items={result.relatedQuestions} />
                <Section heading="Suggested next steps" items={result.nextSteps} />
              </div>

              <div className="rounded-2xl border bg-muted/40 p-5">
                <h2 className="text-base font-semibold">Ask a follow-up question</h2>
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void ask();
                  }}
                >
                  <Input
                    aria-label="Follow-up question"
                    value={followUp}
                    onChange={(event) => setFollowUp(event.target.value)}
                    placeholder="What would a practical rollout plan look like?"
                  />
                  <Button type="submit" disabled={askBusy}>
                    <Send className="size-4" aria-hidden />
                    {askBusy ? "Asking…" : "Ask"}
                  </Button>
                </form>

                {askBusy ? (
                  <div className="mt-4">
                    <LoadingBlock lines={3} />
                  </div>
                ) : null}

                {followUps.length ? (
                  <ul className="mt-4 space-y-3">
                    {followUps.map((entry, index) => (
                      <li key={index} className="rounded-xl border bg-card p-4">
                        <p className="text-sm font-semibold">{entry.question}</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {entry.answer}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Microscope className="size-5" aria-hidden />}
              title="No research yet"
              description="Enter a topic and any specific questions, choose a depth, then press Start Research."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function itemToTextContext(result: ResearchResult): string {
  return [
    result.overview,
    ...result.keyFindings,
    ...result.importantFacts,
    ...result.supportingEvidence,
  ].join("\n");
}
