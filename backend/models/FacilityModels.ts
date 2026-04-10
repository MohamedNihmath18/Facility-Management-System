import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'supervisor', 'technician', 'staff'], default: 'staff' },
  department: String,
  avatar: String,
  createdAt: { type: Date, default: Date.now }
});

const WorkRequestSchema = new mongoose.Schema({
  wrId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  department: String,
  block: String,
  floor: String,
  room: String,
  location: String, // Keeping this for backward compatibility or as a combined field
  category: { type: String, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  status: { 
    type: String, 
    enum: ['OPEN', 'ASSIGNED', 'IN PROGRESS', 'PENDING USER CONFIRMATION', 'CLOSED', 'ON HOLD'], 
    default: 'OPEN' 
  },
  description: String,
  imageUrl: String,
  activities: [{
    action: String,
    user: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    imageUrl: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const WorkOrderSchema = new mongoose.Schema({
  woId: { type: String, required: true, unique: true },
  wrId: { type: String, ref: 'WorkRequest', required: true },
  category: String,
  assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  technicianName: String,
  status: { type: String, enum: ['ASSIGNED', 'IN PROGRESS', 'COMPLETED', 'ON HOLD'], default: 'ASSIGNED' },
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
export const WorkRequest = mongoose.model('WorkRequest', WorkRequestSchema);
export const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);
