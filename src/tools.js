import { randomInt, randomBytes } from "node:crypto";
import { tool } from "@langchain/core/tools";

const WORDS = [
  "кот", "собака", "солнце", "облако", "река", "гора", "лес", "море",
  "ветер", "камень", "цветок", "птица", "рыба", "звезда", "огонь", "вода",
  "книга", "дорога", "мост", "рассвет", "закат", "гармония", "идея",
];

/** Генерирует случайное число */
export const generateRandomNumber = tool(
  async (input) => {
    const num = randomInt(input.min, input.max + 1);
    return String(num);
  },
  {
    name: "generate_random_number",
    description: "Генерирует случайное число в заданном диапазоне от min до max",
    schema: {
      type: "object",
      properties: {
        min: { type: "number", description: "Минимальное значение" },
        max: { type: "number", description: "Максимальное значение" },
      },
      required: ["min", "max"],
    },
  }
);

/** Генерирует случайное слово */
export const generateRandomWord = tool(
  async () => {
    const bytes = randomBytes(4);
    const index = Math.abs(bytes.readInt32BE(0)) % WORDS.length;
    return WORDS[index];
  },
  {
    name: "generate_random_word",
    description: "Генерирует случайное слово из словаря",
    schema: { type: "object", properties: {}, required: [] },
  }
);
