export type EmailTone =
  | "professional"
  | "friendly"
  | "formal"
  | "persuasive"
  | "apologetic"
  | "concise";

export type EmailLength = "short" | "medium" | "long";

export type EmailResult = {
  subject: string;
  body: string;
};

export type EmailRequest = {
  purpose: string;
  recipient: string;
  tone: EmailTone;
  length: EmailLength;
  language: string;
};

export type EmailRefineAction = "regenerate" | "improve" | "shorten" | "expand" | "tone";

export type ActionItem = {
  task: string;
  owner: string;
  deadline: string;
  status: "not-started" | "in-progress" | "done";
};

export type MeetingResult = {
  executiveSummary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  followUpQuestions: string[];
};

export type ResearchDepth = "quick" | "standard" | "deep";

export type ResearchSource = {
  title: string;
  url: string;
  note: string;
};

export type ResearchResult = {
  overview: string;
  keyFindings: string[];
  importantFacts: string[];
  supportingEvidence: string[];
  sources: ResearchSource[];
  relatedQuestions: string[];
  nextSteps: string[];
};

export type FollowUpAnswer = {
  question: string;
  answer: string;
};
