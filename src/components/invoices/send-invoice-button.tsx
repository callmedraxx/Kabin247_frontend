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
import { Loader2, Mail, Send, AlertCircle, CheckCircle2, ExternalLink, X, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { createInvoice, sendInvoiceEmail, CreateInvoiceRequest, Invoice } from "@/lib/invoice-api"
import { toast } from "sonner"

interface SendInvoiceButtonProps {
  orderId: number
  orderNumber: string
  orderTotal: number
  clientEmail?: string
  clientAdditionalEmails?: string[]
  onInvoiceCreated?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SendInvoiceButton({
  orderId,
  orderNumber,
  orderTotal,
  clientEmail,
  clientAdditionalEmails = [],
  onInvoiceCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SendInvoiceButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [deliveryMethod, setDeliveryMethod] = useState<'EMAIL' | 'SHARE_MANUALLY'>('EMAIL')
  const [recipientEmail, setRecipientEmail] = useState(clientEmail || '')
  const [selectedClientEmails, setSelectedClientEmails] = useState<Set<string>>(new Set())
  const [manualEmails, setManualEmails] = useState<string[]>([])
  const [newEmailInput, setNewEmailInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null)
  const [additionalEmailsResult, setAdditionalEmailsResult] = useState<{ sentTo: string[]; failed: Array<{ email: string; error: string }> } | null>(null)

  const handleCreateInvoice = async () => {
    if (deliveryMethod === 'EMAIL' && !recipientEmail) {
      setError('Recipient email is required for Square Email delivery')
      return
    }

    setError(null)
    setCreating(true)

    try {
      // Collect all additional emails
      const additionalEmails: string[] = []
      
      // Add selected client additional emails
      selectedClientEmails.forEach(email => {
        if (email && email.trim() && email !== recipientEmail) {
          additionalEmails.push(email.trim())
        }
      })
      
      // Add manual emails
      manualEmails.forEach(email => {
        if (email && email.trim() && email !== recipientEmail && !additionalEmails.includes(email.trim())) {
          additionalEmails.push(email.trim())
        }
      })

      const request: CreateInvoiceRequest = {
        delivery_method: deliveryMethod,
        recipient_email: recipientEmail || undefined,
        additional_emails: additionalEmails.length > 0 ? additionalEmails : undefined,
      }

      const result = await createInvoice(orderId, request)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create invoice')
      }

      // Merge public_url from response into invoice object
      const invoiceWithUrl = result.invoice 
        ? { ...result.invoice, public_url: result.public_url || result.invoice.public_url }
        : null
      setCreatedInvoice(invoiceWithUrl)
      setAdditionalEmailsResult({
        sentTo: result.additional_emails_sent || [],
        failed: result.additional_emails_failed || [],
      })

      const additionalEmailsMessage = additionalEmails.length > 0
        ? ` Payment links sent to ${result.additional_emails_sent?.length || 0} additional recipient(s).`
        : ''

      if (deliveryMethod === 'EMAIL') {
        toast.success('Invoice created and sent via Square email', {
          description: `Invoice sent to ${recipientEmail}.${additionalEmailsMessage}`,
        })
        if (additionalEmails.length === 0) {
          setOpen(false)
          onInvoiceCreated?.()
        }
      } else {
        toast.success('Invoice created successfully', {
          description: 'Click "Send Email" to send the invoice link.' + additionalEmailsMessage,
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

  const handleAddManualEmail = () => {
    if (!newEmailInput || !newEmailInput.trim()) {
      return
    }

    const email = newEmailInput.trim().toLowerCase()
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    // Check if email already exists
    if (manualEmails.includes(email) || selectedClientEmails.has(email) || email === recipientEmail) {
      setError('This email is already added')
      return
    }

    setManualEmails([...manualEmails, email])
    setNewEmailInput('')
    setError(null)
  }

  const handleRemoveManualEmail = (email: string) => {
    setManualEmails(manualEmails.filter(e => e !== email))
  }

  const handleToggleClientEmail = (email: string) => {
    const newSet = new Set(selectedClientEmails)
    if (newSet.has(email)) {
      newSet.delete(email)
    } else {
      newSet.add(email)
    }
    setSelectedClientEmails(newSet)
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
      setSelectedClientEmails(new Set())
      setManualEmails([])
      setNewEmailInput('')
      setAdditionalEmailsResult(null)
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
                  Primary Recipient Email {deliveryMethod === 'EMAIL' && <span className="text-destructive">*</span>}
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

              {/* Additional Recipients Section */}
              <div className="space-y-3">
                <Label>Additional Recipients</Label>
                <p className="text-xs text-muted-foreground">
                  Additional recipients will receive the payment link via our custom email system.
                </p>

                {/* Client Additional Emails */}
                {clientAdditionalEmails.length > 0 && (
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                      From Client Record:
                    </Label>
                    <div className="space-y-2">
                      {clientAdditionalEmails.map((email) => (
                        <div key={email} className="flex items-center space-x-2">
                          <Checkbox
                            id={`client-email-${email}`}
                            checked={selectedClientEmails.has(email)}
                            onCheckedChange={() => handleToggleClientEmail(email)}
                          />
                          <Label
                            htmlFor={`client-email-${email}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {email}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Email Entry */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Add more emails:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="extra@email.com"
                      value={newEmailInput}
                      onChange={(e) => {
                        setNewEmailInput(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddManualEmail()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddManualEmail}
                      disabled={!newEmailInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Manual Emails List */}
                {manualEmails.length > 0 && (
                  <div className="space-y-1">
                    {manualEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-2 rounded border bg-background"
                      >
                        <span className="text-sm">{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManualEmail(email)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                          ? 'Square has sent the invoice email to the primary recipient.'
                          : 'Invoice created. You can now send the payment link via email.'}
                      </div>
                      {additionalEmailsResult && additionalEmailsResult.sentTo.length > 0 && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                          Payment links sent to {additionalEmailsResult.sentTo.length} additional recipient(s): {additionalEmailsResult.sentTo.join(', ')}
                        </div>
                      )}
                      {additionalEmailsResult && additionalEmailsResult.failed.length > 0 && (
                        <div className="mt-2 text-sm text-destructive">
                          Failed to send to {additionalEmailsResult.failed.length} recipient(s). Check logs for details.
                        </div>
                      )}
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

