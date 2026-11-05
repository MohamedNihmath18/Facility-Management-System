import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  Trash2, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Building2,
  DollarSign,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Asset, 
  AssetStats, 
  ASSET_CATEGORIES, 
  ASSET_CRITICALITY, 
  ASSET_STATUSES, 
  check30DayAlerts 
} from './types';
import { AddEditAssetModal } from './AddEditAssetModal';
import { BulkUploadModal } from './BulkUploadModal';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetDocumentsModal } from './AssetDocumentsModal';
import { downloadAssetTemplate, exportAssetsToExcel } from './sampleTemplate';

interface AssetDashboardViewProps {
  assets: Asset[];
  onAddAsset: (newAsset: Partial<Asset>) => Promise<void>;
  onUpdateAsset: (updatedAsset: Asset) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onBulkUpload: (uploadedAssets: Asset[], strategy: 'skip' | 'update' | 'replace') => Promise<void>;
}

export const AssetDashboardView: React.FC<AssetDashboardViewProps> = ({
  assets: rawAssets,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onBulkUpload
}) => {
  // Ensure assets is always an array to prevent any .forEach / .filter / .map TypeError
  const assets: Asset[] = useMemo(() => {
    if (Array.isArray(rawAssets)) return rawAssets;
    if (rawAssets && typeof rawAssets === 'object' && Array.isArray((rawAssets as any).assets)) {
      return (rawAssets as any).assets;
    }
    return [];
  }, [rawAssets]);
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Asset | null>(null);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
  const [selectedAssetForDocs, setSelectedAssetForDocs] = useState<Asset | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedAlertFilter, setSelectedAlertFilter] = useState<'all' | 'warranty' | 'ppm' | 'license'>('all');
  const [selectedValuationDept, setSelectedValuationDept] = useState<string>('ALL');

  // Pagination states (vital for 1000+ assets)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Available Hospital Departments
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    
    // Core hospital departments
    const defaultDepts = [
      'Biomedical Engineering',
      'Cardiology',
      'CSSD',
      'Customer Care',
      'Dental Clinic',
      'Emergency Department (ED)',
      'Facilities & Maintenance',
      'FOA (Front Office / Administration)',
      'Human Resources (HR)',
      'Information Technology (IT)',
      'Intensive Care Unit (ICU)',
      'Medical Gas',
      'Operation Theatre (OT)',
      'O&G / Nursery',
      'Oncology',
      'Outpatient Department (OPD)',
      'Pathology & Laboratory',
      'Pediatrics',
      'Pharmacy',
      'Physiotherapy & Rehab',
      'Radiology & Imaging',
      'Ward 2A',
      'Ward 2B'
    ];
    defaultDepts.forEach(d => deptSet.add(d));

    // Also include any custom department registered in assets
    assets.forEach(a => {
      if (a.department && a.department.trim()) {
        deptSet.add(a.department.trim());
      }
    });

    return Array.from(deptSet).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  // Calculate Department Asset Valuation & Metrics
  const deptValuationStats = useMemo(() => {
    let matchedAssets = assets;
    let deptLabel = 'Hospital Wide (All Departments)';

    if (selectedValuationDept !== 'ALL') {
      deptLabel = selectedValuationDept;
      const term = selectedValuationDept.toLowerCase().trim();
      const cleanTokens = term.replace(/[()]/g, ' ').split(/\s+/).filter(t => t.length > 1);

      matchedAssets = assets.filter(a => {
        const d = (a.department || '').toLowerCase().trim();
        const l = (a.location || '').toLowerCase().trim();
        if (!d && !l) return false;
        if (d === term || l === term) return true;
        if (d.includes(term) || term.includes(d)) return true;
        if (l.includes(term) || term.includes(l)) return true;
        return cleanTokens.some(token => d.includes(token) || l.includes(token));
      });
    }

    const totalAmount = matchedAssets.reduce((sum, a) => sum + (Number(a.totalAmount) || 0), 0);
    const assetCount = matchedAssets.length;
    const activeCount = matchedAssets.filter(a => a.status === 'Active').length;
    const maintenanceCount = matchedAssets.filter(a => a.status === 'Under Maintenance' || a.status === 'In Repair').length;
    const avgAmount = assetCount > 0 ? totalAmount / assetCount : 0;

    let highestAsset: Asset | null = null;
    matchedAssets.forEach(a => {
      const amt = Number(a.totalAmount) || 0;
      if (amt > 0) {
        if (!highestAsset || amt > (Number(highestAsset.totalAmount) || 0)) {
          highestAsset = a;
        }
      }
    });

    const hospitalTotalAmount = assets.reduce((sum, a) => sum + (Number(a.totalAmount) || 0), 0);
    const capitalShare = hospitalTotalAmount > 0 
      ? Math.round((totalAmount / hospitalTotalAmount) * 100) 
      : (selectedValuationDept === 'ALL' ? 100 : 0);

    return {
      deptLabel,
      totalAmount,
      assetCount,
      activeCount,
      maintenanceCount,
      avgAmount,
      highestAsset,
      capitalShare
    };
  }, [assets, selectedValuationDept]);

  // Calculate Metrics & 30-day Alerts
  const { stats, alertAssets } = useMemo(() => {
    let active = 0;
    let underMaintenance = 0;
    let warrantyExpiringSoon = 0;
    let ppmDueSoon = 0;
    let licenseExpiringSoon = 0;
    let totalValue = 0;

    const warrantyAlertList: Asset[] = [];
    const ppmAlertList: Asset[] = [];
    const licenseAlertList: Asset[] = [];

    assets.forEach(a => {
      if (a.status === 'Active') active++;
      if (a.status === 'Under Maintenance' || a.status === 'In Repair') underMaintenance++;
      totalValue += Number(a.totalAmount) || 0;

      const alerts = check30DayAlerts(a);
      if (alerts.warrantyAlert) {
        warrantyExpiringSoon++;
        warrantyAlertList.push(a);
      }
      if (alerts.ppmAlert) {
        ppmDueSoon++;
        ppmAlertList.push(a);
      }
      if (alerts.licenseAlert) {
        licenseExpiringSoon++;
        licenseAlertList.push(a);
      }
    });

    return {
      stats: {
        total: assets.length,
        active,
        underMaintenance,
        warrantyExpiringSoon,
        ppmDueSoon,
        licenseExpiringSoon,
        totalValue
      },
      alertAssets: {
        warranty: warrantyAlertList,
        ppm: ppmAlertList,
        license: licenseAlertList
      }
    };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = 
          a.assetName?.toLowerCase().includes(term) ||
          a.assetNo?.toLowerCase().includes(term) ||
          a.serialNumber?.toLowerCase().includes(term) ||
          a.model?.toLowerCase().includes(term) ||
          a.manufacturerName?.toLowerCase().includes(term) ||
          a.supplierName?.toLowerCase().includes(term) ||
          a.location?.toLowerCase().includes(term) ||
          a.department?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Category
      if (selectedCategory !== 'All' && a.assetCategory !== selectedCategory) {
        return false;
      }

      // Criticality
      if (selectedCriticality !== 'All' && a.assetCriticality !== selectedCriticality) {
        return false;
      }

      // Status
      if (selectedStatus !== 'All' && a.status !== selectedStatus) {
        return false;
      }

      // 30-Day Alert Filter
      if (selectedAlertFilter !== 'all') {
        const alerts = check30DayAlerts(a);
        if (selectedAlertFilter === 'warranty' && !alerts.warrantyAlert) return false;
        if (selectedAlertFilter === 'ppm' && !alerts.ppmAlert) return false;
        if (selectedAlertFilter === 'license' && !alerts.licenseAlert) return false;
      }

      return true;
    });
  }, [assets, searchTerm, selectedCategory, selectedCriticality, selectedStatus, selectedAlertFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, currentPage, pageSize]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedCriticality('All');
    setSelectedStatus('All');
    setSelectedAlertFilter('all');
    setSelectedValuationDept('ALL');
    setCurrentPage(1);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Under Maintenance': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Repair': return 'bg-red-100 text-red-800 border-red-200';
      case 'Decommissioned': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case 'Critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low': return 'bg-gray-50 text-gray-600 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Boxes size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Asset Management</h2>
              <p className="text-xs text-muted-foreground">
                Enterprise Biomedical & Facility Equipment Lifecycle Tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadAssetTemplate('xlsx')}
            className="text-gray-700 border-gray-300 hover:bg-gray-100 text-xs flex items-center gap-1.5"
            title="Download blank template formatted with all 34 required columns"
          >
            <Download size={14} />
            Template
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAssetsToExcel(filteredAssets)}
            className="text-gray-700 border-gray-300 hover:bg-gray-100 text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} />
            Export ({filteredAssets.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
            className="text-blue-600 border-blue-300 bg-blue-50/50 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload size={14} />
            Bulk Upload (1000+)
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedAssetForEdit(null);
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Professional KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="shadow-xs hover:border-blue-300 transition-colors">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Assets</p>
            <h3 className="text-2xl font-bold mt-1 text-gray-900">{stats.total}</h3>
            <p className="text-[11px] text-gray-500 mt-1">Hospital registered</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-emerald-300 transition-colors">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700 font-medium">Operational / Active</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-700">{stats.active}</h3>
            <p className="text-[11px] text-emerald-600 mt-1">
              {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% uptime` : '100%'}
            </p>
          </CardContent>
        </Card>

        {/* 1-Month Alerts: Warranty Expiring Soon */}
        <Card 
          onClick={() => setSelectedAlertFilter(selectedAlertFilter === 'warranty' ? 'all' : 'warranty')}
          className={`shadow-xs cursor-pointer transition-all ${
            stats.warrantyExpiringSoon > 0 
              ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-50' 
              : 'hover:border-gray-300'
          } ${selectedAlertFilter === 'warranty' ? 'ring-2 ring-rose-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-rose-700 font-medium">Warranty ≤ 30d</p>
              <AlertTriangle size={14} className="text-rose-600" />
            </div>
            <h3 className="text-2xl font-bold mt-1 text-rose-700">{stats.warrantyExpiringSoon}</h3>
            <p className="text-[11px] text-rose-600 mt-1 font-medium">
              {selectedAlertFilter === 'warranty' ? 'Filtered' : 'Click to filter'}
            </p>
          </CardContent>
        </Card>

        {/* 1-Month Alerts: PPM Due Soon */}
        <Card 
          onClick={() => setSelectedAlertFilter(selectedAlertFilter === 'ppm' ? 'all' : 'ppm')}
          className={`shadow-xs cursor-pointer transition-all ${
            stats.ppmDueSoon > 0 
              ? 'bg-orange-50/60 border-orange-300 hover:bg-orange-50' 
              : 'hover:border-gray-300'
          } ${selectedAlertFilter === 'ppm' ? 'ring-2 ring-orange-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-orange-700 font-medium">PPM Due ≤ 30d</p>
              <Clock size={14} className="text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold mt-1 text-orange-700">{stats.ppmDueSoon}</h3>
            <p className="text-[11px] text-orange-600 mt-1 font-medium">
              {selectedAlertFilter === 'ppm' ? 'Filtered' : 'Click to filter'}
            </p>
          </CardContent>
        </Card>

        {/* 1-Month Alerts: License Expiring Soon */}
        <Card 
          onClick={() => setSelectedAlertFilter(selectedAlertFilter === 'license' ? 'all' : 'license')}
          className={`shadow-xs cursor-pointer transition-all ${
            stats.licenseExpiringSoon > 0 
              ? 'bg-purple-50/60 border-purple-300 hover:bg-purple-50' 
              : 'hover:border-gray-300'
          } ${selectedAlertFilter === 'license' ? 'ring-2 ring-purple-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-purple-700 font-medium">License ≤ 30d</p>
              <ShieldCheck size={14} className="text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mt-1 text-purple-700">{stats.licenseExpiringSoon}</h3>
            <p className="text-[11px] text-purple-600 mt-1 font-medium">
              {selectedAlertFilter === 'license' ? 'Filtered' : 'Click to filter'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-blue-300 transition-colors">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Value</p>
            <h3 className="text-xl font-bold mt-1 text-blue-600 truncate">{formatCurrency(stats.totalValue)}</h3>
            <p className="text-[11px] text-gray-500 mt-1">Capital equipment</p>
          </CardContent>
        </Card>
      </div>

      {/* Prominent Big Card: Department Asset Valuation & Capital Expenditure */}
      <Card className="border-2 border-blue-200/90 bg-white shadow-xs overflow-hidden">
        {/* Header Bar with Department Dropdown */}
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white px-5 py-4 border-b border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Building2 size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">
                  Department Asset Valuation
                </h3>
                <Badge variant="outline" className="bg-blue-100/80 text-blue-800 border-blue-200 text-[10px] font-semibold px-2 py-0.5">
                  Financial Analytics
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Select any hospital department below to view its cumulative asset valuation and equipment metrics
              </p>
            </div>
          </div>

          {/* Department Dropdown Selector */}
          <div className="flex items-center gap-2 w-full md:w-80 shrink-0">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Filter size={12} className="text-blue-600" />
                Select Department:
              </label>
              <Select
                value={selectedValuationDept}
                onValueChange={(val) => setSelectedValuationDept(val)}
              >
                <SelectTrigger className="w-full h-9 bg-white border-blue-200 text-xs font-semibold shadow-xs focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Choose Department" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL" className="text-xs font-bold text-blue-700">
                    🏢 All Departments (Hospital Wide)
                  </SelectItem>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept} className="text-xs font-medium">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Body of the Big Card */}
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Department Amount */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-900">Total Asset Valuation</p>
                <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                  <DollarSign size={15} />
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-blue-700 mt-2 truncate" title={formatCurrency(deptValuationStats.totalAmount)}>
                {formatCurrency(deptValuationStats.totalAmount)}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-medium text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-full">
                  {deptValuationStats.capitalShare}% of Total Hospital Assets
                </span>
              </div>
            </div>

            {/* 2. Total Department Assets Count */}
            <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Department Equipment</p>
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Boxes size={15} />
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-2">
                {deptValuationStats.assetCount} <span className="text-xs font-normal text-gray-500">units registered</span>
              </h2>
              <p className="text-[11px] font-medium text-emerald-700 mt-2 flex items-center gap-1">
                <CheckCircle2 size={13} />
                {deptValuationStats.activeCount} active ({deptValuationStats.assetCount > 0 ? Math.round((deptValuationStats.activeCount / deptValuationStats.assetCount) * 100) : 0}% operational)
              </p>
            </div>

            {/* 3. Average Amount per Unit */}
            <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Average Value / Unit</p>
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <TrendingUp size={15} />
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-purple-800 mt-2 truncate" title={formatCurrency(deptValuationStats.avgAmount)}>
                {formatCurrency(deptValuationStats.avgAmount)}
              </h2>
              <p className="text-[11px] text-gray-500 mt-2">
                Mean capital allocation per asset
              </p>
            </div>

            {/* 4. Top Valued Equipment */}
            <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Highest Valued Asset</p>
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Sparkles size={15} />
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-2 truncate" title={deptValuationStats.highestAsset?.assetName || 'No equipment registered'}>
                {deptValuationStats.highestAsset?.assetName || 'No assets recorded'}
              </h4>
              <p className="text-xs font-bold text-amber-700 mt-1">
                {deptValuationStats.highestAsset?.totalAmount ? formatCurrency(deptValuationStats.highestAsset.totalAmount) : 'RM 0'}
              </p>
            </div>
          </div>

          {/* Quick Filter Action Footer */}
          {selectedValuationDept !== 'ALL' && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-gray-600">
                Currently showing valuation for <strong className="text-blue-800 font-semibold">{selectedValuationDept}</strong> ({deptValuationStats.assetCount} asset{deptValuationStats.assetCount === 1 ? '' : 's'} recorded)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm(selectedValuationDept);
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs font-medium text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5"
                >
                  Filter Equipment Table by "{selectedValuationDept}"
                  <ArrowRight size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedValuationDept('ALL')}
                  className="h-8 text-xs text-gray-500 hover:text-gray-800"
                >
                  Reset to All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 30-Day Alert Banner Section */}
      {(stats.warrantyExpiringSoon > 0 || stats.ppmDueSoon > 0 || stats.licenseExpiringSoon > 0) && (
        <div className="p-4 bg-linear-to-r from-amber-50/90 via-orange-50/80 to-rose-50/90 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                <AlertTriangle size={16} />
              </span>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Critical 30-Day Expiry & PPM Alert System
                </h4>
                <p className="text-xs text-gray-600">
                  Assets requiring immediate warranty renewal, PPM maintenance, or operating license extension within 1 month
                </p>
              </div>
            </div>
            {selectedAlertFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlertFilter('all')}
                className="text-xs text-gray-700 hover:text-gray-900"
              >
                Clear Alert Filter
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => setSelectedAlertFilter(selectedAlertFilter === 'warranty' ? 'all' : 'warranty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedAlertFilter === 'warranty'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              🔴 Warranty Ending Soon ({stats.warrantyExpiringSoon})
            </button>

            <button
              onClick={() => setSelectedAlertFilter(selectedAlertFilter === 'ppm' ? 'all' : 'ppm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedAlertFilter === 'ppm'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'
              }`}
            >
              🟠 PPM Maintenance Due ({stats.ppmDueSoon})
            </button>

            <button
              onClick={() => setSelectedAlertFilter(selectedAlertFilter === 'license' ? 'all' : 'license')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedAlertFilter === 'license'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
              }`}
            >
              🟣 License & MDA Permit Due ({stats.licenseExpiringSoon})
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <Input
                placeholder="Search by Asset Name, Asset No., Model, SN, Location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Category Filter */}
            <div>
              <Select 
                value={selectedCategory} 
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {ASSET_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criticality Filter */}
            <div>
              <Select 
                value={selectedCriticality} 
                onValueChange={(val) => {
                  setSelectedCriticality(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Criticalities</SelectItem>
                  {ASSET_CRITICALITY.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select 
                value={selectedStatus} 
                onValueChange={(val) => {
                  setSelectedStatus(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  {ASSET_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Pills & Reset */}
          {(searchTerm || selectedCategory !== 'All' || selectedCriticality !== 'All' || selectedStatus !== 'All' || selectedAlertFilter !== 'all') && (
            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground">Active filters:</span>
                {searchTerm && <Badge variant="secondary" className="text-[11px]">Search: "{searchTerm}"</Badge>}
                {selectedCategory !== 'All' && <Badge variant="secondary" className="text-[11px]">Category: {selectedCategory}</Badge>}
                {selectedCriticality !== 'All' && <Badge variant="secondary" className="text-[11px]">Criticality: {selectedCriticality}</Badge>}
                {selectedStatus !== 'All' && <Badge variant="secondary" className="text-[11px]">Status: {selectedStatus}</Badge>}
                {selectedAlertFilter !== 'all' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px]">
                    Alert: {selectedAlertFilter.toUpperCase()}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-6 text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Asset Data Table */}
      <Card className="shadow-xs overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Hospital Equipment Register</h4>
            <p className="text-xs text-muted-foreground">
              Showing {filteredAssets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAssets.length)} of {filteredAssets.length} assets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Per page:</span>
            <Select 
              value={String(pageSize)} 
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs bg-white">
                <SelectValue placeholder="15" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider border-b text-[11px]">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-3 min-w-[200px]">Asset Name & Tag</th>
                <th className="py-3 px-3 min-w-[130px]">Category</th>
                <th className="py-3 px-3 min-w-[170px]">Location / Dept</th>
                <th className="py-3 px-3 min-w-[90px]">Criticality</th>
                <th className="py-3 px-3 min-w-[90px]">Status</th>
                <th className="py-3 px-3 min-w-[130px]">Warranty Expiry</th>
                <th className="py-3 px-3 min-w-[130px]">Next PPM Due</th>
                <th className="py-3 px-3 min-w-[90px] text-center">Docs</th>
                <th className="py-3 px-3 min-w-[120px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <Boxes size={36} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold">No assets found matching your criteria</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Try adjusting filters or import assets using the Bulk Upload option.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetFilters} 
                      className="mt-3 text-xs"
                    >
                      Clear All Filters
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset, index) => {
                  const alerts = check30DayAlerts(asset);
                  const rowSeq = asset.no || (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr 
                      key={asset._id || asset.assetNo} 
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* No. */}
                      <td className="py-3 px-3 text-center text-gray-500 font-mono">
                        {rowSeq}
                      </td>

                      {/* Asset Name & Tag */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900 leading-snug">
                          {asset.assetName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono text-blue-600 font-medium">{asset.assetNo}</span>
                          {asset.model && <span>&bull; {asset.model}</span>}
                          {asset.serialNumber && <span className="font-mono">&bull; SN: {asset.serialNumber}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-gray-700">
                        <span>{asset.assetCategory}</span>
                        {asset.typeOfEquipmentSafety && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {asset.typeOfEquipmentSafety}
                          </p>
                        )}
                      </td>

                      {/* Location & Dept */}
                      <td className="py-3 px-3 text-gray-700">
                        <span className="font-medium">{asset.location}</span>
                        {asset.department && asset.department !== asset.location && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Dept: {asset.department}
                          </p>
                        )}
                      </td>

                      {/* Criticality */}
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${getCriticalityBadge(asset.assetCriticality)}`}>
                          {asset.assetCriticality}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${getStatusBadge(asset.status)}`}>
                          {asset.status}
                        </Badge>
                      </td>

                      {/* Warranty End */}
                      <td className="py-3 px-3">
                        {asset.endOfWarranty ? (
                          <div>
                            <span className="text-gray-800">
                              {asset.endOfWarranty.split('T')[0]}
                            </span>
                            {alerts.warrantyAlert && (
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5 mt-0.5">
                                <AlertTriangle size={10} />
                                {alerts.warrantyDaysRemaining !== null && alerts.warrantyDaysRemaining < 0
                                  ? `Expired ${Math.abs(alerts.warrantyDaysRemaining)}d ago`
                                  : `Expires in ${alerts.warrantyDaysRemaining}d`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Next PPM Due */}
                      <td className="py-3 px-3">
                        {alerts.nextPpmDate ? (
                          <div>
                            <span className="text-gray-800 font-medium">
                              {alerts.nextPpmName}: {alerts.nextPpmDate.split('T')[0]}
                            </span>
                            {alerts.ppmAlert && (
                              <p className="text-[10px] font-bold text-orange-600 flex items-center gap-0.5 mt-0.5">
                                <Clock size={10} />
                                Due in {alerts.ppmDaysRemaining} days!
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">All Completed</span>
                        )}
                      </td>

                      {/* Documents Count */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedAssetForDocs(asset)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 transition-colors"
                          title="View / Upload documents"
                        >
                          <FileText size={12} />
                          {asset.documents?.length || 0}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setSelectedAssetForDetail(asset)}
                            title="View Asset Details"
                          >
                            <Eye size={14} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedAssetForEdit(asset);
                              setIsAddModalOpen(true);
                            }}
                            title="Edit Asset"
                          >
                            <Edit3 size={14} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setSelectedAssetForDocs(asset)}
                            title="Manage Documents"
                          >
                            <Upload size={14} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete asset "${asset.assetNo} - ${asset.assetName}"?`)) {
                                if (asset._id) onDeleteAsset(asset._id);
                              }
                            }}
                            title="Delete Asset"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredAssets.length > 0 && (
          <div className="p-3 bg-gray-50/70 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Page <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-bold text-gray-900">{totalPages}</span> ({filteredAssets.length} total assets)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={14} className="mr-0.5" /> Previous
              </Button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                    if (p > totalPages) p = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`h-7 w-7 rounded-md font-medium text-xs transition-colors ${
                        currentPage === p
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next <ChevronRight size={14} className="ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Asset Modal */}
      <AddEditAssetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedAssetForEdit(null);
        }}
        assetToEdit={selectedAssetForEdit}
        existingAssets={assets}
        onSave={async (data) => {
          if (selectedAssetForEdit && selectedAssetForEdit._id) {
            await onUpdateAsset({ ...selectedAssetForEdit, ...data } as Asset);
          } else {
            await onAddAsset(data);
          }
        }}
      />

      {/* Bulk Upload Modal (1000+ records) */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        existingAssets={assets}
        onSuccess={onBulkUpload}
      />

      {/* View Detail Modal */}
      <AssetDetailModal
        isOpen={Boolean(selectedAssetForDetail)}
        onClose={() => setSelectedAssetForDetail(null)}
        asset={selectedAssetForDetail}
        onEdit={(a) => {
          setSelectedAssetForEdit(a);
          setIsAddModalOpen(true);
        }}
        onOpenDocuments={(a) => {
          setSelectedAssetForDocs(a);
        }}
        readOnly={false}
      />

      {/* Manage Documents Modal */}
      <AssetDocumentsModal
        isOpen={Boolean(selectedAssetForDocs)}
        onClose={() => setSelectedAssetForDocs(null)}
        asset={selectedAssetForDocs}
        onUpdateAsset={onUpdateAsset}
        readOnly={false}
      />
    </div>
  );
};
