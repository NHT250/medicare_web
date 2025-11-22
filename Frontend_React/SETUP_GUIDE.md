# Medicare React Frontend - Setup Guide

## 📋 Quick Start Guide

### Step 1: Install Dependencies

```bash
cd Frontend_React
npm install
```

### Step 2: Setup Environment Variables

Create a `.env.local` file in the `Frontend_React` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_RECAPTCHA_SITE_KEY=6LfGbvwrAAAAAOCXGdw0YWlf4VQ6pk6FI5nN8Bke
VITE_APP_NAME=Medicare
VITE_APP_VERSION=2.0.0
```

### Step 3: Start Backend API

Make sure your Flask backend is running:

```bash
cd ../Backend
python app.py
```

Backend should be running on `http://localhost:5000`

### Step 4: Start React Development Server

```bash
cd ../Frontend_React
npm run dev
```

React app will be available at `http://localhost:5173`

## 🔧 Development Workflow

1. **Start Backend** (Terminal 1):
   ```bash
   cd Backend
   python app.py
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd Frontend_React
   npm run dev
   ```

3. **Open Browser**:
   Navigate to `http://localhost:5173`

## 🎯 Testing the App

### 1. Test Login
- Go to: `http://localhost:5173/login`
- Use test credentials:
  - Email: `user@example.com`
  - Password: `password123`

### 2. Test Registration
- Click on "Register" tab
- Fill in the form
- Complete reCAPTCHA
- Submit

### 3. Test Products
- Browse products on homepage
- Click "Shop Now" or "View All Medicines"
- Filter by category
- Add items to cart

### 4. Test Cart
- Add products to cart
- View cart
- Update quantities
- Remove items

## 🐛 Common Issues

### Issue: Cannot connect to backend
**Solution:**
- Make sure Flask backend is running on port 5000
- Check `VITE_API_URL` in `.env.local`
- Verify CORS is enabled in backend

### Issue: reCAPTCHA not loading
**Solution:**
- Check internet connection
- Verify `VITE_RECAPTCHA_SITE_KEY` in `.env.local`
- Check browser console for errors

### Issue: Page not found
**Solution:**
- React Router handles all routes
- Refresh the page if needed
- Check route definitions in `App.jsx`

### Issue: Vite errors
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .vite
npm install
npm run dev
```

## 📝 Environment Variables Explained

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_URL` | Backend API base URL | Yes |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA public key | Yes |
| `VITE_APP_NAME` | Application name | No |
| `VITE_APP_VERSION` | Application version | No |

## 🚀 Build for Production

1. **Update environment variables for production:**
   ```env
   VITE_API_URL=https://your-api-domain.com
   VITE_RECAPTCHA_SITE_KEY=your_production_site_key
   ```

2. **Build the app:**
   ```bash
   npm run build
   ```

3. **Preview production build:**
   ```bash
   npm run preview
   ```

4. **Deploy `dist/` folder** to your hosting provider

## 🔐 Security Notes

- Never commit `.env` or `.env.local` files to git
- Use different reCAPTCHA keys for development and production
- In production, ensure backend has proper CORS configuration
- Use HTTPS in production

## 📊 Project Checklist

- [x] ✅ React app created with Vite
- [x] ✅ React Router setup
- [x] ✅ Authentication (Login/Register)
- [x] ✅ Homepage with hero and products
- [x] ✅ Products listing page
- [x] ✅ Shopping cart
- [x] ✅ Context API for state management
- [x] ✅ API service layer
- [x] ✅ Responsive design
- [x] ✅ Bootstrap styling
- [ ] ⏳ Product detail page
- [ ] ⏳ Checkout page
- [ ] ⏳ Order history
- [ ] ⏳ User profile

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Check terminal for error messages
3. Verify all dependencies are installed
4. Ensure backend is running
5. Check environment variables are set correctly

---

Happy coding! 🎉





