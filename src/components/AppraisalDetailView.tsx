import React, { useState } from 'react';
import { Appraisal, ViewType } from '../types';
import { 
  Building2, 
  MapPin, 
  Edit, 
  Trash2,
  FileText, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Info, 
  Calculator,
  SquareDot, 
  ExternalLink,
  ChevronUp,
  MapPinned,
  AlertTriangle
} from 'lucide-react';

interface AppraisalDetailViewProps {
  appraisal: Appraisal | null;
  onNavigate: (view: ViewType) => void;
  onUpdateValuation?: (id: string, newVal: number) => void;
  onEditAppraisal?: () => void;
  onDeleteAppraisal?: (id: string) => void;
}

export default function AppraisalDetailView({ appraisal, onNavigate, onUpdateValuation, onEditAppraisal, onDeleteAppraisal }: AppraisalDetailViewProps) {
  // Collapsible accordions state
  const [accordions, setAccordions] = useState({
    titular: true,
    tecnico: true,
    valoracion: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleAccordion = (sec: 'titular' | 'tecnico' | 'valoracion') => {
    setAccordions(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Safe fallback if null is passed
  const activeAppraisal = appraisal || {
    id: "APP-002",
    expediente: "EXP-2023-0895",
    client: "Herederos de P. Gómez",
    type: "Vivienda Unifamiliar",
    valuation: 485000,
    status: "En Revisión",
    municipality: "Madrid",
    address: "Calle del Olmo 14, 28004 Madrid",
    date: "2023-12-10",
    referenceCatastral: "9876543UI0987G0001JJ",
    surfaceArea: 142,
    valuePerSqM: 3415.49,
    hasPool: true,
    floors: "2 + Sótano",
    cultivoDetails: "N/A",
    ownerName: "Marta García Fernández",
    ownerNif: "50.123.456-L",
    ownerPhone: "+34 600 000 000",
    ownerEmail: "marta.garcia@email.com",
    description: "Vivienda unifamiliar con estructura de hormigón armado, cerramientos de ladrillo visto y carpintería de aluminio con rotura de puente térmico. Pavimentos de gres porcelánico en planta baja y tarima de roble en planta superior. Instalación completa de climatización por conductos y sistema de aerotermia.",
    latitude: 40.4168,
    longitude: -3.7038,
    detailsTable: [
      { concepto: "Suelo Urbano Consolidado", unidad: "250 m²", valorUnitario: 800.00, subtotal: 200000.00 },
      { concepto: "Vivienda Principal (Construcción)", unidad: "142 m²", valorUnitario: 1600.00, subtotal: 227200.00 },
      { concepto: "Urbanización e Infraestructuras (Piscina)", unidad: "Global", valorUnitario: 57800.00, subtotal: 57800.00 }
    ],
    statusHistory: [
      { status: "INFORME GENERADO", date: "Hoy, 10:45 AM", details: "Por Juan Pérez" },
      { status: "VALORACIÓN FINALIZADA", date: "Ayer, 16:30 PM", details: "" },
      { status: "INSPECCIÓN COMPLETADA", date: "12 Oct 2023, 11:20 AM", details: "" }
    ]
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6 select-none animate-fade-in text-on-surface">
      
      {/* Breadcrumbs Navigation trail */}
      <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
        <button 
          onClick={() => onNavigate('database')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Base de Datos
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-outline animate-none" />
        <span className="text-primary font-bold">Ficha: {activeAppraisal.expediente}</span>
      </nav>

      {/* Header section with keys card summary */}
      <section className="bg-surface rounded-xl border border-outline p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-md">
        
        <div className="md:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
              {activeAppraisal.status}
            </span>
            <span className="text-on-surface-variant text-[11px] font-bold font-mono">
              ID expediente: #{activeAppraisal.id}
            </span>
          </div>
          
          <h2 className="text-lg md:text-xl font-bold font-sans text-on-surface leading-snug">
            Referencia Catastral: {activeAppraisal.referenceCatastral}
          </h2>
          
          <p className="text-xs md:text-sm text-on-surface-variant flex items-center gap-2 font-medium">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span>{activeAppraisal.address}, {activeAppraisal.municipality}</span>
          </p>
        </div>

        <div className="md:col-span-4 flex flex-col md:items-end gap-3 border-t md:border-t-0 border-outline/30 pt-4 md:pt-0">
          <div className="text-left md:text-right">
            <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block leading-none mb-1">
              VALOR TOTAL ESTIMADO
            </span>
            <span className="text-xl md:text-2xl font-black text-primary font-mono select-all">
              {activeAppraisal.valuation.toLocaleString('es-ES')},00 €
            </span>
          </div>

          <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
            <button 
              onClick={() => onEditAppraisal && onEditAppraisal()}
              className="px-4 py-2 bg-surface-container-high border border-outline hover:bg-surface-container-highest text-on-surface rounded-lg text-xs font-bold font-sans flex items-center gap-2 cursor-pointer transition-all"
            >
              <Edit className="w-4 h-4 text-primary" />
              <span>Editar Datos</span>
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-900/20 border border-red-700/40 text-red-400 hover:bg-red-900/40 rounded-lg text-xs font-bold font-sans flex items-center gap-2 cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
            <button 
              onClick={() => alert(`Generando certificado oficial de tasación catastral (PDF) para el expediente ${activeAppraisal.expediente}...`)}
              className="px-4 py-2 bg-secondary text-white hover:bg-primary rounded-lg text-xs font-bold font-sans flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Generar Informe PDF</span>
            </button>
          </div>
        </div>

      </section>

      {/* Accordions and Timeline split split workspace columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left grid containing core dossier data accordions */}
        <div className="md:col-span-8 space-y-4">
          
          {/* ACCORDION 1: DATOS DEL TITULAR */}
          <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-md">
            <button 
              onClick={() => toggleAccordion('titular')}
              className="w-full flex justify-between items-center p-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors select-none"
            >
              <div className="flex items-center gap-3 text-on-surface font-sans">
                <User className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm text-on-surface">Datos del Titular</span>
              </div>
              {accordions.titular ? <ChevronUp className="w-5 h-5 text-outline" /> : <ChevronDown className="w-5 h-5 text-outline" />}
            </button>
            
            {accordions.titular && (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-outline text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase">Nombre Completo</label>
                  <p className="text-on-surface font-semibold">{activeAppraisal.ownerName || 'Marta García Fernández'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase">NIF / CIF</label>
                  <p className="text-on-surface font-semibold font-mono">{activeAppraisal.ownerNif || '50.123.456-L'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase">Teléfono de Contacto</label>
                  <p className="text-on-surface font-semibold font-mono">{activeAppraisal.ownerPhone || '+34 600 000 000'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase">Correo Electrónico</label>
                  <p className="text-on-surface font-semibold font-sans">{activeAppraisal.ownerEmail || 'marta.garcia@email.com'}</p>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: CARACTERÍSTICAS TÉCNICAS */}
          <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-md">
            <button 
              onClick={() => toggleAccordion('tecnico')}
              className="w-full flex justify-between items-center p-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors select-none"
            >
              <div className="flex items-center gap-3 text-on-surface font-sans">
                <Info className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm text-on-surface">Características Técnicas</span>
              </div>
              {accordions.tecnico ? <ChevronUp className="w-5 h-5 text-outline" /> : <ChevronDown className="w-5 h-5 text-outline" />}
            </button>
            
            {accordions.tecnico && (
              <div className="p-5 border-t border-outline space-y-4">
                
                {/* 4 Stats Grid Boxes matching mockup layout */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-surface-container-high p-3.5 rounded-lg border border-outline">
                    <label className="block text-[9px] font-extrabold text-on-surface-variant uppercase mb-1">Superficie</label>
                    <div className="flex items-center gap-1">
                      <SquareDot className="w-3.5 h-3.5 text-primary" />
                      <span className="font-extrabold font-mono text-on-surface text-sm">{activeAppraisal.surfaceArea.toLocaleString('es-ES')} m²</span>
                    </div>
                  </div>
                  
                  <div className="bg-surface-container-high p-3.5 rounded-lg border border-outline">
                    <label className="block text-[9px] font-extrabold text-on-surface-variant uppercase mb-1">Piscina</label>
                    <div className="flex items-center gap-1">
                      <SquareDot className="w-3.5 h-3.5 text-primary" />
                      <span className="font-extrabold font-sans text-on-surface text-sm">{activeAppraisal.hasPool ? 'Sí (Privada)' : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-high p-3.5 rounded-lg border border-outline">
                    <label className="block text-[9px] font-extrabold text-on-surface-variant uppercase mb-1">Cultivos</label>
                    <div className="flex items-center gap-1">
                      <SquareDot className="w-3.5 h-3.5 text-primary" />
                      <span className="font-extrabold font-sans text-on-surface text-sm truncate">{activeAppraisal.cultivoDetails || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-high p-3.5 rounded-lg border border-outline">
                    <label className="block text-[9px] font-extrabold text-on-surface-variant uppercase mb-1">Plantas / Niveles</label>
                    <div className="flex items-center gap-1">
                      <SquareDot className="w-3.5 h-3.5 text-primary" />
                      <span className="font-extrabold font-sans text-on-surface text-sm">{activeAppraisal.floors || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="text-[10px] font-extrabold text-primary uppercase">Distribución y Materiales</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-sans">{activeAppraisal.description}</p>
                </div>

              </div>
            )}
          </div>

          {/* ACCORDION 3: VALORACIÓN DETALLADA TABLE */}
          <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-md">
            <button 
              onClick={() => toggleAccordion('valoracion')}
              className="w-full flex justify-between items-center p-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors select-none"
            >
              <div className="flex items-center gap-3 text-on-surface font-sans">
                <Calculator className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm text-on-surface font-sans">Valoración Detallada</span>
              </div>
              {accordions.valoracion ? <ChevronUp className="w-5 h-5 text-outline" /> : <ChevronDown className="w-5 h-5 text-outline" />}
            </button>
            
            {accordions.valoracion && (
              <div className="border-t border-outline overflow-x-auto text-xs font-semibold select-none">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high border-b border-outline font-bold text-on-surface-variant">
                      <th className="p-3">Concepto</th>
                      <th className="p-3 text-center">Unidad</th>
                      <th className="p-3 text-right font-sans">Valor Unitario</th>
                      <th className="p-3 text-right font-sans">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/40 font-medium bg-surface">
                    {activeAppraisal.detailsTable ? (
                      activeAppraisal.detailsTable.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-high transition-colors">
                          <td className="p-3 text-on-surface font-sans">{row.concepto}</td>
                          <td className="p-3 text-center font-mono">{row.unidad}</td>
                          <td className="p-3 text-right font-mono">{row.valorUnitario?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                          <td className="p-3 text-right font-mono font-bold">{row.subtotal?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-surface-container-high transition-colors">
                        <td className="p-3 text-on-surface font-sans">Valoración de Suelo Aglomerado</td>
                        <td className="p-3 text-center font-mono">{activeAppraisal.surfaceArea} m²</td>
                        <td className="p-3 text-right font-mono">{(activeAppraisal.valuation / activeAppraisal.surfaceArea).toFixed(0)} €</td>
                        <td className="p-3 text-right font-mono font-bold">{activeAppraisal.valuation.toLocaleString('es-ES')} €</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/10 border-t border-primary font-bold">
                      <td className="p-3 font-bold text-primary text-right uppercase" colSpan={3}>Valor de Mercado Estimado</td>
                      <td className="p-3 font-mono font-black text-primary text-right text-sm">
                        {activeAppraisal.valuation.toLocaleString('es-ES')} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right sidebar column containing timeline coordinates and map */}
        <div className="md:col-span-4 flex flex-col gap-4">
          
          {/* Map Localization card widget */}
          <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-md h-fit">
            <div className="p-3.5 border-b border-outline bg-surface-container-high flex justify-between items-center text-xs font-bold leading-none select-none">
              <span>Localización GIS</span>
              <MapPinned className="w-4 h-4 text-primary shrink-0 animate-pulse" />
            </div>
            
            <div className="aspect-square relative w-full bg-surface-container-highest overflow-hidden select-none">
              <img 
                alt="Topographic location property parcel map view"
                className="w-full h-full object-cover opacity-60 contrast-[1.05]"
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&h=400&q=80"
              />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-primary text-on-primary p-2.5 rounded-full shadow-lg ring-4 ring-primary/20 pointer-events-auto">
                  <MapPin className="w-4 h-4 animate-bounce" />
                </div>
              </div>

              <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-outline">
                <span className="text-[10px] font-extrabold font-mono text-on-surface leading-none">
                  {activeAppraisal.latitude?.toFixed(4)}° N, {Math.abs(activeAppraisal.longitude || 3.7038)?.toFixed(4)}° W
                </span>
              </div>
            </div>

            <div className="p-4">
              <button 
                onClick={() => {
                  const query = `${activeAppraisal.latitude},${activeAppraisal.longitude}`;
                  alert(`Redireccionando a Google Maps Catastro con las coordenadas: ${query}`);
                }}
                className="w-full py-2 bg-surface-container-high hover:bg-surface-container border border-outline text-on-surface font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>Abrir en Google Maps</span>
              </button>
            </div>
          </div>

          {/* Timeline History log schedule tracker */}
          <div className="bg-surface border border-outline rounded-xl p-4 shadow-md h-fit select-none">
            <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-wider mb-4 leading-none">
              Historial de Estados
            </h4>
            
            <div className="relative space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline">
              {activeAppraisal.statusHistory ? (
                activeAppraisal.statusHistory.map((hist, idx) => (
                  <div key={idx} className="relative pl-6 flex items-start text-xs gap-3 font-medium">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center z-15 border-4 border-surface ${
                      idx === 0 ? 'bg-primary' : 'bg-surface-container-highest border border-outline'
                    }`}>
                      {idx === 0 && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className={`font-bold leading-none ${idx === 0 ? 'text-primary' : 'text-on-surface'}`}>
                        {hist.status}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-1 leading-none">{hist.date}</p>
                      {hist.details && (
                        <p className="text-[10px] text-outline mt-1 font-sans">{hist.details}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative pl-6 flex items-start text-xs gap-3">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-15 border-4 border-surface">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-bold text-primary leading-none">INSPECCIÓN FINALIZADA</p>
                    <p className="text-[10px] text-on-surface-variant mt-1 font-sans">Cierre de expediente en fecha.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
              <p className="font-bold text-on-surface font-mono">{activeAppraisal.expediente}</p>
              <p className="text-on-surface-variant">{activeAppraisal.address}, {activeAppraisal.municipality}</p>
              <p className="text-on-surface-variant">Valor: <span className="font-bold text-primary">{activeAppraisal.valuation.toLocaleString('es-ES')} EUR</span></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high font-semibold text-xs cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteAppraisal) {
                    onDeleteAppraisal(activeAppraisal.id);
                  }
                  setShowDeleteConfirm(false);
                  onNavigate('database');
                }}
                className="px-5 py-2 rounded-lg bg-red-700 text-white hover:bg-red-600 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminacion</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
