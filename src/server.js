import readline from "node:readline";
import { HumanMessage } from "@langchain/core/messages";
import { agentGraph } from "./graph.js";

async function startAgent() {
  console.log("🤖 Агент LangGraph запущен\n");
  console.log("Доступные команды:");
  console.log("  • 'сгенерируй число' — случайное число (1-100)");
  console.log("  • 'сгенерируй слово' — случайное слово из словаря\n");
  console.log("Напишите 'выход', 'стоп' или 'пока' для завершения.\n");

  let config = { configurable: { thread_id: "main" } };
  let messages = [];

  async function processInput(input) {
    const trimmed = input.trim();
    if (!trimmed) return;

    messages.push(new HumanMessage(trimmed));

    // Invoke проходит один ход: router → одна нода → end
    const result = await agentGraph.invoke(
      { messages: [...messages] },
      { config }
    );

    if (!result) return;

    // Находим ответ AI или результат инструмента
    let responseContent = null;
    for (const m of [...result.messages].reverse()) {
      const content = typeof m.content === "string" ? m.content : "";
      if ((m._getType() === "ai" || m._getType() === "tool") && content && !content.includes("Error")) {
        responseContent = content;
        break;
      }
    }

    if (responseContent) {
      console.log(`\nАгент: ${responseContent}\n`);
    }

    // Выход по mode или по тексту
    const isExit = result.mode === "exit" ||
      (responseContent ?? "").toString().toLowerCase().includes("до свидания");

    if (isExit) {
      // Показываем прощальное сообщение
      for (const m of [...result.messages].reverse()) {
        const content = typeof m.content === "string" ? m.content : "";
        if (content.includes("До свидания")) {
          console.log(`\n${content}\n`);
          break;
        }
      }
      rl.close();
      process.exit(0);
    }

    ask();
  }

  function ask() {
    rl.question("Вы: ", (input) => {
      processInput(input).catch(() => ask());
    });
  }

  ask();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
startAgent().catch((err) => {
  console.error("Ошибка запуска:", err);
});
