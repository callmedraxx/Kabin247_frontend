/**
 * Square Web Payments SDK Configuration
 * Handles loading and initializing Square Payments SDK
 */

import { API_BASE_URL } from './api-config';

let squarePayments: any = null;
let squareApplicationId: string | null = null;
let squareEnvironment: 'sandbox' | 'production' = 'sandbox';

/**
 * Load Square Web Payments SDK script
 */
export function loadSquareSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Square) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = () => {
      if (window.Square) {
        resolve();
      } else {
        reject(new Error('Square SDK failed to load'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Square SDK script'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Initialize Square Payments instance
 */
export async function initializeSquarePayments(): Promise<any> {
  if (squarePayments) {
    return squarePayments;
  }

  // Get application ID from backend
  if (!squareApplicationId) {
    try {
      const token = localStorage.getItem('kabin247_access_token') || '';
      
      const response = await fetch(`${API_BASE_URL}/payments/application-id`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to get Square application ID';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        console.error('Square Application ID fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      squareApplicationId = data.application_id;
      squareEnvironment = data.environment === 'production' ? 'production' : 'sandbox';
    } catch (error) {
      console.error('Failed to get Square application ID:', error);
      throw error;
    }
  }

  // Load SDK if not already loaded
  if (!window.Square) {
    await loadSquareSDK();
  }

  // Update script source based on environment
  if (squareEnvironment === 'production') {
    const existingScript = document.querySelector('script[src*="squarecdn.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    const script = document.createElement('script');
    script.src = 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize Square Payments
  squarePayments = window.Square.payments(squareApplicationId, squareEnvironment);

  return squarePayments;
}

/**
 * Get Square Payments instance (initializes if needed)
 */
export async function getSquarePayments(): Promise<any> {
  if (!squarePayments) {
    await initializeSquarePayments();
  }
  return squarePayments;
}

/**
 * Get Square application ID
 */
export async function getSquareApplicationId(): Promise<string> {
  if (!squareApplicationId) {
    await initializeSquarePayments();
  }
  return squareApplicationId || '';
}

/**
 * Get Square environment
 */
export function getSquareEnvironment(): 'sandbox' | 'production' {
  return squareEnvironment;
}

// Extend Window interface for Square SDK
declare global {
  interface Window {
    Square?: any;
  }
}

