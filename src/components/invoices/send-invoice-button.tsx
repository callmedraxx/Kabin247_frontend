"use client"

import * as React from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Send, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createInvoice, sendInvoiceEmail, CreateInvoiceRequest, Invoice } from "@/lib/invoice-api"
import { toast } from "sonner"

interface SendInvoiceButtonProps {
  orderId: number
  orderNumber: string
  orderTotal: number
  clientEmail?: string
  onInvoiceCreated?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SendInvoiceButton({
  orderId,
  orderNumber,
  orderTotal,
  clientEmail,
  onInvoiceCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SendInvoiceButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [deliveryMethod, setDeliveryMethod] = useState<'EMAIL' | 'SHARE_MANUALLY'>('EMAIL')
  const [recipientEmail, setRecipientEmail] = useState(clientEmail || '')
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null)

  const handleCreateInvoice = async () => {
    if (deliveryMethod === 'EMAIL' && !recipientEmail) {
      setError('Recipient email is required for Square Email delivery')
      return
    }

    setError(null)
    setCreating(true)

    try {
      const request: CreateInvoiceRequest = {
        delivery_method: deliveryMethod,
        recipient_email: deliveryMethod === 'SHARE_MANUALLY' ? recipientEmail : undefined,
      }

      const result = await createInvoice(orderId, request)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create invoice')
      }

      setCreatedInvoice(result.invoice || null)

      if (deliveryMethod === 'EMAIL') {
        toast.success('Invoice created and sent via Square email', {
          description: `Invoice sent to ${recipientEmail}`,
        })
        setOpen(false)
        onInvoiceCreated?.()
      } else {
        toast.success('Invoice created successfully', {
          description: 'Click "Send Email" to send the invoice link',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice')
      toast.error('Failed to create invoice', {
        description: err.message || 'Please try again',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSendEmail = async () => {
    if (!createdInvoice || !recipientEmail) {
      setError('Recipient email is required')
      return
    }

    setError(null)
    setSending(true)

    try {
      const result = await sendInvoiceEmail(orderId, {
        invoice_id: createdInvoice.id,
        recipient_email: recipientEmail,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email')
      }

      toast.success('Invoice email sent successfully', {
        description: `Email sent to ${recipientEmail}`,
      })
      setOpen(false)
      onInvoiceCreated?.()
    } catch (err: any) {
      setError(err.message || 'Failed to send email')
      toast.error('Failed to send email', {
        description: err.message || 'Please try again',
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setError(null)
      setCreatedInvoice(null)
      setDeliveryMethod('EMAIL')
      setRecipientEmail(clientEmail || '')
    }
  }

  const handleOpen = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          type="button"
          onClick={(e) => handleOpen(e)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Send Invoice
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Create and send an invoice for Order #{orderNumber}
            </DialogDescription>
          </DialogHeader>

          {!createdInvoice ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Amount</span>
                  <span className="text-lg font-bold">${orderTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <Select
                  value={deliveryMethod}
                  onValueChange={(value) => {
                    setDeliveryMethod(value as 'EMAIL' | 'SHARE_MANUALLY')
                    setError(null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Square Email (Square sends directly)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SHARE_MANUALLY">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Custom Email (We send via our system)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Recipient Email {deliveryMethod === 'EMAIL' && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value)
                    setError(null)
                  }}
                />
              </div>

              {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-destructive mb-1">Error</div>
                        <div className="text-sm text-destructive/80">{error}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                        Invoice Created Successfully
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deliveryMethod === 'EMAIL' 
                          ? 'Square has sent the invoice email to the recipient.'
                          : 'Invoice created. You can now send the payment link via email.'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {deliveryMethod === 'SHARE_MANUALLY' && createdInvoice.public_url && (
                <div className="space-y-2">
                  <Label>Payment Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdInvoice.public_url}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(createdInvoice.public_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this link or click "Send Email" to send it via our email system.
                  </p>
                </div>
              )}

              {deliveryMethod === 'SHARE_MANUALLY' && (
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-destructive mb-1">Error</div>
                        <div className="text-sm text-destructive/80">{error}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={creating || sending}>
              {createdInvoice ? 'Close' : 'Cancel'}
            </Button>
            {!createdInvoice ? (
              <Button type="button" onClick={handleCreateInvoice} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
            ) : deliveryMethod === 'SHARE_MANUALLY' ? (
              <Button type="button" onClick={handleSendEmail} disabled={sending || !recipientEmail}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

