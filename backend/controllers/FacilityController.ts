import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, WorkRequest, WorkOrder, Category, Asset } from '../models/FacilityModels.ts';

// --- Auth Controller ---
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  console.log(`🔐 Login attempt for: ${username}`);
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.warn(`⚠️ User not found: ${username}`);
      return res.status(404).json({ error: `User ${username} not found.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`❌ Invalid password for: ${username}`);
      return res.status(401).json({ error: 'Invalid password.' });
    }

    console.log(`✅ Login successful: ${user.name} (${user.role})`);
    
    // Don't send password back to client
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json(userObj);
  } catch (err: any) {
    console.error(`❌ Login error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

// --- User Controller ---
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err: any) {
    console.error(`❌ Failed to fetch users: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { password, ...userData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ ...userData, password: hashedPassword });
    
    const userObj = newUser.toObject();
    delete userObj.password;
    
    res.status(201).json(userObj);
  } catch (err: any) {
    console.error(`❌ Create user error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (err: any) {
    console.error(`❌ Update user error: ${err.message}`);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    console.error(`❌ Delete user error: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// --- Stats Controller ---
export const getStats = async (req: Request, res: Response) => {
  try {
    const total = await WorkRequest.countDocuments();
    const open = await WorkRequest.countDocuments({ status: 'OPEN' });
    const inProgress = await WorkRequest.countDocuments({ status: 'IN PROGRESS' });
    const pendingConfirm = await WorkRequest.countDocuments({ status: 'PENDING USER CONFIRMATION' });
    const closed = await WorkRequest.countDocuments({ status: 'CLOSED' });
    
    // Aggregate by category
    const categories = await WorkRequest.aggregate([
      { $group: { _id: "$category", value: { $sum: 1 } } },
      { $project: { name: "$_id", value: 1, _id: 0 } }
    ]);

    // Aggregate by month for trend
    const trend = await WorkRequest.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: 1 },
          closed: { $sum: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0] } }
        }
      },
      { $sort: { "_id": 1 } },
      {
        $project: {
          name: {
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              "$_id"
            ]
          },
          total: 1,
          closed: 1,
          open: 1
        }
      }
    ]);

    // Technician performance
    const techPerf = await WorkOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      {
        $group: {
          _id: "$assignedTechnician",
          name: { $first: "$technicianName" },
          completed: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      total,
      open,
      inProgress,
      pendingConfirm,
      closed,
      slaCompliance: total > 0 ? Math.round((closed / total) * 100) : 100,
      categories: categories.length > 0 ? categories : [
        { name: 'Medical Equipment', value: 0 },
        { name: 'HVAC', value: 0 },
        { name: 'Electrical', value: 0 }
      ],
      trend: trend.length > 0 ? trend : [
        { name: 'Apr', total: 0, closed: 0, open: 0 }
      ],
      technicians: techPerf
    });
  } catch (err: any) {
    console.error(`❌ Stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// --- Work Request Controller ---
export const getAllWorkRequests = async (req: Request, res: Response) => {
  try {
    console.log('🔍 Fetching all work requests...');
    // Exclude large fields from list view to prevent 500 errors and speed up loading
    const requests = await WorkRequest.find()
      .select('-videoUrl -activities')
      .sort({ createdAt: -1 })
      .lean();
    console.log(`✅ Found ${requests.length} work requests`);
    res.json(requests);
  } catch (err: any) {
    console.error(`❌ Failed to fetch work requests: ${err.message}`, err);
    res.status(500).json({ error: 'Failed to fetch work requests', details: err.message });
  }
};

export const getWorkRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await WorkRequest.findById(id).lean();
    if (!request) return res.status(404).json({ error: 'Work Request not found' });
    res.json(request);
  } catch (err: any) {
    console.error(`❌ Failed to fetch work request ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch work request' });
  }
};

export const createWorkRequest = async (req: Request, res: Response) => {
  try {
    // Find the latest request to get the next number
    const lastRequest = await WorkRequest.findOne().sort({ createdAt: -1 }).lean();
    let nextNum = 1;
    
    if (lastRequest && lastRequest.wrId) {
      const parts = lastRequest.wrId.split('-');
      const lastNumStr = parts[parts.length - 1];
      const lastNum = parseInt(lastNumStr);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    // Safety check for unique wrId
    let wrId = `WR-2026-${nextNum.toString().padStart(3, '0')}`;
    let exists = await WorkRequest.findOne({ wrId });
    let safetyCounter = 0;
    while (exists && safetyCounter < 10) {
      nextNum++;
      wrId = `WR-2026-${nextNum.toString().padStart(3, '0')}`;
      exists = await WorkRequest.findOne({ wrId });
      safetyCounter++;
    }

    const newRequest = await WorkRequest.create({ 
      ...req.body, 
      wrId,
      activities: [{
        action: 'CREATED',
        user: req.body.userName || 'System',
        timestamp: new Date(),
        note: 'Work request submitted'
      }]
    });
    res.status(201).json(newRequest);
  } catch (err: any) {
    console.error(`❌ Create work request error:`, err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Conflict Error', details: 'A request with this ID already exists. Please try again.' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation Error', details: err.message });
    }
    if (err.message && err.message.includes('maximum document size')) {
      return res.status(413).json({ 
        error: 'Payload too large', 
        details: 'The combined size of attachments exceeds the MongoDB limit (16MB). Please use smaller files.' 
      });
    }
    res.status(500).json({ error: 'Failed to create work request', details: err.message });
  }
};

export const updateWorkRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { activity, ...updateData } = req.body;
    
    // If reopening to OPEN, check if it already has a Work Order
    if (updateData.status === 'OPEN') {
      const requestToUpdate = await WorkRequest.findById(id);
      if (requestToUpdate) {
        const order = await WorkOrder.findOne({ wrId: requestToUpdate.wrId });
        if (order) {
          console.log(`ℹ️ Request ${requestToUpdate.wrId} already has a Work Order. Setting status to ASSIGNED instead of OPEN.`);
          updateData.status = 'ASSIGNED';
        }
      }
    }
    
    const updateQuery: any = { ...updateData };
    const updatedRequest = await WorkRequest.findByIdAndUpdate(
      id, 
      { 
        ...updateQuery, 
        $push: activity ? { activities: activity } : undefined 
      }, 
      { new: true }
    );
    if (!updatedRequest) return res.status(404).json({ error: 'Work Request not found' });

    // Sync with Work Order if status changed
    if (updateData.status) {
      let woStatus = '';
      if (updateData.status === 'IN PROGRESS') woStatus = 'IN PROGRESS';
      else if (updateData.status === 'ON HOLD') woStatus = 'ON HOLD';
      else if (updateData.status === 'CLOSED' || updateData.status === 'PENDING USER CONFIRMATION') woStatus = 'COMPLETED';
      else if (updateData.status === 'OPEN' || updateData.status === 'ASSIGNED') woStatus = 'ASSIGNED';
      
      if (woStatus) {
        const wrIdString = String(updatedRequest.wrId);
        console.log(`🔄 Syncing Work Order for WR ${wrIdString} to status: ${woStatus}`);
        
        const woUpdate: any = { 
          status: woStatus,
          updatedAt: new Date()
        };
        
        if (woStatus === 'COMPLETED') {
          woUpdate.endTime = new Date();
        } else if (woStatus === 'IN PROGRESS') {
          woUpdate.startTime = new Date();
          woUpdate.endTime = null;
        } else {
          woUpdate.endTime = null;
        }

        // Use updateMany to ensure all related orders are synced
        const syncResult = await WorkOrder.updateMany(
          { wrId: wrIdString },
          { $set: woUpdate }
        );
        
        if (syncResult.modifiedCount > 0) {
          console.log(`✅ Successfully synced ${syncResult.modifiedCount} Work Order(s) for WR ${wrIdString}`);
        } else {
          console.warn(`⚠️ No Work Order found for WR ${wrIdString} to sync`);
        }
      }
    }

    res.json(updatedRequest);
  } catch (err: any) {
    console.error(`❌ Update work request error:`, err);
    if (err.message && err.message.includes('maximum document size')) {
      return res.status(413).json({ 
        error: 'Payload too large', 
        details: 'The total size of attachments in this request exceeds the database limit. Please use smaller files.' 
      });
    }
    res.status(500).json({ error: 'Failed to update work request', details: err.message });
  }
};

// --- Work Order Controller ---
export const getAllWorkOrders = async (req: Request, res: Response) => {
  try {
    const orders = await WorkOrder.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err: any) {
    console.error(`❌ Failed to fetch work orders: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch work orders', details: err.message });
  }
};

export const createWorkOrder = async (req: Request, res: Response) => {
  try {
    const wrIdString = String(req.body.wrId);
    
    // Check if a Work Order already exists for this Work Request
    const existingOrder = await WorkOrder.findOne({ wrId: wrIdString });
    
    if (existingOrder) {
      console.log(`🔄 Work Order already exists for WR ${wrIdString}. Updating existing order ${existingOrder.woId}`);
      
      // Update existing order instead of creating a new one
      const updatedOrder = await WorkOrder.findByIdAndUpdate(
        existingOrder._id,
        { 
          assignedTechnician: req.body.assignedTechnician,
          technicianName: req.body.technicianName,
          status: 'ASSIGNED',
          updatedAt: new Date()
        },
        { new: true }
      );

      // Update linked Work Request status and log activity
      await WorkRequest.findOneAndUpdate(
        { wrId: wrIdString },
        { 
          status: 'ASSIGNED',
          $push: { 
            activities: {
              action: 'RE-ASSIGNED',
              user: req.body.adminName || 'Admin',
              timestamp: new Date(),
              note: `Re-assigned to technician: ${req.body.technicianName}`
            }
          }
        }
      );

      return res.status(200).json(updatedOrder);
    }

    const lastOrder = await WorkOrder.findOne().sort({ woId: -1 });
    let nextNum = 1;
    
    if (lastOrder && lastOrder.woId) {
      const match = lastOrder.woId.match(/WO-\d+-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }

    const woId = `WO-2026-${nextNum.toString().padStart(3, '0')}`;
    const newOrder = await WorkOrder.create({ ...req.body, woId });
    
    // Update linked Work Request status and log activity
    await WorkRequest.findOneAndUpdate(
      { wrId: wrIdString },
      { 
        status: 'ASSIGNED',
        $push: { 
          activities: {
            action: 'ASSIGNED',
            user: req.body.adminName || 'Admin',
            timestamp: new Date(),
            note: `Assigned to technician: ${req.body.technicianName}`
          }
        }
      }
    );

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(`❌ Failed to create/update work order: ${err}`);
    res.status(500).json({ error: 'Failed to create work order' });
  }
};

export const updateWorkOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, startTime, endTime } = req.body;
    
    console.log(`🔧 Updating Work Order ${id} to status: ${status}`);
    
    const updatedOrder = await WorkOrder.findByIdAndUpdate(
      id, 
      { status, startTime, endTime, updatedAt: new Date() }, 
      { new: true }
    );
    
    if (!updatedOrder) {
      console.warn(`⚠️ Work Order ${id} not found`);
      return res.status(404).json({ error: 'Work Order not found' });
    }

    // Sync status with the linked Work Request
    const wrIdString = String(updatedOrder.wrId);
    if (status === 'IN PROGRESS') {
      console.log(`🔄 Syncing Work Request ${wrIdString} to IN PROGRESS`);
      await WorkRequest.findOneAndUpdate(
        { wrId: wrIdString },
        { 
          status: 'IN PROGRESS', 
          updatedAt: new Date(),
          $push: {
            activities: {
              action: 'STARTED',
              user: updatedOrder.technicianName || 'Technician',
              timestamp: new Date(),
              note: 'Work started on the request'
            }
          }
        }
      );
    } else if (status === 'COMPLETED') {
      console.log(`🔄 Syncing Work Request ${wrIdString} to PENDING USER CONFIRMATION`);
      await WorkRequest.findOneAndUpdate(
        { wrId: wrIdString },
        { 
          status: 'PENDING USER CONFIRMATION', 
          updatedAt: new Date(),
          $push: {
            activities: {
              action: 'COMPLETED',
              user: updatedOrder.technicianName || 'Technician',
              timestamp: new Date(),
              note: 'Work completed, awaiting user confirmation'
            }
          }
        }
      );
    } else if (status === 'ON HOLD') {
      console.log(`🔄 Syncing Work Request ${wrIdString} to ON HOLD`);
      await WorkRequest.findOneAndUpdate(
        { wrId: wrIdString },
        { 
          status: 'ON HOLD', 
          updatedAt: new Date(),
          $push: {
            activities: {
              action: 'ON HOLD',
              user: updatedOrder.technicianName || 'Technician',
              timestamp: new Date(),
              note: 'Work put on hold'
            }
          }
        }
      );
    }

    res.json(updatedOrder);
  } catch (err: any) {
    console.error(`❌ Failed to update work order: ${err.message}`);
    res.status(500).json({ error: 'Failed to update work order' });
  }
};

// --- Category Controller ---
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json(categories);
  } catch (err: any) {
    console.error(`❌ Failed to fetch categories: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const newCategory = await Category.create(req.body);
    res.status(201).json(newCategory);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// --- Additional Work Request Controllers ---
export const deleteWorkRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await WorkRequest.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Work Request not found' });
    
    // Also delete associated work order if exists
    await WorkOrder.deleteOne({ wrId: deleted.wrId });
    
    res.json({ message: 'Work Request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete work request' });
  }
};

// --- Asset Controllers ---
export const getAssetStats = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    const baseFilter: any = {};
    if (department) {
      baseFilter.$or = [
        { department: new RegExp(String(department), 'i') },
        { location: new RegExp(String(department), 'i') }
      ];
    }

    const total = await Asset.countDocuments(baseFilter);
    const active = await Asset.countDocuments({ ...baseFilter, status: 'Active' });
    const underMaintenance = await Asset.countDocuments({ ...baseFilter, status: { $in: ['Under Maintenance', 'In Repair'] } });
    
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + 30);

    // Warranty expiring in 30 days
    const warrantyExpiringSoon = await Asset.countDocuments({
      ...baseFilter,
      endOfWarranty: { $lte: oneMonthFromNow }
    });

    // License expiring in 30 days
    const licenseExpiringSoon = await Asset.countDocuments({
      ...baseFilter,
      $or: [
        { licenseEndDate: { $lte: oneMonthFromNow } },
        { "documents.expiryDate": { $lte: oneMonthFromNow } }
      ]
    });

    // PPM due in 30 days
    const ppmFilter = {
      ...baseFilter,
      $or: [
        { ppm1Planned: { $lte: oneMonthFromNow }, ppm1Actual: null },
        { ppm2Planned: { $lte: oneMonthFromNow }, ppm2Actual: null },
        { ppm3Planned: { $lte: oneMonthFromNow }, ppm3Actual: null },
        { ppm4Planned: { $lte: oneMonthFromNow }, ppm4Actual: null },
        { ppm5Planned: { $lte: oneMonthFromNow }, ppm5Actual: null },
        { ppm6Planned: { $lte: oneMonthFromNow }, ppm6Actual: null }
      ]
    };
    const ppmDueSoon = await Asset.countDocuments(ppmFilter);

    // Total valuation
    const valuationResult = await Asset.aggregate([
      { $match: baseFilter },
      { $group: { _id: null, totalValue: { $sum: "$totalAmount" } } }
    ]);
    const totalValue = valuationResult.length > 0 ? valuationResult[0].totalValue : 0;

    // Categories breakdown
    const categories = await Asset.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$assetCategory", count: { $sum: 1 } } },
      { $project: { name: "$_id", value: "$count", _id: 0 } }
    ]);

    // Criticality breakdown
    const criticality = await Asset.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$assetCriticality", count: { $sum: 1 } } },
      { $project: { name: "$_id", value: "$count", _id: 0 } }
    ]);

    res.json({
      total,
      active,
      underMaintenance,
      warrantyExpiringSoon,
      licenseExpiringSoon,
      ppmDueSoon,
      totalValue,
      categories,
      criticality
    });
  } catch (err: any) {
    console.error(`❌ Asset stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch asset stats' });
  }
};

export const getAllAssets = async (req: Request, res: Response) => {
  try {
    const { 
      department, 
      search, 
      category, 
      criticality, 
      status, 
      alert,
      page = '1', 
      limit = '10000' 
    } = req.query;

    const filter: any = {};

    if (department) {
      filter.$or = [
        { department: new RegExp(String(department), 'i') },
        { location: new RegExp(String(department), 'i') }
      ];
    }

    if (category && category !== 'All') {
      filter.assetCategory = category;
    }

    if (criticality && criticality !== 'All') {
      filter.assetCriticality = criticality;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { assetName: searchRegex },
          { assetNo: searchRegex },
          { serialNumber: searchRegex },
          { model: searchRegex },
          { manufacturerName: searchRegex },
          { supplierName: searchRegex },
          { location: searchRegex },
          { department: searchRegex }
        ]
      });
    }

    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + 30);

    if (alert === 'warranty') {
      filter.endOfWarranty = { $lte: oneMonthFromNow };
    } else if (alert === 'license') {
      filter.$or = [
        { licenseEndDate: { $lte: oneMonthFromNow } },
        { "documents.expiryDate": { $lte: oneMonthFromNow } }
      ];
    } else if (alert === 'ppm') {
      filter.$or = [
        { ppm1Planned: { $lte: oneMonthFromNow }, ppm1Actual: null },
        { ppm2Planned: { $lte: oneMonthFromNow }, ppm2Actual: null },
        { ppm3Planned: { $lte: oneMonthFromNow }, ppm3Actual: null },
        { ppm4Planned: { $lte: oneMonthFromNow }, ppm4Actual: null },
        { ppm5Planned: { $lte: oneMonthFromNow }, ppm5Actual: null },
        { ppm6Planned: { $lte: oneMonthFromNow }, ppm6Actual: null }
      ];
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10000;
    const skip = (pageNum - 1) * limitNum;

    const total = await Asset.countDocuments(filter);
    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      assets,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    console.error(`❌ Get assets error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

export const getAssetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const { assetNo } = req.body;
    if (!assetNo) {
      return res.status(400).json({ error: 'Asset No is required' });
    }

    const existing = await Asset.findOne({ assetNo: assetNo.trim() });
    if (existing) {
      return res.status(409).json({ 
        error: `Asset with Asset No "${assetNo}" already exists!`,
        duplicate: true 
      });
    }

    // Auto calculate row sequence 'no' if not provided
    if (!req.body.no) {
      const count = await Asset.countDocuments();
      req.body.no = count + 1;
    }

    const newAsset = await Asset.create(req.body);
    console.log(`✅ Created asset: ${newAsset.assetNo} - ${newAsset.assetName}`);
    res.status(201).json(newAsset);
  } catch (err: any) {
    console.error(`❌ Create asset error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to create asset' });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    // Check if updating assetNo to one that belongs to another asset
    if (updateData.assetNo) {
      const existing = await Asset.findOne({ 
        assetNo: updateData.assetNo.trim(), 
        _id: { $ne: id } 
      });
      if (existing) {
        return res.status(409).json({ 
          error: `Asset No "${updateData.assetNo}" is already in use by another asset!`,
          duplicate: true 
        });
      }
    }

    const updated = await Asset.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Asset not found' });
    res.json(updated);
  } catch (err: any) {
    console.error(`❌ Update asset error: ${err.message}`);
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Asset.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Asset deleted successfully', assetNo: deleted.assetNo });
  } catch (err: any) {
    console.error(`❌ Delete asset error: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

export const bulkUploadAssets = async (req: Request, res: Response) => {
  try {
    const { assets = [], duplicateStrategy = 'skip' } = req.body;
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'No assets provided for bulk upload' });
    }

    console.log(`📦 Bulk upload received ${assets.length} items. Strategy: ${duplicateStrategy}`);

    // Clean and validate assets
    const cleanedAssets: any[] = [];
    const seenSerialsInFile = new Set<string>();
    const seenExactInFile = new Set<string>();
    const fileDuplicates: string[] = [];

    assets.forEach((item, index) => {
      const rawSerial = item.serialNumber || item['Serial Number'] || item['Serial No.'] || item['Serial No'] || item['S/N'] || item['SN'] || item['serial_number'];
      const serialNumber = rawSerial ? String(rawSerial).trim() : '';
      const hasValidSerial = Boolean(
        serialNumber && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(serialNumber.toUpperCase())
      );

      const rawAssetNo = item.assetNo || item['Asset No.'] || item['Asset No'] || item['asset_no'] || item['Asset ID'] || item['Asset Tag'] || item['Tag No'];
      let assetNo = rawAssetNo ? String(rawAssetNo).trim() : '';
      
      // Auto-generate assetNo if missing so NO row is dropped
      if (!assetNo) {
        if (hasValidSerial) {
          assetNo = `AST-${serialNumber}`;
        } else {
          assetNo = `AST-${String(index + 1).padStart(5, '0')}`;
        }
      }

      const rawAssetName = item.assetName || item['Asset Description'] || item['Asset Name'] || item['asset_name'] || item['Equipment Name'] || item['Description'];
      const assetName = rawAssetName ? String(rawAssetName).trim() : `Asset ${index + 1}`;

      // Check duplicates in file based on Serial Number (or Asset No + Name if no serial)
      if (hasValidSerial) {
        const normSerial = serialNumber.toUpperCase();
        if (seenSerialsInFile.has(normSerial)) {
          fileDuplicates.push(`Serial: ${serialNumber}`);
          return; // Skip duplicate serial inside the same uploaded file
        }
        seenSerialsInFile.add(normSerial);
      } else {
        const exactKey = `${assetNo.toUpperCase()}|||${assetName.toUpperCase()}`;
        if (seenExactInFile.has(exactKey)) {
          fileDuplicates.push(`Asset: ${assetNo} (${assetName})`);
          return; // Skip duplicate inside the same uploaded file
        }
        seenExactInFile.add(exactKey);
      }

      // Map fields cleanly
      const mapped = {
        no: Number(item.no || item['No.'] || item['No'] || index + 1),
        assetName,
        assetNo,
        serialNumber,
        model: String(item.model || item['Model'] || '').trim(),
        manufacturerName: String(item.manufacturerName || item['Manufacturer Name'] || '').trim(),
        supplierName: String(item.supplierName || item['Supplier Name'] || '').trim(),
        supplierContactNo: String(item.supplierContactNo || item['Supplier Contact No.'] || item['Supplier Contact No'] || '').trim(),
        location: String(item.location || item['Location'] || 'General').trim(),
        department: String(item.department || item['Department'] || item.location || 'General').trim(),
        warrantyPeriod: String(item.warrantyPeriod || item['Warranty Period'] || '').trim(),
        startOfWarranty: item.startOfWarranty || item['Start of Warranty'] ? new Date(item.startOfWarranty || item['Start of Warranty']) : undefined,
        endOfWarranty: item.endOfWarranty || item['End of Warranty'] ? new Date(item.endOfWarranty || item['End of Warranty']) : undefined,
        ppmFrequency: String(item.ppmFrequency || item['PPM Frequency'] || 'Quarterly').trim(),
        ppm1Planned: item.ppm1Planned || item['1st PPM Planned'] ? new Date(item.ppm1Planned || item['1st PPM Planned']) : undefined,
        ppm1Actual: item.ppm1Actual || item['1st PPM Actual'] ? new Date(item.ppm1Actual || item['1st PPM Actual']) : undefined,
        ppm2Planned: item.ppm2Planned || item['2nd PPM Planned'] ? new Date(item.ppm2Planned || item['2nd PPM Planned']) : undefined,
        ppm2Actual: item.ppm2Actual || item['2nd PPM Actual'] ? new Date(item.ppm2Actual || item['2nd PPM Actual']) : undefined,
        ppm3Planned: item.ppm3Planned || item['3rd PPM Planned'] ? new Date(item.ppm3Planned || item['3rd PPM Planned']) : undefined,
        ppm3Actual: item.ppm3Actual || item['3rd PPM Actual'] ? new Date(item.ppm3Actual || item['3rd PPM Actual']) : undefined,
        ppm4Planned: item.ppm4Planned || item['4th PPM Planned'] ? new Date(item.ppm4Planned || item['4th PPM Planned']) : undefined,
        ppm4Actual: item.ppm4Actual || item['4th PPM Actual'] ? new Date(item.ppm4Actual || item['4th PPM Actual']) : undefined,
        ppm5Planned: item.ppm5Planned || item['5th PPM Planned'] ? new Date(item.ppm5Planned || item['5th PPM Planned']) : undefined,
        ppm5Actual: item.ppm5Actual || item['5th PPM Actual'] ? new Date(item.ppm5Actual || item['5th PPM Actual']) : undefined,
        ppm6Planned: item.ppm6Planned || item['6th PPM Planned'] ? new Date(item.ppm6Planned || item['6th PPM Planned']) : undefined,
        ppm6Actual: item.ppm6Actual || item['6th PPM Actual'] ? new Date(item.ppm6Actual || item['6th PPM Actual']) : undefined,
        poNo: String(item.poNo || item['PO No.'] || item['PO No'] || '').trim(),
        doNo: String(item.doNo || item['DO No.'] || item['DO No'] || '').trim(),
        invoiceNo: String(item.invoiceNo || item['Invoice No.'] || item['Invoice No'] || '').trim(),
        totalAmount: Number(item.totalAmount || item['Total Amount'] || 0) || 0,
        lifespan: String(item.lifespan || item['Lifespan'] || '').trim(),
        assetCriticality: ['Critical', 'High', 'Medium', 'Low'].includes(item.assetCriticality || item['Asset Criticality']) ? (item.assetCriticality || item['Asset Criticality']) : 'Medium',
        assetCategory: String(item.assetCategory || item['Asset Category'] || 'Medical Equipment').trim(),
        typeOfEquipmentSafety: String(item.typeOfEquipmentSafety || item['Type of Equipment Safety'] || 'Class I').trim(),
        status: ['Active', 'Under Maintenance', 'In Repair', 'Decommissioned', 'Inactive'].includes(item.status || item['Status']) ? (item.status || item['Status']) : 'Active',
        licenseEndDate: item.licenseEndDate || item['License End Date'] ? new Date(item.licenseEndDate || item['License End Date']) : undefined,
        documents: []
      };

      cleanedAssets.push(mapped);
    });

    // Find which serialNumbers and exact assets already exist in DB
    const incomingSerials = cleanedAssets
      .map(a => a.serialNumber)
      .filter((s): s is string => Boolean(s && s.trim() && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(s.trim().toUpperCase())));

    const existingInDb = await Asset.find({
      $or: [
        { serialNumber: { $in: incomingSerials } },
        { assetNo: { $in: cleanedAssets.map(a => a.assetNo) } }
      ]
    }, { assetNo: 1, serialNumber: 1, assetName: 1 }).lean();

    const existingSerials = new Set(
      existingInDb
        .filter(d => d.serialNumber && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(d.serialNumber.trim().toUpperCase()))
        .map(d => String(d.serialNumber).trim().toUpperCase())
    );

    const existingExactSet = new Set(
      existingInDb.map(d => `${String(d.assetNo || '').trim().toUpperCase()}|||${String(d.assetName || '').trim().toUpperCase()}`)
    );

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const skippedList: string[] = [];

    if (duplicateStrategy === 'replace') {
      // Clear entire collection and insert fresh
      await Asset.deleteMany({});
      if (cleanedAssets.length > 0) {
        const result = await Asset.insertMany(cleanedAssets, { ordered: false });
        insertedCount = result.length;
      }
      console.log(`✅ Bulk upload replace: ${insertedCount} fresh assets inserted.`);
    } else if (duplicateStrategy === 'skip') {
      const toInsert: any[] = [];
      for (const asset of cleanedAssets) {
        const hasValidSerial = Boolean(
          asset.serialNumber && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(asset.serialNumber.toUpperCase())
        );

        const isDup = hasValidSerial 
          ? existingSerials.has(asset.serialNumber.toUpperCase())
          : existingExactSet.has(`${asset.assetNo.toUpperCase()}|||${asset.assetName.toUpperCase()}`);

        if (isDup) {
          skippedCount++;
          skippedList.push(hasValidSerial ? asset.serialNumber : `${asset.assetNo} (${asset.assetName})`);
        } else {
          toInsert.push(asset);
          if (hasValidSerial) existingSerials.add(asset.serialNumber.toUpperCase());
          existingExactSet.add(`${asset.assetNo.toUpperCase()}|||${asset.assetName.toUpperCase()}`);
        }
      }
      if (toInsert.length > 0) {
        const result = await Asset.insertMany(toInsert, { ordered: false });
        insertedCount = result.length;
      }
    } else {
      // 'update' strategy: Upsert each asset matching serialNumber (if available) or (assetNo + assetName)
      const bulkOps = cleanedAssets.map(asset => {
        const hasValidSerial = Boolean(
          asset.serialNumber && !['N/A', 'NA', '-', 'NONE', 'NULL', 'UNKNOWN', 'N / A'].includes(asset.serialNumber.toUpperCase())
        );

        const filter = hasValidSerial
          ? { serialNumber: asset.serialNumber }
          : { assetNo: asset.assetNo, assetName: asset.assetName };

        return {
          updateOne: {
            filter,
            update: { $set: asset },
            upsert: true
          }
        };
      });
      if (bulkOps.length > 0) {
        const result = await Asset.bulkWrite(bulkOps);
        insertedCount = (result.upsertedCount || 0) + (result.insertedCount || 0);
        updatedCount = result.modifiedCount || 0;
      }
    }

    console.log(`✅ Bulk upload complete: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped`);
    res.json({
      success: true,
      totalUploaded: assets.length,
      processed: cleanedAssets.length,
      insertedCount,
      updatedCount,
      skippedCount,
      skippedList: skippedList.slice(0, 50),
      fileDuplicates
    });
  } catch (err: any) {
    console.error(`❌ Bulk upload error: ${err.message}`);
    res.status(500).json({ error: 'Failed to process bulk upload', details: err.message });
  }
};

export const addAssetDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, url, fileSize, expiryDate, notes } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Document name and file are required' });
    }

    const docId = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newDoc = {
      id: docId,
      name,
      type: type || 'Other',
      url,
      fileSize: fileSize || '',
      uploadDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes: notes || ''
    };

    const asset = await Asset.findByIdAndUpdate(
      id,
      { 
        $push: { documents: newDoc },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.status(201).json({ message: 'Document added successfully', document: newDoc, asset });
  } catch (err: any) {
    console.error(`❌ Add document error: ${err.message}`);
    res.status(500).json({ error: 'Failed to add document' });
  }
};

export const deleteAssetDocument = async (req: Request, res: Response) => {
  try {
    const { id, docId } = req.params;
    const asset = await Asset.findByIdAndUpdate(
      id,
      { 
        $pull: { documents: { id: docId } },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ message: 'Document removed successfully', asset });
  } catch (err: any) {
    console.error(`❌ Delete document error: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};
