import React, { useState } from 'react';
import { Appraisal, AppraisalStatus, ViewType } from '../types';
import { 
  FolderOpen, 
  Banknote, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  ArrowRight,
  Download,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  appraisals: Appraisal[];
  onSelectAppraisal: (appraisal: Appraisal) => void;
  onNavigate: (view: ViewType) => void;
}

export default function DashboardView({ appraisals, onSelectAppraisal, onNavigate }: DashboardViewProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Take the first 5 records as latest appraisals
  const latestAppraisals = appraisals.slice(0, 5);

  const getStatusBadge = (status: AppraisalStatus) => {
    switch (status) {
      case 'Completado':
        return <span className="px-2.5 py-0.5 bg-[#065F46] text-[#34D399] border border-[#059669]/60 text-[10px] font-bold uppercase rounded-full">Completado</span>;
      case 'En Revisión':
        return <span className="px-2.5 py-0.5 bg-[#1E3A8A] text-[#93C5FD] border border-[#3B82F6]/60 text-[10px] font-bold uppercase rounded-full">En Revisión</span>;
      case 'Pendiente':
        return <span className="px-2.5 py-0.5 bg-[#78350F] text-[#FDE68A] border border-[#D97706]/60 text-[10px] font-bold uppercase rounded-full">Pendiente</span>;
      case 'En Proceso':
        return <span className="px-2.5 py-0.5 bg-[#581C87] text-[#E9D5FF] border border-[#8B5CF6]/60 text-[10px] font-bold uppercase rounded-full">En Proceso</span>;
      default:
        return null;
    }
  };

  // Distribution chart parameters
  const distributionData = [
    { type: 'Cítricos', percentage: 45, color: '#38BDF8', strokeDash: '45 100', strokeOffset: '0' },
    { type: 'Viviendas', percentage: 25, color: '#0284C7', strokeDash: '25 100', strokeOffset: '-45' },
    { type: 'Piscinas / Ocio', percentage: 20, color: '#2D3748', strokeDash: '20 100', strokeOffset: '-70' },
    { type: 'Otros', percentage: 10, color: '#334155', strokeDash: '10 100', strokeOffset: '-90' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto select-none">
      
      {/* Executive Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-sans text-on-surface">Executive Overview</h2>
          <p className="text-xs md:text-sm text-on-surface-variant">Real-time valuation metrics and workflow status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('Preparando exportación masiva de informes de tasación... Exportado: 1284 registros.')}
            className="bg-surface border border-outline px-4 py-2.5 flex items-center gap-2 font-semibold text-xs text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer rounded-lg"
          >
            <Download className="w-4 h-4 text-on-surface-variant" />
            <span>Exportar Informes</span>
          </button>
          <button 
            onClick={() => onNavigate('new-appraisal')}
            className="bg-secondary text-white px-4 py-2.5 flex items-center gap-2 font-semibold text-xs hover:bg-primary transition-colors cursor-pointer rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tasación</span>
          </button>
        </div>
      </div>

      {/* Stats Grid Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expedientes */}
        <div className="bg-surface p-5 border border-outline hover:shadow-md transition-all rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="p-1.5 bg-primary/10 rounded-lg">
              <FolderOpen className="w-6 h-6 text-primary" />
            </span>
            <span className="text-error font-extrabold text-[11px] font-mono shrink-0">+12%</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">TOTAL EXPEDIENTES</p>
            <h3 className="text-2xl font-bold text-on-surface mt-1">1.284</h3>
          </div>
        </div>

        {/* Valor Medio Tasado */}
        <div className="bg-surface p-5 border border-outline hover:shadow-md transition-all rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="p-1.5 bg-primary/10 rounded-lg">
              <Banknote className="w-6 h-6 text-primary" />
            </span>
            <span className="text-primary font-bold text-[11px] tracking-tight">Estable</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">VALOR MEDIO TASADO</p>
            <h3 className="text-2xl font-bold text-on-surface mt-1">412.500 €</h3>
          </div>
        </div>

        {/* Expedientes Pendientes */}
        <div className="bg-surface p-5 border border-outline hover:shadow-md transition-all rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="p-1.5 bg-primary/10 rounded-lg">
              <Clock className="w-6 h-6 text-primary" />
            </span>
            <span className="bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide shrink-0">
              High Priority
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">EXPEDIENTES PENDIENTES</p>
            <h3 className="text-2xl font-bold text-on-surface mt-1">42</h3>
          </div>
        </div>

        {/* Tasaciones Finalizadas */}
        <div className="bg-surface p-5 border border-outline hover:shadow-md transition-all rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="p-1.5 bg-primary/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-primary" />
            </span>
            <span className="text-primary font-bold text-[11px] tracking-tight shrink-0">98% Success</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">TASACIONES FINALIZADAS</p>
            <h3 className="text-2xl font-bold text-on-surface mt-1">956</h3>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Bento: table of recent valuations */}
        <div className="lg:col-span-8 bg-surface border border-outline rounded-xl flex flex-col h-full shrink-0 overflow-hidden">
          <div className="p-4 border-b border-outline flex justify-between items-center bg-surface-container-high rounded-t-xl">
            <h4 className="text-sm font-bold text-on-surface">Últimas Tasaciones Procesadas</h4>
            <button 
              onClick={() => onNavigate('database')}
              className="text-primary hover:text-primary-hover font-semibold text-xs tracking-tight hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver todo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-outline">
                  <th className="px-4 py-3 uppercase tracking-wider">Expediente</th>
                  <th className="px-4 py-3 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 uppercase tracking-wider">Valoración</th>
                  <th className="px-4 py-3 uppercase tracking-wider text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/60 font-medium">
                {latestAppraisals.map((app) => (
                  <tr 
                    key={app.id}
                    onClick={() => onSelectAppraisal(app)}
                    className="hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-primary group-hover:underline">
                      {app.expediente}
                    </td>
                    <td className="px-4 py-3 text-on-surface font-sans">{app.client}</td>
                    <td className="px-4 py-3 text-on-surface-variant font-sans">{app.type}</td>
                    <td className="px-4 py-3 font-mono text-on-surface font-semibold">
                      {app.valuation.toLocaleString('es-ES')} €
                    </td>
                    <td className="px-4 py-3 text-right">
                      {getStatusBadge(app.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Bento: Doughnut chart & Featured showcasing */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Distribution chart card */}
          <div className="bg-surface p-5 border border-outline rounded-xl flex flex-col justify-between">
            <h4 className="text-sm font-bold text-on-surface mb-4">Distribución por Tipo</h4>
            
            <div className="relative h-44 flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                {/* Background track circle */}
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#334155" strokeWidth="2.8" />
                
                {distributionData.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="18"
                    cy="18"
                    r="16"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={hoveredSegment === seg.type ? "3.6" : "2.8"}
                    strokeDasharray={seg.strokeDash}
                    strokeDashoffset={seg.strokeOffset}
                    className="transition-all duration-300 pointer-events-auto cursor-pointer"
                    onMouseEnter={() => setHoveredSegment(seg.type)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                ))}
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-on-surface font-mono">100%</span>
                <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest">
                  {hoveredSegment ? hoveredSegment : 'TOTAL ASSETS'}
                </span>
              </div>
            </div>

            {/* List labels */}
            <div className="mt-4 space-y-2">
              {distributionData.map((seg, idx) => (
                <div 
                  key={idx} 
                  onMouseEnter={() => setHoveredSegment(seg.type)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer ${
                    hoveredSegment === seg.type ? 'bg-surface-container-high scale-[1.01]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></div>
                    <span className="text-xs font-semibold text-on-surface-variant">{seg.type}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-on-surface">{seg.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Featured agricultural asset spotlight */}
          <div className="relative overflow-hidden group bg-surface text-white border border-outline h-[220px] rounded-xl flex flex-col justify-end">
            <img 
              alt="Finca Rural El Amanecer" 
              className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-700" 
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 p-5 w-full z-15">
              <span className="bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-1.5 inline-block rounded">
                Tasación Destacada
              </span>
              <h5 className="text-base font-extrabold font-sans leading-tight">Finca "El Amanecer"</h5>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-none">Comunidad Valenciana • 12,4 Ha</p>
              
              <div className="flex items-center justify-between gap-4 mt-4 border-t border-white/15 pt-3">
                <div>
                  <p className="text-[9px] uppercase font-bold text-[#94A3B8] leading-none">VALOR ESTIMADO</p>
                  <p className="font-mono text-sm font-bold mt-0.5 text-primary">1.25M €</p>
                </div>
                <button 
                  onClick={() => {
                    // Find actual seed for El Amanecer and trigger selection
                    const elAmanecer = appraisals.find(a => a.expediente === 'EXP-2023-0891');
                    if (elAmanecer) onSelectAppraisal(elAmanecer);
                  }}
                  className="bg-secondary hover:bg-primary text-white px-3.5 py-1.5 font-bold text-[11px] rounded transition-colors cursor-pointer select-none"
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
