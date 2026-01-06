"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"
import { PaymentModal } from "./payment-modal"
import { getStoredCards, StoredCard } from "@/lib/payment-api"

interface PaymentButtonProps {
  orderId: number
  orderNumber: string
  amount: number
  clientId?: number
  onPaymentSuccess?: () => void
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export function PaymentButton({
  orderId,
  orderNumber,
  amount,
  clientId,
  onPaymentSuccess,
  variant = "default",
  size = "default",
}: PaymentButtonProps) {
  const [open, setOpen] = useState(false)
  const [storedCards, setStoredCards] = useState<StoredCard[]>([])
  const [loadingCards, setLoadingCards] = useState(false)

  const handleOpen = async () => {
    setOpen(true)
    if (clientId) {
      setLoadingCards(true)
      try {
        const response = await getStoredCards(clientId)
        setStoredCards(response.cards)
      } catch (error) {
        console.error('Failed to load stored cards:', error)
      } finally {
        setLoadingCards(false)
      }
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={handleOpen}
        variant={variant}
        size={size}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Process Payment
      </Button>
      <PaymentModal
        open={open}
        onOpenChange={setOpen}
        orderId={orderId}
        orderNumber={orderNumber}
        amount={amount}
        clientId={clientId}
        storedCards={storedCards}
        onPaymentSuccess={onPaymentSuccess}
      />
    </>
  )
}

