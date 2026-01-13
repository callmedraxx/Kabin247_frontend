import { apiCallJson } from "./api-client"

export interface Invoice {
  id: number
  order_id: number
  square_invoice_id: string
  public_url?: string
  reference_id: string
  status: 'pending' | 'paid' | 'cancelled' | 'failed'
  amount: number
  currency: string
  delivery_method: 'EMAIL' | 'SHARE_MANUALLY'
  recipient_email?: string
  email_sent_at?: string
  created_by: number
  created_at: string
  updated_at: string
  paid_at?: string
}

export interface CreateInvoiceRequest {
  delivery_method: 'EMAIL' | 'SHARE_MANUALLY'
  recipient_email?: string
  additional_emails?: string[]
}

export interface CreateInvoiceResponse {
  success: boolean
  invoice?: Invoice
  public_url?: string
  message?: string
  error?: string
  additional_emails_sent?: string[]
  additional_emails_failed?: Array<{ email: string; error: string }>
}

export interface SendInvoiceEmailRequest {
  invoice_id: number
  recipient_email: string
}

export interface SendInvoiceEmailResponse {
  success: boolean
  message?: string
  messageId?: string
  error?: string
}

export interface GetInvoicesResponse {
  invoices: Invoice[]
}

export interface GetInvoiceResponse {
  invoice: Invoice
}

export interface CancelInvoiceResponse {
  success: boolean
  message?: string
  invoice?: Invoice
  error?: string
}

export async function createInvoice(
  orderId: number,
  data: CreateInvoiceRequest
): Promise<CreateInvoiceResponse> {
  return apiCallJson(`/orders/${orderId}/invoices`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getInvoices(orderId: number): Promise<Invoice[]> {
  const response = await apiCallJson<GetInvoicesResponse>(`/orders/${orderId}/invoices`)
  return response.invoices || []
}

export async function getInvoice(invoiceId: number): Promise<Invoice> {
  const response = await apiCallJson<GetInvoiceResponse>(`/invoices/${invoiceId}`)
  return response.invoice
}

export async function sendInvoiceEmail(
  orderId: number,
  data: SendInvoiceEmailRequest
): Promise<SendInvoiceEmailResponse> {
  return apiCallJson(`/orders/${orderId}/invoices/send`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function cancelInvoice(invoiceId: number): Promise<CancelInvoiceResponse> {
  return apiCallJson(`/invoices/${invoiceId}/cancel`, {
    method: "POST",
  })
}

