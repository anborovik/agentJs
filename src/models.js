import { config as dotenvConfig } from "dotenv";
import { Agent } from "node:https";
import { GigaChat } from "langchain-gigachat";

dotenvConfig({ path: new URL("../.env", import.meta.url) });

export function createGigaChat() {
  const auth = { httpsAgent: new Agent({ rejectUnauthorized: false }) };

  if (process.env.GIGACHAT_CREDENTIALS) {
    return new GigaChat({ ...auth, credentials: process.env.GIGACHAT_CREDENTIALS, scope: process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS" });
  }

  throw new Error("Не указаны учётные данные GigaChat (GIGACHAT_ACCESS_TOKEN или GIGACHAT_CREDENTIALS)");
}

export const model = createGigaChat();
