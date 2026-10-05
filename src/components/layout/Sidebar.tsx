import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Tracks', path: '/tracks', icon: 'subscriptions' },
    { label: 'Analytics', path: '/analytics', icon: 'analytics' },
    { label: 'Targets', path: '/targets', icon: 'track_changes' },
    { label: 'Achievements', path: '/achievements', icon: 'emoji_events' },
    { label: 'To-Do List', path: '/todo', icon: 'checklist' },
    { label: 'Notifications', path: '/notifications', icon: 'notifications' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-40 bg-surface border border-outline-variant p-2 rounded-lg text-on-surface shadow-sm"
        aria-label="Toggle Navigation"
      >
        <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
      </button>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          className="md:hidden fixed inset-0 bg-black/40 z-30 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-surface border-r border-outline-variant flex flex-col p-6 gap-stack-gap z-30 transition-all duration-300 ${
          collapsed ? 'w-20 px-4' : 'w-sidebar-width'
        } ${
          mobileOpen ? 'translate-x-0 w-sidebar-width px-6' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-8 bg-surface border border-outline-variant rounded-full w-6 h-6 items-center justify-center cursor-pointer z-40 hover:bg-surface-container-highest transition-colors"
          id="sidebar-toggle"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined text-sm" id="toggle-icon">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-primary">menu_book</span>
          {(!collapsed || mobileOpen) && (
            <div className="font-headline-md text-headline-md text-primary dark:text-on-primary">
              Level Up
            </div>
          )}
        </div>

        <hr className="border-outline-variant w-full my-2" />

        {/* Navigation Menu */}
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-secondary-container dark:bg-secondary-fixed-dim text-on-secondary-container dark:text-on-secondary-fixed-variant font-bold scale-[0.98]'
                    : 'text-on-surface-variant dark:text-surface-variant hover:text-on-surface dark:hover:text-on-surface hover:bg-surface-container-highest dark:hover:bg-surface-dim'
                } ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span 
                    className="material-symbols-outlined" 
                    data-weight={isActive ? "fill" : undefined}
                  >
                    {item.icon}
                  </span>
                  {(!collapsed || mobileOpen) && (
                    <span className="font-label-md text-label-md">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};
