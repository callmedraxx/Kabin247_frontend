"use client"

import * as React from "react"
import { PaymentTransaction } from "@/lib/payment-api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react"
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

interface PaymentHistoryProps {
  transactions: PaymentTransaction[]
}

export function PaymentHistory({ transactions }: PaymentHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-600 border-green-500/20',
      failed: 'bg-red-500/10 text-red-600 border-red-500/20',
      refunded: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    }

    return (
      <Badge className={variants[status] || ''}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No payment transactions found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Card</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              {formatDate(transaction.created_at)}
            </TableCell>
            <TableCell className="font-medium">
              ${transaction.amount.toFixed(2)}
            </TableCell>
            <TableCell>{transaction.payment_method.toUpperCase()}</TableCell>
            <TableCell>
              {transaction.card_last_4 ? (
                <span className="text-muted-foreground">
                  {transaction.card_brand} •••• {transaction.card_last_4}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {getStatusIcon(transaction.status)}
                {getStatusBadge(transaction.status)}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

