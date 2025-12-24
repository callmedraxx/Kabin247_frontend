# Frontend API Documentation - Authentication & Employee Management

This document provides comprehensive API documentation for implementing authentication and employee management features in the frontend application.

## Base URL

```
Production: https://dev.api.kabin247.com (or your backend URL)

```

---

## Authentication Flow

The authentication system uses **JWT (JSON Web Tokens)** with the following approach:

- **Access Token**: Short-lived (15 minutes), sent in `Authorization` header
- **Refresh Token**: Long-lived (30 days), stored as HttpOnly cookie, used to get new access tokens

### Token Storage

1. **Access Token**: Store in memory or localStorage/sessionStorage (NOT recommended for sensitive apps)
2. **Refresh Token**: Automatically handled by browser cookies (HttpOnly, Secure, SameSite=None)

### Token Refresh Flow

1. Access token expires after 15 minutes
2. When API returns `401 Unauthorized`, call `/auth/refresh` endpoint
3. Backend will return a new access token and rotate the refresh token cookie
4. Continue with the new access token

---

## Authentication Endpoints

### 1. Setup Admin Account (One-time)

**Endpoint:** `POST /auth/setup-admin`

**Description:** Creates the initial admin account. Can only be called once. After admin exists, this endpoint will return an error.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "admin@kabin247.com",
  "password": "SecurePassword123"
}
```

**Validation:**
- Email: Valid email format
- Password: Minimum 8 characters

**Response (201 Created):**
```json
{
  "message": "Admin account created successfully",
  "admin": {
    "id": 1,
    "email": "admin@kabin247.com",
    "role": "ADMIN",
    "is_active": true,
    "permissions": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Admin already exists or invalid input
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const response = await fetch(`${API_BASE_URL}/auth/setup-admin`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@kabin247.com',
    password: 'SecurePassword123'
  }),
});

const data = await response.json();
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticates a user and returns access token + user info. Refresh token is automatically set as HttpOnly cookie.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "admin@kabin247.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@kabin247.com",
    "role": "ADMIN",
    "is_active": true,
    "permissions": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Note:** The refresh token cookie is automatically set by the server. You don't need to handle it manually.

**Error Responses:**
- `400 Bad Request`: Email and password required
- `401 Unauthorized`: Invalid email or password
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important: Include cookies
  body: JSON.stringify({
    email: 'admin@kabin247.com',
    password: 'SecurePassword123'
  }),
});

const data = await response.json();
// Store accessToken
localStorage.setItem('accessToken', data.accessToken);
// Store user info
localStorage.setItem('user', JSON.stringify(data.user));
```

---

### 3. Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Description:** Refreshes the access token using the refresh token cookie. Automatically rotates the refresh token.

**Authentication:** Refresh token cookie (HttpOnly)

**Request Body:** None (refresh token sent via cookie)

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
  method: 'POST',
  credentials: 'include', // Important: Include cookies
});

if (response.ok) {
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
} else {
  // Refresh token expired, redirect to login
  localStorage.removeItem('accessToken');
  window.location.href = '/login';
}
```

**Frontend Implementation Tip:** Create an axios interceptor or fetch wrapper that automatically refreshes the token when a 401 is received:

```javascript
async function apiCall(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');
  
  const config = {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    credentials: 'include',
  };

  let response = await fetch(`${API_BASE_URL}${url}`, config);

  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      const { accessToken: newToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', newToken);
      
      // Retry original request with new token
      config.headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${url}`, config);
    } else {
      // Refresh failed, redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  return response;
}
```

---

### 4. Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logs out the user and revokes the refresh token.

**Authentication:** Access token required

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Example:**
```javascript
const accessToken = localStorage.getItem('accessToken');

await fetch(`${API_BASE_URL}/auth/logout`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});

// Clear local storage
localStorage.removeItem('accessToken');
localStorage.removeItem('user');
```

---

### 5. Request Password Reset (Admin Only)

**Endpoint:** `POST /auth/request-password-reset`

**Description:** Requests a password reset OTP for the admin account. OTP is sent via email.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "admin@kabin247.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email exists and is an admin account, a password reset OTP has been sent"
}
```

**Note:** For security, the response message is generic and doesn't reveal whether the email exists.

**Error Responses:**
- `400 Bad Request`: Email required
- `429 Too Many Requests`: Too many password reset attempts (max 5 per OTP)
- `500 Internal Server Error`: Server error

**Example:**
```javascript
await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@kabin247.com'
  }),
});
```

**Frontend Flow:**
1. User enters email on password reset page
2. Call this endpoint
3. Show success message: "If this email is registered, you will receive an OTP code"
4. User checks email for OTP
5. User enters OTP and new password on reset form
6. Call `/auth/reset-password` endpoint

---

### 6. Reset Password

**Endpoint:** `POST /auth/reset-password`

