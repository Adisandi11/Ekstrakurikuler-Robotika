import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toast } from '../common/Toast';
import { useApp } from '../../context/AppContext';

interface LayoutProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  activeTab,
  setActiveTab,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useApp();

  const tab = activeTab ?? currentTab ?? 'dashboard';
  const setTab = setActiveTab ?? setCurrentTab ?? (() => {});

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800 font-sans">
      <Sidebar
        currentTab={tab}
        setCurrentTab={setTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar onToggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};
