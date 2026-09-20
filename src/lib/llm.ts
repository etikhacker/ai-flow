import OpenAI from "openai";
import type { Answer } from "./types";

let client: OpenAI | null = null;
const getClient = () =>
  (client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  }));

const SYSTEM = `You are a decision node inside an automated workflow.
Answer the question about the given input with exactly one word: YES or NO.
No punctuation, no explanation, no other text.`;

/** Parse a model reply into YES/NO. Throws when the model breaks the contract. */
export function parseAnswer(raw: string): Answer {
  const m = raw.trim().toUpperCase().match(/^(YES|NO)\b/);
  if (!m) throw new Error(`Model returned an invalid answer: "${raw.slice(0, 60)}"`);
  return m[1] as Answer;
}

export async function askYesNo(prompt: string, input: string): Promise<Answer> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await getClient().chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Question: ${prompt}\n\nInput:\n${input}` },
    ],
  });
  return parseAnswer(res.choices[0]?.message?.content ?? "");
}