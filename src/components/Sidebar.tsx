import React from 'react';
import { ViewType, SystemConfig } from '../types';
import { 
  LayoutDashboard, 
  Globe, 
  Database, 
  PlusSquare, 
  HelpCircle, 
  User, 
  Building2,
  Settings2
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  config: SystemConfig;
}

export default function Sidebar({ currentView, onViewChange, config }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'geospatial' as ViewType, label: 'Análisis Geoespacial', icon: Globe },
    { id: 'database' as ViewType, label: 'Base de Datos', icon: Database },
    { id: 'new-appraisal' as ViewType, label: 'Nueva Tasación', icon: PlusSquare },
    { id: 'admin' as ViewType, label: 'Administración', icon: Settings2 },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen p-6 gap-6 z-40 bg-surface border-r border-outline w-60"
        id="desktop-sidebar"
      >
        {/* Logo / Brand Header */}
        <div className="flex items-center gap-3 mb-4 px-1 select-none">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white shrink-0 shadow-md">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-on-surface leading-tight font-sans">{config.appName}</h1>
            <p className="text-[9px] text-on-surface-variant/80 uppercase font-bold tracking-widest leading-none">
              {config.subTitle}
            </p>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 space-y-1.5" id="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-secondary text-white border border-outline shadow-md scale-[0.97]'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-on-surface-variant'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Items */}
        <div className="mt-auto pt-4 border-t border-outline space-y-1.5" id="sidebar-footer">
          <button 
            onClick={() => alert(`Soporte técnico: contacta con ${config.supportEmail}`)}
            className="w-full flex items-center gap-4 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high bg-transparent rounded-lg transition-all text-left cursor-pointer border-0"
          >
            <HelpCircle className="w-5 h-5 shrink-0 text-on-surface-variant" />
            <span>Soporte</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-high border border-outline rounded-lg mt-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm">
              {config.peritoName ? config.peritoName.split(' ').map(n => n.charAt(0)).join('') : 'CM'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface leading-tight truncate">{config.peritoName}</p>
              <p className="text-[10px] text-on-surface-variant/80 truncate">{config.peritoRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface border-t border-outline shadow-xl"
        id="mobile-bottom-nav"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-secondary text-white scale-[0.95] font-bold border border-outline'
                  : 'text-on-surface-variant'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-bold font-sans">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
