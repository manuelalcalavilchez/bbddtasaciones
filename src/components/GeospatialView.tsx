import React, { useState } from 'react';
import { Appraisal, ViewType } from '../types';
import { 
  Search, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  Table, 
  Map as MapIcon, 
  Download, 
  FileText, 
  Eye, 
  MoreVertical,
  Plus,
  Minus,
  Layers,
  MapPinned
} from 'lucide-react';

interface GeospatialViewProps {
  appraisals: Appraisal[];
  onSelectAppraisal: (appraisal: Appraisal) => void;
  onNavigate: (view: ViewType) => void;
}

export default function GeospatialView({ appraisals, onSelectAppraisal, onNavigate }: GeospatialViewProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');
  const [radius, setRadius] = useState(15);
  const [municipality, setMunicipality] = useState('Murcia');
  const [openSections, setOpenSections] = useState({
    ubicacion: true,
    caracteristicas: false,
    valores: false,
  });

  // Filter properties from appraisals that match Murcia/Naranjos/Santomera
  const geospatialAppraisals = appraisals.filter(app => 
    app.expediente.startsWith('#REF-')
  );

  const toggleSection = (section: 'ubicacion' | 'caracteristicas' | 'valores') => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleResetFilters = () => {
    setRadius(15);
    setMunicipality('Murcia');
    alert('Filtros reiniciados a los valores predeterminados.');
  };

  const handleApplyAnalysis = () => {
    alert(`Análisis aplicado para: ${municipality} en un radio de ${radius} km.`);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-64px)] select-none text-on-surface">
      
      {/* Advanced Filters Left Sidebar */}
      <aside className="w-full md:w-80 bg-surface border-r border-outline flex flex-col overflow-y-auto custom-scrollbar shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-4 flex justify-between items-center sticky top-0 bg-surface z-20 border-b border-outline">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-on-surface font-sans">Filtros Avanzados</span>
          </div>
          <button 
            onClick={handleResetFilters}
            className="text-primary font-bold text-xs hover:underline cursor-pointer font-sans"
          >
            Reiniciar
          </button>
        </div>

        {/* Collapsible Accordion sections */}
        <div className="flex-1 divide-y divide-outline/40">
          
          {/* UBICACIÓN COMPONENT */}
          <div className="bg-surface">
            <button 
              onClick={() => toggleSection('ubicacion')}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-high transition-colors text-xs font-black text-on-surface uppercase tracking-wider"
            >
              <span>Ubicación</span>
              {openSections.ubicacion ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
            </button>
            
            {openSections.ubicacion && (
              <div className="px-4 pb-4 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Municipio</label>
                  <select 
                    value={municipality} 
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none font-sans"
                  >
                    <option value="Todos">Todos los municipios</option>
                    <option value="Murcia">Murcia</option>
                    <option value="Cartagena">Cartagena</option>
                    <option value="Santomera">Santomera</option>
                  </select>
                </div>

                {/* Proximity Slider Component */}
                <div className="flex flex-col gap-3 p-3 bg-surface-container-low border border-outline rounded-lg">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Proximidad</label>
                    <button 
                      onClick={() => {
                        setMunicipality('Murcia');
                        alert('Localizando perito... Ubicación fijada en Murcia Centro (37.99, -1.13)');
                      }}
                      className="flex items-center gap-1 text-primary text-[10px] font-bold hover:underline cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-primary animate-pulse" />
                      <span>Mi Ubicación</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-bold font-mono">
                      <span className="text-on-surface-variant">Radio</span>
                      <span className="text-primary font-black">{radius} km</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      className="w-full accent-primary h-1 bg-outline rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-on-surface-variant/70 font-mono">
                      <span>0km</span>
                      <span>50km</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* CARACTERÍSTICAS COMPONENT */}
          <div className="bg-surface">
            <button 
              onClick={() => toggleSection('caracteristicas')}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-high transition-colors text-xs font-black text-on-surface uppercase tracking-wider"
            >
              <span>Características</span>
              {openSections.caracteristicas ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
            </button>
            
            {openSections.caracteristicas && (
              <div className="px-4 pb-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Tipo de Finca</label>
                  <div className="flex flex-col gap-2.5 text-xs font-semibold p-2.5 bg-surface-container-high border border-outline rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer text-on-surface hover:text-primary">
                      <input type="checkbox" defaultChecked className="rounded border-outline text-primary focus:ring-primary w-4 h-4 bg-surface" />
                      <span className="font-sans">Naranjos / Cítricos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-on-surface hover:text-primary">
                      <input type="checkbox" className="rounded border-outline text-primary focus:ring-primary w-4 h-4 bg-surface" />
                      <span className="font-sans">Olivares</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-on-surface hover:text-primary">
                      <input type="checkbox" className="rounded border-outline text-primary focus:ring-primary w-4 h-4 bg-surface" />
                      <span className="font-sans">Viñedos</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Calidad / Estado</label>
                  <select className="w-full bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none font-sans">
                    <option>Cualquiera</option>
                    <option>Alta producción</option>
                    <option>Media producción</option>
                    <option>Abandono parcial</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Antigüedad (Años)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" className="w-1/2 bg-surface-container-high border border-outline rounded-lg p-2 text-xs text-on-surface outline-none font-mono" />
                    <input type="number" placeholder="Max" className="w-1/2 bg-surface-container-high border border-outline rounded-lg p-2 text-xs text-on-surface outline-none font-mono" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* VALORES COMPONENT */}
          <div className="bg-surface">
            <button 
              onClick={() => toggleSection('valores')}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-high transition-colors text-xs font-black text-on-surface uppercase tracking-wider"
            >
              <span>Valores</span>
              {openSections.valores ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
            </button>
            
            {openSections.valores && (
              <div className="px-4 pb-4 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Rango de valor (€/m²)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="0 €" className="w-1/2 bg-surface-container-high border border-outline rounded-lg p-2 text-xs text-on-surface outline-none font-mono" />
                    <input type="number" placeholder="100 €" className="w-1/2 bg-surface-container-high border border-outline rounded-lg p-2 text-xs text-on-surface outline-none font-mono" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Fecha de Tasación</label>
                  <input type="date" defaultValue="2023-01-01" className="w-full bg-surface-container-high border border-outline rounded-lg p-2 text-xs text-on-surface outline-none font-sans" />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Apply triggers */}
        <div className="p-4 sticky bottom-0 bg-surface border-t border-outline">
          <button 
            onClick={handleApplyAnalysis}
            className="w-full bg-secondary text-white font-semibold text-xs py-3 rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none font-sans active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>Aplicar Análisis</span>
          </button>
        </div>
      </aside>

      {/* Visual Data Layer Viewports (Main panel on right) */}
      <section className="flex-1 bg-[#090d16] flex flex-col overflow-hidden h-full">
        
        {/* View header & controls */}
        <div className="px-6 md:px-8 py-4 border-b border-outline flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 bg-surface">
          <div>
            <h3 className="text-base font-bold text-on-surface font-sans">
              Tasaciones: {municipality} / Naranjos
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
              {geospatialAppraisals.length} testigos encontrados en un radio de {radius}km
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-start">
            {/* Table vs Map toggle */}
            <div className="inline-flex p-1 bg-surface-container-high rounded-lg border border-outline shrink-0">
              <button 
                onClick={() => setActiveTab('table')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  activeTab === 'table' 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button 
                onClick={() => setActiveTab('map')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  activeTab === 'map' 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>
            </div>

            {/* Vertical Splitter */}
            <div className="h-6 w-[1px] bg-outline hidden md:block"></div>

            {/* Action exports */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => alert('Descargando archivo CSV con 124 testigos rústicos de la huerta...')}
                className="p-2 border border-outline bg-surface rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer"
                title="Descargar datos"
              >
                <Download className="w-4 h-4 text-primary" />
              </button>
              <button 
                onClick={() => alert('Generando informe geoespacial detallado (PDF)...')}
                className="p-2 border border-outline bg-surface rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer"
                title="Exportar reporte PDF"
              >
                <FileText className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Box swap */}
        <div className="flex-1 relative overflow-auto custom-scrollbar flex flex-col h-full bg-[#090d16]">
          
          {/* TAB 1: TABLE VIEW */}
          {activeTab === 'table' ? (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                <thead className="sticky top-0 bg-surface z-10 font-black border-b border-outline uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4 text-on-surface-variant">Referencia</th>
                    <th className="p-4 text-on-surface-variant">Fecha</th>
                    <th className="p-4 text-on-surface-variant">Ubicación</th>
                    <th className="p-4 text-on-surface-variant text-center">Distancia</th>
                    <th className="p-4 text-on-surface-variant">Tipo</th>
                    <th className="p-4 text-on-surface-variant text-right">Valor (€/m²)</th>
                    <th className="p-4 text-on-surface-variant text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/40 font-medium">
                  {geospatialAppraisals.map((app) => (
                    <tr 
                      key={app.id}
                      onClick={() => onSelectAppraisal(app)}
                      className="hover:bg-primary/10 transition-all cursor-pointer group"
                    >
                      <td className="p-4 font-mono font-bold text-primary group-hover:underline">
                        {app.expediente}
                      </td>
                      <td className="p-4 font-mono text-on-surface-variant/80">{app.date}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface font-sans">{app.municipality}</span>
                          <span className="text-[10px] text-on-surface-variant/70 truncate max-w-xs">{app.address}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-on-surface font-mono">
                        {(app.id === 'APP-006' ? 2.4 : app.id === 'APP-007' ? 5.8 : 12.1)} km
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded bg-[#0a2f1d] border border-green-500/30 text-green-400 text-[10px] font-extrabold uppercase font-sans">
                          {app.cultivoDetails ? app.cultivoDetails.toUpperCase() : 'NARANJOS'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-right text-primary font-bold">
                        {app.valuePerSqM?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1">
                          <button 
                            onClick={() => {
                              onSelectAppraisal(app);
                              setActiveTab('map');
                            }}
                            className="p-1 px-2.5 hover:bg-primary/20 rounded border border-primary/30 text-primary font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Ver en mapa"
                          >
                            <MapPinned className="w-3.5 h-3.5 text-primary" />
                            <span>Mapa</span>
                          </button>
                          <button 
                            onClick={() => onSelectAppraisal(app)}
                            className="p-1.5 hover:bg-surface-container-high rounded text-primary cursor-pointer border border-outline bg-surface"
                            title="Inspeccionar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => alert(`Acciones para testigo ${app.expediente}: comparar, duplicar u ocultar.`)}
                            className="p-1.5 hover:bg-surface-container-high rounded text-on-surface-variant cursor-pointer border border-outline bg-surface"
                            title="Opciones"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            
            /* TAB 2: RICH INTERACTIVE MAP LAYERING */
            <div className="flex-1 relative flex flex-col h-full bg-[#090d16] overflow-hidden min-h-[400px]">
              
              {/* Simulated professional topographic vector map utilizing gradient backgrounds & satellite focus */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=45')`
                }}
              >
                {/* SVG Radial overlay simulation representing pricing densities or agricultural heatmaps */}
                <div className="absolute inset-0 pointer-events-none bg-[#0a1128]/60 bg-blend-multiply flex items-center justify-center">
                  <div className="absolute w-[350px] h-[350px] bg-primary/25 rounded-full blur-[90px] pointer-events-none animate-pulse"></div>
                  <div className="absolute w-[200px] h-[200px] bg-secondary/15 rounded-full blur-[70px] pointer-events-none"></div>
                </div>

                {/* Grid guidelines overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {/* Simulated Geolocation pin markers on the map */}
                {geospatialAppraisals.map((app, index) => {
                  // Distribute positions nicely around center coordinate
                  const tops = ["40%", "30%", "60%", "25%", "65%"];
                  const lefts = ["45%", "25%", "55%", "68%", "30%"];
                  
                  return (
                    <div 
                      key={app.id}
                      className="absolute group z-20 cursor-pointer transition-transform duration-200 hover:scale-105"
                      style={{ 
                        top: tops[index % tops.length], 
                        left: lefts[index % lefts.length] 
                      }}
                      onClick={() => onSelectAppraisal(app)}
                    >
                      {/* Price badge popup bubble */}
                      <div className="bg-surface px-2 py-1 rounded-md border border-primary text-[10px] font-bold text-primary shadow-md flex items-center gap-1 group-hover:bg-primary group-hover:text-white transition-colors">
                        <MapPin className="w-3 h-3 text-secondary" />
                        <span className="font-mono">{app.valuePerSqM?.toLocaleString('es-ES', { maximumFractionDigits: 1 })} €/m²</span>
                      </div>
                      
                      {/* Anchor arrow indicator pin */}
                      <div className="w-3.5 h-3.5 bg-primary rounded-full mx-auto -mt-1.5 border-2 border-surface shadow-sm ring-4 ring-primary/25 pointer-events-none"></div>
                      
                      {/* Hover properties tooltip overview */}
                      <div className="absolute hidden group-hover:flex flex-col bg-surface text-on-surface p-3 rounded-lg border border-outline shadow-xl w-52 -left-20 top-8 z-50 animate-fade-in text-xs gap-1">
                        <p className="font-extrabold text-primary font-mono">{app.expediente}</p>
                        <p className="font-semibold font-sans">{app.municipality}</p>
                        <p className="text-[10px] text-on-surface-variant/80 font-sans">{app.address}</p>
                        <div className="flex justify-between items-center mt-1 border-t border-outline/30 pt-1.5">
                          <span className="font-bold text-[9px] text-on-surface-variant">Área: {app.surfaceArea.toLocaleString()} m²</span>
                          <span className="text-primary font-bold text-[10px]">Ver Ficha →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Floating GPS map controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
                  <div className="bg-surface rounded-lg shadow-lg border border-outline overflow-hidden text-on-surface-variant font-mono">
                    <button 
                      onClick={() => alert('Zoom incremental aplicado (+)')}
                      className="p-2 w-10 hover:bg-surface-container-high border-b border-outline block text-center font-bold text-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mx-auto text-primary" />
                    </button>
                    <button 
                      onClick={() => alert('Zoom decremental aplicado (-)')}
                      className="p-2 w-10 hover:bg-surface-container-high block text-center font-bold text-sm cursor-pointer"
                    >
                      <Minus className="w-4 h-4 mx-auto text-primary" />
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      alert('Centrando vista GPS en la delegación de Murcia Sede Central (37.989, -1.129).');
                    }}
                    className="bg-surface p-2.5 rounded-lg shadow-lg border border-outline hover:bg-surface-container text-primary flex items-center justify-center cursor-pointer" 
                    title="Fijar punto central"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      alert('Cargar / descargar ortofotos y capas del catastro SIGPAC...');
                    }}
                    className="bg-secondary text-white p-2.5 rounded-lg shadow-lg hover:bg-primary flex items-center justify-center cursor-pointer" 
                    title="Activar Heatmap / Capas"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>

                {/* Map pricing gradient density legend */}
                <div className="absolute bottom-4 left-4 bg-surface/95 p-3 rounded-lg shadow-lg border border-outline backdrop-blur-sm min-w-[200px] z-30 flex flex-col gap-1.5">
                  <p className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider leading-none">Densidad de Precios (€/m²)</p>
                  <div className="h-2 w-full bg-gradient-to-r from-blue-900 via-primary to-orange-500 rounded-full"></div>
                  <div className="flex justify-between text-[10px] text-on-surface font-extrabold font-mono">
                    <span>12€</span>
                    <span>25€</span>
                    <span>+40€</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Unified Table pagination footer */}
        <footer className="p-4 border-t border-outline bg-surface flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <span className="text-xs text-on-surface-variant font-semibold">
            Mostrando 1-5 de 5 tasaciones geolocalizadas
          </span>
          <div className="flex gap-1.5 items-center select-none font-mono">
            <button className="p-1 px-2.5 border border-outline rounded bg-surface-container-high text-on-surface-variant opacity-50 cursor-not-allowed">
              <span>&lt;</span>
            </button>
            <button className="px-3 py-1 rounded bg-secondary text-white text-xs font-black">1</button>
            <button onClick={() => alert('Solo un testigo cargado en la paginación de prueba')} className="px-3 py-1 rounded border border-outline bg-surface-container-high text-xs hover:bg-surface-container-highest cursor-pointer text-on-surface">2</button>
            <button onClick={() => alert('Solo un testigo cargado en la paginación de prueba')} className="px-3 py-1 rounded border border-outline bg-surface-container-high text-xs hover:bg-surface-container-highest cursor-pointer text-on-surface">3</button>
            <span className="px-1 text-on-surface-variant/60 text-xs">...</span>
            <button onClick={() => alert('Solo un testigo cargado en la paginación de prueba')} className="px-3 py-1 rounded border border-outline bg-surface-container-high text-xs hover:bg-surface-container-highest cursor-pointer text-on-surface">5</button>
            <button onClick={() => alert('Siguiente página de testigos')} className="p-1 px-2.5 border border-outline rounded bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest cursor-pointer text-on-surface">
              <span>&gt;</span>
            </button>
          </div>
        </footer>

      </section>

    </div>
  );
}
