import React, { useState } from 'react';
import { Search, Bell, Settings, Command } from 'lucide-react';
import { Appraisal, SystemConfig } from '../types';

interface HeaderProps {
  onSearchSelect?: (appraisal: Appraisal) => void;
  appraisals?: Appraisal[];
  config: SystemConfig;
}

export default function Header({ onSearchSelect, appraisals = [], config }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredAppraisals = searchTerm.trim() === '' 
    ? [] 
    : appraisals.filter(app => 
        app.expediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.referenceCatastral.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 md:px-8 h-16 bg-surface border-b border-outline">
      {/* Brand Label */}
      <div className="flex items-center gap-4 flex-1">
        <span className="text-lg font-bold text-primary tracking-tight font-sans">{config.appName}</span>
        
        {/* Breadcrumb decoration (or global search input on Desktop) */}
        <div className="relative hidden md:flex items-center bg-surface-container-high px-4 py-2 rounded-lg border border-outline w-full max-w-md">
          <Search className="w-4 h-4 text-[#757682] mr-2 shrink-0 animate-none" />
          <input
            type="text"
            placeholder="Buscador global (referencia, cliente, dirección...)"
            className="bg-transparent border-none text-xs w-full text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 p-0"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          <div className="flex items-center gap-1 select-none text-xs text-outline border border-outline px-1.5 py-0.5 rounded ml-2 bg-surface text-[10px] font-mono shrink-0">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>

          {/* Quick results dropdown dropdown popover */}
          {showResults && filteredAppraisals.length > 0 && (
            <div className="absolute left-0 top-11 w-full bg-surface border border-outline rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar p-1.5 animate-fade-in">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-2 py-1 border-b border-outline">
                Resultados Rápidos ({filteredAppraisals.length})
              </p>
              {filteredAppraisals.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    if (onSearchSelect) onSearchSelect(app);
                    setSearchTerm('');
                    setShowResults(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-surface-container-high transition-all flex items-center justify-between text-xs cursor-pointer border-0 bg-transparent text-on-surface"
                >
                  <div className="overflow-hidden">
                    <p className="font-bold text-primary truncate leading-tight">{app.expediente}</p>
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{app.client} — {app.municipality}</p>
                  </div>
                  <span className="text-[11px] font-bold bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded font-mono shrink-0">
                    {app.valuation.toLocaleString('es-ES')} €
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Icons: notifications, settings, profile avatar */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => alert('Notificaciones: No hay alertas urgentes pendientes')}
          className="relative p-2 hover:bg-surface-container-high transition-colors rounded-full text-on-surface-variant cursor-pointer border-0 bg-transparent"
          title="Notificaciones"
        >
          <Bell className="w-5 h-5 text-primary" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse"></span>
        </button>

        <button 
          onClick={() => alert('Configuración del sistema: módulo SaaS de Appraisal Management v4.1')}
          className="p-2 hover:bg-surface-container-high transition-colors rounded-full text-on-surface-variant cursor-pointer border-0 bg-transparent"
          title="Configuración de Tasaciones"
        >
          <Settings className="w-5 h-5 text-primary" />
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-[1.5px] bg-outline mx-1 md:block hidden"></div>

        {/* User Card */}
        <div className="flex items-center gap-2 pl-1 select-none">
          <div className="text-right hidden sm:block font-sans">
            <p className="text-xs font-bold text-on-surface leading-none">{config.peritoName}</p>
            <p className="text-[9px] text-[#444651] font-semibold">{config.peritoRole}</p>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline bg-[#00236f]">
            <img 
              alt={`Perito ${config.peritoName}`} 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&h=120&q=80" 
            />
          </div>
        </div>
      </div>
    </header>
  );
}
