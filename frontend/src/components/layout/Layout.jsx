import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="layout">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />
      <div className="layout-body">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
