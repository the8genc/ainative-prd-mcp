import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

const TIERS = ['', 'admin', 'consultant', 'client']; // '' = unclassified
const tierLabel = (t) => (t ? t : 'unclassified');
const tierChip = (t) =>
  t === 'admin' ? 'chip--alert' : t === 'consultant' ? 'chip--signal' : t === 'client' ? 'chip--ok' : 'chip--warn';

export default function AdminSkills() {
  const [skills, setSkills] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await api.get('/admin/skills');
      setSkills(r.skills);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (id, body) => {
    setMsg(''); setErr('');
    try {
      const r = await api.patch(`/admin/skills/${id}`, body);
      setSkills((cur) => cur.map((s) => (s.id === id ? r.skill : s)));
    } catch (e) { setErr(e.message || 'Update failed'); }
  };

  const rescan = async () => {
    setBusy(true); setMsg(''); setErr('');
    try {
      const r = await api.post('/admin/skills/rescan');
      setSkills(r.skills);
      setMsg(`Rescanned ${r.upserted} skill(s) from ${r.repo}@${r.branch} (${r.inserted} new).`);
    } catch (e) { setErr(e.message || 'Rescan failed'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="portal__head">
        <div>
          <h1 className="portal__name">Skills catalog</h1>
          <p className="portal__email mono">Tier each skill: admins always see all · consultants see consultant+client · clients see client (or per-user allows)</p>
        </div>
        <button className="btn btn--signal" disabled={busy} onClick={rescan}>{busy ? 'Rescanning…' : 'Rescan from GitHub'}</button>
      </div>

      {msg && <div className="form-msg form-msg--ok">{msg}</div>}
      {err && <div className="form-msg form-msg--err">{err}</div>}

      <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
        <table className="token-table utable">
          <thead><tr><th>Skill</th><th>Tier</th><th>Enabled</th><th>Synced</th></tr></thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.id}>
                <td className="tk-name">
                  <code>{s.slug}</code>
                  {s.source && <a className="mono" style={{ marginLeft: 8, fontSize: 'var(--fs-2xs)' }} href={s.source} target="_blank" rel="noreferrer">github ↗</a>}
                  <div className="mono" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)', maxWidth: '52ch' }}>{s.description}</div>
                </td>
                <td>
                  <span className={`chip ${tierChip(s.tier)}`} style={{ marginRight: 8 }}>{tierLabel(s.tier)}</span>
                  <select value={s.tier || ''} onChange={(e) => patch(s.id, { tier: e.target.value || null })}>
                    {TIERS.map((t) => <option key={t || 'none'} value={t}>{tierLabel(t)}</option>)}
                  </select>
                </td>
                <td>
                  <label className="row" style={{ gap: 6 }}>
                    <input type="checkbox" checked={!!s.enabled} onChange={(e) => patch(s.id, { enabled: e.target.checked })} />
                    {s.enabled ? 'on' : 'off'}
                  </label>
                </td>
                <td className="mono" style={{ fontSize: 'var(--fs-2xs)' }}>{s.synced_at ? new Date(s.synced_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {skills.length === 0 && <p className="token-empty mono">Catalog is empty — click “Rescan from GitHub”.</p>}
      </div>
    </>
  );
}
