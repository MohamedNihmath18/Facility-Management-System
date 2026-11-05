import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Eye, 
  FileText, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  Building2,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Asset, check30DayAlerts } from './types';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetDocumentsModal } from './AssetDocumentsModal';

interface DepartmentAssetsSectionProps {
  assets: Asset[];
  userDepartment?: string;
  userName?: string;
}

export const DepartmentAssetsSection: React.FC<DepartmentAssetsSectionProps> = ({
  assets: rawAssets,
  userDepartment = '',
  userName
}) => {
  const assets: Asset[] = useMemo(() => {
    if (Array.isArray(rawAssets)) return rawAssets;
    if (rawAssets && typeof rawAssets === 'object' && Array.isArray((rawAssets as any).assets)) {
      return (rawAssets as any).assets;
    }
    return [];
  }, [rawAssets]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
  const [selectedAssetForDocs, setSelectedAssetForDocs] = useState<Asset | null>(null);

  // Filter department assets
  const deptAssets = useMemo(() => {
    const deptNorm = (userDepartment || '').trim().toLowerCase();
    if (!deptNorm) return [];

    return assets.filter(a => {
      const matchDept = a.department?.toLowerCase().includes(deptNorm);
      const matchLoc = a.location?.toLowerCase().includes(deptNorm);
      return matchDept || matchLoc;
    });
  }, [assets, userDepartment]);

  // Filtered by search
  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return deptAssets;
    const term = searchTerm.toLowerCase();
    return deptAssets.filter(a => 
      a.assetName?.toLowerCase().includes(term) ||
      a.assetNo?.toLowerCase().includes(term) ||
      a.model?.toLowerCase().includes(term) ||
      a.serialNumber?.toLowerCase().includes(term) ||
      a.location?.toLowerCase().includes(term)
    );
  }, [deptAssets, searchTerm]);

  const activeCount = deptAssets.filter(a => a.status === 'Active').length;
  const upcomingPpmCount = deptAssets.filter(a => check30DayAlerts(a).ppmAlert).length;

  return (
    <Card className="shadow-xs overflow-hidden border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-5 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Boxes size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base lg:text-lg font-bold text-gray-900">
                  Department Equipment & Assets ({userDepartment || 'General'})
                </CardTitle>
                <Badge variant="outline" className="bg-white text-gray-600 text-[10px] flex items-center gap-1 font-semibold">
                  <Lock size={10} /> View Only
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Overview of biomedical and facility equipment assigned to your department
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2 text-gray-400" size={14} />
              <Input
                placeholder="Search department assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Summary Mini-Cards */}
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="p-2.5 bg-white rounded-lg border text-xs">
            <span className="text-muted-foreground block text-[11px]">Total Dept Assets</span>
            <span className="font-bold text-base text-gray-900">{deptAssets.length}</span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border text-xs">
            <span className="text-emerald-700 block text-[11px]">In Service / Active</span>
            <span className="font-bold text-base text-emerald-700">{activeCount}</span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border text-xs">
            <span className="text-orange-700 block text-[11px]">PPM Due (≤ 30d)</span>
            <span className="font-bold text-base text-orange-700">{upcomingPpmCount}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-mono">Tag No.</th>
                <th className="py-2.5 px-4 min-w-[180px]">Asset Name & Model</th>
                <th className="py-2.5 px-4 min-w-[140px]">Location</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 min-w-[120px]">Warranty</th>
                <th className="py-2.5 px-4 min-w-[130px]">Next PPM Schedule</th>
                <th className="py-2.5 px-4 text-center">Docs</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    <p className="text-xs font-semibold">No equipment registered under {userDepartment}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Contact facility admin if equipment needs to be assigned.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => {
                  const alerts = check30DayAlerts(asset);

                  return (
                    <tr key={asset.assetNo} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-blue-600">
                        {asset.assetNo}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-gray-900 block">{asset.assetName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {asset.model || asset.manufacturerName || 'Equipment'} &bull; {asset.assetCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-700">
                        {asset.location}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-gray-700">
                          {asset.endOfWarranty ? asset.endOfWarranty.split('T')[0] : '-'}
                        </span>
                        {alerts.warrantyAlert && (
                          <span className="text-[10px] block font-semibold text-rose-600">
                            Expires in {alerts.warrantyDaysRemaining}d
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {alerts.nextPpmDate ? (
                          <div>
                            <span className="text-gray-800">
                              {alerts.nextPpmName}: {alerts.nextPpmDate.split('T')[0]}
                            </span>
                            {alerts.ppmAlert && (
                              <span className="text-[10px] block font-semibold text-orange-600">
                                Due in {alerts.ppmDaysRemaining}d
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Up to date</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedAssetForDocs(asset)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <FileText size={12} />
                          {asset.documents?.length || 0}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1 mx-auto"
                          onClick={() => setSelectedAssetForDetail(asset)}
                        >
                          <Eye size={13} /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Read-Only Asset Details Modal */}
      <AssetDetailModal
        isOpen={Boolean(selectedAssetForDetail)}
        onClose={() => setSelectedAssetForDetail(null)}
        asset={selectedAssetForDetail}
        onOpenDocuments={(a) => setSelectedAssetForDocs(a)}
        readOnly={true}
      />

      {/* Read-Only Asset Documents Modal */}
      <AssetDocumentsModal
        isOpen={Boolean(selectedAssetForDocs)}
        onClose={() => setSelectedAssetForDocs(null)}
        asset={selectedAssetForDocs}
        onUpdateAsset={async () => {}}
        readOnly={true}
      />
    </Card>
  );
};
