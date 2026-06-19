/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ViewType = 'dashboard' | 'geospatial' | 'database' | 'new-appraisal' | 'edit-appraisal' | 'detail' | 'admin';

export type AppraisalStatus = 'Completado' | 'En Revisión' | 'Pendiente' | 'En Proceso';

export interface SystemConfig {
  appName: string;
  subTitle: string;
  peritoName: string;
  peritoRole: string;
  defaultMunicipality: string;
  defaultTaxRate: number; // For e.g. IVA or tax calculations
  multiplierCitricos: number; // default value multiplier/m2 for citrus trees
  multiplierUrbano: number; // default value multiplier/m2 for housing constructions
  supportEmail: string;
  contactPhone: string;
}

export interface ValuationDetailRow {
  concepto: string;
  unidad: string;
  valorUnitario: number;
  subtotal: number;
}

export interface StatusHistoryItem {
  status: string;
  date: string;
  details: string;
}

export interface Appraisal {
  id: string; // Unique internal ID
  expediente: string; // EXP-YYYY-XXXX notation
  client: string;
  type: string; // e.g., 'Cítricos (Finca)', 'Vivienda Unifamiliar', etc.
  valuation: number; // Total valuation in Euros
  status: AppraisalStatus;
  municipality: string;
  address: string;
  date: string; // YYYY-MM-DD
  referenceCatastral: string;
  surfaceArea: number; // in m²
  valuePerSqM?: number; // valuation / surfaceArea
  hasPool?: boolean;
  floors?: string;
  cultivoDetails?: string; // N/A or detail
  ownerName?: string;
  ownerNif?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  description?: string;
  latitude: number;
  longitude: number;
  detailsTable?: ValuationDetailRow[];
  statusHistory?: StatusHistoryItem[];
  imageUrl?: string;
}
