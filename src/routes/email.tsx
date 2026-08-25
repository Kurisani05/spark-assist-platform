import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Download,
  Eraser,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Sparkles,
  Wand2,
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
import { CopyButton, EmptyState, ErrorState, LoadingBlock } from "@/components/ui-bits";
import { usePreferences } from "@/hooks/use-app-data";
import { generateEmail } from "@/lib/ai.functions";
import type { EmailRefineAction } from "@/lib/ai-types";
import {
  download,
  loadItems,
  newId,
  upsertItem,
  type EmailItemData,
  type StoredItem,
} from "@/lib/storage";

export const Route = createFileRoute("/email")({
  validateSearch: (search: Record<string, unknown>) => ({
    load: typeof search.load === "string" ? search.load : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Smart Email Generator — AI Productivity Suite" },
      {
        name: "description",
        content:
          "Describe your intent and generate a polished email with subject line, tone, length and language control.",
      },
      { property: "og:title", content: "Smart Email Generator — AI Productivity Suite" },
      {
        property: "og:description",
        content: "Generate polished emails with tone, length and language control.",
      },
    ],
  }),
  component: EmailPage,
});

const tones = ["professional", "friendly", "formal", "persuasive", "apologetic", "concise"];
const lengths = [
  { value: "short", label: "Short — a few lines" },
  { value: "medium", label: "Medium — standard email" },
  { value: "long", label: "Long — detailed" },
];
const languages = ["English", "Afrikaans", "isiZulu", "French", "Spanish", "German", "Portuguese"];

const example = "Ask my manager for three days of leave next month.";

function EmailPage() {
  const { load } = Route.useSearch();
  const navigate = useNavigate();
  const { prefs } = usePreferences();

  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState(prefs.defaultTone);
  const [length, setLength] = useState(prefs.defaultLength);
  const [language, setLanguage] = useState(prefs.language);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [itemId, setItemId] = useState<string | null>(null);
  const [pending, setPending] = useState<null | EmailRefineAction>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTone((current) => current || prefs.defaultTone);
    setLength((current) => current || prefs.defaultLength);
    setLanguage((current) => current || prefs.language);
  }, [prefs]);

  useEffect(() => {
    if (!load) return;
    const item = loadItems().find((i) => i.id === load && i.kind === "email");
    if (!item) return;
    const data = item.data as EmailItemData;
    setPurpose(data.purpose);
    setRecipient(data.recipient);
    setTone(data.tone);
    setLength(data.length);
    setLanguage(data.language);
    setSubject(data.subject);
    setBody(data.body);
    setItemId(item.id);
  }, [load]);

  const persist = (nextSubject: string, nextBody: string) => {
    const id = itemId ?? newId();
    const existing = loadItems().find((i) => i.id === id);
    const item: StoredItem = {
      id,
      kind: "email",
      title: nextSubject || purpose.slice(0, 70) || "Untitled email",
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      favorite: existing?.favorite ?? false,
      data: { purpose, recipient, tone, length, language, subject: nextSubject, body: nextBody },
    };
    upsertItem(item);
    setItemId(id);
    return item;
  };

  const run = async (action: EmailRefineAction, overrideTone?: string) => {
    if (purpose.trim().length < 3) {
      toast.error("Describe what the email should say first");
      return;
    }
    setPending(action);
    setError(null);
    try {
      const result = await generateEmail({
        data: {
          purpose,
          recipient,
          tone: overrideTone ?? tone,
          length,
          language,
          action,
          currentSubject: subject,
          currentBody: body,
        },
      });
      setSubject(result.subject ?? "");
      setBody(result.body ?? "");
      if (prefs.autoSave) persist(result.subject ?? "", result.body ?? "");
      toast.success(action === "regenerate" ? "Email generated" : "Draft updated");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "The AI request failed. Please retry.";
      setError(message);
    } finally {
      setPending(null);
    }
  };

  const clear = () => {
    setPurpose("");
    setRecipient("");
    setSubject("");
    setBody("");
    setItemId(null);
    setError(null);
    navigate({ to: "/email", search: {} });
  };

  const hasResult = Boolean(subject || body);
  const busy = pending !== null;

  return (
    <AppShell
      title="Smart Email Generator"
      description="Describe the situation — get a send-ready email"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form
          className="surface h-fit space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void run("regenerate");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="purpose">Email purpose / context</Label>
            <Textarea
              id="purpose"
              rows={4}
              required
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder={example}
            />
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => {
                setPurpose(example);
                setRecipient("My line manager");
              }}
            >
              Use the example brief
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient / extra context</Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="e.g. My line manager, Sarah"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((value) => (
                    <SelectItem key={value} value={value} className="capitalize">
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger id="length">
                  <SelectValue placeholder="Length" />
                </SelectTrigger>
                <SelectContent>
                  {lengths.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              <Sparkles className="size-4" aria-hidden />
              {pending === "regenerate" ? "Generating…" : "Generate"}
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
              <ErrorState message={error} onRetry={() => void run(pending ?? "regenerate")} />
            </div>
          ) : null}

          {busy && !hasResult ? (
            <LoadingBlock lines={7} label="Writing your email…" />
          ) : hasResult ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email body</Label>
                <Textarea
                  id="body"
                  rows={16}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void run("regenerate")}>
                  <RefreshCcw className="size-4" aria-hidden /> Regenerate
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void run("improve")}>
                  <Wand2 className="size-4" aria-hidden /> Improve
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void run("shorten")}>
                  <Minimize2 className="size-4" aria-hidden /> Shorten
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void run("expand")}>
                  <Maximize2 className="size-4" aria-hidden /> Expand
                </Button>
                <Select
                  onValueChange={(value) => {
                    setTone(value);
                    void run("tone", value);
                  }}
                >
                  <SelectTrigger size="sm" className="w-[160px]" aria-label="Change tone">
                    <SelectValue placeholder="Change tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((value) => (
                      <SelectItem key={value} value={value} className="capitalize">
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CopyButton text={`Subject: ${subject}\n\n${body}`} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    download(
                      `${(subject || "email").replace(/[^\w -]+/g, "").slice(0, 50)}.txt`,
                      `Subject: ${subject}\n\n${body}`,
                    )
                  }
                >
                  <Download className="size-4" aria-hidden /> Export
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    persist(subject, body);
                    toast.success("Saved to your history");
                  }}
                >
                  <Bookmark className="size-4" aria-hidden /> Save
                </Button>
              </div>
              {busy ? <p className="text-sm text-muted-foreground">Updating the draft…</p> : null}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="size-5" aria-hidden />}
              title="No email yet"
              description="Describe the purpose of your email on the left and hit Generate. You can edit and refine everything afterwards."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
