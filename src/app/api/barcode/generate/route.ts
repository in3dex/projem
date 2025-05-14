import { NextRequest, NextResponse } from 'next/server';
import BwipJs from 'bwip-js'; // Tekrar bwip-js
import { z } from 'zod';

// Gelen isteği doğrulamak için şema
const barcodeQuerySchema = z.object({
  text: z.string().min(1, { message: "Barkod içeriği boş olamaz." }),
  type: z.string().min(1, { message: "Barkod tipi belirtilmelidir." }).default('code128'), // bwipjs küçük harf tercih eder
  includetext: z.preprocess((val) => String(val).toLowerCase() === 'true', z.boolean()).optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parametrelerini al ve doğrula
    const queryParams = {
      text: searchParams.get('text'),
      type: searchParams.get('type')?.toLowerCase() || 'code128', // Küçük harfe çevir
      includetext: searchParams.get('includetext'),
    };
    
    const validation = barcodeQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz parametreler.', details: validation.error.format() }, { status: 400 });
    }

    const { text, type, includetext } = validation.data;

    // Barkod oluştur (bwip-js ile)
    const pngBase64 = await new Promise<string>((resolve, reject) => {
      BwipJs.toBuffer({
        bcid: type, // Doğrudan küçük harfli tip
        text: text,               
        scale: 3,
        height: 15,                    
        includetext: includetext, 
        textxalign: 'center',
      }, (err, pngBuffer) => {
        if (err) {
          // bwipjs bilinen hataları kontrol et
          const errorMessage = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Bilinmeyen bwip-js hatası');
          console.error("bwip-js Error:", err); // Hatanın tamamını logla
          if (errorMessage.includes('Unknown barcode type')) {
            reject(new Error(`Bilinmeyen barkod tipi: ${type}`));
          } else {
            reject(new Error(errorMessage));
          }
        } else {
          resolve(`data:image/png;base64,${pngBuffer.toString('base64')}`);
        }
      });
    });

    // Base64 resmi yanıt olarak döndür
    return NextResponse.json({ barcodeImage: pngBase64 });

  } catch (error: unknown) {
    console.error("Barkod oluşturma API genel hata:", error);
    const message = error instanceof Error ? error.message : 'Barkod oluşturulurken bilinmeyen bir hata oluştu.';
    const status = (error instanceof Error && error.message.startsWith('Bilinmeyen barkod tipi')) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
} 