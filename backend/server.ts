import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import facilityRoutes from './routes/FacilityRoutes.ts';
import { User, WorkRequest, Asset } from './models/FacilityModels.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI;
  let isDbConnected = false;

  if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
      .then(() => {
        console.log('✅ Connected to MongoDB');
        isDbConnected = true;
        seedData().catch(err => console.error('❌ Seeding error:', err));
      })
      .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('Running in limited mode without database persistence.');
      });
  } else {
    console.warn('⚠️ MONGODB_URI not found in environment variables.');
  }

  app.use(express.json({ limit: '50mb' }));

  // Middleware to check DB connection for API routes
  app.use('/api', (req, res, next) => {
    if (!isDbConnected && req.method !== 'GET') {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        details: 'Please ensure MongoDB is running and MONGODB_URI is configured.'
      });
    }
    next();
  });

  // API Routes
  app.use('/api', facilityRoutes);

  // Seed Data Function
  async function seedData() {
    try {
      const userCount = await User.countDocuments();
      console.log(`📊 Current user count: ${userCount}`);
      if (userCount === 0) {
        console.log('🌱 Seeding initial data...');
        
        const hashedPassword = await bcrypt.hash('password123', 10);

        const admin = await User.create({
          name: 'Supervisor Mark',
          username: 'admin',
          email: 'mark@mahsa.edu.my',
          password: hashedPassword,
          role: 'admin',
          department: 'Facilities',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark'
        });

        const manager = await User.create({
          name: 'Facility Manager Alex',
          username: 'manager',
          email: 'alex@mahsa.edu.my',
          password: hashedPassword,
          role: 'manager',
          department: 'Management',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
        });

        const tech = await User.create({
          name: 'Mike Johnson',
          username: 'mike',
          email: 'mike@mahsa.edu.my',
          password: hashedPassword,
          role: 'technician',
          department: 'Medical Equipment',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
        });

        await WorkRequest.create([
          {
            wrId: 'WR-2026-001',
            userId: admin._id,
            userName: 'Dr. Sarah Ahmad',
            department: 'Cardiology',
            block: 'Block A',
            floor: '3rd Floor',
            room: 'Room 305',
            location: 'Block A, 3rd Floor, Room 305',
            category: 'Medical Equipment',
            priority: 'CRITICAL',
            status: 'IN PROGRESS',
            description: 'Defibrillator not charging'
          },
          {
            wrId: 'WR-2026-002',
            userId: admin._id,
            userName: 'Nurse Maria Santos',
            department: 'Emergency',
            block: 'Block B',
            floor: '1st Floor',
            room: 'ER-2',
            location: 'Block B, 1st Floor, ER-2',
            category: 'HVAC',
            priority: 'HIGH',
            status: 'ASSIGNED',
            description: 'AC leaking water'
          }
        ]);
        console.log('✅ Seeding complete');
      }

      // Seed Assets if empty
      const assetCount = await Asset.countDocuments();
      console.log(`📊 Current asset count: ${assetCount}`);
      if (assetCount === 0) {
        console.log('🌱 Seeding initial assets...');
        await Asset.create([
          {
            no: 1,
            assetName: 'GE Healthcare Vivid E95 Ultrasound',
            assetNo: 'AST-MED-001',
            serialNumber: 'SN-GE-9832104',
            model: 'Vivid E95 4D',
            manufacturerName: 'GE Healthcare',
            supplierName: 'GE Medical Systems Malaysia Sdn Bhd',
            supplierContactNo: '+60 3-2273 9000',
            location: 'Block A, 3rd Floor, Room 305 (Cardiology)',
            department: 'Cardiology',
            warrantyPeriod: '36 Months',
            startOfWarranty: new Date('2024-11-20'),
            endOfWarranty: new Date('2026-11-20'), // Expires in 16 days!
            ppmFrequency: 'Quarterly',
            ppm1Planned: new Date('2025-02-15'),
            ppm1Actual: new Date('2025-02-14'),
            ppm2Planned: new Date('2025-05-15'),
            ppm2Actual: new Date('2025-05-15'),
            ppm3Planned: new Date('2025-08-15'),
            ppm3Actual: new Date('2025-08-16'),
            ppm4Planned: new Date('2025-11-15'),
            ppm4Actual: new Date('2025-11-14'),
            ppm5Planned: new Date('2026-02-15'),
            ppm5Actual: new Date('2026-02-16'),
            ppm6Planned: new Date('2026-11-18'), // Due in 14 days!
            ppm6Actual: null,
            poNo: 'PO-2024-0891',
            doNo: 'DO-2024-1102',
            invoiceNo: 'INV-GE-88421',
            totalAmount: 285000,
            lifespan: '8 Years',
            assetCriticality: 'Critical',
            assetCategory: 'Medical Equipment',
            typeOfEquipmentSafety: 'Class I Type BF',
            status: 'Active',
            licenseEndDate: new Date('2026-11-28'), // License expires in 24 days!
            documents: [
              {
                id: 'DOC-INIT-001',
                name: 'GE Vivid E95 User & Service Manual.pdf',
                type: 'User Manual',
                url: '#',
                fileSize: '4.2 MB',
                uploadDate: new Date('2024-11-21'),
                notes: 'Official operator guide from GE'
              },
              {
                id: 'DOC-INIT-002',
                name: 'MDA Operating License Certificate 2025-2026.pdf',
                type: 'License / Certificate',
                url: '#',
                fileSize: '1.1 MB',
                uploadDate: new Date('2025-11-28'),
                expiryDate: new Date('2026-11-28'),
                notes: 'Medical Device Authority Malaysia Certification'
              }
            ]
          },
          {
            no: 2,
            assetName: 'Philips IntelliVue MX700 Patient Monitor',
            assetNo: 'AST-MED-002',
            serialNumber: 'PH-MX7-448102',
            model: 'IntelliVue MX700',
            manufacturerName: 'Philips Healthcare',
            supplierName: 'IDS Medical Systems Malaysia',
            supplierContactNo: '+60 3-7965 2888',
            location: 'Block B, 1st Floor, ER-2 (Emergency)',
            department: 'Emergency',
            warrantyPeriod: '24 Months',
            startOfWarranty: new Date('2025-01-10'),
            endOfWarranty: new Date('2027-01-10'),
            ppmFrequency: 'Semi-Annual',
            ppm1Planned: new Date('2025-07-10'),
            ppm1Actual: new Date('2025-07-09'),
            ppm2Planned: new Date('2026-01-10'),
            ppm2Actual: new Date('2026-01-12'),
            ppm3Planned: new Date('2026-11-15'), // Due in 11 days!
            ppm3Actual: null,
            ppm4Planned: new Date('2027-05-10'),
            poNo: 'PO-2025-0120',
            doNo: 'DO-2025-0145',
            invoiceNo: 'INV-IDS-9921',
            totalAmount: 64000,
            lifespan: '7 Years',
            assetCriticality: 'High',
            assetCategory: 'Medical Equipment',
            typeOfEquipmentSafety: 'Class I Type CF',
            status: 'Active',
            licenseEndDate: new Date('2027-01-10'),
            documents: [
              {
                id: 'DOC-INIT-003',
                name: 'PPM Calibration Certificate Round 2.pdf',
                type: 'Calibration Report',
                url: '#',
                fileSize: '850 KB',
                uploadDate: new Date('2026-01-12'),
                notes: 'Annual calibration check passed'
              }
            ]
          },
          {
            no: 3,
            assetName: 'Mindray BeneHeart D6 Defibrillator',
            assetNo: 'AST-MED-003',
            serialNumber: 'MR-D6-781920',
            model: 'BeneHeart D6',
            manufacturerName: 'Mindray Bio-Medical',
            supplierName: 'Transmedic Healthcare Sdn Bhd',
            supplierContactNo: '+60 3-5638 1288',
            location: 'Block A, 2nd Floor, ICU Bed 4',
            department: 'ICU',
            warrantyPeriod: '24 Months',
            startOfWarranty: new Date('2024-12-01'),
            endOfWarranty: new Date('2026-12-01'), // Expires in 27 days!
            ppmFrequency: 'Quarterly',
            ppm1Planned: new Date('2025-03-01'),
            ppm1Actual: new Date('2025-03-02'),
            ppm2Planned: new Date('2025-06-01'),
            ppm2Actual: new Date('2025-06-01'),
            ppm3Planned: new Date('2025-09-01'),
            ppm3Actual: new Date('2025-09-03'),
            ppm4Planned: new Date('2025-12-01'),
            ppm4Actual: new Date('2025-12-01'),
            ppm5Planned: new Date('2026-03-01'),
            ppm5Actual: new Date('2026-03-01'),
            ppm6Planned: new Date('2026-11-25'), // PPM due in 21 days!
            ppm6Actual: null,
            poNo: 'PO-2024-1104',
            doNo: 'DO-2024-1240',
            invoiceNo: 'INV-TM-4410',
            totalAmount: 48500,
            lifespan: '7 Years',
            assetCriticality: 'Critical',
            assetCategory: 'Medical Equipment',
            typeOfEquipmentSafety: 'Class I Type BF (Defibrillation-proof)',
            status: 'Active',
            licenseEndDate: new Date('2026-11-30'), // License expires in 26 days!
            documents: []
          },
          {
            no: 4,
            assetName: 'Daikin VRV IV Air Handling Unit (AHU-OT1)',
            assetNo: 'AST-FAC-001',
            serialNumber: 'DK-AHU-2023-8812',
            model: 'VRV IV RXYQ16T',
            manufacturerName: 'Daikin Malaysia',
            supplierName: 'Daikin Malaysia Sales Sdn Bhd',
            supplierContactNo: '+60 3-7953 8388',
            location: 'Operation Theater Complex - Level 4 AHU Room',
            department: 'Facilities',
            warrantyPeriod: '36 Months',
            startOfWarranty: new Date('2024-03-15'),
            endOfWarranty: new Date('2027-03-15'),
            ppmFrequency: 'Bi-Monthly',
            ppm1Planned: new Date('2024-05-15'),
            ppm1Actual: new Date('2024-05-14'),
            ppm2Planned: new Date('2024-07-15'),
            ppm2Actual: new Date('2024-07-15'),
            ppm3Planned: new Date('2024-09-15'),
            ppm3Actual: new Date('2024-09-15'),
            ppm4Planned: new Date('2024-11-15'),
            ppm4Actual: new Date('2024-11-16'),
            ppm5Planned: new Date('2025-01-15'),
            ppm5Actual: new Date('2025-01-15'),
            ppm6Planned: new Date('2026-11-12'), // PPM due in 8 days!
            ppm6Actual: null,
            poNo: 'PO-2024-0210',
            doNo: 'DO-2024-0305',
            invoiceNo: 'INV-DK-11892',
            totalAmount: 112000,
            lifespan: '15 Years',
            assetCriticality: 'High',
            assetCategory: 'HVAC',
            typeOfEquipmentSafety: 'Electrical Safety Standard IEC 60335',
            status: 'Active',
            licenseEndDate: new Date('2027-03-15'),
            documents: []
          },
          {
            no: 5,
            assetName: 'Schneider Electric Galaxy 300 40kVA UPS',
            assetNo: 'AST-ELE-001',
            serialNumber: 'SE-G300-9941',
            model: 'Galaxy 300 40kVA',
            manufacturerName: 'Schneider Electric',
            supplierName: 'Schneider Electric Malaysia Sdn Bhd',
            supplierContactNo: '+60 3-7883 6000',
            location: 'Main Server Room - Basement 1',
            department: 'IT Infrastructure',
            warrantyPeriod: '36 Months',
            startOfWarranty: new Date('2024-08-01'),
            endOfWarranty: new Date('2027-08-01'),
            ppmFrequency: 'Quarterly',
            ppm1Planned: new Date('2024-11-01'),
            ppm1Actual: new Date('2024-11-01'),
            ppm2Planned: new Date('2025-02-01'),
            ppm2Actual: new Date('2025-02-01'),
            ppm3Planned: new Date('2025-05-01'),
            ppm3Actual: new Date('2025-05-02'),
            ppm4Planned: new Date('2025-08-01'),
            ppm4Actual: new Date('2025-08-01'),
            ppm5Planned: new Date('2025-11-01'),
            ppm5Actual: new Date('2025-11-01'),
            ppm6Planned: new Date('2026-12-05'),
            ppm6Actual: null,
            poNo: 'PO-2024-0711',
            doNo: 'DO-2024-0790',
            invoiceNo: 'INV-SE-9081',
            totalAmount: 78000,
            lifespan: '10 Years',
            assetCriticality: 'High',
            assetCategory: 'Electrical',
            typeOfEquipmentSafety: 'Class I (Grounded)',
            status: 'Active',
            licenseEndDate: new Date('2027-08-01'),
            documents: []
          }
        ]);
        console.log('✅ Seeded initial assets complete');
      }

    } catch (err: any) {
      console.error('❌ Seed data failed:', err.message);
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
