import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { model } from "./models.js";

const WELCOME = `Привет! Я агент на LangGraph.

Доступные действия:
• 'сгенерируй число' — случайное число 1-100
• 'сгенерируй слово' — случайное слово из словаря

Напиши 'выход' или 'пока' чтобы завершить разговор.`;

/** Проверка auth-ошибки по всем полям */
function isAuthError(err) {
  const errName = (err.name || err.constructor?.name || "").toLowerCase();
  const errData = err.response?.data || err.data || err.parsed_response;
  const errMessage = (errData?.message || "").toLowerCase();
  return errName.includes("auth") || errMessage.includes("credential") || errMessage.includes("token");
}

let lastAuthErrorTime = 0;

function handleModelError(label) {
  return (err) => {
    if (isAuthError(err)) {
      console.error(`[${label}] ⚠️ Ошибка аутентификации GigaChat`);
      const now = Date.now();
      if (now - lastAuthErrorTime > 5000) {
        lastAuthErrorTime = now;
        console.warn("[router] ⚠️ Ошибка аутентификации GigaChat. Проверьте GIGACHAT_ACCESS_TOKEN в .env");
      }
      throw Object.assign(new Error(err.message), { isAuthError: true });
    }
    console.error(`[${label}] MODEL ERROR:`, err?.message || String(err));
    throw err;
  };
}

/** Router Node — вызывает LLM для определения команды пользователя */
export async function routerNode(state) {
  const messages = state.messages;

  // Первое сообщение — приветствие
  if (messages.length === 0) {
    return { messages: [new HumanMessage(WELCOME)], mode: "route" };
  }

  // Берём последнее сообщение пользователя
  const lastHuman = [...messages].reverse().find((m) => m._getType() === "human");
  if (!lastHuman) {
    return { messages: [new HumanMessage(WELCOME)], mode: "route" };
  }

  const text = typeof lastHuman.content === "string" ? lastHuman.content : "";

  // Собираем только human-сообщения для контекста
  const humanOnly = messages.filter((m) => m._getType() === "human");

  // Вызываем LLM для классификации запроса (только текущее сообщение без истории)
  let response;
  try {
    response = await model.invoke([
      new SystemMessage(
        "Ты — маршрутизатор чата. Ответь ТОЧНО одним словом.\n\n" +
        "Правила:\n" +
        "- random — ТОЛЬКО если просят число или слово (сгенерируй, рандом)\n" +
        "- exit — если говорят 'выход', 'пока', 'стоп'\n" +
        "- dialog — ВСЁ ОСТАЛЬНОЕ (приветствия, вопросы, разговоры)\n\n" +
        `Текущее сообщение пользователя: "${text}"`
      ),
      new HumanMessage(text),
    ]);
  } catch (err) {
    handleModelError("router")(err);
    return { mode: "dialog" };
  }

  const raw = String(response.content ?? "").trim().toLowerCase();

  let mode = "dialog";
  if (raw.includes("random")) mode = "random";
  else if (raw.includes("exit")) mode = "exit";

  if (mode === "random") {
    return {
      messages: [new AIMessage({
        content: "",
        tool_calls: [
          {
            name: text.toLowerCase().includes("слово") ? "generate_random_word" : "generate_random_number",
            args: text.toLowerCase().includes("слово") ? {} : { min: 1, max: 100 },
            id: `call_${Date.now()}`,
          },
        ],
      })],
      mode,
    };
  }

  return { mode };
}

/** Dialog Node — отвечает пользователю через LLM */
export async function dialogNode(state) {
  // Берём последнее human-сообщение для контекста ответа
  const lastHuman = [...state.messages].reverse().find((m) => m._getType() === "human");
  const text = lastHuman ? (typeof lastHuman.content === "string" ? lastHuman.content : "") : "";

  try {
    const response = await model.invoke([
      new SystemMessage(
        "Ты — дружелюбный помощник. Отвечай на русском языке кратко и по делу."
      ),
      new HumanMessage(text),
    ]);
    return { messages: [response], mode: "route" };
  } catch (err) {
    if (isAuthError(err)) {
      // Auth-ошибка — выходим из цикла
      return {
        messages: [new HumanMessage("⚠️ Ошибка аутентификации GigaChat. Проверьте credentials в .env")],
        mode: "exit",
      };
    }
    console.warn("Dialog fallback — LLM unavailable");
    return {
      messages: [new HumanMessage("⚠️ Модель временно недоступна. Попробуйте позже.")],
      mode: "route",
    };
  }
}

/** Exit Node — добавляет прощальное сообщение */
export async function exitNode(state) {
  return {
    messages: [...state.messages, new HumanMessage("До свидания! 👋")],
  };
}
