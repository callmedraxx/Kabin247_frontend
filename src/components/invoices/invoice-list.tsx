"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  Copy,
  Loader2
} from "lucide-react"
import { Invoice, getInvoices, sendInvoiceEmail, cancelInvoice } from "@/lib/invoice-api"
import { toast } from "sonner"
// Date formatting helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface InvoiceListProps {
  orderId: number
  onInvoiceUpdate?: () => void
}

export function InvoiceList({ orderId, onInvoiceUpdate }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<number | null>(null)

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await getInvoices(orderId)
      setInvoices(data)
    } catch (error: any) {
      toast.error('Failed to load invoices', {
        description: error.message || 'Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [orderId])

  const handleResend = async (invoice: Invoice, email: string) => {
    if (!email) {
      toast.error('Recipient email is required')
      return
    }

    setSending(invoice.id)
    try {
      const result = await sendInvoiceEmail(orderId, {
        invoice_id: invoice.id,
        recipient_email: email,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email')
      }

      toast.success('Invoice email sent successfully', {
        description: `Email sent to ${email}`,
      })
      onInvoiceUpdate?.()
      loadInvoices()
    } catch (error: any) {
      toast.error('Failed to send email', {
        description: error.message || 'Please try again',
      })
    } finally {
      setSending(null)
    }
  }

  const handleCancel = async (invoice: Invoice) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) {
      return
    }

    setCancelling(invoice.id)
    try {
      const result = await cancelInvoice(invoice.id)

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel invoice')
      }

      toast.success('Invoice cancelled successfully')
      onInvoiceUpdate?.()
      loadInvoices()
    } catch (error: any) {
      toast.error('Failed to cancel invoice', {
        description: error.message || 'Please try again',
      })
    } finally {
      setCancelling(null)
    }
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Payment link copied to clipboard')
  }

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-gray-400 text-gray-600">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDeliveryMethodBadge = (method: Invoice['delivery_method']) => {
    return (
      <Badge variant="outline" className="text-xs">
        {method === 'EMAIL' ? (
          <>
            <Mail className="h-3 w-3 mr-1" />
            Square Email
          </>
        ) : (
          <>
            <Mail className="h-3 w-3 mr-1" />
            Custom Email
          </>
        )}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading invoices...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-sm text-muted-foreground">
            No invoices found for this order
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <Card key={invoice.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Invoice #{invoice.id}</CardTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(invoice.status)}
                {getDeliveryMethodBadge(invoice.delivery_method)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-semibold">${invoice.amount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div className="font-medium">
                  {formatDate(invoice.created_at)}
                </div>
              </div>
              {invoice.recipient_email && (
                <div>
                  <div className="text-muted-foreground">Recipient</div>
                  <div className="font-medium">{invoice.recipient_email}</div>
                </div>
              )}
              {invoice.email_sent_at && (
                <div>
                  <div className="text-muted-foreground">Email Sent</div>
                  <div className="font-medium">
                    {formatDate(invoice.email_sent_at)}
                  </div>
                </div>
              )}
              {invoice.paid_at && (
                <div>
                  <div className="text-muted-foreground">Paid At</div>
                  <div className="font-medium">
                    {formatDate(invoice.paid_at)}
                  </div>
                </div>
              )}
            </div>

            {invoice.public_url && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Payment Link</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 rounded border bg-muted text-xs font-mono truncate">
                    {invoice.public_url}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(invoice.public_url!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(invoice.public_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t">
              {invoice.delivery_method === 'SHARE_MANUALLY' && 
               invoice.status === 'pending' && 
               invoice.public_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResend(invoice, invoice.recipient_email || '')}
                  disabled={sending === invoice.id || !invoice.recipient_email}
                >
                  {sending === invoice.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Email
                    </>
                  )}
                </Button>
              )}
              {invoice.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(invoice)}
                  disabled={cancelling === invoice.id}
                >
                  {cancelling === invoice.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