**Description:** Resets the password using OTP code sent via email.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "admin@kabin247.com",
  "otp": "123456",
  "newPassword": "NewSecurePassword123"
}
```

**Validation:**
- Email: Valid email format
- OTP: 6-digit numeric code
- newPassword: Minimum 8 characters

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid OTP, email, or password (doesn't specify which for security)
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@kabin247.com',
    otp: '123456',
    newPassword: 'NewSecurePassword123'
  }),
});

if (response.ok) {
  // Redirect to login page
  window.location.href = '/login?passwordReset=true';
} else {
  const error = await response.json();
  // Show error: error.error
}
```

---

## Employee Management Endpoints

All employee management endpoints require:
- **Authentication**: Valid access token
- **Authorization**: ADMIN role only

### Request Headers

All requests to employee endpoints must include:
```
Authorization: Bearer <access_token>
```

---

### 1. Invite Employee

**Endpoint:** `POST /employees/invite`

**Description:** Sends an invitation email to a new employee (CSR). The employee will receive an email with a signup link.

**Request Body:**
```json
{
  "email": "employee@example.com",
  "permissions": {
    "orders.read": true,
    "orders.update_status": true
  }
}
```

**Permissions Object:**
Available permissions for CSR employees (admin-only permissions are automatically removed):
- `orders.read` (boolean): Read/view orders
- `orders.update_status` (boolean): Update order status (except "paid")
- `orders.set_paid` (boolean): **ADMIN ONLY** - Cannot be set for CSR
- `invoices.send_final` (boolean): **ADMIN ONLY** - Cannot be set for CSR
- `employees.manage` (boolean): **ADMIN ONLY** - Cannot be set for CSR
- `invites.create` (boolean): **ADMIN ONLY** - Cannot be set for CSR

**Response (201 Created):**
```json
{
  "message": "Invite sent successfully",
  "expiresAt": "2024-01-15T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format, user already exists, or active invite exists
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`${API_BASE_URL}/employees/invite`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'employee@example.com',
    permissions: {
      'orders.read': true,
      'orders.update_status': true,
    }
  }),
});

const data = await response.json();
```

---

### 2. List Employees

**Endpoint:** `GET /employees`

**Description:** Returns a list of all CSR employees.

**Response (200 OK):**
```json
{
  "employees": [
    {
      "id": 2,
      "email": "employee@example.com",
      "role": "CSR",
      "is_active": true,
      "permissions": {
        "orders.read": true,
        "orders.update_status": true
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Example:**
```javascript
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`${API_BASE_URL}/employees`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});

