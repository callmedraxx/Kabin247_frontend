// Order status types - Complete list matching backend
export type OrderStatus =
  | "awaiting_quote"
  | "awaiting_client_approval"
  | "awaiting_caterer"
  | "caterer_confirmed"
  | "in_preparation"
  | "ready_for_delivery"
  | "delivered"
  | "cancelled"
  | "order_changed"

// Order status configuration with detailed information
export interface OrderStatusConfig {
  value: OrderStatus
  label: string
  color: string
  purpose: string
  pdfType: "PDF A (with pricing)" | "PDF B (no pricing)" | "None"
  emailRecipient: string
  emailSubject?: string
  billTo?: string
  autoUpdate?: boolean
  details: string
}

export const orderStatusConfig: OrderStatusConfig[] = [
  {
    value: "awaiting_quote",
    label: "Awaiting Quote",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    purpose: "Send Quote Request to caterer when pricing is not known",
    pdfType: "PDF B (no pricing)",
    emailRecipient: "Caterer",
    emailSubject: "Kabin247 Order#???? / Airport Code / Quote Request- This Order Is Not Live!",
    billTo: "Kabin247 info (name, address, accounting@Kabin247.com)",
    details: "Sent to caterer to request pricing. PDF does not include pricing information.",
  },
  {
    value: "awaiting_client_approval",
    label: "Awaiting Client Approval",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    purpose: "Quote sent to client, awaiting approval",
    pdfType: "PDF A (with pricing)",
    emailRecipient: "Client",
    details: "Quote has been sent to the client with pricing information. Waiting for client to approve the quote.",
  },
  {
    value: "awaiting_caterer",
    label: "Awaiting Caterer",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    purpose: "Send new order or changes to caterer",
    pdfType: "PDF B (no pricing)",
    emailRecipient: "Caterer",
    emailSubject: "Kabin247 Order#???? / Airport Code / Confirmation Request",
    billTo: "Kabin247 info (name, address, accounting@Kabin247.com)",
    details: "Order or changes sent to caterer for confirmation. PDF does not include pricing.",
  },
  {
    value: "caterer_confirmed",
    label: "Caterer Confirmed",
    color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    purpose: "Order confirmed by both caterer and client, no pending changes, awaiting delivery date",
    pdfType: "PDF B (no pricing)",
    emailRecipient: "Client",
    emailSubject: "Kabin247 Order#???? / Airport Code / Order Confirmed",
    billTo: "Client info (not Kabin247)",
    details: "Order has been confirmed by both parties. No pending changes. Awaiting delivery date.",
  },
  {
    value: "in_preparation",
    label: "In Preparation",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    purpose: "Auto-assigned by system 4 hours prior to local delivery time at airport",
    pdfType: "None",
    emailRecipient: "N/A (system status)",
    autoUpdate: true,
    details: "Automatically set by the system 4 hours before the scheduled delivery time. No email is sent.",
  },
  {
    value: "ready_for_delivery",
    label: "Ready for Delivery",
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    purpose: "Auto-assigned by system 1 hour prior to local delivery time at airport",
    pdfType: "None",
    emailRecipient: "N/A (system status)",
    autoUpdate: true,
    details: "Automatically set by the system 1 hour before the scheduled delivery time. No email is sent.",
  },
  {
    value: "delivered",
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    purpose: "Manually set by CSR once delivery is confirmed",
    pdfType: "None",
    emailRecipient: "Client",
    emailSubject: "Kabin247 Order#???? / Airport Code / Delivery Completed",
    details: "Manually set by Customer Service Representative when delivery is confirmed. Email notification sent to client.",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    purpose: "Order has been cancelled",
    pdfType: "PDF B (no pricing)",
    emailRecipient: "Both client and caterer (if applicable)",
    details: "Order has been cancelled. Notification sent to both client and caterer if applicable.",
  },
  {
    value: "order_changed",
    label: "Order Changed",
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    purpose: "Used by CSR when an update comes in and has not yet been sent to vendor or client",
    pdfType: "PDF B (no pricing)",
    emailRecipient: "Both client and caterer (if applicable)",
    details: "Order has been modified by CSR. Changes have not yet been sent to vendor or client.",
  },
]

// Helper function to get status config by value
export function getOrderStatusConfig(status: OrderStatus): OrderStatusConfig | undefined {
  return orderStatusConfig.find((config) => config.value === status)
}

// Helper function to get status options for dropdowns/selects
export function getStatusOptions(): Array<{ value: OrderStatus; label: string; color: string }> {
  return orderStatusConfig.map((config) => ({
    value: config.value,
    label: config.label,
    color: config.color,
  }))
}

// Helper function to get tooltip content for a status
export function getStatusTooltipContent(status: OrderStatus): string {
  const config = getOrderStatusConfig(status)
  if (!config) return ""

  let content = `${config.purpose}\n\n`
  content += `PDF: ${config.pdfType}\n`
  content += `Email Recipient: ${config.emailRecipient}\n`
  if (config.emailSubject) {
    content += `Email Subject: ${config.emailSubject}\n`
  }
  if (config.billTo) {
    content += `Bill-to: ${config.billTo}\n`
  }
  if (config.autoUpdate) {
    content += `Auto-update: Yes (via scheduler)\n`
  }
  content += `\n${config.details}`

  return content
}

