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
