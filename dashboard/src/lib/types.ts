// Mirrors the orchestrator's credential model (orchestrator/src/runner/tool-credentials.ts).
export type ToolPolicy = 'shared' | 'client-owned';

export interface AdminTool {
  policy?: ToolPolicy;
  envKeys?: string[];
  command?: string;
  args?: string[];
}
export interface AdminToolConfig {
  tools: Record<string, AdminTool>;
}

/** Admin view payload: the registry + which shared keys are present in the system .env. */
export interface AdminToolsResponse {
  configPath: string;
  tools: Record<string, AdminTool>;
  /** per env var name: is it set in the system .env? (value never returned) */
  systemEnvKeys: Record<string, boolean>;
}

export interface ToolClientStatus {
  token: string;
  policy: ToolPolicy;
  envKeys: string[];
  /** for client-owned: which of the tool's envKeys the client has provided (names only). */
  providedKeys: string[];
  connected: boolean; // client-owned: has all envKeys; shared: agency-provided
}
export interface ClientStatusResponse {
  clientId: string;
  tools: ToolClientStatus[];
}

export interface TestConnectionResult {
  ok: boolean;
  detail: string;
  live: boolean; // true = a real API call was made; false = key-presence check only
}
