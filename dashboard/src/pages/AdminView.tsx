import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AdminTool, AdminToolsResponse, ToolPolicy } from '../lib/types';
import { PolicyToggle, StatusDot } from '../components/ui';

export function AdminView() {
  const [data, setData] = useState<AdminToolsResponse | null>(null);
  const [tools, setTools] = useState<Record<string, AdminTool>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAdminTools()
      .then((d) => {
        setData(d);
        setTools(d.tools);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const setPolicy = (token: string, policy: ToolPolicy) =>
    setTools((t) => ({ ...t, [token]: { ...t[token], policy } }));

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await api.saveAdminTools(tools);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (err) return <div className="error">Couldn’t reach the orchestrator config — {err}</div>;
  if (!data) return <div className="muted">Loading tool registry…</div>;

  return (
    <section>
      <div className="section-head">
        <div>
          <h1>Tool registry</h1>
          <p className="muted">
            Set each tool’s policy. <strong>shared</strong> tools use the agency key from the system{' '}
            <code>.env</code>; <strong>client-owned</strong> tools require each client’s own key
            (admin key never used — no cross-pollination). Secrets live in <code>.env</code>, never here.
          </p>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save registry'}
        </button>
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th>Tool</th>
            <th>Policy</th>
            <th>Env keys</th>
            <th>Shared key status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(tools).map(([token, t]) => {
            const policy = t.policy ?? 'shared';
            const keys = t.envKeys ?? [];
            return (
              <tr key={token}>
                <td>
                  <code>{token}</code>
                  {t.command && <div className="muted small">mcp: {t.command}</div>}
                </td>
                <td>
                  <PolicyToggle policy={policy} onChange={(p) => setPolicy(token, p)} />
                </td>
                <td className="muted small">{keys.join(', ') || '—'}</td>
                <td>
                  {policy === 'client-owned' ? (
                    <StatusDot state="muted" label="per client" />
                  ) : keys.every((k) => data.systemEnvKeys[k]) && keys.length ? (
                    <StatusDot state="ok" label="set in system .env" />
                  ) : keys.length ? (
                    <StatusDot state="warn" label="missing in system .env" />
                  ) : (
                    <StatusDot state="muted" label="no key needed" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
