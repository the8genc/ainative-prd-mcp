import { useEffect, useState } from 'react';
import { api } from '../api.js';

const tierLabel = (t) => (t ? t : 'unclassified');

export default function MyAccess() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/me/access').then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="form-msg form-msg--err">{err}</div>;
  if (!data) return <div className="app-loading">Loading…</div>;

  const ctx = data.context || {};
  const files = Array.isArray(ctx.coda_files) ? ctx.coda_files : [];
  const vars = Object.entries(ctx.variables || {});

  return (
    <>
      <div className="portal__head">
        <div>
          <h1 className="portal__name">My access</h1>
          <p className="portal__email mono">role: {data.role} · skills you can engage over MCP</p>
        </div>
      </div>

      <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
        <h2 className="h-section" style={{ fontSize: 'var(--fs-lg)' }}>Skills</h2>
        {data.skills.length === 0 && <p className="token-empty mono">No skills assigned yet. Contact your 8genC admin.</p>}
        {data.skills.map((s) => (
          <div key={s.slug} style={{ padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
            <code>{s.slug}</code> <span className="chip chip--signal" style={{ marginLeft: 6 }}>{tierLabel(s.tier)}</span>
            <div className="mono" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>{s.description}</div>
          </div>
        ))}
      </div>

      {(files.length > 0 || vars.length > 0 || ctx.notes) && (
        <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
          <h2 className="h-section" style={{ fontSize: 'var(--fs-lg)' }}>Your data-scope</h2>
          <p className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            These sources are injected into your skill context automatically.
          </p>
          {files.length > 0 && (
            <ul>
              {files.map((f, i) => (
                <li key={i} className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                  {f.label || f.doc_id || 'document'}{f.url ? <> — <a href={f.url} target="_blank" rel="noreferrer">{f.url}</a></> : null}
                </li>
              ))}
            </ul>
          )}
          {vars.length > 0 && (
            <ul>
              {vars.map(([k, v]) => (
                <li key={k} className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{k}: {typeof v === 'string' ? v : JSON.stringify(v)}</li>
              ))}
            </ul>
          )}
          {ctx.notes && <p className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{ctx.notes}</p>}
        </div>
      )}
    </>
  );
}
