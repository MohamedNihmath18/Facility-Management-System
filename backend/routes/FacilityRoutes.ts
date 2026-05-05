import express from 'express';
import { 
  getStats, 
  getAllWorkRequests, 
  createWorkRequest,
  updateWorkRequest,
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
  deleteWorkRequest
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

export default router;
