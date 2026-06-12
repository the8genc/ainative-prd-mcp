import type {
  AdminTool,
  AdminToolsResponse,
  ClientStatusResponse,
  TestConnectionResult,
} from './types';

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export const api = {
  getAdminTools: () => fetch('/api/admin/tools').then(json<AdminToolsResponse>),
  saveAdminTools: (tools: Record<string, AdminTool>) =>
    fetch('/api/admin/tools', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tools }),
    }).then(json<{ ok: boolean }>),
  getClient: (id: string) => fetch(`/api/client/${encodeURIComponent(id)}`).then(json<ClientStatusResponse>),
  uploadClientEnv: (id: string, content: string) =>
    fetch(`/api/client/${encodeURIComponent(id)}/env`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(json<{ ok: boolean; keys: string[] }>),
  testConnection: (token: string, clientId?: string) =>
    fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, clientId }),
    }).then(json<TestConnectionResult>),
};
