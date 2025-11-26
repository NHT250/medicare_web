# 📋 Authentication API & Features Documentation

## 🔐 Overview
Complete login/register system with JWT token-based authentication.

---

## 🔵 **BACKEND API ENDPOINTS**

### 1️⃣ **Register** 
- **URL:** `POST /api/auth/register`
- **Required Fields:**
  - `name` (string) - User full name
  - `email` (string) - User email (unique)
  - `phone` (string) - User phone number
  - `password` (string) - User password
  - `recaptcha_token` (string, optional) - Only if reCAPTCHA enabled

**Request Example:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123"
}
```

**Success Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

**Error Responses:**
- `400` - Missing fields, email already exists
- `500` - Server error

---

### 2️⃣ **Login**
- **URL:** `POST /api/auth/login`
- **Required Fields:**
  - `email` (string) - User email
  - `password` (string) - User password
  - `recaptchaToken` (string, optional) - Only if reCAPTCHA enabled

**Request Example:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

**Error Responses:**
- `400` - Missing email/password
- `401` - Invalid email or password
- `403` - Account is banned
- `500` - Server error

---

## 🎨 **FRONTEND LOGIN/REGISTER FLOW**

### Login Flow:
```
1. User enters email & password
2. Frontend validates email format
3. If reCAPTCHA enabled → execute reCAPTCHA
4. Call authAPI.login(credentials)
5. Backend validates and returns JWT token
6. Frontend stores token + user in localStorage
7. Redirect to homepage or admin dashboard
```

### Register Flow:
```
1. User fills form (name, email, phone, password)
2. Frontend validates:
   - Email format
   - Phone format
   - Password strength (8+ chars, uppercase, lowercase, number)
   - Passwords match
   - Terms agreement checked
3. If reCAPTCHA enabled → execute reCAPTCHA
4. Call authAPI.register(userData)
5. Backend creates user in MongoDB
6. User can now login
7. Redirect to login page
```

---

## 📦 **AUTH CONTEXT (Frontend State Management)**

**Available Methods:**
- `login(credentials)` - Login user, returns { success, data } or error
- `register(userData)` - Register new user, returns { success, data } or error
- `logout()` - Clear token, user data, and localStorage

**Available States:**
- `user` - Current user object
- `token` - JWT token
- `role` - User role (customer/admin)
- `isAuthenticated` - Boolean
- `loading` - Initial load state

**Example Usage:**
```jsx
const { login, register, logout, user, isAuthenticated } = useAuth();

// Login
const result = await login({ email, password });
if (result.success) {
  // User logged in successfully
}

// Register
const result = await register({ name, email, phone, password });
if (result.success) {
  // User registered successfully
}

// Logout
logout();
```

---

## 🔒 **JWT TOKEN DETAILS**

**Token Structure:**
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "role": "customer",
  "exp": 1700000000
}
```

**Token Storage:**
- Stored in `localStorage.getItem('medicare_token')`
- Expires in: 24 hours
- Auto-cleared on logout

**Token Usage:**
- Automatically added to all API requests via interceptor:
  ```
  Authorization: Bearer <token>
  ```

---

## 🛡️ **SECURITY FEATURES**

✅ **Password Hashing:** bcrypt with salt rounds
✅ **JWT Authentication:** 24-hour expiration
✅ **Email Uniqueness:** Database unique index on email
✅ **Input Validation:** 
  - Email format validation (regex)
  - Phone number validation
  - Password strength requirements
✅ **reCAPTCHA:** Optional bot protection
✅ **Account Lock:** Ban system (is_banned field)
✅ **Auto Logout:** On 401 response (token expired)

---

## 📋 **DATABASE SCHEMA (Users Collection)**

```javascript
{
  "_id": ObjectId,
  "email": String (unique),
  "password": String (hashed with bcrypt),
  "name": String,
  "phone": String,
  "address": Object,
  "role": String (customer|admin),
  "is_banned": Boolean,
  "isVerified": Boolean (always true, no email verification),
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## 🚨 **REMOVED FEATURES**

❌ **OTP Email Verification** - Removed
❌ **Password Reset Email** - Removed  
❌ **Welcome Email** - Removed
❌ **Email SMTP Config** - Not in .env
❌ **reCAPTCHA** - Currently disabled (ENABLE_RECAPTCHA=False)

---

## ✅ **CURRENT STATUS**

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ Working | No reCAPTCHA required |
| Register | ✅ Working | No email verification |
| JWT Token | ✅ Working | 24-hour expiration |
| Password Hashing | ✅ Working | bcrypt |
| Email Uniqueness | ✅ Working | Database index |
| Admin Role | ✅ Working | Can be set manually |
| Account Ban | ✅ Working | Can be set by admin |
| Auto Logout | ✅ Working | On token expiry |

---

## 🧪 **TEST ACCOUNTS**

To test, register new account with:
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+1234567890",
  "password": "TestPass123"
}
```

Then login with same credentials.

---

## 📍 **API ROUTES SUMMARY**

| Method | Route | Protected | Description |
|--------|-------|-----------|-------------|
| POST | /api/auth/register | ❌ | Register new user |
| POST | /api/auth/login | ❌ | Login user |
| GET | /api/users/profile | ✅ | Get user profile (requires JWT) |
| PUT | /api/users/profile | ✅ | Update user profile (requires JWT) |

---

**Last Updated:** November 26, 2025
**reCAPTCHA Status:** Disabled (ENABLE_RECAPTCHA=False)
**Email Features:** Disabled (all removed)
