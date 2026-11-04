import * as XLSX from 'xlsx';
import { Asset } from './types';

export const EXACT_HEADERS = [
  'No.',
  'Asset Name',
  'Asset No.',
  'Serial Number',
  'Model',
  'Manufacturer Name',
  'Supplier Name',
  'Supplier Contact No.',
  'Location',
  'Warranty Period',
  'Start of Warranty',
  'End of Warranty',
  'PPM Frequency',
  '1st PPM Planned',
  '1st PPM Actual',
  '2nd PPM Planned',
  '2nd PPM Actual',
  '3rd PPM Planned',
  '3rd PPM Actual',
  '4th PPM Planned',
  '4th PPM Actual',
  '5th PPM Planned',
  '5th PPM Actual',
  '6th PPM Planned',
  '6th PPM Actual',
  'PO No.',
  'DO No.',
  'Invoice No.',
  'Total Amount',
  'Lifespan',
  'Asset Criticality',
  'Asset Category',
  'Type of Equipment Safety',
  'Status'
];

export const SAMPLE_TEMPLATE_ROWS = [
  {
    'No.': 1,
    'Asset Name': 'GE Vivid E95 4D Ultrasound System',
    'Asset No.': 'AST-CARD-001',
    'Serial Number': 'GE-9832104',
    'Model': 'Vivid E95',
    'Manufacturer Name': 'GE Healthcare',
    'Supplier Name': 'GE Medical Systems Malaysia',
    'Supplier Contact No.': '+60 3-2273 9000',
    'Location': 'Cardiology - Room 305',
    'Warranty Period': '36 Months',
    'Start of Warranty': '2024-11-20',
    'End of Warranty': '2026-11-20',
    'PPM Frequency': 'Quarterly',
    '1st PPM Planned': '2025-02-15',
    '1st PPM Actual': '2025-02-14',
    '2nd PPM Planned': '2025-05-15',
    '2nd PPM Actual': '2025-05-15',
    '3rd PPM Planned': '2025-08-15',
    '3rd PPM Actual': '2025-08-16',
    '4th PPM Planned': '2025-11-15',
    '4th PPM Actual': '2025-11-14',
    '5th PPM Planned': '2026-02-15',
    '5th PPM Actual': '2026-02-16',
    '6th PPM Planned': '2026-11-18',
    '6th PPM Actual': '',
    'PO No.': 'PO-2024-0891',
    'DO No.': 'DO-2024-1102',
    'Invoice No.': 'INV-GE-88421',
    'Total Amount': 285000,
    'Lifespan': '8 Years',
    'Asset Criticality': 'Critical',
    'Asset Category': 'Medical Equipment',
    'Type of Equipment Safety': 'Class I Type BF',
    'Status': 'Active'
  },
  {
    'No.': 2,
    'Asset Name': 'Philips IntelliVue MX700 Patient Monitor',
    'Asset No.': 'AST-EMG-002',
    'Serial Number': 'PH-MX7-448102',
    'Model': 'MX700',
    'Manufacturer Name': 'Philips Healthcare',
    'Supplier Name': 'IDS Medical Systems Malaysia',
    'Supplier Contact No.': '+60 3-7965 2888',
    'Location': 'Emergency - ER-2',
    'Warranty Period': '24 Months',
    'Start of Warranty': '2025-01-10',
    'End of Warranty': '2027-01-10',
    'PPM Frequency': 'Semi-Annual',
    '1st PPM Planned': '2025-07-10',
    '1st PPM Actual': '2025-07-09',
    '2nd PPM Planned': '2026-01-10',
    '2nd PPM Actual': '2026-01-12',
    '3rd PPM Planned': '2026-11-15',
    '3rd PPM Actual': '',
    '4th PPM Planned': '2027-05-10',
    '4th PPM Actual': '',
    '5th PPM Planned': '',
    '5th PPM Actual': '',
    '6th PPM Planned': '',
    '6th PPM Actual': '',
    'PO No.': 'PO-2025-0120',
    'DO No.': 'DO-2025-0145',
    'Invoice No.': 'INV-IDS-9921',
    'Total Amount': 64000,
    'Lifespan': '7 Years',
    'Asset Criticality': 'High',
    'Asset Category': 'Medical Equipment',
    'Type of Equipment Safety': 'Class I Type CF',
    'Status': 'Active'
  }
];

export const downloadAssetTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS, { header: EXACT_HEADERS });
  
  // Set generous column widths
  const colWidths = EXACT_HEADERS.map(header => ({
    wch: Math.max(header.length + 4, 16)
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset Template');

  const filename = `MAHSA_Asset_Bulk_Template.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, filename, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
  }
};

export const exportAssetsToExcel = (assets: Asset[], filename = 'MAHSA_Hospital_Assets.xlsx') => {
  const rows = assets.map((a, idx) => ({
    'No.': a.no || idx + 1,
    'Asset Name': a.assetName || '',
    'Asset No.': a.assetNo || '',
    'Serial Number': a.serialNumber || '',
    'Model': a.model || '',
    'Manufacturer Name': a.manufacturerName || '',
    'Supplier Name': a.supplierName || '',
    'Supplier Contact No.': a.supplierContactNo || '',
    'Location': a.location || '',
    'Warranty Period': a.warrantyPeriod || '',
    'Start of Warranty': a.startOfWarranty ? a.startOfWarranty.split('T')[0] : '',
    'End of Warranty': a.endOfWarranty ? a.endOfWarranty.split('T')[0] : '',
    'PPM Frequency': a.ppmFrequency || '',
    '1st PPM Planned': a.ppm1Planned ? a.ppm1Planned.split('T')[0] : '',
    '1st PPM Actual': a.ppm1Actual ? a.ppm1Actual.split('T')[0] : '',
    '2nd PPM Planned': a.ppm2Planned ? a.ppm2Planned.split('T')[0] : '',
    '2nd PPM Actual': a.ppm2Actual ? a.ppm2Actual.split('T')[0] : '',
    '3rd PPM Planned': a.ppm3Planned ? a.ppm3Planned.split('T')[0] : '',
    '3rd PPM Actual': a.ppm3Actual ? a.ppm3Actual.split('T')[0] : '',
    '4th PPM Planned': a.ppm4Planned ? a.ppm4Planned.split('T')[0] : '',
    '4th PPM Actual': a.ppm4Actual ? a.ppm4Actual.split('T')[0] : '',
    '5th PPM Planned': a.ppm5Planned ? a.ppm5Planned.split('T')[0] : '',
    '5th PPM Actual': a.ppm5Actual ? a.ppm5Actual.split('T')[0] : '',
    '6th PPM Planned': a.ppm6Planned ? a.ppm6Planned.split('T')[0] : '',
    '6th PPM Actual': a.ppm6Actual ? a.ppm6Actual.split('T')[0] : '',
    'PO No.': a.poNo || '',
    'DO No.': a.doNo || '',
    'Invoice No.': a.invoiceNo || '',
    'Total Amount': a.totalAmount || 0,
    'Lifespan': a.lifespan || '',
    'Asset Criticality': a.assetCriticality || 'Medium',
    'Asset Category': a.assetCategory || 'Medical Equipment',
    'Type of Equipment Safety': a.typeOfEquipmentSafety || '',
    'Status': a.status || 'Active'
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: EXACT_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hospital Assets');
  XLSX.writeFile(wb, filename);
};
