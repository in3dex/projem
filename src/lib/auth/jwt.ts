import { SignJWT, jwtVerify } from 'jose';
import { User } from '@prisma/client';

// JWT token payload tipi
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// JWT Secret key
const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-buraya-gelecek';
const EXPIRATION = '7d'; // 7 gün

// Secret key'i TextEncoder ile Buffer'a dönüştür
const getSecret = () => new TextEncoder().encode(JWT_SECRET);

/**
 * Kullanıcı için JWT token oluşturur
 */
export async function createToken(user: User): Promise<string> {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(getSecret());

  return token;
}

/**
 * JWT token'ı doğrular ve payload'ı döndürür
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    return null;
  }
}

/**
 * Cookie'den token okur
 */
export function getTokenFromCookie(cookies: string): string | null {
  if (!cookies) return null;
  
  const tokenCookie = cookies
    .split(';')
    .find(cookie => cookie.trim().startsWith('token='));
  
  if (!tokenCookie) return null;
  
  return decodeURIComponent(tokenCookie.split('=')[1]);
}

/**
 * Token için cookie oluşturur
 */
export function createCookie(token: string): string {
  // HTTP-only cookie, sadece HTTPS üzerinden erişilebilir (production'da)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // 7 gün geçerli
  const maxAge = 7 * 24 * 60 * 60;
  
  return `token=${token}; Path=/; HttpOnly; Max-Age=${maxAge}${secure}; SameSite=Lax`;
} 