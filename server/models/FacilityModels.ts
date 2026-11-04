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

const AssetDocumentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['PPM Report', 'Service Report', 'License / Certificate', 'Calibration Report', 'Invoice', 'User Manual', 'Safety Certificate', 'Other'],
    default: 'Other' 
  },
  url: String, // Base64 data URI or file path
  fileSize: String,
  uploadDate: { type: Date, default: Date.now },
  expiryDate: Date,
  notes: String
});

const AssetSchema = new mongoose.Schema({
  no: { type: Number },
  assetName: { type: String, required: true },
  assetNo: { type: String, required: true, unique: true, index: true },
  serialNumber: { type: String },
  model: { type: String },
  manufacturerName: { type: String },
  supplierName: { type: String },
  supplierContactNo: { type: String },
  location: { type: String, required: true },
  department: { type: String },
  warrantyPeriod: { type: String },
  startOfWarranty: { type: Date },
  endOfWarranty: { type: Date, index: true },
  ppmFrequency: { type: String },
  ppm1Planned: { type: Date },
  ppm1Actual: { type: Date },
  ppm2Planned: { type: Date },
  ppm2Actual: { type: Date },
  ppm3Planned: { type: Date },
  ppm3Actual: { type: Date },
  ppm4Planned: { type: Date },
  ppm4Actual: { type: Date },
  ppm5Planned: { type: Date },
  ppm5Actual: { type: Date },
  ppm6Planned: { type: Date },
  ppm6Actual: { type: Date },
  poNo: { type: String },
  doNo: { type: String },
  invoiceNo: { type: String },
  totalAmount: { type: Number, default: 0 },
  lifespan: { type: String },
  assetCriticality: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  assetCategory: { type: String, default: 'Medical Equipment' },
  typeOfEquipmentSafety: { type: String },
  status: { type: String, enum: ['Active', 'Under Maintenance', 'In Repair', 'Decommissioned', 'Inactive'], default: 'Active' },
  licenseEndDate: { type: Date, index: true },
  documents: [AssetDocumentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Asset = mongoose.model('Asset', AssetSchema);

