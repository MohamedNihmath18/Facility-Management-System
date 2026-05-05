import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, WorkRequest, WorkOrder, Category } from '../models/FacilityModels.ts';

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
