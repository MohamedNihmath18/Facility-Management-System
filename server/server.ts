import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import facilityRoutes from './routes/FacilityRoutes.ts';
import { User, WorkRequest, Category } from './models/FacilityModels.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // CORS Configuration
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      if (
        allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === origin) ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost')
      ) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI;
  let isDbConnected = false;

  if (MONGODB_URI) {
    const maskedUri = MONGODB_URI.replace(/\/\/.*@/, '//****:****@');
    console.log(`📡 Attempting to connect to MongoDB: ${maskedUri}`);
    
    mongoose.connect(MONGODB_URI)
      .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        isDbConnected = true;
        seedData().catch(err => console.error('❌ Seeding error:', err));
      })
      .catch(err => {
        isDbConnected = false;
        console.error('❌ MongoDB connection error:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
          console.error('   CRITICAL: MongoDB connection refused. Ensure your MONGODB_URI is correct and accessible.');
        }
      });
  } else {
    console.warn('⚠️ MONGODB_URI not found in environment variables.');
  }

  app.use(express.json({ limit: '50mb' }));

  // Middleware to check DB connection for API routes
  app.use('/api', (req, res, next) => {
    if (!isDbConnected) {
      if (req.method === 'GET') {
        return res.status(503).json({ 
          error: 'Database connection unavailable',
          details: 'The server is running but cannot connect to MongoDB. Please check your MONGODB_URI secret.'
        });
      }
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        details: 'Write operations are disabled without a database connection. Please configure MONGODB_URI.'
      });
    }
    next();
  });

  // API Routes
  app.use('/api', facilityRoutes);

  // Seed Data Function (only creates default users and categories if DB collections are empty)
  async function seedData() {
    try {
      // 1. Seed Users if empty
      const userCount = await User.countDocuments();
      console.log(`📊 Current user count: ${userCount}`);
      if (userCount === 0) {
        console.log('🌱 Seeding initial users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        await User.create([
          {
            name: 'Supervisor Mark',
            username: 'admin',
            email: 'mark@mahsa.edu.my',
            password: hashedPassword,
            role: 'admin',
            department: 'Facilities',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark'
          },
          {
            name: 'Facility Manager Alex',
            username: 'manager',
            email: 'alex@mahsa.edu.my',
            password: hashedPassword,
            role: 'manager',
            department: 'Management',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
          },
          {
            name: 'Mike Johnson',
            username: 'mike',
            email: 'mike@mahsa.edu.my',
            password: hashedPassword,
            role: 'technician',
            department: 'Medical Equipment',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
          }
        ]);
        console.log('✅ Initial users seeded');
      }

      // 2. Seed Categories if empty
      const catCount = await Category.countDocuments();
      console.log(`📊 Current category count: ${catCount}`);
      if (catCount === 0) {
        console.log('🌱 Initializing system categories...');
        const initialCategories = [
          { name: 'Medical Equipment', description: 'Biomedical devices and clinical equipment' },
          { name: 'HVAC', description: 'Air conditioning, ventilation, and chiller systems' },
          { name: 'Electrical', description: 'Power supply, wiring, distribution panels, and lighting' },
          { name: 'Plumbing', description: 'Water supply, drainage, sanitary fixtures, and piping' },
          { name: 'IT Infrastructure', description: 'Hardware, networking, telephony, and access control' },
          { name: 'Furniture', description: 'Beds, tables, cabinets, chairs, and office furniture' },
          { name: 'Leakage', description: 'Water leakages, roof leaks, and pipe bursts' },
          { name: 'Pneumatic Tube', description: 'Hospital pneumatic tube delivery station and carrier systems' },
          { name: 'Card Access', description: 'Electronic door locks and access reader systems' },
          { name: 'Medical Gas', description: 'Oxygen, nitrous oxide, medical air, and vacuum lines' },
          { name: 'Door, Floor, Window, Paint, Ceiling', description: 'General building structural repairs and maintenance' },
          { name: 'Lift & Escalator', description: 'Elevators, dumbwaiters, and passenger escalators' },
          { name: 'Event', description: 'Audio-visual setup, event staging, and logistics' },
          { name: 'Civil & Structural', description: 'Structural walls, roadways, masonry, and civil engineering' },
          { name: 'Fire Protection', description: 'Fire alarms, smoke detectors, sprinklers, and extinguishers' }
        ];

        // Also sync any distinct categories from existing work requests
        try {
          const distinctFromWRs = await WorkRequest.distinct('category');
          const existingNames = new Set(initialCategories.map(c => c.name));
          for (const catName of distinctFromWRs) {
            if (catName && !existingNames.has(catName)) {
              initialCategories.push({ name: catName, description: `${catName} category` });
              existingNames.add(catName);
            }
          }
        } catch (e) {
          console.warn('Could not read distinct categories from work requests');
        }

        await Category.insertMany(initialCategories);
        console.log(`✅ Initialized ${initialCategories.length} categories`);
      }
    } catch (err: any) {
      console.error('❌ Seed data failed:', err.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
