import { useState } from 'react';
import { AdminView } from './pages/AdminView';
import { ClientView } from './pages/ClientView';

type Tab = 'admin' | 'client';

export function App() {
  const [tab, setTab] = useState<Tab>('admin');
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">8</span>
          <div>
            <div className="brand-title">Tool Credentials</div>
            <div className="brand-sub">MCP server · admin defaults &amp; client overrides</div>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'admin' ? 'tab active' : 'tab'} onClick={() => setTab('admin')}>
            Admin
          </button>
          <button className={tab === 'client' ? 'tab active' : 'tab'} onClick={() => setTab('client')}>
            Client
          </button>
        </nav>
      </header>
      <main className="content">{tab === 'admin' ? <AdminView /> : <ClientView />}</main>
    </div>
  );
}