const data = await response.json();
const employees = data.employees;
```

---

### 3. Update Employee Permissions

**Endpoint:** `PATCH /employees/:id/permissions`

**Description:** Updates the permissions for a specific employee.

**URL Parameters:**
- `id` (integer): Employee ID

**Request Body:**
```json
{
  "permissions": {
    "orders.read": true,
    "orders.update_status": true
  }
}
```

**Response (200 OK):**
```json
{
  "employee": {
    "id": 2,
    "email": "employee@example.com",
    "role": "CSR",
    "is_active": true,
    "permissions": {
      "orders.read": true,
      "orders.update_status": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid permissions object
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Employee not found
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const accessToken = localStorage.getItem('accessToken');
const employeeId = 2;

const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/permissions`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
  body: JSON.stringify({
    permissions: {
      'orders.read': true,
      'orders.update_status': false, // Revoke this permission
    }
  }),
});

const data = await response.json();
```

---

### 4. Deactivate Employee

**Endpoint:** `POST /employees/:id/deactivate`

**Description:** Deactivates an employee account. Deactivated employees cannot log in.

**URL Parameters:**
- `id` (integer): Employee ID

**Response (200 OK):**
```json
{
  "message": "Employee deactivated successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Employee not found
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const accessToken = localStorage.getItem('accessToken');
const employeeId = 2;

const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/deactivate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});
```

---

### 5. Reactivate Employee

**Endpoint:** `POST /employees/:id/reactivate`

**Description:** Reactivates a previously deactivated employee account.

**URL Parameters:**
- `id` (integer): Employee ID

**Response (200 OK):**
```json
{
  "message": "Employee reactivated successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin
- `404 Not Found`: Employee not found
- `500 Internal Server Error`: Server error

**Example:**
```javascript
const accessToken = localStorage.getItem('accessToken');
const employeeId = 2;

const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/reactivate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});
```

---

## Invite Acceptance Endpoint

### Accept Invitation

**Endpoint:** `POST /invites/accept`

**Description:** Accepts an invitation token and creates a CSR employee account. This endpoint is called when a user clicks the invitation link and sets their password.

**Authentication:** None required

**Request Body:**
```json
{
  "token": "abc123def456...",
  "password": "SecurePassword123"
}
```

**Validation:**
- token: Valid invitation token from email link
- password: Minimum 8 characters

**Response (201 Created):**
```json
{
  "message": "Account created successfully",
  "user": {
    "id": 2,
    "email": "employee@example.com",
    "role": "CSR",
    "is_active": true,
    "permissions": {
      "orders.read": true,
      "orders.update_status": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid token, token expired, user already exists, or password too short
- `500 Internal Server Error`: Server error

**Frontend Flow:**

1. User receives invitation email with link: `https://app.kabin247.com/signup?token=abc123...`
2. User clicks link and is redirected to signup page
3. Frontend extracts token from URL query parameter
4. User enters password on signup form
5. Frontend calls this endpoint with token and password
6. On success, redirect to login page
7. User can now login with their email and password

**Example:**
```javascript
// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// User submits password form
const password = document.getElementById('password').value;

const response = await fetch(`${API_BASE_URL}/invites/accept`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: token,
    password: password
  }),
});

if (response.ok) {
  const data = await response.json();
  // Show success message and redirect to login
  window.location.href = '/login?accountCreated=true';
} else {
  const error = await response.json();
  // Show error: error.error
  alert(error.error);
}
```

---

## Permission Structure

### Permission Keys

The system uses granular permissions for CSR employees:

1. **orders.read** - View/read orders
2. **orders.update_status** - Update order status (except "paid")
3. **orders.set_paid** - Set order status to "paid" (ADMIN ONLY)
4. **invoices.send_final** - Send final invoice emails (ADMIN ONLY)
5. **employees.manage** - Manage employees (ADMIN ONLY)
6. **invites.create** - Create invitations (ADMIN ONLY)

### Permission Behavior

- **ADMIN role**: Has all permissions implicitly, doesn't need explicit permission objects
- **CSR role**: Requires explicit permissions in the `permissions` object
- Admin-only permissions (`orders.set_paid`, `invoices.send_final`, `employees.manage`, `invites.create`) are automatically removed when setting CSR permissions

---

## User Object Structure

### User Object

```typescript
interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'CSR';
  is_active: boolean;
  permissions: PermissionMap | null; // null for ADMIN, object for CSR
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}

interface PermissionMap {
  'orders.read'?: boolean;
  'orders.update_status'?: boolean;
  'orders.set_paid'?: boolean;      // ADMIN only
  'invoices.send_final'?: boolean;  // ADMIN only
  'employees.manage'?: boolean;     // ADMIN only
  'invites.create'?: boolean;       // ADMIN only
  [key: string]: boolean | undefined;
}
```

---

## Error Handling

### Standard Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded (for password reset)
- `500 Internal Server Error`: Server error

### Frontend Error Handling Example

```javascript
async function handleApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        // Try to refresh token
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const { accessToken } = await refreshResponse.json();
          localStorage.setItem('accessToken', accessToken);
          
          // Retry original request
          options.headers.Authorization = `Bearer ${accessToken}`;
          return fetch(url, options);
        } else {
          // Redirect to login
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      } else if (response.status === 403) {
        throw new Error('You do not have permission to perform this action');
      } else {
        throw new Error(data.error || 'An error occurred');
      }
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## CORS Configuration

The backend is configured to accept requests from:
- Frontend URL: `https://app.kabin247.com` (configurable via `FRONTEND_URL` env var)

**Important:** All API requests must include `credentials: 'include'` to send cookies:

```javascript
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include', // Required for cookies
  body: JSON.stringify(data),
});
```

---

## Frontend Implementation Checklist

### Initial Setup
- [ ] Configure API base URL
- [ ] Set up axios/fetch wrapper with automatic token refresh
- [ ] Configure CORS credentials
- [ ] Create authentication context/store (React) or service (Vue/Angular)

### Authentication Pages
- [ ] Admin setup page (`/setup-admin`)
- [ ] Login page (`/login`)
- [ ] Password reset request page (`/forgot-password`)
- [ ] Password reset page (`/reset-password?token=...`)

### Employee Management Pages (Admin Only)
- [ ] Employee list page (`/employees`)
- [ ] Invite employee form (`/employees/invite`)
- [ ] Employee details/edit permissions page (`/employees/:id`)
- [ ] Deactivate/reactivate functionality

### Invite Acceptance
- [ ] Signup page (`/signup?token=...`)
- [ ] Extract token from URL
- [ ] Password creation form
- [ ] Handle success/error states

### Protected Routes
- [ ] Route guard middleware to check authentication
- [ ] Redirect to login if not authenticated
- [ ] Role-based route protection (ADMIN vs CSR)
- [ ] Permission-based feature visibility

### Token Management
- [ ] Store access token (localStorage or memory)
- [ ] Automatic token refresh on 401
- [ ] Logout clears tokens and redirects
- [ ] Handle token expiry gracefully

---

## Example React Implementation Snippets

### Authentication Context

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'CSR';
  is_active: boolean;
  permissions: Record<string, boolean> | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = async () => {
    if (accessToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        credentials: 'include',
      });
    }

    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user && !!accessToken;
  const isAdmin = user?.role === 'ADMIN';

  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true; // Admin has all permissions
    if (!user?.permissions) return false;
    return user.permissions[permission] === true;
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isAuthenticated, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```typescript
// ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requirePermission,
}) => {
  const { isAuthenticated, isAdmin, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

---

## Support

For questions or issues, contact the backend development team or refer to the Swagger documentation at:
```
https://dev.api.kabin247.com/api-docs
```

---

**Last Updated:** 2024-01-01
**API Version:** 1.0

