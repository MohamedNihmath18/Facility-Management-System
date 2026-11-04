export interface AssetDocument {
  id: string;
  name: string;
  type: 'PPM Report' | 'Service Report' | 'License / Certificate' | 'Calibration Report' | 'Invoice' | 'User Manual' | 'Safety Certificate' | 'Other';
  url: string;
  fileSize?: string;
  uploadDate: string;
  expiryDate?: string;
  notes?: string;
}

export interface Asset {
  _id?: string;
  no?: number;
  assetName: string;
  assetNo: string;
  serialNumber?: string;
  model?: string;
  manufacturerName?: string;
  supplierName?: string;
  supplierContactNo?: string;
  location: string;
  department?: string;
  warrantyPeriod?: string;
  startOfWarranty?: string;
  endOfWarranty?: string;
  ppmFrequency?: string;
  ppm1Planned?: string;
  ppm1Actual?: string;
  ppm2Planned?: string;
  ppm2Actual?: string;
  ppm3Planned?: string;
  ppm3Actual?: string;
  ppm4Planned?: string;
  ppm4Actual?: string;
  ppm5Planned?: string;
  ppm5Actual?: string;
  ppm6Planned?: string;
  ppm6Actual?: string;
  poNo?: string;
  doNo?: string;
  invoiceNo?: string;
  totalAmount?: number;
  lifespan?: string;
  assetCriticality: 'Critical' | 'High' | 'Medium' | 'Low';
  assetCategory: string;
  typeOfEquipmentSafety?: string;
  status: 'Active' | 'Under Maintenance' | 'In Repair' | 'Decommissioned' | 'Inactive';
  licenseEndDate?: string;
  documents?: AssetDocument[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetStats {
  total: number;
  active: number;
  underMaintenance: number;
  warrantyExpiringSoon: number;
  licenseExpiringSoon: number;
  ppmDueSoon: number;
  totalValue: number;
  categories: { name: string; value: number }[];
  criticality: { name: string; value: number }[];
}

export const ASSET_CATEGORIES = [
  'Medical Equipment',
  'Biomedical Laboratory',
  'HVAC & Ventilation',
  'Electrical & Power',
  'IT Infrastructure',
  'Diagnostic Imaging',
  'Surgical & OT',
  'Patient Care & Ward',
  'Facilities & Mechanical',
  'Safety & Security',
  'General'
];

export const ASSET_CRITICALITY = ['Critical', 'High', 'Medium', 'Low'] as const;

export const ASSET_STATUSES = [
  'Active',
  'Under Maintenance',
  'In Repair',
  'Decommissioned',
  'Inactive'
] as const;

export const PPM_FREQUENCIES = [
  'Monthly',
  'Bi-Monthly',
  'Quarterly',
  'Semi-Annual',
  'Annual'
] as const;

export const SAFETY_TYPES = [
  'Class I Type B',
  'Class I Type BF',
  'Class I Type CF',
  'Class II Type B',
  'Class II Type BF',
  'Class II Type CF',
  'Electrical Safety Standard IEC 60601',
  'Electrical Safety Standard IEC 62353',
  'Class I (Grounded)',
  'Class II (Double Insulated)',
  'Internally Powered'
] as const;

export const DOCUMENT_TYPES = [
  'PPM Report',
  'Service Report',
  'License / Certificate',
  'Calibration Report',
  'Invoice',
  'User Manual',
  'Safety Certificate',
  'Other'
] as const;

// Helper to check 30-day alerts
export const check30DayAlerts = (asset: Asset) => {
  const now = new Date();
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(now.getDate() + 30);

  // Warranty
  let warrantyAlert = false;
  let warrantyDaysRemaining: number | null = null;
  if (asset.endOfWarranty) {
    const end = new Date(asset.endOfWarranty);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      warrantyAlert = true;
      warrantyDaysRemaining = diffDays;
    }
  }

  // License
  let licenseAlert = false;
  let licenseDaysRemaining: number | null = null;
  const licenseDate = asset.licenseEndDate 
    ? new Date(asset.licenseEndDate) 
    : asset.documents?.find(d => d.type === 'License / Certificate' && d.expiryDate)?.expiryDate 
      ? new Date(asset.documents.find(d => d.type === 'License / Certificate' && d.expiryDate)!.expiryDate!)
      : null;

  if (licenseDate) {
    const diffTime = licenseDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      licenseAlert = true;
      licenseDaysRemaining = diffDays;
    }
  }

  // PPM
  let ppmAlert = false;
  let ppmDaysRemaining: number | null = null;
  let nextPpmName: string | null = null;
  let nextPpmDate: string | null = null;

  const ppmPairs = [
    { name: '1st PPM', planned: asset.ppm1Planned, actual: asset.ppm1Actual },
    { name: '2nd PPM', planned: asset.ppm2Planned, actual: asset.ppm2Actual },
    { name: '3rd PPM', planned: asset.ppm3Planned, actual: asset.ppm3Actual },
    { name: '4th PPM', planned: asset.ppm4Planned, actual: asset.ppm4Actual },
    { name: '5th PPM', planned: asset.ppm5Planned, actual: asset.ppm5Actual },
    { name: '6th PPM', planned: asset.ppm6Planned, actual: asset.ppm6Actual },
  ];

  for (const pair of ppmPairs) {
    if (pair.planned && !pair.actual) {
      const plannedDate = new Date(pair.planned);
      const diffTime = plannedDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (!nextPpmDate || plannedDate < new Date(nextPpmDate)) {
        nextPpmName = pair.name;
        nextPpmDate = pair.planned;
        ppmDaysRemaining = diffDays;
        if (diffDays <= 30) {
          ppmAlert = true;
        }
      }
    }
  }

  return {
    warrantyAlert,
    warrantyDaysRemaining,
    licenseAlert,
    licenseDaysRemaining,
    ppmAlert,
    ppmDaysRemaining,
    nextPpmName,
    nextPpmDate
  };
};
