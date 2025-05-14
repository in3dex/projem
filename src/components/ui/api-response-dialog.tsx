"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ApiResponseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  response: any
}

export function ApiResponseDialog({
  open,
  onOpenChange,
  title,
  description,
  response
}: ApiResponseDialogProps) {
  const formattedResponse = JSON.stringify(response, null, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="h-[60vh] rounded-md border p-4 bg-secondary/20">
          <pre className="font-mono text-xs text-secondary-foreground whitespace-pre overflow-x-auto">
            {formattedResponse}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 