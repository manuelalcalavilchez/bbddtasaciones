import React, { useState } from 'react';
import { ViewType, Appraisal, SystemConfig } from './types';
import { INITIAL_APPRAISALS } from './data';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import GeospatialView from './components/GeospatialView';
import AppraisalDbView from './components/AppraisalDbView';
import NewAppraisalView from './components/NewAppraisalView';
import AppraisalDetailView from './components/AppraisalDetailView';
import AdminView from './components/AdminView';
import EditAppraisalView from './components/EditAppraisalView';
import LoginView, { AppUser } from './components/LoginView';
import { Database, Terminal, Copy, X, Code2, LogOut } from 'lucide-react';

const DEFAULT_USERS: AppUser[] = [
  { id: 'USR-001', username: 'admin', password: 'admin123', name: 'Carlos Mendoza', role: 'admin', email: 'carlos@tecnologiaalcala.es', active: true },
  { id: 'USR-002', username: 'perito1', password: 'perito123', name: 'Ana Lopez Garcia', role: 'perito', email: 'ana.lopez@tecnologiaalcala.es', active: true },
  { id: 'USR-003', username: 'consultor1', password: 'consultor123', name: 'Pedro Martinez', role: 'consultor', email: 'pedro@tecnologiaalcala.es', active: true },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [config, setConfig] = useState<SystemConfig>({
    appName: 'Tecnología Alcalá',
    subTitle: 'TASACIONES & PERITAJES',
    peritoName: 'Carlos Mendoza',
    peritoRole: 'Tasador Senior',
    defaultMunicipality: 'Alcalá de Henares',
    defaultTaxRate: 21,
    multiplierCitricos: 25.50,
    multiplierUrbano: 1600,
    supportEmail: 'soporte@tecnologiaalcala.es',
    contactPhone: '+34 91 885 4000'
  });
  const [appraisals, setAppraisals] = useState<Appraisal[]>(INITIAL_APPRAISALS);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(INITIAL_APPRAISALS[0]);
  const [showDockerModal, setShowDockerModal] = useState(false);
  const [modalTab, setModalTab] = useState<'sql' | 'docker'>('sql');

  const handleResetDatabase = () => {
    setAppraisals(INITIAL_APPRAISALS);
    setSelectedAppraisal(INITIAL_APPRAISALS[0]);
  };

  // Handle saving new manually created items
  const handleSaveAppraisal = (newApp: Appraisal) => {
    setAppraisals(prev => [newApp, ...prev]);
  };

  // Callback to update valuations live
  const handleUpdateValuation = (id: string, newVal: number) => {
    setAppraisals(prev => prev.map(item => 
      item.id === id ? { ...item, valuation: newVal } : item
    ));
    if (selectedAppraisal && selectedAppraisal.id === id) {
      setSelectedAppraisal(prev => prev ? { ...prev, valuation: newVal } : null);
    }
  };

  // Handle full update of an appraisal record
  const handleUpdateAppraisal = (updated: Appraisal) => {
    setAppraisals(prev => prev.map(item => 
      item.id === updated.id ? updated : item
    ));
    setSelectedAppraisal(updated);
  };

  // Handle deletion of an appraisal record
  const handleDeleteAppraisal = (id: string) => {
    setAppraisals(prev => prev.filter(item => item.id !== id));
    if (selectedAppraisal && selectedAppraisal.id === id) {
      setSelectedAppraisal(null);
    }
  };

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  // If not logged in, show login screen
  if (!currentUser) {
    return <LoginView users={users} onLogin={handleLogin} />;
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('¡Código copiado al portapapeles!');
  };

  const sqlSchemaText = `-- Schema de Base de Datos para AppraisalPro (Valuation Suite)
CREATE TABLE IF NOT EXISTS appraisals (
    id VARCHAR(50) PRIMARY KEY,
    expediente VARCHAR(30) UNIQUE NOT NULL,
    client VARCHAR(100) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    valuation NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Completado', 'En Revisión', 'Pendiente', 'En Proceso')),
    municipality VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_catastral VARCHAR(50) UNIQUE NOT NULL,
    surface_area NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    has_pool BOOLEAN DEFAULT FALSE,
    floors VARCHAR(30) DEFAULT 'N/A',
    cultivo_details VARCHAR(100) DEFAULT 'N/A'
);

CREATE TABLE IF NOT EXISTS valuation_details (
    id SERIAL PRIMARY KEY,
    appraisal_id VARCHAR(50) REFERENCES appraisals(id) ON DELETE CASCADE,
    concepto VARCHAR(150) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    valor_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);`;

  const dockerSetupText = `# EasyPanel Setup:
1. Create PostgreSQL service DB: "appraisalpro"
2. Deploy PostgREST API with environment:
   PGRST_DB_URI: postgres://postgres:YourSecPass@postgresql:5432/appraisalpro
   PGRST_DB_SCHEMA: public
   PGRST_DB_ANON_ROLE: postgres
3. Set domain routing for proxy resolution.`;

  return (
    <div className="min-h-screen bg-background text-on-background flex font-sans" id="app-root">
      
      {/* Structural left sidebar navigation menu */}
      <Sidebar 
        currentView={currentView} 
        config={config}
        onViewChange={(view) => {
          setCurrentView(view);
          // Auto-focus Marta if accessing detail directly to avoid crash
          if (view === 'detail' && !selectedAppraisal) {
            setSelectedAppraisal(appraisals[1]);
          }
        }} 
      />

      {/* Main viewport workspace content container */}
      <div className="flex-1 flex flex-col md:pl-60 min-h-screen pb-16 md:pb-0" id="main-content-flow">
        
        {/* Sticky top executive metadata bar */}
        <Header 
          appraisals={appraisals}
          config={config}
          currentUserName={currentUser.name}
          onLogout={handleLogout}
          onSearchSelect={(app) => {
            setSelectedAppraisal(app);
            setCurrentView('detail');
          }}
        />

        {/* View Routing Conditional dispatcher */}
        <main className="flex-1 overflow-y-auto" id="view-dispatcher-container">
          {currentView === 'dashboard' && (
            <DashboardView 
              appraisals={appraisals}
              onSelectAppraisal={(app) => {
                setSelectedAppraisal(app);
                setCurrentView('detail');
              }}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === 'geospatial' && (
            <GeospatialView 
              appraisals={appraisals}
              onSelectAppraisal={(app) => {
                setSelectedAppraisal(app);
                setCurrentView('detail');
              }}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === 'database' && (
            <AppraisalDbView 
              appraisals={appraisals}
              onSelectAppraisal={(app) => {
                setSelectedAppraisal(app);
                setCurrentView('detail');
              }}
              onNavigate={(view) => setCurrentView(view)}
              onEditAppraisal={(app) => {
                setSelectedAppraisal(app);
                setCurrentView('edit-appraisal');
              }}
              onDeleteAppraisal={handleDeleteAppraisal}
            />
          )}

          {currentView === 'new-appraisal' && (
            <NewAppraisalView 
              onSaveAppraisal={handleSaveAppraisal}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === 'detail' && (
            <AppraisalDetailView 
              appraisal={selectedAppraisal}
              onUpdateValuation={handleUpdateValuation}
              onNavigate={(view) => setCurrentView(view)}
              onEditAppraisal={() => setCurrentView('edit-appraisal')}
              onDeleteAppraisal={handleDeleteAppraisal}
            />
          )}

          {currentView === 'edit-appraisal' && (
            <EditAppraisalView
              appraisal={selectedAppraisal}
              onUpdateAppraisal={handleUpdateAppraisal}
              onDeleteAppraisal={handleDeleteAppraisal}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === 'admin' && (
            <AdminView 
              config={config}
              onUpdateConfig={(newConfig) => setConfig(newConfig)}
              onResetDatabase={handleResetDatabase}
              users={users}
              onUpdateUsers={setUsers}
              currentUser={currentUser}
            />
          )}
        </main>

        {/* Floating SQL / Easypanel instructions access trigger */}
        <div className="fixed bottom-20 md:bottom-6 right-6 z-40 select-none">
          <button
            onClick={() => setShowDockerModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-surface hover:bg-surface-container-high text-[11px] font-extrabold uppercase tracking-wider text-primary border border-outline rounded-full shadow-lg transition-all cursor-pointer hover:scale-105"
            title="Mostrar Esquema SQL y EasyPanel"
          >
            <Code2 className="w-4 h-4 shrink-0" />
            <span>Postgres &amp; EasyPanel</span>
            <span className="w-2 h-2 rounded-full bg-green-600 animate-ping shrink-0"></span>
          </button>
        </div>

        {/* Modals layout: SQL / Postgres & Docker guidelines */}
        {showDockerModal && (
          <div className="fixed inset-0 bg-[#0a1128]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
            <div className="bg-surface rounded-xl border border-outline shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              
              {/* Modal header */}
              <div className="p-4 bg-surface-container-high border-b border-outline flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5 text-primary">
                  <Database className="w-5 h-5 animate-none" />
                  <span className="font-black font-sans text-sm">Contenedores y Modelamiento de Datos</span>
                </div>
                <button 
                  onClick={() => setShowDockerModal(false)}
                  className="p-1 hover:bg-surface-container-highest rounded-full cursor-pointer text-on-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation modal tabs */}
              <div className="flex bg-surface-container-high border-b border-outline select-none shrink-0 text-xs">
                <button 
                  onClick={() => setModalTab('sql')}
                  className={`flex-1 py-3 text-center font-bold tracking-wide transition-all cursor-pointer border-b-2 ${
                    modalTab === 'sql' 
                      ? 'border-primary text-primary bg-surface' 
                      : 'border-transparent text-on-surface-variant hover:text-primary'
                  }`}
                >
                  SQL Script (PostgreSQL)
                </button>
                <button 
                  onClick={() => setModalTab('docker')}
                  className={`flex-1 py-3 text-center font-bold tracking-wide transition-all cursor-pointer border-b-2 ${
                    modalTab === 'docker' 
                      ? 'border-primary text-primary bg-surface' 
                      : 'border-transparent text-on-surface-variant hover:text-primary'
                  }`}
                >
                  EasyPanel (PostgREST Instuctions)
                </button>
              </div>

              {/* Code blocks area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-[#0e172a]">
                {modalTab === 'sql' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-white text-xs bg-slate-800/80 p-2 rounded border border-slate-700/60 select-none">
                      <span className="font-mono">postgres-schema.sql</span>
                      <button 
                        onClick={() => handleCopyText(sqlSchemaText)}
                        className="flex items-center gap-1.5 hover:text-primary font-bold cursor-pointer font-sans"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar código</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-cyan-300 overflow-x-auto bg-slate-950 p-4 rounded-lg select-all max-h-96">
                      {sqlSchemaText}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-white text-xs bg-slate-800/80 p-2 rounded border border-slate-700/60 select-none">
                      <span className="font-mono">docker-compose-instructions</span>
                      <button 
                        onClick={() => handleCopyText(dockerSetupText)}
                        className="flex items-center gap-1.5 hover:text-primary font-bold cursor-pointer font-sans"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar guía</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto bg-slate-950 p-4 rounded-lg select-all max-h-96">
                      {dockerSetupText}
                    </pre>
                    <div className="text-slate-300 text-xs font-medium space-y-2 pt-2 bg-slate-90030 p-3 rounded-lg border border-slate-700/40">
                      <p className="font-bold text-white text-[11px] uppercase tracking-wider text-primary">¿Por qué unificar con PostgREST?</p>
                      <p className="text-[11px] leading-relaxed">
                        Frente a crear servidores personalizados pesados, PostgREST compila automáticamente las consultas URL transformándolas en llamadas SQL puras y eficientes sobre tu base de datos rústica en cuestión de microsegundos de latencia.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Close footer */}
              <div className="p-4 bg-surface-container-high border-t border-outline flex justify-end shrink-0 select-none">
                <button
                  onClick={() => setShowDockerModal(false)}
                  className="bg-secondary text-white hover:bg-primary font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                >
                  Entendido
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
