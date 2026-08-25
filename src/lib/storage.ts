import type { EmailResult, MeetingResult, ResearchResult, FollowUpAnswer } from "./ai-types";

export type ItemKind = "email" | "meeting" | "research";

export type EmailItemData = EmailResult & {
  purpose: string;
  recipient: string;
  tone: string;
  length: string;
  language: string;
};

export type MeetingItemData = MeetingResult & {
  title: string;
  participants: string;
  notes: string;
};

export type ResearchItemData = ResearchResult & {
  topic: string;
  questions: string;
  depth: string;
  followUps: FollowUpAnswer[];
};

export type StoredItem = {
  id: string;
  kind: ItemKind;
  title: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  data: EmailItemData | MeetingItemData | ResearchItemData;
};

export type Preferences = {
  theme: "light" | "dark";
  language: string;
  defaultTone: string;
  defaultLength: string;
  defaultDepth: string;
  autoSave: boolean;
};

const ITEMS_KEY = "aips.items.v1";
const PREFS_KEY = "aips.prefs.v1";
const SEED_KEY = "aips.seeded.v1";

export const defaultPreferences: Preferences = {
  theme: "light",
  language: "English",
  defaultTone: "professional",
  defaultLength: "medium",
  defaultDepth: "standard",
  autoSave: true,
};

const isBrowser = () => typeof window !== "undefined";

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadItems(): StoredItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ITEMS_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredItem[]) : [];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveItems(items: StoredItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("aips:items-changed"));
}

export function upsertItem(item: StoredItem): StoredItem[] {
  const items = loadItems();
  const index = items.findIndex((i) => i.id === item.id);
  if (index >= 0) items[index] = item;
  else items.unshift(item);
  saveItems(items);
  return items;
}

export function deleteItem(id: string): StoredItem[] {
  const items = loadItems().filter((i) => i.id !== id);
  saveItems(items);
  return items;
}

export function patchItem(id: string, patch: Partial<StoredItem>): StoredItem[] {
  const items = loadItems().map((i) =>
    i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i,
  );
  saveItems(items);
  return items;
}

export function clearAllData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ITEMS_KEY);
  window.localStorage.removeItem(PREFS_KEY);
  window.localStorage.removeItem(SEED_KEY);
  window.dispatchEvent(new Event("aips:items-changed"));
}

export function loadPreferences(): Preferences {
  if (!isBrowser()) return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPreferences, ...(JSON.parse(raw) as Preferences) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: Preferences): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event("aips:prefs-changed"));
}

export function exportData(): string {
  return JSON.stringify({ items: loadItems(), preferences: loadPreferences() }, null, 2);
}

export function importData(json: string): number {
  const parsed = JSON.parse(json) as { items?: StoredItem[]; preferences?: Preferences };
  if (!parsed.items || !Array.isArray(parsed.items)) throw new Error("Invalid backup file");
  const existing = loadItems();
  const byId = new Map(existing.map((i) => [i.id, i]));
  for (const item of parsed.items) byId.set(item.id, item);
  saveItems([...byId.values()]);
  if (parsed.preferences) savePreferences({ ...defaultPreferences, ...parsed.preferences });
  return parsed.items.length;
}

