import { StateSchema, MessagesValue } from "@langchain/langgraph";
import * as z from "zod";

export const ModeEnum = z.enum(["route", "random", "dialog", "exit"]);

export const AgentState = new StateSchema({
  messages: MessagesValue,
  mode: ModeEnum.default("route"),
});
