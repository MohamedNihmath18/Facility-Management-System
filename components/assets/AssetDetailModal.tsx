import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Boxes,
  Calendar,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  Edit3,
  MapPin,
  Building2,
  Phone,
  Check,
  FileCheck
} from 'lucide-react';
import { Asset, check30DayAlerts } from './types';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onEdit?: (asset: Asset) => void;
  onOpenDocuments?: (asset: Asset) => void;
  readOnly?: boolean;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
  onEdit,
  onOpenDocuments,
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState('specs');
  if (!asset) return null;

  const alerts = check30DayAlerts(asset);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Under Maintenance': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Repair': return 'bg-red-100 text-red-800 border-red-200';
      case 'Decommissioned': return 'bg-gray-200 text-gray-800 border-gray-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-blue-500 text-white';
      case 'Low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val || 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                <Boxes size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold">{asset.assetName}</DialogTitle>
                  <Badge variant="outline" className={`text-xs ${getStatusBadge(asset.status)}`}>
                    {asset.status}
                  </Badge>
                  <Badge className={`text-xs ${getCriticalityBadge(asset.assetCriticality)}`}>
                    {asset.assetCriticality} Criticality
                  </Badge>
                </div>
                <DialogDescription className="font-mono text-xs text-blue-600 mt-0.5">
                  Asset Tag: {asset.assetNo} &bull; SN: {asset.serialNumber || 'N/A'}
                </DialogDescription>
              </div>
            </div>

            {!readOnly && onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onEdit(asset);
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Edit3 size={14} /> Edit Asset
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 30-Day Alert Banners */}
        {(alerts.warrantyAlert || alerts.ppmAlert || alerts.licenseAlert) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <AlertTriangle size={15} /> 30-Day Lifecycle Alerts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {alerts.warrantyAlert && (
                <div className="p-2 bg-white/80 rounded border border-amber-200">
                  <span className="font-medium">Warranty Expiry:</span>{' '}
                  <span className="font-bold text-red-600">
                    {alerts.warrantyDaysRemaining !== null && alerts.warrantyDaysRemaining < 0
                      ? `Expired ${Math.abs(alerts.warrantyDaysRemaining)}d ago`
                      : `Expires in ${alerts.warrantyDaysRemaining} days`}
                  </span>
                </div>
              )}
              {alerts.ppmAlert && (
                <div className="p-2 bg-white/80 rounded border border-amber-200">
                  <span className="font-medium">PPM Due:</span>{' '}
                  <span className="font-bold text-orange-600">
                    {alerts.nextPpmName} in {alerts.ppmDaysRemaining} days
                  </span>
                </div>
              )}
              {alerts.licenseAlert && (
                <div className="p-2 bg-white/80 rounded border border-amber-200">
                  <span className="font-medium">License / MDA:</span>{' '}
                  <span className="font-bold text-amber-700">
                    {alerts.licenseDaysRemaining !== null && alerts.licenseDaysRemaining < 0
                      ? `Expired ${Math.abs(alerts.licenseDaysRemaining)}d ago`
                      : `Expires in ${alerts.licenseDaysRemaining} days`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI Mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-[11px] text-muted-foreground uppercase font-medium">Asset Category</p>
            <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{asset.assetCategory}</p>
          </div>
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-[11px] text-muted-foreground uppercase font-medium">Location</p>
            <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{asset.location}</p>
          </div>
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-[11px] text-muted-foreground uppercase font-medium">Total Amount</p>
            <p className="text-sm font-bold text-blue-600 mt-0.5">{formatCurrency(asset.totalAmount)}</p>
          </div>
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-[11px] text-muted-foreground uppercase font-medium">PPM Frequency</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{asset.ppmFrequency || 'Quarterly'}</p>
          </div>
        </div>

        {/* Custom Robust Tabs Bar */}
        <div className="flex border border-gray-200 gap-1.5 p-1 bg-gray-50/90 rounded-xl overflow-x-auto">
          {[
            { id: 'specs', label: 'Specifications' },
            { id: 'ppm', label: 'PPM Schedule (1-6)' },
            { id: 'documents', label: `Documents (${asset.documents?.length || 0})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200 font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Specs Tab */}
        {activeTab === 'specs' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white border rounded-xl space-y-2">
                <h5 className="font-semibold text-gray-900 text-sm pb-1 border-b">
                  Equipment Information
                </h5>
                <div className="grid grid-cols-2 gap-y-1.5 text-gray-700">
                  <span className="text-gray-500">Asset No.:</span>
                  <span className="font-mono font-semibold">{asset.assetNo}</span>

                  <span className="text-gray-500">Serial Number:</span>
                  <span className="font-mono">{asset.serialNumber || '-'}</span>

                  <span className="text-gray-500">Model:</span>
                  <span className="font-semibold">{asset.model || '-'}</span>

                  <span className="text-gray-500">Manufacturer:</span>
                  <span>{asset.manufacturerName || '-'}</span>

                  <span className="text-gray-500">Safety Classification:</span>
                  <span className="font-semibold">{asset.typeOfEquipmentSafety || '-'}</span>

                  <span className="text-gray-500">Lifespan:</span>
                  <span>{asset.lifespan || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-white border rounded-xl space-y-2">
                <h5 className="font-semibold text-gray-900 text-sm pb-1 border-b">
                  Location & Department
                </h5>
                <div className="grid grid-cols-2 gap-y-1.5 text-gray-700">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-semibold">{asset.location}</span>

                  <span className="text-gray-500">Department:</span>
                  <span>{asset.department || asset.location.split('-')[0] || '-'}</span>

                  <span className="text-gray-500">Warranty Period:</span>
                  <span>{asset.warrantyPeriod || '-'}</span>

                  <span className="text-gray-500">Warranty Start:</span>
                  <span>{asset.startOfWarranty ? asset.startOfWarranty.split('T')[0] : '-'}</span>

                  <span className="text-gray-500">Warranty End:</span>
                  <span className="font-semibold text-blue-600">
                    {asset.endOfWarranty ? asset.endOfWarranty.split('T')[0] : '-'}
                  </span>

                  <span className="text-gray-500">License Expiry:</span>
                  <span>{asset.licenseEndDate ? asset.licenseEndDate.split('T')[0] : '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-white border rounded-xl space-y-2 md:col-span-2">
                <h5 className="font-semibold text-gray-900 text-sm pb-1 border-b">
                  Procurement & Supplier Details
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 text-gray-700">
                  <div>
                    <span className="text-gray-500 block">Supplier Name</span>
                    <span className="font-semibold">{asset.supplierName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Contact No.</span>
                    <span>{asset.supplierContactNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">PO No.</span>
                    <span className="font-mono">{asset.poNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">DO No.</span>
                    <span className="font-mono">{asset.doNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Invoice No.</span>
                    <span className="font-mono">{asset.invoiceNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Total Amount</span>
                    <span className="font-bold text-blue-600">{formatCurrency(asset.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PPM Lifecycle Tab */}
        {activeTab === 'ppm' && (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
              <div>
                <span className="font-semibold">Maintenance Schedule: </span>
                {asset.ppmFrequency || 'Quarterly'} PPM Inspection
              </div>
              <Badge variant="outline" className="bg-white">
                Planned vs Actual
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const planned = (asset as any)[`ppm${num}Planned`];
                const actual = (asset as any)[`ppm${num}Actual`];
                const isCompleted = Boolean(actual);

                return (
                  <div
                    key={num}
                    className={`p-3.5 rounded-xl border space-y-2 ${isCompleted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : planned
                          ? 'bg-white border-blue-200'
                          : 'bg-gray-50/60 border-gray-200'
                      }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b">
                      <span className="font-bold text-gray-800">
                        {num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `${num}th`} PPM
                      </span>
                      {isCompleted ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Check size={10} /> Completed
                        </span>
                      ) : planned ? (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                          Scheduled
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          Unscheduled
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Planned:</span>
                        <span className="font-semibold text-gray-800">
                          {planned ? planned.split('T')[0] : 'Not Set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Actual Done:</span>
                        <span className={`font-semibold ${isCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {actual ? actual.split('T')[0] : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-gray-700">
                Uploaded Service, PPM, & License Documents
              </span>
              {onOpenDocuments && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-blue-600 border-blue-200"
                  onClick={() => {
                    onClose();
                    onOpenDocuments(asset);
                  }}
                >
                  <FileText size={14} className="mr-1" />
                  {readOnly ? 'View All Documents' : 'Manage Documents'}
                </Button>
              )}
            </div>

            {(!asset.documents || asset.documents.length === 0) ? (
              <div className="p-6 text-center border-2 border-dashed rounded-xl bg-gray-50 text-xs text-muted-foreground">
                No documents uploaded for this asset yet.
              </div>
            ) : (
              <div className="space-y-2">
                {asset.documents.map(doc => (
                  <div key={doc.id} className="p-3 bg-white border rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded">
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{doc.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {doc.type} &bull; Uploaded: {doc.uploadDate ? doc.uploadDate.split('T')[0] : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        if (doc.url && doc.url !== '#') window.open(doc.url, '_blank');
                        else alert(`Viewing ${doc.name}`);
                      }}
                    >
                      View / Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
