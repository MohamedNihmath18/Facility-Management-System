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
  FileCheck
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Asset } from './types';
import { downloadAssetTemplate, EXACT_HEADERS } from './sampleTemplate';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAssets: Asset[];
  onSuccess: (newAssets: Asset[], strategy: 'skip' | 'update') => Promise<void>;
}

interface ParsedSummary {
  totalRows: number;
  validNewCount: number;
  duplicateCount: number;
  duplicatesInFileCount: number;
  duplicateAssetNos: string[];
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
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [summary, setSummary] = useState<ParsedSummary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDuplicatesList, setShowDuplicatesList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setSummary(null);
    setIsProcessing(false);
    setUploading(false);
    setShowDuplicatesList(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
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

      // Existing asset numbers lookup set
      const existingNoSet = new Set(
        existingAssets.map(a => String(a.assetNo || '').trim().toUpperCase())
      );

      const seenInFile = new Set<string>();
      const duplicatesInFile: string[] = [];
      const duplicateWithSystem: string[] = [];
      const cleanedRows: any[] = [];

      rawRows.forEach((row, index) => {
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

        const rawAssetNo = getVal('Asset No.', 'Asset No', 'assetNo', 'Asset Number', 'asset_no');
        const assetNo = String(rawAssetNo || '').trim();
        const assetName = String(getVal('Asset Name', 'assetName', 'Equipment Name') || `Asset ${index + 1}`).trim();

        if (!assetNo) return; // Skip row without Asset No

        const normalizedNo = assetNo.toUpperCase();

        if (seenInFile.has(normalizedNo)) {
          duplicatesInFile.push(assetNo);
          return;
        }
        seenInFile.add(normalizedNo);

        const isDuplicateWithSystem = existingNoSet.has(normalizedNo);
        if (isDuplicateWithSystem) {
          duplicateWithSystem.push(assetNo);
        }

        const formatDateVal = (val: any) => {
          if (!val) return undefined;
          if (val instanceof Date) return val.toISOString();
          const parsed = new Date(val);
          return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
        };

        const totalAmountVal = Number(getVal('Total Amount', 'totalAmount', 'Amount', 'Cost')) || 0;

        cleanedRows.push({
          no: Number(getVal('No.', 'No', 'Index') || cleanedRows.length + 1),
          assetName,
          assetNo,
          serialNumber: String(getVal('Serial Number', 'serialNumber', 'SN') || '').trim(),
          model: String(getVal('Model', 'model') || '').trim(),
          manufacturerName: String(getVal('Manufacturer Name', 'manufacturerName', 'Manufacturer') || '').trim(),
          supplierName: String(getVal('Supplier Name', 'supplierName', 'Supplier') || '').trim(),
          supplierContactNo: String(getVal('Supplier Contact No.', 'supplierContactNo', 'Contact') || '').trim(),
          location: String(getVal('Location', 'location', 'Department') || 'General').trim(),
          department: String(getVal('Department', 'department', 'Location') || 'General').trim(),
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
          assetCategory: String(getVal('Asset Category', 'assetCategory', 'Category') || 'Medical Equipment').trim(),
          typeOfEquipmentSafety: String(getVal('Type of Equipment Safety', 'typeOfEquipmentSafety', 'Safety Type') || 'Class I').trim(),
          status: String(getVal('Status', 'status') || 'Active').trim(),
          licenseEndDate: formatDateVal(getVal('License End Date', 'licenseEndDate', 'End of Warranty')),
          documents: []
        });
      });

      setParsedData(cleanedRows);
      setSummary({
        totalRows: rawRows.length,
        validNewCount: cleanedRows.length - duplicateWithSystem.length,
        duplicateCount: duplicateWithSystem.length,
        duplicatesInFileCount: duplicatesInFile.length,
        duplicateAssetNos: duplicateWithSystem,
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
      await onSuccess(parsedData, duplicateStrategy);
      handleClose();
    } catch (err: any) {
      alert(`Bulk upload failed: ${err.message || 'Please try again'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Bulk Asset Upload</DialogTitle>
                <DialogDescription>
                  Import 1,000+ assets with duplicate prevention & automated mapping
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
                  Zero Duplicate Clashes
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

              {/* Analysis Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white border rounded-xl shadow-xs">
                  <p className="text-xs text-muted-foreground font-medium">Total Assets in File</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{parsedData.length}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Valid formatted rows</p>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <p className="text-xs text-emerald-700 font-medium">New Unique Assets</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.validNewCount}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Will be newly added</p>
                </div>

                <div className={`p-4 rounded-xl border ${summary.duplicateCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-amber-700 font-medium">Existing in System</p>
                  <p className={`text-2xl font-bold mt-1 ${summary.duplicateCount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {summary.duplicateCount}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    {summary.duplicateCount > 0 ? 'Duplicate Asset Nos found' : 'No duplicates detected'}
                  </p>
                </div>
              </div>

              {/* Duplicate Handling Strategy */}
              {summary.duplicateCount > 0 && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                      <AlertTriangle size={18} />
                      Duplicate Resolution (Prevent Clashing)
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicatesList(!showDuplicatesList)}
                      className="text-xs text-amber-700 underline font-medium hover:text-amber-900"
                    >
                      {showDuplicatesList ? 'Hide duplicate list' : `View ${summary.duplicateCount} duplicate IDs`}
                    </button>
                  </div>

                  {showDuplicatesList && (
                    <div className="max-h-28 overflow-y-auto p-2.5 bg-white/80 rounded-lg border border-amber-200 text-xs text-gray-700 flex flex-wrap gap-1.5">
                      {summary.duplicateAssetNos.map(no => (
                        <span key={no} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono text-[11px]">
                          {no}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <label
                      onClick={() => setDuplicateStrategy('skip')}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        duplicateStrategy === 'skip'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="skip"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          Skip Duplicates <Badge className="bg-emerald-600 text-[10px] h-4">Recommended</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Keep existing assets intact. Insert only the {summary.validNewCount} new assets. Safe for recurring uploads!
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setDuplicateStrategy('update')}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        duplicateStrategy === 'update'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="update"
                        checked={duplicateStrategy === 'update'}
                        onChange={() => setDuplicateStrategy('update')}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold">Update / Overwrite</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Update existing records with new data from this spreadsheet and add new assets.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Sample Data Preview (First 5 Rows)
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
              <p className="font-semibold text-gray-800">Duplicate Protection Guarantee</p>
              <p className="mt-0.5">
                Every asset is uniquely identified by its <strong>Asset No.</strong> If you upload 1,000+ assets today and another spreadsheet next week with overlapping items, selecting "Skip Duplicates" prevents duplicate entries and ensures zero system clashes.
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