export function download(filename: string, content: string, type = "text/plain"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function itemToText(item: StoredItem): string {
  if (item.kind === "email") {
    const data = item.data as EmailItemData;
    return `Subject: ${data.subject}\n\n${data.body}`;
  }
  if (item.kind === "meeting") {
    const d = item.data as MeetingItemData;
    return [
      `Meeting: ${d.title || item.title}`,
      d.participants ? `Participants: ${d.participants}` : "",
      "",
      "EXECUTIVE SUMMARY",
      d.executiveSummary,
      "",
      "KEY DISCUSSION POINTS",
      ...(d.keyPoints ?? []).map((p) => `- ${p}`),
      "",
      "DECISIONS",
      ...(d.decisions ?? []).map((p) => `- ${p}`),
      "",
      "ACTION ITEMS",
      ...(d.actionItems ?? []).map(
        (a) => `- ${a.task} | Owner: ${a.owner} | Due: ${a.deadline} | Status: ${a.status}`,
      ),
      "",
      "FOLLOW-UP QUESTIONS",
      ...(d.followUpQuestions ?? []).map((p) => `- ${p}`),
    ]
      .filter((line) => line !== undefined)
      .join("\n");
  }
  const d = item.data as ResearchItemData;
  return [
    `Research report: ${d.topic || item.title}`,
    `Depth: ${d.depth}`,
    "",
    "EXECUTIVE OVERVIEW",
    d.overview,
    "",
    "KEY FINDINGS",
    ...(d.keyFindings ?? []).map((p) => `- ${p}`),
    "",
    "IMPORTANT FACTS",
    ...(d.importantFacts ?? []).map((p) => `- ${p}`),
    "",
    "SUPPORTING EVIDENCE",
    ...(d.supportingEvidence ?? []).map((p) => `- ${p}`),
    "",
    "SOURCES",
    ...(d.sources ?? []).map((s) => `- ${s.title} (${s.url})${s.note ? ` — ${s.note}` : ""}`),
    "",
    "RELATED QUESTIONS",
    ...(d.relatedQuestions ?? []).map((p) => `- ${p}`),
    "",
    "SUGGESTED NEXT STEPS",
    ...(d.nextSteps ?? []).map((p) => `- ${p}`),
    ...((d.followUps ?? []).length
      ? ["", "FOLLOW-UPS", ...(d.followUps ?? []).map((f) => `Q: ${f.question}\nA: ${f.answer}`)]
      : []),
  ].join("\n");
}

const now = Date.now();
const day = 86_400_000;

const sampleItems: StoredItem[] = [
  {
    id: "sample-email-1",
    kind: "email",
    title: "Leave request for three days next month",
    createdAt: now - day * 1,
    updatedAt: now - day * 1,
    favorite: true,
    data: {
      purpose: "Ask my manager for three days of leave next month.",
      recipient: "My line manager, Sarah Nkosi",
      tone: "professional",
      length: "medium",
      language: "English",
      subject: "Leave Request: 12–14 September",
      body: `Hi Sarah,

I hope you're doing well. I'd like to request three days of annual leave from 12 to 14 September for a family commitment.

Ahead of the break I'll close out the Q3 reporting pack and hand over the client follow-ups to Thabo so nothing stalls while I'm away. I'm happy to adjust the dates if that week turns out to be difficult for the team.

Please let me know if you'd like anything else from me to confirm the request.

Kind regards,
[Your Name]`,
    },
  },
  {
    id: "sample-meeting-1",
    kind: "meeting",
    title: "Q3 Product Planning Sync",
    createdAt: now - day * 3,
    updatedAt: now - day * 3,
    favorite: false,
    data: {
      title: "Q3 Product Planning Sync",
      participants: "Sarah Nkosi, Thabo Dlamini, Priya Menon, Owen Mkhabele",
      notes:
        "Discussed Q3 roadmap priorities, onboarding drop-off, pricing experiment results and hiring for the platform team.",
      executiveSummary:
        "The team agreed to focus Q3 on reducing onboarding drop-off rather than shipping new integrations. The pricing experiment showed a 6% lift on the annual plan and will be rolled out to all traffic. One platform engineer role is approved for immediate hiring.",
      keyPoints: [
        "Onboarding drop-off is concentrated on step three of the setup wizard.",
        "The annual-plan pricing experiment outperformed control and is safe to roll out.",
        "Integration requests are mostly from two enterprise accounts, so they can wait a quarter.",
        "Platform team is at capacity and blocking two roadmap items.",
      ],
      decisions: [
        "Q3 theme is onboarding activation, not new integrations.",
        "Roll the annual pricing variant out to 100% of traffic.",
        "Open one platform engineer requisition this week.",
      ],
      actionItems: [
        {
          task: "Rebuild step three of the setup wizard with progressive disclosure",
          owner: "Priya Menon",
          deadline: "2026-09-12",
          status: "in-progress",
        },
        {
          task: "Roll out annual pricing variant to all traffic and monitor churn",
          owner: "Thabo Dlamini",
          deadline: "2026-09-02",
          status: "not-started",
        },
        {
          task: "Publish the platform engineer role and brief the recruiter",
          owner: "Sarah Nkosi",
          deadline: "2026-08-28",
          status: "done",
        },
      ],
      followUpQuestions: [
        "What is the churn impact of the pricing change after 30 days?",
        "Can the two enterprise integration requests be met with the existing API?",
      ],
    },
  },
  {
    id: "sample-research-1",
    kind: "research",
    title: "AI adoption in small professional-services firms",
    createdAt: now - day * 5,
    updatedAt: now - day * 5,
    favorite: true,
    data: {
      topic: "AI adoption in small professional-services firms",
      questions: "Where do small firms see the fastest returns? What blocks adoption?",
      depth: "standard",
      overview:
        "Small professional-services firms adopt AI fastest in drafting, summarising and research tasks, where output is reviewed by a human before it leaves the firm. Blockers are rarely technical: confidentiality policy, unclear review workflows and lack of training dominate.",
      keyFindings: [
        "Document drafting and meeting summarisation deliver the earliest measurable time savings.",
        "Firms that define a human review step adopt AI far more consistently than firms that ban or ignore it.",
        "Client confidentiality concerns are the most common formal blocker.",
        "Per-seat cost is rarely the deciding factor at small firm size.",
      ],
      importantFacts: [
        "Drafting and summarising are the two most common first use cases.",
        "Adoption tends to start with individuals before it becomes firm policy.",
        "Written AI usage policies materially increase staff willingness to use the tools.",
      ],
      supportingEvidence: [
        "Industry surveys of small firms consistently rank document drafting as the top AI use case.",
        "Case studies report meeting-note turnaround dropping from hours to minutes with AI summarisation plus human review.",
      ],
      sources: [
        {
          title: "OECD — Artificial intelligence and the labour market",
          url: "https://www.oecd.org",
          note: "Organisation homepage; search their AI and productivity publications.",
        },
        {
          title: "McKinsey — The state of AI",
          url: "https://www.mckinsey.com",
          note: "Annual survey covering adoption by function and firm size.",
        },
      ],
      relatedQuestions: [
        "What does a practical AI usage policy look like for a 20-person firm?",
        "How should firms measure time saved rather than tasks automated?",
      ],
      nextSteps: [
        "Pick one workflow (meeting notes) and measure turnaround before and after.",
        "Draft a one-page AI usage policy covering client data.",
        "Run a 30-minute training session on review-before-send habits.",
      ],
      followUps: [],
    },
  },
];

/** Seeds realistic sample data once per browser so the app is never empty on first visit. */
export function seedSampleDataOnce(): void {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEED_KEY)) return;
  window.localStorage.setItem(SEED_KEY, "1");
  if (loadItems().length === 0) saveItems(sampleItems);
}
