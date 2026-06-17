import React, { useState } from 'react';
import { Appraisal, AppraisalStatus, ViewType } from '../types';
import { 
  MapPin, 
  Settings, 
  CloudUpload, 
  Map, 
  ArrowLeft, 
  ArrowRight,
  Database,
  Calculator,
  Trash2,
  FileCheck
} from 'lucide-react';

interface NewAppraisalViewProps {
  onSaveAppraisal: (newAppraisal: Appraisal) => void;
  onNavigate: (view: ViewType) => void;
}

export default function NewAppraisalView({ onSaveAppraisal, onNavigate }: NewAppraisalViewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [municipality, setMunicipality] = useState('Madrid');
  const [refCatastral, setRefCatastral] = useState('');
  const [address, setAddress] = useState('');
  
  const [propertyType, setPropertyType] = useState('Rústica');
  const [surfaceArea, setSurfaceArea] = useState<number>(150);
  const [buildYear, setBuildYear] = useState<number>(2015);
  const [hasPool, setHasPool] = useState(false);
  const [hasNaranjos, setHasNaranjos] = useState(true);
  const [hasGarage, setHasGarage] = useState(false);
  const [hasTrastero, setHasTrastero] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<{name: string, size: string}[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3 - Pricing
  const [baseValue, setBaseValue] = useState<number>(120000);
  const [marketCoefficient, setMarketCoefficient] = useState<number>(1.00);

  // Calculations
  const calculatedTotal = baseValue * marketCoefficient;
  const rawIva = calculatedTotal * 0.21;
  const notaryFees = calculatedTotal > 0 ? 1200 + (calculatedTotal * 0.001) : 0;

  // File Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const parsed: {name: string, size: string}[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        parsed.push({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        });
      }
      setUploadedFiles(prev => [...prev, ...parsed]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const parsed: {name: string, size: string}[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        parsed.push({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        });
      }
      setUploadedFiles(prev => [...prev, ...parsed]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCatastral.trim()) {
      alert('Por favor, indica la Referencia Catastral.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Create actual model appraisal struct
      const newExpedienteNum = Math.floor(Math.random() * 9000) + 1000;
      const newAppraisal: Appraisal = {
        id: `APP-NEW-${Date.now()}`,
        expediente: `EXP-2026-${newExpedienteNum}`,
        client: "Cliente Nuevo (Añadido)",
        type: propertyType === 'Rústica' ? 'Cítricos (Finca)' : 'Vivienda Unifamiliar',
        valuation: calculatedTotal,
        status: 'En Proceso' as AppraisalStatus,
        municipality: municipality,
        address: address || 'Dirección de Prueba, Madrid',
        date: new Date().toISOString().split('T')[0],
        referenceCatastral: refCatastral,
        surfaceArea: surfaceArea,
        valuePerSqM: surfaceArea > 0 ? calculatedTotal / surfaceArea : 0,
        hasPool: hasPool,
        floors: propertyType === 'Urbana' ? '2 Plantas' : 'N/A',
        cultivoDetails: hasNaranjos ? 'Naranjos / Mandarinas' : 'Cereal / Rústico',
        ownerName: "Propietario de Alta Manual",
        ownerNif: "11222333-X",
        ownerPhone: "+34 600 112233",
        ownerEmail: "propietario@manual.es",
        description: `Expediente generado de forma interactiva. Inmueble destinado a uso ${propertyType.toLowerCase()} con superficie de ${surfaceArea} m2.`,
        latitude: 40.4168 + (Math.random() - 0.5) * 0.1,
        longitude: -3.7038 + (Math.random() - 0.5) * 0.1,
        detailsTable: [
          { concepto: "Valoración base del suelo", unidad: `${surfaceArea} m²`, valorUnitario: surfaceArea > 0 ? baseValue / surfaceArea : 0, subtotal: baseValue },
          { concepto: "Coeficiente multiplicador corrector", unidad: "Coef.", valorUnitario: marketCoefficient, subtotal: calculatedTotal }
        ],
        statusHistory: [
          { status: "EXPEDIENTE CREADO", date: new Date().toLocaleDateString('es-ES'), details: "Ficha técnica inicial de entrada cargada por tasador." }
        ],
        imageUrl: propertyType === 'Rústica'
          ? "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80"
          : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80"
      };

      onSaveAppraisal(newAppraisal);
      setIsSubmitting(false);
      alert('¡Datos guardados con éxito en la base de datos de expedientes!');
      onNavigate('database'); // Go back to view
    }, 1200);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 select-none">
      
      {/* Header section with instructions */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold font-sans text-primary">Nueva Entrada de Datos</h1>
        <p className="text-xs md:text-sm text-on-surface-variant flex items-center gap-1">
          <span>Inscripción y valoración de un nuevo expediente de tasaciones.</span>
        </p>
      </div>

      {/* Modern Horizontal Stepper Indicators */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-outline shadow-md text-xs border-r border-[#334155]">
        {/* Step 1 */}
        <div className={`flex flex-col items-center flex-1 transition-all ${currentStep === 1 ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'}`}>
          <MapPin className={`w-5 h-5 ${currentStep === 1 ? 'text-primary' : 'text-on-surface-variant/60'}`} />
          <span className="mt-1">1. Ubicación</span>
        </div>
        <div className="h-[1px] bg-outline flex-1 mx-4"></div>
        
        {/* Step 2 */}
        <div className={`flex flex-col items-center flex-1 transition-all ${currentStep === 2 ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'}`}>
          <Settings className={`w-5 h-5 ${currentStep === 2 ? 'text-primary' : 'text-on-surface-variant/60'}`} />
          <span className="mt-1">2. Características</span>
        </div>
        <div className="h-[1px] bg-outline flex-1 mx-4"></div>
        
        {/* Step 3 */}
        <div className={`flex flex-col items-center flex-1 transition-all ${currentStep === 3 ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'}`}>
          <Calculator className={`w-5 h-5 ${currentStep === 3 ? 'text-primary' : 'text-on-surface-variant/60'}`} />
          <span className="mt-1">3. Valoración</span>
        </div>
      </div>

      {/* Main Core Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* STEP 1: GENERAL LOCATION DETAILS */}
        {currentStep === 1 && (
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-outline pb-3">
              <Map className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-on-surface">Detalles de Ubicación</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Municipio</label>
                <select 
                  className="p-3 border border-outline rounded-lg font-sans text-xs bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                >
                  <option value="Madrid">Madrid</option>
                  <option value="Barcelona">Barcelona</option>
                  <option value="Valencia">Valencia</option>
                  <option value="Sevilla">Sevilla</option>
                  <option value="Zaragoza">Zaragoza</option>
                  <option value="Murcia">Murcia</option>
                  <option value="Alicante">Alicante</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Referencia Catastral</label>
                <input 
                  type="text" 
                  placeholder="Ej: 1234567AB1234C0001XY"
                  className="p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder-on-surface-variant/40"
                  value={refCatastral}
                  onChange={(e) => setRefCatastral(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Dirección Completa</label>
                <input 
                  type="text" 
                  placeholder="Calle, avenida, plaza, número, código postal..."
                  className="p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder-on-surface-variant/40"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Simulated Satellite Map Coordinates widget matching mockup */}
            <div className="mt-4 h-60 rounded-xl bg-surface-container relative border border-outline overflow-hidden select-none">
              <img 
                alt="Mock GIS Satellite mapping coordinate layout"
                className="w-full h-full object-cover opacity-50 grayscale"
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-primary text-on-primary p-3 rounded-full shadow-lg ring-8 ring-primary/20 pointer-events-auto cursor-pointer animate-bounce">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute bottom-3 right-3 bg-surface px-3 py-1 rounded-full text-[10px] font-bold font-mono border border-outline shadow-md text-on-surface">
                Lat: 40.4168 | Lon: -3.7038
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: TECHNICAL CHARACTERISTICS AND ATTACHMENTS */}
        {currentStep === 2 && (
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-outline pb-3">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-on-surface">Atributos del Inmueble</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Tipo de Propiedad</label>
                <select 
                  className="p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none focus:ring-1 focus:ring-primary font-sans"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  <option value="Urbana">Urbana (Vivienda)</option>
                  <option value="Rústica">Rústica (Finca/Área Agraria)</option>
                  <option value="Industrial">Industrial (Almacén/Nave)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Superficie útil (m²)</label>
                <input 
                  type="number" 
                  className="p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none font-mono" 
                  value={surfaceArea}
                  onChange={(e) => setSurfaceArea(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Año de Construcción</label>
                <input 
                  type="number" 
                  className="p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none font-mono" 
                  value={buildYear}
                  onChange={(e) => setBuildYear(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Checkbox parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-container-low p-3.5 rounded-lg border border-outline/60">
              <label className="flex items-center gap-2.5 p-2 bg-surface-container-high rounded-lg border border-outline/50 cursor-pointer text-xs font-semibold group hover:bg-surface-container-highest">
                <input 
                  type="checkbox" 
                  checked={hasPool}
                  onChange={(e) => setHasPool(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary rounded" 
                />
                <span className="text-on-surface-variant group-hover:text-primary transition-colors">Piscina</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-surface-container-high rounded-lg border border-outline/50 cursor-pointer text-xs font-semibold group hover:bg-surface-container-highest">
                <input 
                  type="checkbox" 
                  checked={hasNaranjos}
                  onChange={(e) => setHasNaranjos(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary rounded" 
                />
                <span className="text-on-surface-variant group-hover:text-primary transition-colors">Naranjos/Cítricos</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-surface-container-high rounded-lg border border-outline/50 cursor-pointer text-xs font-semibold group hover:bg-surface-container-highest">
                <input 
                  type="checkbox" 
                  checked={hasGarage}
                  onChange={(e) => setHasGarage(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary rounded" 
                />
                <span className="text-on-surface-variant group-hover:text-primary transition-colors">Garaje</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-surface-container-high rounded-lg border border-outline/50 cursor-pointer text-xs font-semibold group hover:bg-surface-container-highest">
                <input 
                  type="checkbox" 
                  checked={hasTrastero}
                  onChange={(e) => setHasTrastero(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary rounded" 
                />
                <span className="text-on-surface-variant group-hover:text-primary transition-colors">Trastero</span>
              </label>
            </div>

            {/* Document Upload file explorer widget */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Documentación y Fotos</label>
              
              <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-outline bg-surface-container-low hover:bg-surface-container-high'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input 
                  type="file" 
                  id="file-upload-input" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
                
                <CloudUpload className="w-10 h-10 text-outline mb-2 shrink-0" />
                <p className="text-xs font-bold text-on-surface-variant">
                  Arrastre archivos aquí o <span className="text-primary underline font-extrabold">busque en su equipo</span>
                </p>
                <p className="text-[10px] text-on-surface-variant/60 mt-1 font-mono">PNG, JPG, PDF, XLS (máx. 10MB por archivo)</p>
              </div>

              {/* Uploaded state indicator list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 border border-outline rounded-lg divide-y divide-outline bg-surface max-h-40 overflow-y-auto custom-scrollbar p-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-surface-container-high text-xs">
                      <div className="flex items-center gap-2 overflow-hidden mr-4">
                        <FileCheck className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-semibold text-on-surface truncate font-mono">{file.name}</span>
                        <span className="text-[10px] text-on-surface-variant/60 font-mono shrink-0">({file.size})</span>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        className="p-1 hover:bg-error-container/30 text-error rounded cursor-pointer"
                        title="Quitar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* STEP 3: FINANCIAL APPRAISAL ESTIMATION SUMMARY */}
        {currentStep === 3 && (
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-outline pb-3">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-on-surface">Estimación de Valoración</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Manual Valuation inputs left */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Valor de Mercado Base (€)</label>
                  <input 
                    type="number" 
                    className="p-3 text-base font-bold font-mono border border-outline bg-surface-container-high text-on-surface focus:ring-2 focus:ring-primary rounded-lg outline-none"
                    value={baseValue}
                    onChange={(e) => setBaseValue(Number(e.target.value))}
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">Coeficiente de Mercado Corrector</label>
                  <input 
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={marketCoefficient}
                    onChange={(e) => setMarketCoefficient(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-high rounded-lg cursor-pointer accent-primary appearance-none mt-1" 
                  />
                  <div className="flex justify-between text-[10px] font-bold text-outline font-mono">
                    <span>Conservador (0.5)</span>
                    <span className="text-primary font-extrabold">Coef: {marketCoefficient.toFixed(2)}</span>
                    <span>Optimista (1.5)</span>
                  </div>
                </div>
              </div>

              {/* Automatic live visual overview panel */}
              <div className="bg-surface-container-high p-4 rounded-xl border border-outline flex flex-col justify-center items-center relative shadow-sm">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-none mb-1">
                  Resumen de Tasaciones
                </span>
                
                <div className="text-2xl md:text-3xl font-black text-primary font-mono select-all mt-1">
                  {calculatedTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </div>

                <div className="h-[1px] bg-outline w-full my-4"></div>

                <div className="w-full space-y-2 text-xs font-semibold text-on-surface-variant">
                  <div className="flex justify-between font-mono">
                    <span>Superficie Registrada</span>
                    <span className="text-on-surface font-extrabold">{surfaceArea} m²</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Precio Unitario Resultante</span>
                    <span className="text-on-surface font-extrabold">
                      {(surfaceArea > 0 ? (calculatedTotal / surfaceArea) : 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €/m²
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>I.V.A Estimado (21%)</span>
                    <span className="text-on-surface font-extrabold">{rawIva.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Gastos Fiscales / Notaría</span>
                    <span className="text-on-surface font-extrabold">~ {notaryFees.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Wizard Bottom navigation actions bar */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => currentStep > 1 && setCurrentStep(prev => prev - 1)}
            className={`px-4 py-2.5 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all ${
              currentStep === 1 ? 'invisible pointer-events-none' : ''
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <div className="flex gap-3">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2.5 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-primary active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-md select-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 font-sans"></span>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Guardar en Base de Datos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </form>

    </div>
  );
}
