import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { gugusSecrets, supervisorSecrets } from '@/lib/authSecrets';

const SERVER_SECRET = process.env.SERVER_SECRET || 'koryandik-cibadak-secret-key-2026';

function signToken(sessionUser: any): string {
  const payloadStr = JSON.stringify(sessionUser);
  const payload = Buffer.from(payloadStr).toString('base64');
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payloadStr).digest('hex');
  return `${payload}:${signature}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role, identifier, passcode, sessionData } = body;

    let isValid = false;
    let finalSessionData = sessionData || {};

    if (role === 'school') {
      // passcode should match NPSN (identifier)
      if (passcode === identifier) {
        isValid = true;
      }
    } else if (role === 'gugus') {
      const g = gugusSecrets.find(g => g.id === identifier);
      if (g && g.passcode === passcode) {
        isValid = true;
      }
    } else if (['pengawas', 'kkks', 'pgri'].includes(role)) {
      const sup = supervisorSecrets.find(s => s.role === role);
      if (sup && sup.passcode === passcode) {
        isValid = true;
      }
    } else if (role === 'admin') {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminSup = supervisorSecrets.find(s => s.role === 'admin');
      
      if (adminSup && identifier === 'admin' && passcode === adminSup.passcode) {
         isValid = true;
      } else if (identifier === adminUsername && passcode === adminPassword) {
         isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = signToken(finalSessionData);
    
    return NextResponse.json({
      success: true,
      token,
      user: finalSessionData
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
