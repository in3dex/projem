"use client";

import { useState } from "react";
import Link from "next/link";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, subject: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // TODO: Gerçek API çağrısı eklenecek (örneğin /api/contact-form)
    // Şimdilik sadece bir gecikme ve toast mesajı ile simüle ediliyor.
    try {
      // Örnek API çağrısı:
      // const response = await fetch('/api/contact-form', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      // if (!response.ok) throw new Error('Mesaj gönderilemedi');
      // const result = await response.json();
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simülasyon
      toast.success("Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 sm:p-8 rounded-lg shadow-sm">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Bize Mesaj Gönderin</h2>
        <p className="text-sm text-muted-foreground">
          Formu doldurarak bize mesaj gönderebilirsiniz. En kısa sürede size dönüş yapacağız.
        </p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Adınız Soyadınız</Label>
          <Input 
            id="name" 
            name="name" 
            placeholder="Adınız Soyadınız" 
            required 
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Adresiniz</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="ornek@email.com" 
            required 
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon Numaranız (Opsiyonel)</Label>
          <Input 
            id="phone" 
            name="phone" 
            placeholder="0500 000 00 00" 
            value={formData.phone}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Konu</Label>
          <Select onValueChange={handleSelectChange} value={formData.subject} disabled={loading}>
            <SelectTrigger id="subject" name="subject">
              <SelectValue placeholder="Konu seçiniz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="genel-bilgi">Genel Bilgi</SelectItem>
              <SelectItem value="satis">Satış Bilgisi</SelectItem>
              <SelectItem value="teknik-destek">Teknik Destek</SelectItem>
              <SelectItem value="isbirligi">İşbirliği</SelectItem>
              <SelectItem value="diger">Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="message">Mesajınız</Label>
        <Textarea 
          id="message" 
          name="message" 
          placeholder="Mesajınızı buraya yazınız" 
          rows={5} 
          required 
          value={formData.message}
          onChange={handleChange}
          disabled={loading}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gönderiliyor...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Mesajı Gönder <SendIcon className="h-4 w-4" />
          </span>
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center mt-2">
        Formu göndererek <Link href="/gizlilik-politikasi" className="underline hover:text-primary">Gizlilik Politikamızı</Link> ve <Link href="/kullanim-kosullari" className="underline hover:text-primary">Kullanım Koşullarımızı</Link> kabul etmiş olursunuz.
      </p>
    </form>
  );
} 