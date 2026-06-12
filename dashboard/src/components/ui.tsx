import type { ToolPolicy } from '../lib/types';

export function PolicyBadge({ policy }: { policy: ToolPolicy }) {
  return (
    <span className={`badge ${policy === 'shared' ? 'badge-shared' : 'badge-owned'}`}>
      {policy === 'shared' ? 'shared' : 'client-owned'}
    </span>
  );
}

export function StatusDot({ state, label }: { state: 'ok' | 'warn' | 'danger' | 'muted'; label: string }) {
  return (
    <span className="status">
      <span className={`dot dot-${state}`} />
      {label}
    </span>
  );
}

export function PolicyToggle({
  policy,
  onChange,
}: {
  policy: ToolPolicy;
  onChange: (p: ToolPolicy) => void;
}) {
  return (
    <div className="toggle" role="group" aria-label="policy">
      <button
        className={policy === 'shared' ? 'seg active' : 'seg'}
        onClick={() => onChange('shared')}
        title="The agency key (system .env) is exposed to clients"
      >
        shared
      </button>
      <button
        className={policy === 'client-owned' ? 'seg active' : 'seg'}
        onClick={() => onChange('client-owned')}
        title="Each client must bring their own key — admin key never used"
      >
        client-owned
      </button>
    </div>
  );
}
