import { Faith, Language, DailyBlessingResponse, QAResponse, ScriptureResponse } from "./types";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const API_URL = "/api/openai";

export async function getDailyBlessing(faith: Faith, language: Language): Promise<DailyBlessingResponse> {
  const response = await fetch(`${API_URL}/blessing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ faith, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get daily blessing: ${response.statusText}`);
  }

  return await response.json();
}

export async function getQAResponse(
  faith: Faith, 
  question: string, 
  compareMode: boolean = false,
  language: Language
): Promise<QAResponse> {
  const response = await fetch(`${API_URL}/question`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ faith, question, compareMode, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get Q&A response: ${response.statusText}`);
  }

  return await response.json();
}

export async function getScripturePassage(
  faith: Faith,
  source: string,
  reference: string,
  language: Language
): Promise<ScriptureResponse> {
  const response = await fetch(`${API_URL}/scripture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ faith, source, reference, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get scripture passage: ${response.statusText}`);
  }

  return await response.json();
}
