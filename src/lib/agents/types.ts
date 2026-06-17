import type { CrisisScenario } from "@/lib/scenarios/crisisScenarios";
export type CrisisAgentId = "commander"|"security"|"operations"|"legal"|"finance"|"pr"|"executive"|"human";
export type AgentContext = { scenario: CrisisScenario; previousMessages: CrisisMessage[]; useExternalModels?: boolean; useBand?: boolean };
export type CrisisMessage = { id:string; at:string; agentId:CrisisAgentId; agent:string; role:string; model:string; status:"thinking"|"sent"|"decision"|"conflict"; content:string; decision?:string; bandRoom?:string; handoffTo?:CrisisAgentId[] };
export type AgentDefinition = { id:CrisisAgentId; name:string; role:string; model:string; prompt:string; handoffTo:CrisisAgentId[]; run:(ctx:AgentContext)=>Promise<Omit<CrisisMessage,"id"|"at"|"agentId"|"agent"|"role"|"model">> };
