"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react"
import { getSquarePayments } from "@/lib/square-config"
import { processPayment, ProcessPaymentRequest, StoredCard } from "@/lib/payment-api"
import { toast } from "sonner"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  orderNumber: string
  amount: number
  clientId?: number
  storedCards?: StoredCard[]
  onPaymentSuccess?: () => void
}

export function PaymentModal({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  amount,
  clientId,
  storedCards = [],
  onPaymentSuccess,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'stored_card'>('card')
  const [selectedStoredCard, setSelectedStoredCard] = useState<number | null>(null)
  const [storeCard, setStoreCard] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardElement, setCardElement] = useState<any>(null)
  const cardContainerRef = useRef<HTMLDivElement>(null)

  // Initialize Square card element
  useEffect(() => {
    if (open && paymentMethod === 'card' && cardContainerRef.current && !cardElement) {
      initializeCardElement()
    }

    return () => {
      if (cardElement) {
        cardElement.destroy()
        setCardElement(null)
      }
    }
  }, [open, paymentMethod])

  const initializeCardElement = async () => {
    try {
      const payments = await getSquarePayments()
      const card = await payments.card()
      await card.attach(cardContainerRef.current!)
      setCardElement(card)
    } catch (err: any) {
      console.error('Failed to initialize card element:', err)
      setError('Failed to initialize payment form. Please refresh and try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setProcessing(true)

    try {
      let sourceId: string
      let idempotencyKey = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(7)}`

      if (paymentMethod === 'stored_card' && selectedStoredCard) {
        // Use stored card
        const card = storedCards.find(c => c.id === selectedStoredCard)
        if (!card) {
          throw new Error('Selected card not found')
        }
        sourceId = card.square_card_id
      } else {
        // Use card element
        if (!cardElement) {
          throw new Error('Card element not initialized')
        }

        const tokenResult = await cardElement.tokenize()
        if (tokenResult.status !== 'OK') {
          throw new Error(tokenResult.errors?.[0]?.message || 'Failed to tokenize card')
        }
        sourceId = tokenResult.token
      }

      const paymentData: ProcessPaymentRequest = {
        amount,
        payment_method: 'card',
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        use_stored_card: paymentMethod === 'stored_card',
        stored_card_id: selectedStoredCard || undefined,
        store_card: storeCard && paymentMethod === 'card',
        customer_id: clientId ? `customer_${clientId}` : undefined,
      }

      const result = await processPayment(orderId, paymentData)

      if (result.success) {
        toast.success('Payment processed successfully', {
          description: `Order ${orderNumber} has been marked as paid.`,
        })
        onPaymentSuccess?.()
        onOpenChange(false)
        // Reset form
        setPaymentMethod('card')
        setSelectedStoredCard(null)
        setStoreCard(false)
      } else {
        setError(result.error || 'Payment processing failed')
        toast.error('Payment failed', {
          description: result.error || 'Please try again or use a different payment method.',
        })
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment processing failed'
      setError(errorMessage)
      toast.error('Payment error', {
        description: errorMessage,
      })
    } finally {
      setProcessing(false)
    }
  }

  const selectedCard = storedCards.find(c => c.id === selectedStoredCard)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Process payment for order {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="text-2xl font-semibold">${amount.toFixed(2)}</div>
          </div>

          {storedCards.length > 0 && (
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value as 'card' | 'stored_card')
                  setError(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">New Card</SelectItem>
                  <SelectItem value="stored_card">Stored Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentMethod === 'stored_card' ? (
            <div className="space-y-2">
              <Label>Select Card</Label>
              <Select
                value={selectedStoredCard?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedStoredCard(parseInt(value))
                  setError(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stored card" />
                </SelectTrigger>
                <SelectContent>
                  {storedCards.map((card) => (
                    <SelectItem key={card.id} value={card.id.toString()}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>
                          {card.card_brand} •••• {card.card_last_4}
                          {card.is_default && ' (Default)'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCard && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">
                    {selectedCard.card_brand} •••• {selectedCard.card_last_4}
                  </div>
                  {selectedCard.card_exp_month && selectedCard.card_exp_year && (
                    <div className="text-xs text-muted-foreground">
                      Expires {selectedCard.card_exp_month}/{selectedCard.card_exp_year}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Card Information</Label>
              <div
                ref={cardContainerRef}
                id="card-container"
                className="p-3 border rounded-md min-h-[50px]"
              />
              {clientId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="store-card"
                    checked={storeCard}
                    onCheckedChange={(checked) => setStoreCard(checked === true)}
                  />
                  <Label
                    htmlFor="store-card"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Save card for future use
                  </Label>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={processing || (paymentMethod === 'stored_card' && !selectedStoredCard)}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Process Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

