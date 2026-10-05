import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface PageLayoutProps {
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col font-body-md">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`transition-all duration-300 min-h-screen flex flex-col ${
        collapsed ? 'md:ml-20' : 'md:ml-sidebar-width'
      }`}>
        <TopBar />
        <main className="max-w-[1440px] mx-auto w-full flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
