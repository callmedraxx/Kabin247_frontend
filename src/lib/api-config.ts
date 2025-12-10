/**
 * API Configuration
 * Centralized configuration for backend API base URL
 * 
 * Reads from environment variable NEXT_PUBLIC_API_BASE_URL
 * Falls back to http://localhost:3000 if not set
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"
