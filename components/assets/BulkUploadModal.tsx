import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Info, 
  Check, 
  FileCheck,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Asset } from './types';
import { downloadAssetTemplate } from './sampleTemplate';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAssets: Asset[];
  onSuccess: (newAssets: Asset[], strategy: 'skip' | 'update' | 'replace', allowDuplicates?: boolean) => Promise<void>;
}

export interface SkippedItem {
  excelRow: number;
  assetName: string;
  assetNo: string;
  serialNumber: string;
  department?: string;
  category?: string;
  reason: string;
}

interface ParsedSummary {
  totalRows: number;
  validNewCount: number;
  duplicateCount: number;
  duplicatesInFileCount: number;
  duplicateAssetNos: string[];
  skippedItems: SkippedItem[];
  sampleParsed: any[];
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  existingAssets,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'replace'>('update');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [rawCleanedRows, setRawCleanedRows] = useState<any[]>([]);
  const [allProcessedRows, setAllProcessedRows] = useState<any[]>([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [summary, setSummary] = useState<ParsedSummary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDuplicatesList, setShowDuplicatesList] = useState(false);
  const [showSkippedModal, setShowSkippedModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setRawCleanedRows([]);
    setAllProcessedRows([]);
    setAllowDuplicates(false);
    setSummary(null);
    setIsProcessing(false);
    setUploading(false);
    setShowDuplicatesList(false);
    setShowSkippedModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleToggleAllowDuplicates = (checked: boolean) => {
    setAllowDuplicates(checked);
    if (checked) {
      setParsedData(allProcessedRows);
    } else {
      setParsedData(rawCleanedRows);
    }
  };

  const exportSkippedReport = () => {
    if (!summary || summary.skippedItems.length === 0) return;
    const exportData = summary.skippedItems.map(item => ({
      'Excel Row #': item.excelRow,
      'Asset Description': item.assetName,
      'Asset No.': item.assetNo,
      'Serial Number': item.serialNumber,
      'Department': item.department || '-',
      'Category': item.category || '-',
      'Reason Removed / Duplicate Diagnosis': item.reason
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Skipped_Duplicates_Report');
    const fileName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : 'Assets';
    XLSX.writeFile(wb, `Skipped_Duplicates_Report_${fileName}.xlsx`);
  };

  const normalizeKey = (key: string) => {
    return key.trim().toLowerCase().replace(/[\._\s-]/g, '');
  };

  const parseFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        alert('The uploaded file contains no data rows.');
        setIsProcessing(false);
        return;
      }

      // Existing assets lookup sets (by Serial Number and exact AssetNo + Name)
      const existingSerialSet = new Set(
        existingAssets
          .filter(a => a.serialNumber && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(String(a.serialNumber).trim().toUpperCase()))
          .map(a => String(a.serialNumber).trim().toUpperCase())
      );
      const existingExactSet = new Set(
        existingAssets
          .map(a => `${String(a.assetNo || '').trim().toUpperCase()}|||${String(a.assetName || '').trim().toUpperCase()}`)
      );

      const seenSerialsMap = new Map<string, { excelRow: number; assetName: string; assetNo: string }>();
      const seenExactMap = new Map<string, { excelRow: number; assetName: string; assetNo: string }>();
      const skippedItems: SkippedItem[] = [];
      const duplicateWithSystem: string[] = [];
      const cleanedRows: any[] = [];
      const allRows: any[] = [];

      rawRows.forEach((row, index) => {
        const excelRow = index + 2; // Row 1 is header in Excel

        // Dynamic key mapper to handle minor spelling or casing differences
        const getVal = (exactKey: string, ...aliases: string[]) => {
          if (row[exactKey] !== undefined && row[exactKey] !== '') return row[exactKey];
          for (const alias of aliases) {
            if (row[alias] !== undefined && row[alias] !== '') return row[alias];
          }
          const normKey = normalizeKey(exactKey);
          for (const [k, v] of Object.entries(row)) {
            if (normalizeKey(k) === normKey && v !== undefined && v !== '') return v;
          }
          return '';
        };

        const rawAssetNo = getVal(
          'Asset No.', 'Asset No', 'assetNo', 'Asset Number', 'asset_no', 
          'Asset ID', 'Asset Tag', 'Tag No', 'Tag Number', 'Asset Code', 'Item Code', 'Barcode', 'Code'
        );
        const rawSerial = getVal(
          'Serial Number', 'serialNumber', 'Serial No.', 'Serial No', 'Serial', 'S/N', 'SN', 'serial_number', 'Serial #'
        );
        const rawAssetName = getVal(
          'Asset Description', 'Asset Name', 'assetName', 'Equipment Name', 'Item Name', 'Description', 'Name'
        );

        const serialNumber = String(rawSerial || '').trim();
        const hasValidSerial = Boolean(
          serialNumber && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(serialNumber.toUpperCase())
        );

        let assetNo = String(rawAssetNo || '').trim();
        // If assetNo is missing or empty, auto-generate valid asset identifier from serial number or index
        if (!assetNo) {
          if (hasValidSerial) {
            assetNo = `AST-${serialNumber}`;
          } else {
            assetNo = `AST-${String(index + 1).padStart(5, '0')}`;
          }
        }

        const assetName = String(rawAssetName || `Asset ${index + 1}`).trim();
        const dept = String(getVal('Department', 'department', 'Location') || 'General').trim();
        const category = String(getVal('Asset Category', 'assetCategory', 'Category') || 'Medical Equipment').trim();

        const formatDateVal = (val: any) => {
          if (!val) return undefined;
          if (val instanceof Date) return val.toISOString();
          const parsed = new Date(val);
          return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
        };

        const totalAmountVal = Number(getVal('Total Amount', 'totalAmount', 'Amount', 'Cost', 'Price', 'Value')) || 0;

        const rowObject = {
          no: Number(getVal('No.', 'No', 'Index') || (index + 1)),
          assetName,
          assetNo,
          serialNumber,
          model: String(getVal('Model', 'model') || '').trim(),
          manufacturerName: String(getVal('Manufacturer Name', 'manufacturerName', 'Manufacturer') || '').trim(),
          supplierName: String(getVal('Supplier Name', 'supplierName', 'Supplier') || '').trim(),
          supplierContactNo: String(getVal('Supplier Contact No.', 'supplierContactNo', 'Contact') || '').trim(),
          location: String(getVal('Location', 'location', 'Department') || 'General').trim(),
          department: dept,
          warrantyPeriod: String(getVal('Warranty Period', 'warrantyPeriod') || '').trim(),
          startOfWarranty: formatDateVal(getVal('Start of Warranty', 'startOfWarranty')),
          endOfWarranty: formatDateVal(getVal('End of Warranty', 'endOfWarranty')),
          ppmFrequency: String(getVal('PPM Frequency', 'ppmFrequency') || 'Quarterly').trim(),
          ppm1Planned: formatDateVal(getVal('1st PPM Planned', 'ppm1Planned')),
          ppm1Actual: formatDateVal(getVal('1st PPM Actual', 'ppm1Actual')),
          ppm2Planned: formatDateVal(getVal('2nd PPM Planned', 'ppm2Planned')),
          ppm2Actual: formatDateVal(getVal('2nd PPM Actual', 'ppm2Actual')),
          ppm3Planned: formatDateVal(getVal('3rd PPM Planned', 'ppm3Planned')),
          ppm3Actual: formatDateVal(getVal('3rd PPM Actual', 'ppm3Actual')),
          ppm4Planned: formatDateVal(getVal('4th PPM Planned', 'ppm4Planned')),
          ppm4Actual: formatDateVal(getVal('4th PPM Actual', 'ppm4Actual')),
          ppm5Planned: formatDateVal(getVal('5th PPM Planned', 'ppm5Planned')),
          ppm5Actual: formatDateVal(getVal('5th PPM Actual', 'ppm5Actual')),
          ppm6Planned: formatDateVal(getVal('6th PPM Planned', 'ppm6Planned')),
          ppm6Actual: formatDateVal(getVal('6th PPM Actual', 'ppm6Actual')),
          poNo: String(getVal('PO No.', 'PO No', 'poNo') || '').trim(),
          doNo: String(getVal('DO No.', 'DO No', 'doNo') || '').trim(),
          invoiceNo: String(getVal('Invoice No.', 'Invoice No', 'invoiceNo') || '').trim(),
          totalAmount: totalAmountVal,
          lifespan: String(getVal('Lifespan', 'lifespan') || '').trim(),
          assetCriticality: String(getVal('Asset Criticality', 'assetCriticality', 'Criticality') || 'Medium').trim(),
          assetCategory: category,
          typeOfEquipmentSafety: String(getVal('Type of Equipment Safety', 'typeOfEquipmentSafety', 'Safety Type') || 'Class I').trim(),
          status: String(getVal('Status', 'status') || 'Active').trim(),
          licenseEndDate: formatDateVal(getVal('License End Date', 'licenseEndDate', 'End of Warranty')),
          documents: []
        };

        allRows.push(rowObject);

        // Check for duplicate inside file
        let isDuplicateInFile = false;
        let collisionReason = '';

        if (hasValidSerial) {
          const normSerial = serialNumber.toUpperCase();
          const prev = seenSerialsMap.get(normSerial);
          if (prev) {
            isDuplicateInFile = true;
            collisionReason = `Duplicate Serial Number '${serialNumber}' matches Excel Row #${prev.excelRow} ("${prev.assetName}", Asset No: ${prev.assetNo})`;
          } else {
            seenSerialsMap.set(normSerial, { excelRow, assetName, assetNo });
          }
        } else {
          const exactKey = `${assetNo.toUpperCase()}|||${assetName.toUpperCase()}`;
          const prev = seenExactMap.get(exactKey);
          if (prev) {
            isDuplicateInFile = true;
            collisionReason = `Duplicate Asset No & Name matches Excel Row #${prev.excelRow} (Asset No: ${prev.assetNo})`;
          } else {
            seenExactMap.set(exactKey, { excelRow, assetName, assetNo });
          }
        }

        if (isDuplicateInFile) {
          skippedItems.push({
            excelRow,
            assetName,
            assetNo,
            serialNumber: serialNumber || 'N/A',
            department: dept,
            category,
            reason: collisionReason
          });
          return; // Skip from cleanedRows
        }

        // Check duplicate against existing system database
        const isDuplicateWithSystem = hasValidSerial
          ? existingSerialSet.has(serialNumber.toUpperCase())
          : existingExactSet.has(`${assetNo.toUpperCase()}|||${assetName.toUpperCase()}`);

        if (isDuplicateWithSystem) {
          duplicateWithSystem.push(hasValidSerial ? `SN: ${serialNumber}` : `${assetNo} (${assetName})`);
        }

        cleanedRows.push(rowObject);
      });

      setRawCleanedRows(cleanedRows);
      setAllProcessedRows(allRows);
      setParsedData(allowDuplicates ? allRows : cleanedRows);

      setSummary({
        totalRows: rawRows.length,
        validNewCount: cleanedRows.length - duplicateWithSystem.length,
        duplicateCount: duplicateWithSystem.length,
        duplicatesInFileCount: skippedItems.length,
        duplicateAssetNos: duplicateWithSystem,
        skippedItems,
        sampleParsed: cleanedRows.slice(0, 5)
      });
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Failed to parse spreadsheet: ${err.message || 'Invalid file format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleConfirmUpload = async () => {
    if (parsedData.length === 0) return;
    setUploading(true);
    try {
      await onSuccess(parsedData, duplicateStrategy, allowDuplicates);
      handleClose();
    } catch (err: any) {
      alert(`Bulk upload failed: ${err.message || 'Please try again'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Bulk Asset Upload</DialogTitle>
                <DialogDescription>
                  Import 1,000+ assets with duplicate diagnostics, inspection & automated mapping
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadAssetTemplate('xlsx')}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5"
            >
              <Download size={14} />
              Download Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* File Upload Zone */}
          {!summary ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer bg-gray-50/50 hover:bg-blue-50/30 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                {isProcessing ? (
                  <RefreshCw size={28} className="animate-spin text-blue-600" />
                ) : (
                  <Upload size={28} />
                )}
              </div>
              <h4 className="text-base font-semibold text-gray-800 mb-1">
                {isProcessing ? 'Processing spreadsheet...' : 'Click to upload or drag & drop'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Supports Excel (.xlsx, .xls) and CSV (.csv) containing 1,000+ rows
              </p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  All 34 Asset Fields Supported
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Duplicate Diagnostics Included
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {((file?.size || 0) / 1024).toFixed(1)} KB &bull; {summary.totalRows} records analyzed
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetState}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X size={16} className="mr-1" /> Change File
                </Button>
              </div>

              {/* Analysis Summary 4-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border rounded-xl shadow-xs">
                  <p className="text-xs text-muted-foreground font-medium">Total Rows in File</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalRows}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Scanned rows</p>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <p className="text-xs text-emerald-700 font-medium">Valid Assets to Import</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{parsedData.length}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    {allowDuplicates ? 'All rows included' : 'Filtered & clean'}
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${summary.skippedItems.length > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-amber-800 font-medium">Duplicates in File</p>
                  <p className={`text-2xl font-bold mt-1 ${summary.skippedItems.length > 0 ? 'text-amber-800' : 'text-gray-500'}`}>
                    {summary.skippedItems.length}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {summary.skippedItems.length > 0 ? 'Collisions identified' : 'Zero collisions'}
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${summary.duplicateCount > 0 ? 'bg-purple-50/60 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-purple-700 font-medium">Existing in System</p>
                  <p className={`text-2xl font-bold mt-1 ${summary.duplicateCount > 0 ? 'text-purple-700' : 'text-gray-500'}`}>
                    {summary.duplicateCount}
                  </p>
                  <p className="text-[11px] text-purple-600 mt-0.5">
                    {summary.duplicateCount > 0 ? 'Already in database' : 'All brand new'}
                  </p>
                </div>
              </div>

              {/* Duplicate & Skipped Diagnosis Section */}
              {summary.skippedItems.length > 0 && (
                <div className="p-4 bg-amber-50/60 border border-amber-300 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                      <div>
                        <h5 className="text-sm font-bold text-amber-900">
                          {summary.skippedItems.length} Duplicate / Removed Rows Detected
                        </h5>
                        <p className="text-xs text-amber-800">
                          These rows share existing Serial Numbers or identical identifiers with earlier rows in your file.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={exportSkippedReport}
                        className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900 text-xs h-8 flex items-center gap-1.5"
                      >
                        <Download size={13} />
                        Export Report (.xlsx)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSkippedModal(!showSkippedModal)}
                        className="text-amber-900 hover:bg-amber-100 text-xs h-8 flex items-center gap-1 font-semibold"
                      >
                        {showSkippedModal ? (
                          <>Hide Rows <ChevronUp size={14} /></>
                        ) : (
                          <>Inspect Rows & Reasons <ChevronDown size={14} /></>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Toggle checkbox to force import everything */}
                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowDuplicates}
                        onChange={(e) => handleToggleAllowDuplicates(e.target.checked)}
                        className="rounded border-amber-400 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs font-semibold text-amber-950">
                        Import all {summary.totalRows} rows anyway (bypass duplicate exclusion)
                      </span>
                    </label>
                    <span className="text-[11px] text-amber-800 font-medium">
                      {allowDuplicates ? `Ready to import all ${allProcessedRows.length} rows` : `${summary.skippedItems.length} duplicate rows excluded`}
                    </span>
                  </div>

                  {/* Collapsible Inspection Table */}
                  {showSkippedModal && (
                    <div className="mt-2 border border-amber-200 bg-white rounded-lg overflow-hidden shadow-xs">
                      <div className="p-2.5 bg-amber-100/60 border-b border-amber-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <FileText size={14} className="text-amber-700" />
                          Detailed Collision Log ({summary.skippedItems.length} Items)
                        </span>
                        <span className="text-[11px] text-amber-800">
                          Edit these rows in your spreadsheet or check the bypass box above
                        </span>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Excel Row</th>
                              <th className="px-3 py-2">Asset Description</th>
                              <th className="px-3 py-2">Asset No.</th>
                              <th className="px-3 py-2">Serial Number</th>
                              <th className="px-3 py-2">Department</th>
                              <th className="px-3 py-2">Why It Was Flagged / Removed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {summary.skippedItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/40">
                                <td className="px-3 py-2 font-mono font-bold text-amber-900 whitespace-nowrap">
                                  Row #{item.excelRow}
                                </td>
                                <td className="px-3 py-2 font-semibold text-gray-900">
                                  {item.assetName}
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">
                                  {item.assetNo}
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px]">
                                    {item.serialNumber}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                  {item.department || '-'}
                                </td>
                                <td className="px-3 py-2 text-amber-900 font-medium">
                                  {item.reason}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Duplicate Handling Strategy for System Clashes */}
              {summary.duplicateCount > 0 && (
                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-900 text-sm font-semibold">
                      <AlertTriangle size={18} className="text-purple-600" />
                      Database Sync Strategy ({summary.duplicateCount} records already in system)
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicatesList(!showDuplicatesList)}
                      className="text-xs text-purple-700 underline font-medium hover:text-purple-900"
                    >
                      {showDuplicatesList ? 'Hide duplicate list' : `View ${summary.duplicateCount} duplicate IDs`}
                    </button>
                  </div>

                  {showDuplicatesList && (
                    <div className="max-h-28 overflow-y-auto p-2.5 bg-white/80 rounded-lg border border-purple-200 text-xs text-gray-700 flex flex-wrap gap-1.5">
                      {summary.duplicateAssetNos.map(no => (
                        <span key={no} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono text-[11px]">
                          {no}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <label
                      onClick={() => setDuplicateStrategy('update')}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        duplicateStrategy === 'update'
                          ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs ring-1 ring-blue-500'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="update"
                        checked={duplicateStrategy === 'update'}
                        onChange={() => setDuplicateStrategy('update')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1">
                          Update & Add Missing <Badge className="bg-blue-600 text-[9px] h-3.5 px-1">Recommended</Badge>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                          Syncs matching equipment records and imports all missing sub-components & accessories.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setDuplicateStrategy('skip')}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        duplicateStrategy === 'skip'
                          ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs ring-1 ring-blue-500'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="skip"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold">Skip Existing</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                          Keeps existing assets intact and only inserts newly detected assets.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setDuplicateStrategy('replace')}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        duplicateStrategy === 'replace'
                          ? 'border-amber-600 bg-amber-50/60 text-amber-900 shadow-xs ring-1 ring-amber-500'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="replace"
                        checked={duplicateStrategy === 'replace'}
                        onChange={() => setDuplicateStrategy('replace')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Replace Entire Register</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                          Clears existing assets and imports all {summary.totalRows} assets cleanly from this spreadsheet.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Sample Data Preview (First 5 Rows to be imported)
                </p>
                <div className="border rounded-lg overflow-x-auto max-h-48 text-xs">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Asset No.</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Asset Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Location</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Warranty End</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {summary.sampleParsed.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-medium text-blue-600">{item.assetNo}</td>
                          <td className="px-3 py-2 text-gray-900 font-medium">{item.assetName}</td>
                          <td className="px-3 py-2 text-gray-600">{item.assetCategory}</td>
                          <td className="px-3 py-2 text-gray-600">{item.location}</td>
                          <td className="px-3 py-2 text-gray-600">{item.endOfWarranty ? item.endOfWarranty.split('T')[0] : '-'}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-50 text-green-700 border border-green-200">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Guidelines Box */}
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 flex items-start gap-2 border">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800">Unique Identification & Duplicate Protection</p>
              <p className="mt-0.5">
                Every asset is uniquely identified by its <strong>Serial Number</strong>. Duplicates within the spreadsheet are automatically isolated with clear Excel row numbers so you can edit and resolve them before importing.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          {summary && (
            <Button
              onClick={handleConfirmUpload}
              disabled={uploading || parsedData.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check size={14} className="mr-1.5" />
                  Import {parsedData.length} Assets
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
