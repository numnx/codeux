import type { JulesActivity } from "../../contracts/app-types.js";

export interface JulesClient {
  getFullConversation(sessionId: string): Promise<JulesActivity[]>;
}
