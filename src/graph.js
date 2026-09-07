import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AgentState } from "./state.js";
import { generateRandomNumber, generateRandomWord } from "./tools.js";
import { routerNode, dialogNode, exitNode } from "./nodes.js";

/** ToolNode для вызова генерации числа/слова */
const toolNode = new ToolNode([generateRandomNumber, generateRandomWord]);

/**
 * Граф — каждый invoke обрабатывает ровно один ход:
 *   __start__ → routerNode (LLM classifies)
 *     ├→ random (ToolNode) → __end__
 *     ├→ dialogNode → __end__ (server loop handles next turn)
 *     └→ exitNode → __end__
 */
const graph = new StateGraph(AgentState)
  .addNode("router", routerNode)
  .addNode("random", toolNode)
  .addNode("dialog", dialogNode)
  .addNode("exit", exitNode)

  .addEdge("__start__", "router")

  // Conditional routing based on LLM classification
  .addConditionalEdges("router", (state) => state.mode, {
    random: "random",   // → tool execution, then end
    dialog: "dialog",   // → chat response, then end
    exit: "exit",       // → farewell, then end
    route: "router",    // fallback — re-evaluate
  })

  .addEdge("random", "__end__")
  .addEdge("dialog", "__end__")
  .addEdge("exit", "__end__");

export const agentGraph = graph.compile();
