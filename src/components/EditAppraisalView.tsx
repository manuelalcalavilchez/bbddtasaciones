import React, { useState, useEffect } from 'react';
import { Appraisal, AppraisalStatus, ViewType, ValuationDetailRow } from '../types';
import {
  ArrowLeft,
  Save,
  Trash2,
  MapPin,
  User,
  Settings,
  Calculator,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';

interface EditAppraisalViewProps {
  appraisal: Appraisal | null;
  onUpdateAppraisal: (updated: Appraisal) => void;
  onDeleteAppraisal: (id: string) => void;
  onNavigate: (view: ViewType) => void;
}

export default function EditAppraisalView({ appraisal, onUpdateAppraisal, onDeleteAppraisal, onNavigate }: EditAppraisalViewProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [expediente, setExpediente] = useState('');
  const [client, setClient] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState<AppraisalStatus>('En Proceso');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [referenceCatastral, setReferenceCatastral] = useState('');
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [valuation, setValuation] = useState<number>(0);
  const [hasPool, setHasPool] = useState(false);
  const [floors, setFloors] = useState('');
  const [cultivoDetails, setCultivoDetails] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerNif, setOwnerNif] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [detailsTable, setDetailsTable] = useState<ValuationDetailRow[]>([]);

  // Load appraisal data into form
  useEffect(() => {
    if (appraisal) {
      setExpediente(appraisal.expediente);
      setClient(appraisal.client);
      setType(appraisal.type);
      setStatus(appraisal.status);
      setMunicipality(appraisal.municipality);
      setAddress(appraisal.address);
      setDate(appraisal.date);
      setReferenceCatastral(appraisal.referenceCatastral);
      setSurfaceArea(appraisal.surfaceArea);
      setValuation(appraisal.valuation);
      setHasPool(appraisal.hasPool || false);
      setFloors(appraisal.floors || '');
      setCultivoDetails(appraisal.cultivoDetails || '');
      setOwnerName(appraisal.ownerName || '');
      setOwnerNif(appraisal.ownerNif || '');
      setOwnerPhone(appraisal.ownerPhone || '');
      setOwnerEmail(appraisal.ownerEmail || '');
      setDescription(appraisal.description || '');
      setLatitude(appraisal.latitude);
      setLongitude(appraisal.longitude);
      setImageUrl(appraisal.imageUrl || '');
      setDetailsTable(appraisal.detailsTable ? [...appraisal.detailsTable] : []);
    }
  }, [appraisal]);

  if (!appraisal) {
    return (
      <div className="p-8 text-center">
        <p className="text-on-surface-variant">No se ha seleccionado ninguna tasacion para editar.</p>
        <button onClick={() => onNavigate('database')} className="mt-4 text-primary font-bold text-sm hover:underline cursor-pointer">
          Volver a la Base de Datos
        </button>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!expediente.trim() || !referenceCatastral.trim()) {
      alert('Los campos Expediente y Referencia Catastral son obligatorios.');
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      const updated: Appraisal = {
        ...appraisal,
        expediente,
        client,
        type,
        status,
        municipality,
        address,
        date,
        referenceCatastral,
        surfaceArea,
        valuation,
        valuePerSqM: surfaceArea > 0 ? valuation / surfaceArea : 0,
        hasPool,
        floors: floors || undefined,
        cultivoDetails: cultivoDetails || undefined,
        ownerName: ownerName || undefined,
        ownerNif: ownerNif || undefined,
        ownerPhone: ownerPhone || undefined,
        ownerEmail: ownerEmail || undefined,
        description: description || undefined,
        latitude,
        longitude,
        imageUrl: imageUrl || undefined,
        detailsTable: detailsTable.length > 0 ? detailsTable : undefined,
        statusHistory: [
          { status: "EXPEDIENTE MODIFICADO", date: new Date().toLocaleDateString('es-ES') + ', ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), details: "Ficha actualizada por el tasador." },
          ...(appraisal.statusHistory || [])
        ]
      };

      onUpdateAppraisal(updated);
      setIsSaving(false);
      onNavigate('detail');
    }, 600);
  };

  const handleDelete = () => {
    onDeleteAppraisal(appraisal.id);
    setShowDeleteConfirm(false);
    onNavigate('database');
  };

  // Detail table row handlers
  const handleAddDetailRow = () => {
    setDetailsTable(prev => [...prev, { concepto: '', unidad: '', valorUnitario: 0, subtotal: 0 }]);
  };

  const handleUpdateDetailRow = (index: number, field: keyof ValuationDetailRow, value: string | number) => {
    setDetailsTable(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleRemoveDetailRow = (index: number) => {
    setDetailsTable(prev => prev.filter((_, i) => i !== index));
  };

  const inputClass = "w-full p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder-on-surface-variant/40";
  const labelClass = "text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 select-none animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('detail')}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant cursor-pointer transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary">Editar Expediente</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Modificando: <span className="font-bold font-mono text-on-surface">{appraisal.expediente}</span> (ID: {appraisal.id})
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2.5 bg-red-900/20 border border-red-700/40 text-red-400 hover:bg-red-900/40 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Eliminar Expediente</span>
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">

        {/* SECTION 1: Datos Generales */}
        <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center gap-2 border-b border-outline pb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-on-surface">Datos Generales y Ubicacion</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Expediente *</label>
              <input type="text" className={inputClass} value={expediente} onChange={e => setExpediente(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Cliente</label>
              <input type="text" className={inputClass} value={client} onChange={e => setClient(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Estado</label>
              <select className={inputClass} value={status} onChange={e => setStatus(e.target.value as AppraisalStatus)}>
                <option value="Completado">Completado</option>
                <option value="En Revision">En Revision</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Tipo de Propiedad</label>
              <input type="text" className={inputClass} value={type} onChange={e => setType(e.target.value)} placeholder="Ej: Citricos (Finca), Vivienda Unifamiliar..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Municipio</label>
              <input type="text" className={inputClass} value={municipality} onChange={e => setMunicipality(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Fecha</label>
              <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className={labelClass}>Direccion Completa</label>
              <input type="text" className={inputClass} value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Referencia Catastral *</label>
              <input type="text" className={inputClass} value={referenceCatastral} onChange={e => setReferenceCatastral(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Latitud</label>
              <input type="number" step="any" className={inputClass} value={latitude} onChange={e => setLatitude(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Longitud</label>
              <input type="number" step="any" className={inputClass} value={longitude} onChange={e => setLongitude(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className={labelClass}>URL de Imagen</label>
              <input type="url" className={inputClass} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* SECTION 2: Datos del Titular */}
        <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center gap-2 border-b border-outline pb-3">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-on-surface">Datos del Titular / Propietario</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nombre Completo</label>
              <input type="text" className={inputClass} value={ownerName} onChange={e => setOwnerName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>NIF / CIF</label>
              <input type="text" className={inputClass} value={ownerNif} onChange={e => setOwnerNif(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Telefono de Contacto</label>
              <input type="tel" className={inputClass} value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Correo Electronico</label>
              <input type="email" className={inputClass} value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />
            </div>
          </div>
        </div>

        {/* SECTION 3: Caracteristicas Tecnicas */}
        <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center gap-2 border-b border-outline pb-3">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-on-surface">Caracteristicas Tecnicas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Superficie (m2)</label>
              <input type="number" step="any" className={inputClass} value={surfaceArea} onChange={e => setSurfaceArea(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Plantas / Niveles</label>
              <input type="text" className={inputClass} value={floors} onChange={e => setFloors(e.target.value)} placeholder="Ej: 2 + Sotano, N/A" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Cultivo / Detalles</label>
              <input type="text" className={inputClass} value={cultivoDetails} onChange={e => setCultivoDetails(e.target.value)} placeholder="Ej: Citricos, Naranjos, N/A" />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2.5 p-2.5 bg-surface-container-high rounded-lg border border-outline/50 cursor-pointer text-xs font-semibold group hover:bg-surface-container-highest">
              <input type="checkbox" checked={hasPool} onChange={e => setHasPool(e.target.checked)} className="w-4 h-4 text-primary focus:ring-primary rounded" />
              <span className="text-on-surface-variant group-hover:text-primary transition-colors">Tiene Piscina</span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Descripcion General</label>
            <textarea
              className="w-full p-3 border border-outline rounded-lg text-xs bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder-on-surface-variant/40 min-h-[100px] resize-y"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripcion detallada del inmueble, materiales, instalaciones..."
            />
          </div>
        </div>

        {/* SECTION 4: Valoracion */}
        <div className="bg-surface border border-outline rounded-xl p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center gap-2 border-b border-outline pb-3">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-on-surface">Valoracion</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Valor Total Tasado (EUR)</label>
              <input type="number" step="any" className={inputClass + " text-base font-bold font-mono"} value={valuation} onChange={e => setValuation(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Valor por m2 (calculado)</label>
              <div className="p-3 border border-outline rounded-lg text-xs bg-surface-container-highest text-on-surface font-mono font-bold">
                {surfaceArea > 0 ? (valuation / surfaceArea).toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '0'} EUR/m2
              </div>
            </div>
          </div>

          {/* Desglose de valoracion */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Desglose de Valoracion</label>
              <button
                type="button"
                onClick={handleAddDetailRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[10px] font-bold hover:bg-primary/30 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Anadir Concepto</span>
              </button>
            </div>

            {detailsTable.length > 0 ? (
              <div className="border border-outline rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-container-high border-b border-outline text-on-surface-variant font-bold">
                      <th className="p-2.5 text-left">Concepto</th>
                      <th className="p-2.5 text-left">Unidad</th>
                      <th className="p-2.5 text-right">Valor Unitario</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/40">
                    {detailsTable.map((row, idx) => (
                      <tr key={idx} className="bg-surface hover:bg-surface-container-high transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            className="w-full p-1.5 border border-outline/60 rounded text-xs bg-surface-container-high text-on-surface outline-none focus:ring-1 focus:ring-primary"
                            value={row.concepto}
                            onChange={e => handleUpdateDetailRow(idx, 'concepto', e.target.value)}
                            placeholder="Concepto"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            className="w-full p-1.5 border border-outline/60 rounded text-xs bg-surface-container-high text-on-surface outline-none focus:ring-1 focus:ring-primary font-mono"
                            value={row.unidad}
                            onChange={e => handleUpdateDetailRow(idx, 'unidad', e.target.value)}
                            placeholder="m2, Global..."
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            className="w-full p-1.5 border border-outline/60 rounded text-xs bg-surface-container-high text-on-surface outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                            value={row.valorUnitario}
                            onChange={e => handleUpdateDetailRow(idx, 'valorUnitario', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            className="w-full p-1.5 border border-outline/60 rounded text-xs bg-surface-container-high text-on-surface outline-none focus:ring-1 focus:ring-primary font-mono text-right font-bold"
                            value={row.subtotal}
                            onChange={e => handleUpdateDetailRow(idx, 'subtotal', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDetailRow(idx)}
                            className="p-1 hover:bg-red-900/30 text-red-400 rounded cursor-pointer transition-colors"
                            title="Eliminar fila"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-outline rounded-lg text-center text-xs text-on-surface-variant">
                No hay conceptos de valoracion. Pulse "Anadir Concepto" para agregar filas.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <button
            type="button"
            onClick={() => onNavigate('detail')}
            className="px-5 py-2.5 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancelar</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-lg bg-secondary text-white font-bold text-xs hover:bg-primary active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>

      </form>

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
              <p className="font-bold text-on-surface font-mono">{appraisal.expediente}</p>
              <p className="text-on-surface-variant">{appraisal.address}, {appraisal.municipality}</p>
              <p className="text-on-surface-variant">Valor: <span className="font-bold text-primary">{appraisal.valuation.toLocaleString('es-ES')} EUR</span></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high font-semibold text-xs cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
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
