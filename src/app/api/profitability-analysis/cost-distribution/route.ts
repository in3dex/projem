// import { getTokenFromCookie, verifyToken } from '@/lib/auth/jwt'; // KALDIRILDI
import { auth } from '@/lib/auth/auth'; // auth import edildi
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// API Yanıt Tipi (Export kaldırıldı, src/types/analysis.ts'den import edilecek)
interface CostDistributionDataPoint {
  name: string; 
  value: number; 
} 

export async function GET(request: NextRequest) {
    try {
        const session = await auth(); // auth() kullanıldı
        if (!session?.user?.id) { // Oturum veya kullanıcı ID yoksa yetkisiz
            return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
        }
        const userId = session.user.id; // userId oturumdan alındı

        // ... (rest of the function using userId) ...

    } catch (error) {
        // ... existing error handling ...
    }
} 