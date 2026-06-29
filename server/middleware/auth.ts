import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../../src/db/index.ts';
import { admins } from '../../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  isAdmin?: boolean;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Check if user is in admins table
    let admin = null;
    try {
      // First try Drizzle
      const result = await db.select().from(admins).where(eq(admins.webUid, decodedToken.uid));
      admin = result[0];
    } catch (dbError: any) {
      console.error('⚠️ Drizzle Admin Check Error:', dbError.message);
      
      // Fallback: Raw SQL check to see if table even exists
      try {
        const tableCheck = await db.execute(sql`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins'`);
        if (tableCheck.rows.length === 0) {
           console.error('❌ CRITICAL: "admins" table is MISSING from the database.');
        } else {
           console.log('✅ "admins" table exists, Drizzle query failed for another reason.');
        }
      } catch (e: any) {
        console.error('❌ DB connection failed entirely during admin check:', e.message);
      }
    }
    
    req.isAdmin = !!admin;

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
};
