'use client'

import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export function SubscriptionAlert() {
  return (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]"> 
      <Alert variant="destructive" className="max-w-lg">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Aktif Abonelik Gerekli</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Bu sayfaya erişmek veya bu özelliği kullanmak için aktif bir aboneliğe sahip olmanız gerekmektedir.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/ayarlar/abonelik">Abonelik Planlarını İncele</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
} 