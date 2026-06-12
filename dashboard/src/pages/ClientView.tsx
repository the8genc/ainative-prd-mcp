import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ClientStatusResponse, TestConnectionResult, ToolClientStatus } from '../lib/types';
import { PolicyBadge, StatusDot } from '../components/ui';

export function ClientView() {
  const [clientId, setClientId] = useState('acme');
  const [data, setData] = useState<ClientStatusResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = (id: string) =>
    api.getClient(id).then(setData).catch((e) => setErr(String(e)));

  useEffect(() => {
    load(clientId);
  }, []); // initial

  return (
    <section>
      <div className="section-head">
        <div>
          <h1>Connect tools</h1>
          <p className="muted">
            Shared tools already use the agency key. For <strong>client-owned</strong> tools, upload
            your <code>.env</code> (or paste keys) — they’re stored only for this client and never
            mixed with anyone else’s.
          </p>
        </div>
        <div className="client-picker">
          <label className="muted small">Client</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onBlur={() => load(clientId)}
            placeholder="client id"
          />
          <button className="btn" onClick={() => load(clientId)}>
            Load
          </button>
        </div>
      </div>

      <EnvDropzone clientId={clientId} onUploaded={() => load(clientId)} />

      {err && <div className="error">{err}</div>}
      {!data ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="cards">
          {data.tools.map((t) => (
            <ToolCard key={t.token} clientId={clientId} tool={t} />
          ))}
        </div>
      )}
    </section>
  );
}

function EnvDropzone({ clientId, onUploaded }: { clientId: string; onUploaded: () => void }) {
  const [status, setStatus] = useState<string | null>(null);

  const upload = async (content: string) => {
    try {
      const r = await api.uploadClientEnv(clientId, content);
      setStatus(`Saved ${r.keys.length} key(s) for ${clientId}.`);
      onUploaded();
    } catch (e) {
      setStatus(`Upload failed: ${String(e)}`);
    }
  };

  return (
    <div
      className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) upload(await file.text());
      }}
    >
      <strong>Upload a .env</strong> for <code>{clientId}</code> — drag a file here, or
      <label className="link">
        {' '}choose a file
        <input
          type="file"
          accept=".env,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) upload(await f.text());
          }}
        />
      </label>
      . Keys are routed to the right tools by their env-key names.
      {status && <div className="muted small dz-status">{status}</div>}
    </div>
  );
}

function ToolCard({ clientId, tool }: { clientId: string; tool: ToolClientStatus }) {
  const [result, setResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      setResult(await api.testConnection(tool.token, clientId));
    } catch (e) {
      setResult({ ok: false, detail: String(e), live: false });
    } finally {
      setTesting(false);
    }
  };

  const owned = tool.policy === 'client-owned';
  return (
    <div className="card">
      <div className="card-head">
        <code>{tool.token}</code>
        <PolicyBadge policy={tool.policy} />
      </div>
      <div className="card-body">
        {owned ? (
          tool.connected ? (
            <StatusDot state="ok" label={`connected (${tool.providedKeys.length}/${tool.envKeys.length} keys)`} />
          ) : (
            <StatusDot state="warn" label={`needs your key${tool.envKeys.length ? ` (${tool.envKeys.join(', ')})` : ''}`} />
          )
        ) : (
          <StatusDot state="muted" label="uses agency (shared) key" />
        )}
      </div>
      <div className="card-foot">
        <button className="btn" onClick={test} disabled={testing}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        {result && (
          <span className={result.ok ? 'test ok' : 'test bad'}>
            {result.ok ? '✓' : '✗'} {result.detail}
            {!result.live && ' (key check)'}
          </span>
        )}
      </div>
    </div>
  );
}
