/**
 * Payment API Client
 * Handles all payment-related API calls
 */

import { apiCall, apiCallJson } from './api-client';

export interface ProcessPaymentRequest {
  amount: number;
  payment_method: 'card' | 'ACH' | 'cash_app_pay' | 'afterpay';
  source_id: string;
  idempotency_key: string;
  use_stored_card?: boolean;
  stored_card_id?: number;
  store_card?: boolean;
  customer_id?: string;
}

export interface ProcessPaymentResponse {
  success: boolean;
  payment_transaction?: PaymentTransaction;
  stored_card?: StoredCard;
  error?: string;
  square_error_code?: string;
}

export interface PaymentTransaction {
  id: number;
  order_id: number;
  square_payment_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  card_last_4?: string;
  card_brand?: string;
  status: 'completed' | 'failed' | 'refunded' | 'pending';
  square_customer_id?: string;
  square_card_id?: string;
  error_message?: string;
  processed_by: number;
  created_at: string;
  updated_at: string;
}

export interface StoredCard {
  id: number;
  client_id: number;
  square_customer_id: string;
  square_card_id: string;
  card_last_4: string;
  card_brand: string;
  card_exp_month?: number;
  card_exp_year?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderPaymentsResponse {
  order_id: number;
  transactions: PaymentTransaction[];
  count: number;
}

export interface StoredCardsResponse {
  client_id: number;
  cards: StoredCard[];
  count: number;
}

export interface SquareConfigResponse {
  application_id: string;
  environment: 'sandbox' | 'production';
}

/**
 * Process payment for an order
 */
export async function processPayment(
  orderId: number,
  paymentData: ProcessPaymentRequest
): Promise<ProcessPaymentResponse> {
  return apiCallJson<ProcessPaymentResponse>(
    `/orders/${orderId}/payments/process`,
    {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }
  );
}

/**
 * Get payment transactions for an order
 */
export async function getOrderPayments(orderId: number): Promise<OrderPaymentsResponse> {
  return apiCallJson<OrderPaymentsResponse>(`/orders/${orderId}/payments`);
}

/**
 * Get stored cards for a client
 */
export async function getStoredCards(clientId: number): Promise<StoredCardsResponse> {
  return apiCallJson<StoredCardsResponse>(`/clients/${clientId}/stored-cards`);
}

/**
 * Delete a stored card
 */
export async function deleteStoredCard(cardId: number): Promise<void> {
  await apiCallJson(`/stored-cards/${cardId}`, {
    method: 'DELETE',
  });
}

/**
 * Get Square application ID and environment
 */
export async function getSquareConfig(): Promise<SquareConfigResponse> {
  return apiCallJson<SquareConfigResponse>('/payments/application-id');
}

