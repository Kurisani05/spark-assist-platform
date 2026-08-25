import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailInput = z.object({
  purpose: z.string().min(3),
  recipient: z.string().default(""),
  tone: z.string().default("professional"),
  length: z.string().default("medium"),
  language: z.string().default("English"),
  action: z.enum(["regenerate", "improve", "shorten", "expand", "tone"]).optional(),
  currentSubject: z.string().optional(),
  currentBody: z.string().optional(),
});

const meetingInput = z.object({
  title: z.string().default(""),
  participants: z.string().default(""),
  notes: z.string().min(20),
});

const researchInput = z.object({
  topic: z.string().min(3),
  questions: z.string().default(""),
  depth: z.enum(["quick", "standard", "deep"]).default("standard"),
});

const followUpInput = z.object({
  topic: z.string().min(1),
  question: z.string().min(2),
  context: z.string().default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailInput.parse(input))
  .handler(async ({ data }) => {
    const { callAi, parseJsonOutput } = await import("./ai-gateway.server");
    const lengthHint = {
      short: "about 60-90 words",
      medium: "about 120-180 words",
      long: "about 220-300 words",
    }[data.length] ?? "about 120-180 words";

    const refine =
      data.action && data.action !== "regenerate" && data.currentBody
        ? `\nRefine this existing draft with the action "${data.action}".\nCurrent subject: ${data.currentSubject ?? ""}\nCurrent body:\n${data.currentBody}`
        : "";

    const text = await callAi({
      system:
        "You are an expert business email writer. Always answer with a single JSON object " +
        'of shape {"subject": string, "body": string}. The body is plain text with real line ' +
        "breaks, greeting and sign-off included, no markdown, no placeholders other than " +
        "[Your Name] when the sender name is unknown.",
      json: true,
      prompt: `Write an email.
Purpose/context: ${data.purpose}
Recipient/context: ${data.recipient || "unspecified"}
Tone: ${data.tone}
Target length: ${data.length} (${lengthHint})
Language: ${data.language}${refine}`,
    });

    return parseJsonOutput<{ subject: string; body: string }>(text);
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => meetingInput.parse(input))
  .handler(async ({ data }) => {
    const { callAi, parseJsonOutput } = await import("./ai-gateway.server");
    const text = await callAi({
      system:
        "You are a meticulous meeting analyst. Answer with a single JSON object of shape " +
        '{"executiveSummary": string, "keyPoints": string[], "decisions": string[], ' +
        '"actionItems": [{"task": string, "owner": string, "deadline": string, "status": ' +
        '"not-started"|"in-progress"|"done"}], "followUpQuestions": string[]}. ' +
        'Use "Unassigned" for unknown owners and "No date" for unknown deadlines.',
      json: true,
      prompt: `Summarize the following meeting.
Title: ${data.title || "Untitled meeting"}
Participants: ${data.participants || "unspecified"}
Notes / transcript:
${data.notes}`,
    });

    return parseJsonOutput<Record<string, unknown>>(text);
  });

export const researchTopic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => researchInput.parse(input))
  .handler(async ({ data }) => {
    const { callAi, parseJsonOutput } = await import("./ai-gateway.server");
    const depthHint = {
      quick: "3-4 items per list, concise",
      standard: "5-6 items per list, balanced detail",
      deep: "7-9 items per list, thorough and nuanced",
    }[data.depth];

    const text = await callAi({
      system:
        "You are a rigorous research analyst. Answer with a single JSON object of shape " +
        '{"overview": string, "keyFindings": string[], "importantFacts": string[], ' +
        '"supportingEvidence": string[], "sources": [{"title": string, "url": string, ' +
        '"note": string}], "relatedQuestions": string[], "nextSteps": string[]}. ' +
        "Only cite sources you are confident exist; use the organisation's homepage URL when " +
        "unsure of a deep link, and say so in the note. Never invent statistics.",
      json: true,
      prompt: `Research topic: ${data.topic}
Specific questions: ${data.questions || "none provided"}
Depth: ${data.depth} (${depthHint})`,
    });

    return parseJsonOutput<Record<string, unknown>>(text);
  });

export const askResearchFollowUp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => followUpInput.parse(input))
  .handler(async ({ data }) => {
    const { callAi } = await import("./ai-gateway.server");
    const answer = await callAi({
      system:
        "You are a research analyst answering a follow-up question. Reply in clear plain " +
        "text, 2-5 short paragraphs or bullet lines. No markdown headings.",
      prompt: `Research topic: ${data.topic}
Existing findings for context:
${data.context.slice(0, 6000)}

Follow-up question: ${data.question}`,
    });

    return { question: data.question, answer };
  });
