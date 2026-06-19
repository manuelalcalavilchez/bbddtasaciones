import React, { useState, useMemo } from 'react';
import { Appraisal, AppraisalStatus, ViewType } from '../types';
import { 
  Search, 
  Filter, 
  Calendar,
  Grid,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface AppraisalDbViewProps {
  appraisals: Appraisal[];
  onSelectAppraisal: (appraisal: Appraisal) => void;
  onNavigate: (view: ViewType) => void;
  onEditAppraisal: (appraisal: Appraisal) => void;
  onDeleteAppraisal: (id: string) => void;
}

export default function AppraisalDbView({ appraisals, onSelectAppraisal, onNavigate, onEditAppraisal, onDeleteAppraisal }: AppraisalDbViewProps) {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Murcia');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropTypes, setSelectedCropTypes] = useState<string[]>([
    'Cítricos', 'Cítricos (Finca)'
  ]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Handle crop checkbox toggling
  const handleCropTypeToggle = (type: string) => {
    setSelectedCropTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const handleClearFilters = () => {
    setSelectedMunicipality('Todos');
    setSearchQuery('');
    setSelectedCropTypes([]);
    setMinPrice('');
    setMaxPrice('');
  };

  const handleApplyFilters = () => {
    alert('Filtros aplicados. Se ha actualizado la consulta de tasaciones.');
  };

  // Perform client-side dynamic filtering matching search queries and side filters
  const filteredAppraisals = useMemo(() => {
    return appraisals.filter(app => {
      // 1. Municipality Match
      if (selectedMunicipality !== 'Todos' && app.municipality !== selectedMunicipality) {
        // Relax check to support nested matched strings if needed
        if (!app.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase())) {
          return false;
        }
      }

      // 2. Crop Type Match
      if (selectedCropTypes.length > 0) {
        // Match either type or description details
        const matchesType = selectedCropTypes.some(t => 
          app.type.toLowerCase().includes(t.toLowerCase()) || 
          (app.cultivoDetails && app.cultivoDetails.toLowerCase().includes(t.toLowerCase()))
        );
        if (!matchesType) return false;
      }

      // 3. Price brackets
      if (minPrice && app.valuation < Number(minPrice)) return false;
      if (maxPrice && app.valuation > Number(maxPrice)) return false;

      // 4. Text query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesQuery = 
          app.expediente.toLowerCase().includes(query) ||
          app.client.toLowerCase().includes(query) ||
          app.referenceCatastral.toLowerCase().includes(query) ||
          app.address.toLowerCase().includes(query);
        
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [appraisals, selectedMunicipality, selectedCropTypes, minPrice, maxPrice, searchQuery]);

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

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-64px)] select-none">
      
      {/* Filters Sidebar on Left */}
      <aside className="w-full md:w-85 bg-surface-container-low border-r border-outline-variant flex flex-col overflow-y-auto custom-scrollbar p-5 gap-5 shrink-0">
        
        {/* Header summary */}
        <div className="flex justify-between items-center bg-surface-container-low z-10">
          <h2 className="text-base font-bold text-on-surface">Filtros Avanzados</h2>
          <button 
            onClick={handleClearFilters}
            className="text-primary font-semibold text-xs hover:underline cursor-pointer"
          >
            Limpiar
          </button>
        </div>

        {/* Filter elements block */}
        <div className="flex flex-col gap-4">
          
          {/* MUNICIPIO BLOCK */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Municipio</label>
            <select 
              className="w-full bg-surface border border-outline rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
            >
              <option value="Todos">Todos los municipios</option>
              <option value="Murcia">Murcia</option>
              <option value="Madrid">Madrid</option>
              <option value="Cartagena">Cartagena</option>
              <option value="Santomera">Santomera</option>
            </select>
          </div>

          {/* TIPO FINCA CHECKBOXES */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Tipo de Finca</label>
            <div className="flex flex-col gap-2 text-xs">
              {[
                { key: 'Cítricos', label: 'Naranjos / Cítricos' },
                { key: 'Olivares', label: 'Olivares' },
                { key: 'Viñedos', label: 'Viñedos' },
                { key: 'Secano', label: 'Secano' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={selectedCropTypes.includes(item.key)}
                    onChange={() => handleCropTypeToggle(item.key)}
                    className="rounded border-outline text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-on-surface font-sans group-hover:text-primary transition-colors">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* RANGO DE FECHAS */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Rango de Fechas</label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#757682]" />
                <input 
                  type="date" 
                  defaultValue="2023-01-01"
                  className="w-full bg-surface border border-outline rounded-lg p-2 pl-9 text-xs" 
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#757682]" />
                <input 
                  type="date" 
                  defaultValue="2023-12-31"
                  className="w-full bg-surface border border-outline rounded-lg p-2 pl-9 text-xs" 
                />
              </div>
            </div>
          </div>

          {/* VALOR TASADO BOX */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Valor Tasado (€)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Min (€)" 
                className="w-1/2 bg-surface border border-outline rounded-lg p-2.5 text-xs outline-none" 
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <input 
                type="number" 
                placeholder="Max (€)" 
                className="w-1/2 bg-surface border border-outline rounded-lg p-2.5 text-xs outline-none" 
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <input type="range" className="w-full accent-primary mt-2" />
          </div>

        </div>

        {/* Sidebar bottom trigger link */}
        <div className="mt-auto pt-4">
          <button 
            onClick={handleApplyFilters}
            className="w-full bg-secondary text-white font-semibold text-xs py-3 rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Filter className="w-4 h-4" />
            <span>Aplicar Filtros</span>
          </button>
        </div>
      </aside>

      {/* Database Listing Panel */}
      <section className="flex-1 bg-background flex flex-col overflow-hidden h-full">
        
        {/* Header action bar */}
        <div className="p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h3 className="text-base font-bold text-on-surface font-sans">Base de Datos de Tasaciones</h3>
            <p className="text-xs text-on-surface-variant mt-0.5 font-sans">
              Mostrando {filteredAppraisals.length} resultados para "{selectedMunicipality} / {selectedCropTypes.join(' & ') || 'Cualquier Cultivo'}"
            </p>
          </div>
          
          <div className="flex items-center gap-2 select-none self-stretch sm:self-auto justify-end">
            <button 
              onClick={() => alert('Generando descarga de libro de Excel XLS de tasaciones... (' + filteredAppraisals.length + ' filas)')}
              className="px-3.5 py-2 border border-outline-variant rounded-lg text-on-surface-variant font-semibold text-xs hover:bg-surface-container-low transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-700" />
              <span>Descargar Excel</span>
            </button>
            <button 
              onClick={() => alert(`Iniciando generación de informes ejecutivos (PDF) para ${filteredAppraisals.length} expedientes...`)}
              className="px-3.5 py-2 border border-outline-variant rounded-lg text-on-surface-variant font-semibold text-xs hover:bg-surface-container-low transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#ba1a1a]" />
              <span>Generar PDF</span>
            </button>
          </div>
        </div>

        {/* Text Filter search override */}
        <div className="px-6 py-2.5 bg-surface-container-low/40 border-b border-outline-variant/60 flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-outline" />
          <input
            type="text"
            placeholder="Buscar por expediente, dirección o cliente en tiempo real..."
            className="bg-transparent border-none text-xs text-on-surface placeholder:text-outline w-full focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Listing Data table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {filteredAppraisals.length === 0 ? (
            <div className="p-12 text-center select-none flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
              <p className="text-sm font-semibold text-on-surface-variant">No se encontraron tasaciones coincidentes.</p>
              <button 
                onClick={handleClearFilters}
                className="text-xs bg-primary text-white font-bold py-1.5 px-4 rounded hover:bg-primary-hover transition-all cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant z-15 font-semibold text-on-surface-variant">
                <tr>
                  <th className="p-4 uppercase tracking-wider">Referencia</th>
                  <th className="p-4 uppercase tracking-wider">Fecha</th>
                  <th className="p-4 uppercase tracking-wider">Ubicación</th>
                  <th className="p-4 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 uppercase tracking-wider text-right">Valor Total (€)</th>
                  <th className="p-4 uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-medium">
                {filteredAppraisals.map((app) => (
                  <tr 
                    key={app.id}
                    onClick={() => onSelectAppraisal(app)}
                    className="hover:bg-primary-fixed/20 transition-all cursor-pointer group"
                  >
                    <td className="p-4 font-mono font-bold text-primary group-hover:underline">
                      {app.expediente}
                    </td>
                    <td className="p-4 font-mono text-on-surface-variant">{app.date}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{app.municipality}</span>
                        <span className="text-[10px] text-on-surface-variant truncate max-w-sm">{app.address}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase font-sans">
                        {app.type.replace(' (Finca)', '').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-right text-on-surface font-black">
                      {app.valuation.toLocaleString('es-ES')} €
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <button 
                          onClick={() => onSelectAppraisal(app)}
                          className="p-1.5 hover:bg-surface-container-high rounded text-on-surface-variant cursor-pointer"
                          title="Ver detalles"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onEditAppraisal(app)}
                          className="p-1.5 hover:bg-primary/20 rounded text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
                          title="Editar expediente"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(app.id)}
                          className="p-1.5 hover:bg-red-900/30 rounded text-on-surface-variant hover:text-red-400 cursor-pointer transition-colors"
                          title="Eliminar expediente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Listing Footer */}
        <footer className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center shrink-0">
          <span className="text-xs text-on-surface-variant font-medium">
            Página 1 de {Math.max(1, Math.ceil(filteredAppraisals.length / 10))} ({filteredAppraisals.length} resultados)
          </span>
          <div className="flex gap-1 items-center select-none font-mono">
            <button className="p-1 px-2 border border-outline-variant rounded bg-surface text-on-surface-variant opacity-60 cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="px-3 py-1 rounded bg-secondary text-white text-xs font-bold font-sans">1</button>
            <button className="p-1 px-2 border border-outline-variant rounded bg-surface text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>

      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const appToDelete = appraisals.find(a => a.id === deleteConfirmId);
        if (!appToDelete) return null;
        return (
          <div className="fixed inset-0 bg-[#0a1128]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-xl border border-outline shadow-2xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Eliminar Expediente</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Esta accion no se puede deshacer.</p>
                </div>
              </div>

              <div className="bg-surface-container-high border border-outline rounded-lg p-4 text-xs space-y-1">
                <p className="text-on-surface-variant">Se eliminara permanentemente:</p>
                <p className="font-bold text-on-surface font-mono">{appToDelete.expediente}</p>
                <p className="text-on-surface-variant">{appToDelete.address}, {appToDelete.municipality}</p>
                <p className="text-on-surface-variant">Valor: <span className="font-bold text-primary">{appToDelete.valuation.toLocaleString('es-ES')} EUR</span></p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high font-semibold text-xs cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteAppraisal(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-5 py-2 rounded-lg bg-red-700 text-white hover:bg-red-600 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Eliminacion</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
