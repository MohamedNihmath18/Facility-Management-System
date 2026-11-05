import express from 'express';
import { 
  getStats, 
  getAllWorkRequests, 
  getWorkRequestById,
  createWorkRequest,
  updateWorkRequest,
  deleteWorkRequest,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  login,
  getAllCategories,
  createCategory,
  deleteCategory,
  getAssetStats,
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkUploadAssets,
  addAssetDocument,
  deleteAssetDocument
} from '../controllers/FacilityController.ts';

const router = express.Router();

// Auth
router.post('/login', login);

// Stats
router.get('/stats', getStats);

// Users
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Work Requests
router.get('/work-requests', getAllWorkRequests);
router.get('/work-requests/:id', getWorkRequestById);
router.post('/work-requests', createWorkRequest);
router.patch('/work-requests/:id', updateWorkRequest);
router.delete('/work-requests/:id', deleteWorkRequest);

// Work Orders
router.get('/work-orders', getAllWorkOrders);
router.post('/work-orders', createWorkOrder);
router.patch('/work-orders/:id', updateWorkOrder);

// Categories
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

// Assets
router.get('/assets/stats', getAssetStats);
router.get('/assets', getAllAssets);
router.get('/assets/:id', getAssetById);
router.post('/assets', createAsset);
router.post('/assets/bulk', bulkUploadAssets);
router.post('/assets/bulk-upload', bulkUploadAssets);
router.patch('/assets/:id', updateAsset);
router.put('/assets/:id', updateAsset);
router.delete('/assets/:id', deleteAsset);
router.post('/assets/:id/documents', addAssetDocument);
router.delete('/assets/:id/documents/:docId', deleteAssetDocument);

export default router;
