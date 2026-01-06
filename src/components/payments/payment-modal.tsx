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
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, AlertCircle, CheckCircle2, DollarSign, Lock, Shield, Wallet } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
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
  const [isInitializing, setIsInitializing] = useState(false)
  const cardContainerRef = useRef<HTMLDivElement>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null)
      setPaymentMethod('card')
      setSelectedStoredCard(null)
      setStoreCard(false)
      setIsInitializing(false)
      // Clean up card element
      setCardElement((prev: any) => {
        if (prev) {
          try {
            prev.destroy()
          } catch (e) {
            // Ignore destroy errors
          }
        }
        return null
      })
    }
  }, [open])

  // Initialize Square card element when modal opens and payment method is card
  useEffect(() => {
    if (!open || paymentMethod !== 'card' || cardElement || isInitializing) {
      return
    }

    let mounted = true
    let cardInstance: any = null

    const initializeCardElement = async () => {
      if (!cardContainerRef.current) {
        // Wait a bit for DOM to be ready
        setTimeout(() => initializeCardElement(), 100)
        return
      }

      setIsInitializing(true)
      setError(null)

      try {
        const payments = await getSquarePayments()
        if (!mounted || !cardContainerRef.current) return

        // Customize card element styling
        // Note: Square SDK only accepts limited style properties (borderColor, borderRadius, color, etc.)
        // Most styling (padding, shadows, etc.) is handled via CSS in globals.css
        const card = await payments.card({
          style: {
            '.input-container': {
              borderColor: '#94a3b8', // slate-400 - visible border
              borderRadius: '8px',
            },
            '.input-container.is-focus': {
              borderColor: '#3b82f6', // primary blue
            },
            '.input-container.is-error': {
              borderColor: '#ef4444', // destructive red
            },
          },
        })
        if (!mounted || !cardContainerRef.current) {
          card.destroy()
          return
        }

        await card.attach(cardContainerRef.current)
        
        if (mounted) {
          cardInstance = card
          setCardElement(card)
        } else {
          card.destroy()
        }
      } catch (err: any) {
        console.error('Failed to initialize card element:', err)
        if (mounted) {
          setError(`Failed to initialize payment form: ${err.message || 'Please refresh and try again.'}`)
        }
      } finally {
        if (mounted) {
          setIsInitializing(false)
        }
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeCardElement()
    }, 200)

    return () => {
      mounted = false
      clearTimeout(timer)
      if (cardInstance) {
        try {
          cardInstance.destroy()
        } catch (e) {
          // Ignore destroy errors
        }
      }
    }
  }, [open, paymentMethod])

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
        <DialogContent className="sm:max-w-[750px] max-w-[95vw] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-2 border-border/50 [transform:perspective(1000px)_rotateX(1deg)_translateZ(0)] hover:[transform:perspective(1000px)_rotateX(0deg)_translateZ(5px)] transition-all duration-300 ease-out">
        {/* Header with gradient */}
        <DialogHeader className="px-6 pt-5 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 [transform:translateZ(10px)]">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold">Process Payment</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Order #{orderNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-280px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <form id="payment-form" onSubmit={handleSubmit} className="space-y-0">
            {/* Compact Amount Display */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border border-primary/10">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Amount
                    </Label>
                    <div className="text-2xl font-bold text-foreground mt-0.5">
                      ${amount.toFixed(2)}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">

          {storedCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Payment Method</Label>
              </div>
              <Select
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value as 'card' | 'stored_card')
                  setError(null)
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>New Card</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="stored_card">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span>Stored Card</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentMethod === 'stored_card' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Select Card</Label>
              </div>
              <Select
                value={selectedStoredCard?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedStoredCard(parseInt(value))
                  setError(null)
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose a stored card" />
                </SelectTrigger>
                <SelectContent>
                  {storedCards.map((card) => (
                    <SelectItem key={card.id} value={card.id.toString()}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">
                          {card.card_brand} •••• {card.card_last_4}
                        </span>
                        {card.is_default && (
                          <span className="text-xs text-primary font-medium">(Default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCard && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {selectedCard.card_brand} •••• {selectedCard.card_last_4}
                          </div>
                          {selectedCard.card_exp_month && selectedCard.card_exp_year && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Expires {selectedCard.card_exp_month}/{selectedCard.card_exp_year}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedCard.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Card Information</Label>
              </div>
              {isInitializing && (
                <Card className="border-dashed">
                  <CardContent className="p-6 flex items-center justify-center min-h-[80px]">
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span>Initializing secure payment form...</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className={`border-2 border-border/50 ${isInitializing ? 'hidden' : ''}`}>
                <CardContent className="p-4">
                  <div
                    ref={cardContainerRef}
                    id="card-container"
                    className="min-h-[60px] [&_.input-container]:border [&_.input-container]:border-border [&_.input-container]:rounded-lg [&_.input-container]:bg-background [&_.input-container]:px-3 [&_.input-container]:py-2.5 [&_.input-container]:transition-all [&_.input-container]:duration-200 [&_.input-container.is-focus]:border-primary [&_.input-container.is-focus]:ring-2 [&_.input-container.is-focus]:ring-primary/20 [&_.input-container.is-error]:border-destructive [&_.input-container.is-error]:ring-2 [&_.input-container.is-error]:ring-destructive/20 [&_input]:outline-none [&_input]:w-full [&_input]:text-foreground [&_input::placeholder]:text-muted-foreground [&_input::placeholder]:opacity-60"
                  />
                </CardContent>
              </Card>
              {clientId && (
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                  <Checkbox
                    id="store-card"
                    checked={storeCard}
                    onCheckedChange={(checked) => setStoreCard(checked === true)}
                  />
                  <Label
                    htmlFor="store-card"
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    Save card securely for future use
                  </Label>
                </div>
              )}
            </div>
          )}

          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-destructive mb-1">Payment Error</div>
                    <div className="text-sm text-destructive/80">{error}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
            </div>
          </form>
        </div>

        {/* Footer with Action Buttons */}
        <div className="border-t border-border/50 bg-muted/20 backdrop-blur-sm sticky bottom-0 z-10">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={processing}
                className="flex-1 sm:flex-initial order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="payment-form"
                disabled={processing || isInitializing || (paymentMethod === 'stored_card' && !selectedStoredCard) || (paymentMethod === 'card' && !cardElement)}
                className="flex-1 sm:flex-initial order-1 sm:order-2 bg-gradient-to-r from-primary via-primary/95 to-primary/90 hover:from-primary/90 hover:via-primary/85 hover:to-primary/80 text-white font-semibold shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] hover:shadow-[0_6px_20px_rgba(0,118,255,0.5)] [transform:translateY(0px)_translateZ(0)] hover:[transform:translateY(-2px)_translateZ(10px)] active:[transform:translateY(0px)_translateZ(0)] transition-all duration-200 ease-out"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Process Payment
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Security Footer */}
          <div className="px-6 py-3 border-t border-border/30 bg-muted/10">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Your payment is secured by Square</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

