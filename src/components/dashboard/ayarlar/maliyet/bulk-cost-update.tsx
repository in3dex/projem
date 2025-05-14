'use client';

import { useState, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface UploadResult {
  success: boolean;
  message: string;
  updatedCount?: number;
  notFoundBarcodes?: string[];
  details?: any; // Hata detayları için
}

export function BulkCostUpdate() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Sadece JSON dosyalarını kabul et
      if (file.type === 'application/json') {
        setSelectedFile(file);
        setUploadResult(null); // Yeni dosya seçildiğinde sonucu sıfırla
      } else {
        toast.error("Lütfen sadece .json uzantılı bir dosya seçin.");
        setSelectedFile(null);
        event.target.value = ''; // Dosya seçimini temizle
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning("Lütfen önce bir dosya seçin.");
      return;
    }

    setIsLoading(true);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result;
        if (typeof fileContent !== 'string') {
          throw new Error("Dosya içeriği okunamadı.");
        }
        const jsonData = JSON.parse(fileContent);

        // JSON formatını basitçe kontrol et (API daha detaylı kontrol edecek)
        if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
          throw new Error("JSON formatı hatalı. Beklenen format: { \"barkod\": maliyet, ... }");
        }

        // API'ye gönder
        const response = await fetch('/api/urunler/variants/bulk-cost-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonData),
        });

        const resultData = await response.json();

        if (!response.ok) {
          // API'den gelen hata mesajını göster
          throw new Error(resultData.error || resultData.details || `Sunucu hatası: ${response.status}`);
        }

        // Başarılı sonuç
        setUploadResult({ 
          success: true, 
          message: resultData.message, 
          updatedCount: resultData.updatedCount, 
          notFoundBarcodes: resultData.notFoundBarcodes 
        });
        toast.success(resultData.message || "Maliyetler başarıyla güncellendi!");

      } catch (error: any) {
        console.error("Toplu maliyet yükleme hatası:", error);
        setUploadResult({ success: false, message: error.message || "Bir hata oluştu." });
        toast.error(`Yükleme başarısız: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error("Dosya okunurken bir hata oluştu.");
      setIsLoading(false);
    };

    reader.readAsText(selectedFile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toplu Maliyet Güncelleme</CardTitle>
        <CardDescription>
          Ürün varyantlarınızın maliyetlerini JSON dosyası kullanarak toplu olarak güncelleyin.
          Dosya formatı <code>{'{ "barkod1": 123.45, "barkod2": 67.8, "barkod3": null }'}</code> şeklinde olmalıdır.
          Maliyeti boş bırakmak veya tanımsız yapmak için <code>null</code> değeri kullanabilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="cost-file">JSON Dosyası Seçin</Label>
          <Input 
            id="cost-file" 
            type="file" 
            accept=".json" 
            onChange={handleFileChange} 
            disabled={isLoading}
          />
        </div>

        <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Yükle ve Güncelle
        </Button>

        {/* Yükleme Sonucu */} 
        {uploadResult && (
          <Card className={cn(
            "mt-6",
            uploadResult.success ? "border-green-500" : "border-red-500"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-2",
                uploadResult.success ? "text-green-600" : "text-red-600"
              )}>
                {uploadResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {uploadResult.success ? "İşlem Başarılı" : "İşlem Başarısız"}
              </CardTitle>
              <CardDescription>{uploadResult.message}</CardDescription>
            </CardHeader>
            {uploadResult.success && (
              <CardContent className="space-y-2 text-sm">
                {typeof uploadResult.updatedCount === 'number' && (
                  <p>Başarıyla güncellenen maliyet sayısı: <strong>{uploadResult.updatedCount}</strong></p>
                )}
                {uploadResult.notFoundBarcodes && uploadResult.notFoundBarcodes.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1 font-medium text-orange-600">
                       <AlertTriangle className="h-4 w-4"/> Bulunamayan veya Yetkisiz Barkodlar ({uploadResult.notFoundBarcodes.length}):
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground text-xs pl-4 max-h-32 overflow-y-auto">
                      {uploadResult.notFoundBarcodes.map(barcode => <li key={barcode}>{barcode}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </CardContent>
    </Card>
  );
} 