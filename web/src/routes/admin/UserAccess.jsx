import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api.js';

const ROLES = ['user', 'consultant', 'client', 'admin'];
const tierLabel = (t) => (t ? t : 'unclassified');

export default function UserAccess() {
  const { id } = useParams();
  const [data, setData] = useState(null); // { user, catalog, overrides, context }
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // client-context editor local state
  const [files, setFiles] = useState([]);
  const [vars, setVars] = useState([]); // [[k,v]]
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await api.get(`/admin/users/${id}/access`);
      setData(r);
      const ctx = r.context || {};
      setFiles(Array.isArray(ctx.coda_files) ? ctx.coda_files : []);
      setVars(Object.entries(ctx.variables || {}));
      setNotes(ctx.notes || '');
    } catch (e) { setErr(e.message); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (err && !data) return <div className="form-msg form-msg--err">{err}</div>;
  if (!data) return <div className="app-loading">Loading…</div>;

  const { user, catalog, overrides } = data;
  const overrideBySkill = Object.fromEntries((overrides || []).map((o) => [o.skill_id, o.effect]));

  const setRole = async (role) => {
    setMsg(''); setErr('');
    try { await api.post(`/admin/users/${id}/role`, { role }); setMsg(`Role set to ${role}.`); load(); }
    catch (e) { setErr(e.message || 'Failed to set role'); }
  };

  const setOverride = async (skillId, effect) => {
    setMsg(''); setErr('');
    try { await api.put(`/admin/users/${id}/overrides`, { skillId, effect }); load(); }
    catch (e) { setErr(e.message || 'Failed to set override'); }
  };

  const saveContext = async () => {
    setMsg(''); setErr('');
    const variables = {};
    for (const [k, v] of vars) if (k.trim()) variables[k.trim()] = v;
    try {
      await api.put(`/admin/users/${id}/context`, {
        coda_files: files.filter((f) => f.url || f.doc_id || f.label),
        variables,
        notes: notes || null
      });
      setMsg('Client data-scope saved.');
    } catch (e) { setErr(e.message || 'Failed to save context'); }
  };

  return (
    <>
      <div className="portal__head">
        <div>
          <h1 className="portal__name">{user.username}</h1>
          <p className="portal__email mono">{user.email || '—'} · access management</p>
        </div>
        <Link className="btn btn--ghost" to="/admin/users">← Users</Link>
      </div>

      {msg && <div className="form-msg form-msg--ok">{msg}</div>}
      {err && <div className="form-msg form-msg--err">{err}</div>}

      {/* Role */}
      <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
        <h2 className="h-section" style={{ fontSize: 'var(--fs-lg)' }}>Role</h2>
        <p className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          admin = all · consultant = most skills · client = only allow-listed skills, scoped to their data
        </p>
        <div className="tabbar">
          {ROLES.map((r) => (
            <button
              key={r}
              className={`btn ${user.role === r ? 'btn--signal' : 'btn--ghost'}`}
              disabled={r === 'admin' && !user.email_verified}
              title={r === 'admin' && !user.email_verified ? 'User must verify email first' : ''}
              onClick={() => setRole(r)}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Per-skill overrides */}
      <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
        <h2 className="h-section" style={{ fontSize: 'var(--fs-lg)' }}>Skill access</h2>
        <p className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          “Default” follows the skill tier for this role. Allow/Deny overrides it — use Allow to grant a client a specific skill.
        </p>
        <table className="token-table utable">
          <thead><tr><th>Skill</th><th>Tier</th><th>Access</th></tr></thead>
          <tbody>
            {catalog.map((s) => {
              const cur = overrideBySkill[s.id] ?? 'default';
              return (
                <tr key={s.id}>
                  <td className="tk-name"><code>{s.slug}</code></td>
                  <td className="mono">{tierLabel(s.tier)}</td>
                  <td>
                    <div className="row">
                      {['default', 'allow', 'deny'].map((opt) => (
                        <button
                          key={opt}
                          className={`iconbtn ${cur === opt ? 'iconbtn--active' : ''}`}
                          onClick={() => setOverride(s.id, opt === 'default' ? null : opt)}
                        >{opt}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {catalog.length === 0 && <p className="token-empty mono">No skills in the catalog yet — rescan in Skills.</p>}
      </div>

      {/* Client data-scope */}
      <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
        <h2 className="h-section" style={{ fontSize: 'var(--fs-lg)' }}>Client data-scope</h2>
        <p className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          Pointers injected into this user’s skill/prompt context. The agent fetches contents via its own Coda MCP.
        </p>

        <h3 className="mono" style={{ marginTop: 'var(--space-4)' }}>Coda files</h3>
        {files.map((f, i) => (
          <div className="row" key={i} style={{ gap: 8, marginBottom: 6 }}>
            <input placeholder="label" value={f.label || ''} onChange={(e) => setFiles(files.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            <input placeholder="https://coda.io/d/…" style={{ minWidth: 240 }} value={f.url || ''} onChange={(e) => setFiles(files.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
            <input placeholder="doc_id (optional)" value={f.doc_id || ''} onChange={(e) => setFiles(files.map((x, j) => j === i ? { ...x, doc_id: e.target.value } : x))} />
            <button className="iconbtn iconbtn--danger" onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="iconbtn" onClick={() => setFiles([...files, { label: '', url: '', doc_id: '' }])}>+ Add Coda file</button>

        <h3 className="mono" style={{ marginTop: 'var(--space-4)' }}>Variables</h3>
        {vars.map(([k, v], i) => (
          <div className="row" key={i} style={{ gap: 8, marginBottom: 6 }}>
            <input placeholder="key" value={k} onChange={(e) => setVars(vars.map((x, j) => j === i ? [e.target.value, x[1]] : x))} />
            <input placeholder="value" style={{ minWidth: 240 }} value={typeof v === 'string' ? v : JSON.stringify(v)} onChange={(e) => setVars(vars.map((x, j) => j === i ? [x[0], e.target.value] : x))} />
            <button className="iconbtn iconbtn--danger" onClick={() => setVars(vars.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="iconbtn" onClick={() => setVars([...vars, ['', '']])}>+ Add variable</button>

        <h3 className="mono" style={{ marginTop: 'var(--space-4)' }}>Notes</h3>
        <textarea rows={3} style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope notes for the agent (e.g. only use Q3 data)…" />

        <div style={{ marginTop: 'var(--space-4)' }}>
          <button className="btn btn--signal" onClick={saveContext}>Save data-scope</button>
        </div>
      </div>
    </>
  );
}
