import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Asset, AssetDocument, DOCUMENT_TYPES } from './types';

interface AssetDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onUpdateAsset: (updatedAsset: Asset) => Promise<void>;
  readOnly?: boolean;
}

export const AssetDocumentsModal: React.FC<AssetDocumentsModalProps> = ({
  isOpen,
  onClose,
  asset,
  onUpdateAsset,
  readOnly = false
}) => {
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<AssetDocument['type']>('PPM Report');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!asset) return null;

  const documents = asset.documents || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName) setDocName(file.name);

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFileDataUrl((uploadEvent.target?.result as string) || '#');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      alert('Document name is required');
      return;
    }

    setUploading(true);
    try {
      const newDoc: AssetDocument = {
        id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: docName.trim(),
        type: docType,
        url: fileDataUrl || '#',
        fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB',
        uploadDate: new Date().toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        notes: notes.trim()
      };

      const updatedDocs = [...documents, newDoc];
      const updatedAsset = {
        ...asset,
        documents: updatedDocs,
        // If it's a license with expiry date, sync licenseEndDate
        licenseEndDate: docType === 'License / Certificate' && expiryDate ? expiryDate : asset.licenseEndDate
      };

      await onUpdateAsset(updatedAsset);

      // Reset form
      setDocName('');
      setDocType('PPM Report');
      setExpiryDate('');
      setNotes('');
      setSelectedFile(null);
      setFileDataUrl('');
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert(`Failed to attach document: ${err.message || 'Error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      const updatedDocs = documents.filter(d => d.id !== docId);
      await onUpdateAsset({
        ...asset,
        documents: updatedDocs
      });
    } catch (err: any) {
      alert('Failed to delete document');
    }
  };

  const getDocBadgeColor = (type: string) => {
    switch (type) {
      case 'License / Certificate': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PPM Report': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Service Report': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Calibration Report': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Invoice': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'User Manual': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const checkExpiryStatus = (expDate?: string) => {
    if (!expDate) return null;
    const now = new Date();
    const expiry = new Date(expDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, color: 'bg-red-100 text-red-700' };
    }
    if (diffDays <= 30) {
      return { label: `Expiring in ${diffDays} days!`, color: 'bg-amber-100 text-amber-800 font-semibold' };
    }
    return { label: `Valid (${diffDays} days left)`, color: 'bg-green-100 text-green-700' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <FileText size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Asset Documents & Certificates
                </DialogTitle>
                <DialogDescription>
                  {asset.assetName} &bull; <span className="font-mono text-blue-600">{asset.assetNo}</span>
                </DialogDescription>
              </div>
            </div>

            {!readOnly && !showUploadForm && (
              <Button
                size="sm"
                onClick={() => setShowUploadForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              >
                <Plus size={16} /> Upload Document
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload Form */}
          {showUploadForm && !readOnly && (
            <form onSubmit={handleAddDocument} className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                  <Upload size={16} /> Upload PPM, Service, License or Invoice Document
                </h4>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowUploadForm(false)}
                  className="h-7 text-xs text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Document Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={docType} onValueChange={(val: any) => setDocType(val)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Document Title / File Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-9 text-xs bg-white"
                    placeholder="e.g. PPM Round 2 Report - Nov 2026.pdf"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Expiry Date (Required for License & Certification alerts)
                  </Label>
                  <Input
                    type="date"
                    className="h-9 text-xs bg-white"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Choose File (PDF, Image, Doc)</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="h-9 text-xs bg-white cursor-pointer"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Remarks / Notes</Label>
                  <Input
                    className="h-9 text-xs bg-white"
                    placeholder="e.g. Conducted by GE certified engineer. All calibration tests passed."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={uploading} 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={14} className="mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} className="mr-1.5" />
                      Save & Attach Document
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Document List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Attached Documents ({documents.length})
              </span>
              <span className="text-xs text-muted-foreground">
                Multiple documents allowed per asset
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
                <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-semibold text-gray-700">No documents uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload PPM reports, service work orders, licenses, and calibration certificates.
                </p>
                {!readOnly && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3 text-blue-600 border-blue-200"
                    onClick={() => setShowUploadForm(true)}
                  >
                    <Plus size={14} className="mr-1" /> Upload First Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => {
                  const expiryInfo = checkExpiryStatus(doc.expiryDate);

                  return (
                    <div 
                      key={doc.id}
                      className="p-3 bg-white border rounded-xl hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                          <FileCheck size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {doc.name}
                            </p>
                            <Badge variant="outline" className={`text-[10px] h-4 ${getDocBadgeColor(doc.type)}`}>
                              {doc.type}
                            </Badge>
                            {expiryInfo && (
                              <Badge className={`text-[10px] h-4 border-none ${expiryInfo.color}`}>
                                {expiryInfo.label}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>Uploaded: {doc.uploadDate ? doc.uploadDate.split('T')[0] : 'Today'}</span>
                            {doc.fileSize && <span>&bull; Size: {doc.fileSize}</span>}
                            {doc.expiryDate && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Calendar size={12} /> Expiry: {doc.expiryDate.split('T')[0]}
                              </span>
                            )}
                          </div>

                          {doc.notes && (
                            <p className="text-xs text-gray-600 mt-1 italic line-clamp-1">
                              "{doc.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            if (doc.url && doc.url !== '#') {
                              window.open(doc.url, '_blank');
                            } else {
                              alert(`Viewing document: ${doc.name}`);
                            }
                          }}
                        >
                          <Eye size={14} className="mr-1" /> View / Download
                        </Button>

                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete Document"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
