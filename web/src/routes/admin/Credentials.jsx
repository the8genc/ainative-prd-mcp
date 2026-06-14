import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

export default function AdminCredentials() {
  const [tools, setTools] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try { setTools((await api.get('/admin/tool-registry')).tools); }
    catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setPolicy = async (token, policy) => {
    setMsg(''); setErr('');
    try {
      await api.patch(`/admin/tool-registry/${token}`, { policy });
      setTools((cur) => cur.map((t) => (t.token === token ? { ...t, policy } : t)));
      setMsg(`${token} → ${policy}`);
    } catch (e) { setErr(e.message || 'Update failed'); }
  };

  return (
    <>
      <div className="portal__head">
        <div>
          <h1 className="portal__name">Tool credentials</h1>
          <p className="portal__email mono">Per-tool policy. <strong>shared</strong> = the agency key (server env) is used; <strong>client-owned</strong> = each client brings their own (set on the client page).</p>
        </div>
      </div>

      {msg && <div className="form-msg form-msg--ok">{msg}</div>}
      {err && <div className="form-msg form-msg--err">{err}</div>}

      <div className="panel-block" style={{ marginTop: 'var(--space-4)' }}>
        <table className="token-table utable">
          <thead><tr><th>Tool</th><th>Env keys</th><th>Policy</th><th>Shared key</th></tr></thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.token}>
                <td className="tk-name"><code>{t.token}</code></td>
                <td className="mono" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>{(t.envKeys || []).join(', ') || '—'}</td>
                <td>
                  <div className="row">
                    {['shared', 'client-owned'].map((p) => (
                      <button key={p} className={`iconbtn ${t.policy === p ? 'iconbtn--active' : ''}`} onClick={() => setPolicy(t.token, p)}>{p}</button>
                    ))}
                  </div>
                </td>
                <td>
                  {t.policy !== 'shared' || (t.envKeys || []).length === 0
                    ? <span className="mono" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}>—</span>
                    : <span className={`chip ${t.sharedKeysPresent ? 'chip--ok' : 'chip--warn'}`}>{t.sharedKeysPresent ? 'set in env' : 'missing in env'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tools.length === 0 && <p className="token-empty mono">Registry is empty (it seeds on first server use).</p>}
      </div>
    </>
  );
}
