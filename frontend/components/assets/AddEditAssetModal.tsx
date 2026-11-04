import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Boxes, 
  Save, 
  AlertCircle, 
  ShieldCheck, 
  DollarSign, 
  CalendarClock, 
  Wrench,
  Check
} from 'lucide-react';
import { 
  Asset, 
  ASSET_CATEGORIES, 
  ASSET_CRITICALITY, 
  ASSET_STATUSES, 
  PPM_FREQUENCIES, 
  SAFETY_TYPES 
} from './types';

interface AddEditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset | null;
  existingAssets: Asset[];
  onSave: (assetData: Partial<Asset>) => Promise<void>;
}

const MODAL_TABS = [
  { id: 'general', label: 'General Details', icon: Boxes },
  { id: 'location', label: 'Location & Safety', icon: ShieldCheck },
  { id: 'procurement', label: 'Procurement & Warranty', icon: DollarSign },
  { id: 'ppm', label: 'PPM Schedule (1-6)', icon: CalendarClock },
];

export const AddEditAssetModal: React.FC<AddEditAssetModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
  existingAssets,
  onSave
}) => {
  const isEditing = Boolean(assetToEdit);

  const initialForm: Partial<Asset> = {
    no: undefined,
    assetName: '',
    assetNo: '',
    serialNumber: '',
    model: '',
    manufacturerName: '',
    supplierName: '',
    supplierContactNo: '',
    location: '',
    department: '',
    warrantyPeriod: '24 Months',
    startOfWarranty: '',
    endOfWarranty: '',
    ppmFrequency: 'Quarterly',
    ppm1Planned: '',
    ppm1Actual: '',
    ppm2Planned: '',
    ppm2Actual: '',
    ppm3Planned: '',
    ppm3Actual: '',
    ppm4Planned: '',
    ppm4Actual: '',
    ppm5Planned: '',
    ppm5Actual: '',
    ppm6Planned: '',
    ppm6Actual: '',
    poNo: '',
    doNo: '',
    invoiceNo: '',
    totalAmount: 0,
    lifespan: '7 Years',
    assetCriticality: 'Medium',
    assetCategory: 'Medical Equipment',
    typeOfEquipmentSafety: 'Class I Type BF',
    status: 'Active',
    licenseEndDate: ''
  };

  const [formData, setFormData] = useState<Partial<Asset>>(initialForm);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assetToEdit) {
      const formatDate = (d?: string) => d ? d.split('T')[0] : '';
      setFormData({
        ...assetToEdit,
        startOfWarranty: formatDate(assetToEdit.startOfWarranty),
        endOfWarranty: formatDate(assetToEdit.endOfWarranty),
        licenseEndDate: formatDate(assetToEdit.licenseEndDate),
        ppm1Planned: formatDate(assetToEdit.ppm1Planned),
        ppm1Actual: formatDate(assetToEdit.ppm1Actual),
        ppm2Planned: formatDate(assetToEdit.ppm2Planned),
        ppm2Actual: formatDate(assetToEdit.ppm2Actual),
        ppm3Planned: formatDate(assetToEdit.ppm3Planned),
        ppm3Actual: formatDate(assetToEdit.ppm3Actual),
        ppm4Planned: formatDate(assetToEdit.ppm4Planned),
        ppm4Actual: formatDate(assetToEdit.ppm4Actual),
        ppm5Planned: formatDate(assetToEdit.ppm5Planned),
        ppm5Actual: formatDate(assetToEdit.ppm5Actual),
        ppm6Planned: formatDate(assetToEdit.ppm6Planned),
        ppm6Actual: formatDate(assetToEdit.ppm6Actual),
      });
    } else {
      setFormData({
        ...initialForm,
        no: existingAssets.length + 1,
        assetNo: `AST-${new Date().getFullYear()}-${String(existingAssets.length + 1).padStart(4, '0')}`
      });
    }
    setError(null);
    setActiveTab('general');
  }, [assetToEdit, isOpen, existingAssets.length]);

  const handleChange = (field: keyof Asset, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.assetName?.trim()) {
      setError('Asset Name is required');
      setActiveTab('general');
      return;
    }

    if (!formData.assetNo?.trim()) {
      setError('Asset No. is required');
      setActiveTab('general');
      return;
    }

    if (!formData.location?.trim()) {
      setError('Location / Department is required');
      setActiveTab('location');
      return;
    }

    // Check duplicate Asset No
    const trimmedNo = formData.assetNo.trim().toUpperCase();
    const isDuplicate = existingAssets.some(a => 
      String(a.assetNo || '').trim().toUpperCase() === trimmedNo &&
      a._id !== assetToEdit?._id
    );

    if (isDuplicate) {
      setError(`Asset No "${formData.assetNo}" is already in use by another asset!`);
      setActiveTab('general');
      return;
    }

    // Auto-sync department with location if department is blank
    const payload = {
      ...formData,
      department: formData.department?.trim() || formData.location?.split('-')[0]?.trim() || formData.location?.trim()
    };

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Boxes size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isEditing ? `Edit Asset: ${assetToEdit?.assetNo}` : 'Add New Asset'}
              </DialogTitle>
              <DialogDescription>
                Fill in the 34 standard biomedical and facility management fields
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Custom Robust Tabs Bar (No Overlapping) */}
          <div className="flex border border-gray-200 gap-1.5 p-1.5 bg-gray-50/90 rounded-xl overflow-x-auto">
            {MODAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[150px] py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200 font-bold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: General Details */}
          {activeTab === 'general' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="assetName" className="text-xs font-semibold">
                    Asset Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="assetName"
                    placeholder="e.g. GE Vivid E95 4D Ultrasound"
                    value={formData.assetName || ''}
                    onChange={(e) => handleChange('assetName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assetNo" className="text-xs font-semibold">
                    Asset No. (Unique Identifier) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="assetNo"
                    placeholder="e.g. AST-MED-001"
                    value={formData.assetNo || ''}
                    onChange={(e) => handleChange('assetNo', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="serialNumber" className="text-xs font-semibold">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    placeholder="e.g. SN-9821448"
                    value={formData.serialNumber || ''}
                    onChange={(e) => handleChange('serialNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="model" className="text-xs font-semibold">Model</Label>
                  <Input
                    id="model"
                    placeholder="e.g. Vivid E95"
                    value={formData.model || ''}
                    onChange={(e) => handleChange('model', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="manufacturerName" className="text-xs font-semibold">Manufacturer Name</Label>
                  <Input
                    id="manufacturerName"
                    placeholder="e.g. GE Healthcare"
                    value={formData.manufacturerName || ''}
                    onChange={(e) => handleChange('manufacturerName', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assetCategory" className="text-xs font-semibold">Asset Category</Label>
                  <Select
                    value={formData.assetCategory || 'Medical Equipment'}
                    onValueChange={(val) => handleChange('assetCategory', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assetCriticality" className="text-xs font-semibold">Asset Criticality</Label>
                  <Select
                    value={formData.assetCriticality || 'Medium'}
                    onValueChange={(val: any) => handleChange('assetCriticality', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Criticality" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CRITICALITY.map(crit => (
                        <SelectItem key={crit} value={crit}>{crit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold">Status</Label>
                  <Select
                    value={formData.status || 'Active'}
                    onValueChange={(val: any) => handleChange('status', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_STATUSES.map(st => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Location & Safety */}
          {activeTab === 'location' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="location" className="text-xs font-semibold">
                    Location (Ward, Floor, Room) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. Block A, 3rd Floor, Room 305 (Cardiology)"
                    value={formData.location || ''}
                    onChange={(e) => handleChange('location', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs font-semibold">
                    Department (For Staff Filtering)
                  </Label>
                  <Input
                    id="department"
                    placeholder="e.g. Cardiology, Emergency, Facilities, ICU"
                    value={formData.department || ''}
                    onChange={(e) => handleChange('department', e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Staff from this department can view this asset on their dashboard.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="typeOfEquipmentSafety" className="text-xs font-semibold">
                    Type of Equipment Safety
                  </Label>
                  <Select
                    value={formData.typeOfEquipmentSafety || 'Class I Type BF'}
                    onValueChange={(val) => handleChange('typeOfEquipmentSafety', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Safety Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAFETY_TYPES.map(st => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Procurement & Financials */}
          {activeTab === 'procurement' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="supplierName" className="text-xs font-semibold">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    placeholder="e.g. GE Medical Systems Malaysia Sdn Bhd"
                    value={formData.supplierName || ''}
                    onChange={(e) => handleChange('supplierName', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="supplierContactNo" className="text-xs font-semibold">Supplier Contact No.</Label>
                  <Input
                    id="supplierContactNo"
                    placeholder="e.g. +60 3-2273 9000"
                    value={formData.supplierContactNo || ''}
                    onChange={(e) => handleChange('supplierContactNo', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="poNo" className="text-xs font-semibold">PO No.</Label>
                  <Input
                    id="poNo"
                    placeholder="e.g. PO-2024-0891"
                    value={formData.poNo || ''}
                    onChange={(e) => handleChange('poNo', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="doNo" className="text-xs font-semibold">DO No.</Label>
                  <Input
                    id="doNo"
                    placeholder="e.g. DO-2024-1102"
                    value={formData.doNo || ''}
                    onChange={(e) => handleChange('doNo', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoiceNo" className="text-xs font-semibold">Invoice No.</Label>
                  <Input
                    id="invoiceNo"
                    placeholder="e.g. INV-88421"
                    value={formData.invoiceNo || ''}
                    onChange={(e) => handleChange('invoiceNo', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="totalAmount" className="text-xs font-semibold">Total Amount (RM)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    placeholder="0"
                    value={formData.totalAmount ?? 0}
                    onChange={(e) => handleChange('totalAmount', Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lifespan" className="text-xs font-semibold">Lifespan</Label>
                  <Input
                    id="lifespan"
                    placeholder="e.g. 7 Years, 10 Years"
                    value={formData.lifespan || ''}
                    onChange={(e) => handleChange('lifespan', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="warrantyPeriod" className="text-xs font-semibold">Warranty Period</Label>
                  <Input
                    id="warrantyPeriod"
                    placeholder="e.g. 24 Months, 3 Years"
                    value={formData.warrantyPeriod || ''}
                    onChange={(e) => handleChange('warrantyPeriod', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="startOfWarranty" className="text-xs font-semibold">Start of Warranty</Label>
                  <Input
                    id="startOfWarranty"
                    type="date"
                    value={formData.startOfWarranty || ''}
                    onChange={(e) => handleChange('startOfWarranty', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endOfWarranty" className="text-xs font-semibold">End of Warranty (Alert trigger)</Label>
                  <Input
                    id="endOfWarranty"
                    type="date"
                    value={formData.endOfWarranty || ''}
                    onChange={(e) => handleChange('endOfWarranty', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="licenseEndDate" className="text-xs font-semibold">License End Date (Alert trigger)</Label>
                  <Input
                    id="licenseEndDate"
                    type="date"
                    value={formData.licenseEndDate || ''}
                    onChange={(e) => handleChange('licenseEndDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: PPM Maintenance Schedule */}
          {activeTab === 'ppm' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b gap-2">
                <div>
                  <h4 className="text-sm font-semibold">Planned Preventive Maintenance (PPM)</h4>
                  <p className="text-xs text-muted-foreground">
                    Record 1st through 6th planned dates & actual completion dates
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <Label className="text-xs font-semibold mb-1 block">PPM Frequency</Label>
                  <Select
                    value={formData.ppmFrequency || 'Quarterly'}
                    onValueChange={(val) => handleChange('ppmFrequency', val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {PPM_FREQUENCIES.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const plannedKey = `ppm${num}Planned` as keyof Asset;
                  const actualKey = `ppm${num}Actual` as keyof Asset;
                  const isDone = Boolean(formData[actualKey]);

                  return (
                    <div 
                      key={num} 
                      className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${isDone ? 'bg-green-50/50 border-green-200' : 'bg-gray-50/50 border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between pb-1 border-b">
                        <span className="font-bold text-gray-800">
                          {num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `${num}th`} PPM
                        </span>
                        {isDone ? (
                          <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <Check size={10} /> Completed
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full font-medium">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-600">Planned Date</Label>
                        <Input
                          type="date"
                          className="h-8 text-xs bg-white"
                          value={String(formData[plannedKey] || '')}
                          onChange={(e) => handleChange(plannedKey, e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-600">Actual Date Completed</Label>
                        <Input
                          type="date"
                          className="h-8 text-xs bg-white"
                          value={String(formData[actualKey] || '')}
                          onChange={(e) => handleChange(actualKey, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px]" disabled={saving}>
              {saving ? 'Saving...' : (
                <>
                  <Save size={14} className="mr-1.5" />
                  {isEditing ? 'Save Changes' : 'Create Asset'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
