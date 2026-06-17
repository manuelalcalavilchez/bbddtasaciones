import React, { useState } from 'react';
import { SystemConfig } from '../types';
import { 
  Settings2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  RotateCcw, 
  Check, 
  Percent, 
  Coins, 
  TrendingUp,
  Save,
  HelpCircle,
  Database
} from 'lucide-react';

interface AdminViewProps {
  config: SystemConfig;
  onUpdateConfig: (newConfig: SystemConfig) => void;
  onResetDatabase: () => void;
}

export default function AdminView({ config, onUpdateConfig, onResetDatabase }: AdminViewProps) {
  // Local form state cloned from the parent config to allow edits
  const [formData, setFormData] = useState<SystemConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'defaultTaxRate' || name === 'multiplierCitricos' || name === 'multiplierUrbano'
        ? Number(value) 
        : value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToDefaultConfig = () => {
    const defaultConfig: SystemConfig = {
      appName: 'Tasaciones Alcalá',
      subTitle: 'EXPERTISE & SECURITY',
      peritoName: 'Carlos Mendoza',
      peritoRole: 'Tasador Senior',
      defaultMunicipality: 'Alcalá de Henares',
      defaultTaxRate: 21,
      multiplierCitricos: 25.5,
      multiplierUrbano: 1600,
      supportEmail: 'soporte@tasacionesalcala.es',
      contactPhone: '+34 91 885 4000'
    };
    setFormData(defaultConfig);
    onUpdateConfig(defaultConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6 select-none animate-fade-in text-on-surface">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-on-surface tracking-tight font-sans flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            <span>Panel de Administración</span>
          </h2>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Gestión global de marca de empresa, parámetros de cálculo de valor rústico/urbano y peritos oficiales.
          </p>
        </div>
        
        <button 
          type="button"
          onClick={handleResetToDefaultConfig}
          className="px-4 py-2 bg-surface hover:bg-surface-container-high border border-outline text-on-surface text-xs font-bold font-sans rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Valores por Defecto</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-600 px-4 py-3 rounded-lg flex items-center gap-2.5 text-xs font-bold animate-fade-in">
          <Check className="w-4 h-4 text-green-500 shrink-0" />
          <span>Configuración de {formData.appName} guardada y actualizada en tiempo real con éxito.</span>
        </div>
      )}

      {/* Main split dashboard-style admin forms layout */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left main config area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Brand Identidad Corporativa */}
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-outline/50 pb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <label className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider leading-none">
                Identidad de Marca
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Nombre de la Aplicación / Empresa</label>
                <input 
                  type="text" 
                  name="appName"
                  value={formData.appName}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Tasaciones Alcalá"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Slogan / Subtítulo Corporativo</label>
                <input 
                  type="text" 
                  name="subTitle"
                  value={formData.subTitle}
                  onChange={handleChange}
                  placeholder="Ej. EXPERTISE & SECURITY"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
                />
              </div>
            </div>
          </div>

          {/* Card: Perito Default Signature */}
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-outline/50 pb-3">
              <User className="w-4 h-4 text-primary" />
              <label className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider leading-none">
                Perito Estimador por Defecto
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Nombre Completo del Perito</label>
                <input 
                  type="text" 
                  name="peritoName"
                  value={formData.peritoName}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Carlos Mendoza"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Cargo / Rol Oficial</label>
                <input 
                  type="text" 
                  name="peritoRole"
                  value={formData.peritoRole}
                  onChange={handleChange}
                  placeholder="Ej. Tasador Senior"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
                />
              </div>
            </div>
          </div>

          {/* Card: Parámetros del Cálculo y Tasaciones */}
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-outline/50 pb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <label className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider leading-none">
                Coeficientes y Parámetros de Tasación
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[9px] flex items-center gap-1">
                  <Percent className="w-3 h-3 text-secondary" />
                  <span>Tipo de IVA General (%)</span>
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  name="defaultTaxRate"
                  value={formData.defaultTaxRate}
                  onChange={handleChange}
                  required
                  placeholder="21"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[9px] flex items-center gap-1">
                  <Coins className="w-3 h-3 text-secondary" />
                  <span>Cítricos / Naranjo (€/m²)</span>
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="multiplierCitricos"
                  value={formData.multiplierCitricos}
                  onChange={handleChange}
                  required
                  placeholder="25.50"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[9px] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-secondary" />
                  <span>Viviendas / Construcción (€/m²)</span>
                </label>
                <input 
                  type="number" 
                  step="1" 
                  name="multiplierUrbano"
                  value={formData.multiplierUrbano}
                  onChange={handleChange}
                  required
                  placeholder="1600"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="bg-surface-container-high p-3 rounded-lg border border-outline text-[11px] text-[#444651] leading-relaxed flex items-start gap-2 select-none">
              <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Estos coeficientes se aplicarán de forma predictiva por defecto al redactar y confeccionar nuevos expedientes y tasaciones oficiales para terrenos y construcciones urbanas o rústicas.
              </span>
            </div>
          </div>

          {/* Card: Soporte y Contacto */}
          <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-outline/50 pb-3">
              <Mail className="w-4 h-4 text-primary" />
              <label className="text-[11px] font-black uppercase text-on-surface-variant tracking-wider leading-none">
                Soporte y Contacto Técnico
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Email de Soporte</label>
                <input 
                  type="email" 
                  name="supportEmail"
                  value={formData.supportEmail}
                  onChange={handleChange}
                  required
                  placeholder="soporte@empresa.com"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Teléfono de Centralita</label>
                <input 
                  type="text" 
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+34"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-extrabold text-[#444651] uppercase text-[10px]">Municipio Central Sede</label>
                <input 
                  type="text" 
                  name="defaultMunicipality"
                  value={formData.defaultMunicipality}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Alcalá de Henares"
                  className="bg-surface-container-high border border-outline rounded-lg p-2.5 text-xs text-on-surface outline-none focus:border-primary font-sans"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right side operational controls sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card: Guardar Cambios */}
          <div className="bg-surface border border-outline rounded-xl p-5 shadow-md flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-wider leading-none">
              Acciones de Configuración
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Al guardar, se propagarán el logotipo, el título general, el perito estimador principal y los coeficientes por toda la suite.
            </p>

            <div className="flex flex-col gap-2.5">
              <button 
                type="submit"
                className="w-full bg-secondary hover:bg-primary text-white font-bold text-xs py-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>

          {/* Card: Mantenimiento Base de Datos */}
          <div className="bg-surface border border-outline rounded-xl p-5 shadow-md flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-outline/50 pb-2">
              <Database className="w-4 h-4 text-error" />
              <h4 className="text-xs font-black uppercase text-error tracking-wider leading-none">
                Mantenimiento de Datos
              </h4>
            </div>
            
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Si estás interactuando con testigos rústicos de prueba, puedes restaurar los expedientes originales con un solo clic.
            </p>

            <button 
              type="button"
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas reiniciar todos los expedientes a sus valores de fábrica? Los expedientes nuevos se perderán.')) {
                  onResetDatabase();
                  alert('La base de datos de tasaciones se ha restaurado con éxito.');
                }
              }}
              className="w-full py-2 bg-surface hover:bg-error/10 text-error border border-error/30 hover:border-error/50 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Expedientes</span>
            </button>
          </div>

          {/* Real-time brand preview indicator */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 shadow-sm space-y-3">
            <h5 className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">
              Vista Previa en Tiempo Real
            </h5>
            
            <div className="border border-outline bg-surface rounded-lg p-3 flex items-center gap-2.5 select-none text-xs">
              <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-white shrink-0 font-bold text-[11px]">
                {formData.appName ? formData.appName.charAt(0) : 'T'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-on-surface truncate leading-tight">{formData.appName || 'Tasaciones Alcalá'}</p>
                <p className="text-[9px] text-[#444651] font-bold tracking-widest uppercase leading-none mt-1 truncate">{formData.subTitle || 'EXPERTISE & SECURITY'}</p>
              </div>
            </div>

            <div className="border border-outline bg-surface rounded-lg p-3 flex items-center gap-3 select-none text-xs">
              <div className="w-7 h-7 rounded-full bg-secondary text-white font-mono flex items-center justify-center text-[10px] uppercase">
                {formData.peritoName ? formData.peritoName.split(' ').map(n => n.charAt(0)).join('') : 'CM'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-on-surface truncate leading-none">{formData.peritoName || 'Carlos Mendoza'}</p>
                <p className="text-[9px] text-on-surface-variant mt-1.5 leading-none">{formData.peritoRole || 'Tasador Senior'}</p>
              </div>
            </div>
          </div>

        </div>

      </form>

    </div>
  );
}
