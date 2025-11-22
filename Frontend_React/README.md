# Medicare Frontend - React

Modern React-based frontend for Medicare Online Pharmacy platform.

## 🚀 Features

- **React 18+** with Vite for fast development
- **React Router** for client-side routing
- **Context API** for state management
- **Axios** for API calls
- **Bootstrap 5** for responsive design
- **Font Awesome** icons
- **Google reCAPTCHA** integration

## 📋 Prerequisites

- Node.js 16+ and npm
- Backend API running on `http://localhost:5000`

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd Frontend_React
   npm install
   ```

2. **Configure environment:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
   VITE_APP_NAME=Medicare
   VITE_APP_VERSION=2.0.0
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
Frontend_React/
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable components
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   ├── contexts/         # React Contexts
│   │   ├── AuthContext.jsx
│   │   └── CartContext.jsx
│   ├── pages/            # Page components
│   │   ├── Homepage.jsx
│   │   ├── Auth.jsx
│   │   ├── Products.jsx
│   │   └── Cart.jsx
│   ├── services/         # API services
│   │   └── api.js
│   ├── styles/           # CSS files
│   │   ├── Auth.css
│   │   ├── Homepage.css
│   │   ├── Products.css
│   │   └── Cart.css
│   ├── utils/            # Utility functions
│   ├── config.js         # App configuration
│   ├── App.jsx           # Main app component
│   ├── App.css           # Global styles
│   └── main.jsx          # Entry point
├── .env                  # Environment variables
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

## 🎨 Pages

### 1. Homepage (`/`)
- Hero section
- Category cards
- Featured products
- Search functionality

### 2. Auth Page (`/login`)
- Login form
- Registration form
- reCAPTCHA verification
- Form validation

### 3. Products Page (`/products`)
- Product listing
- Category filtering
- Sorting options
- Search functionality
- Add to cart

### 4. Cart Page (`/cart`)
- View cart items
- Update quantities
- Remove items
- Order summary
- Proceed to checkout

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 API Integration

The app connects to the Flask backend API running on `http://localhost:5000`. All API calls are handled through the `services/api.js` file which includes:

- Axios instance configuration
- Request/response interceptors
- Authentication token handling
- API endpoints for:
  - Authentication (login, register)
  - Products (get all, get by ID, search)
  - Categories
  - Cart operations
  - Orders

## 🔐 Authentication

The app uses JWT tokens for authentication:
- Token is stored in localStorage
- Automatically added to request headers
- Auto-redirect on 401 unauthorized
- Logout clears all user data

## 🛒 Shopping Cart

Cart functionality is managed via Context API:
- Persistent cart in localStorage
- Real-time cart count updates
- Add/remove/update quantities
- Calculate totals with tax and shipping

## 🎯 State Management

Uses React Context API for global state:

**AuthContext:**
- User authentication state
- Login/logout functions
- User data

**CartContext:**
- Cart items
- Cart operations
- Cart totals

## 📱 Responsive Design

- Mobile-first approach
- Bootstrap grid system
- Custom media queries
- Optimized for all screen sizes

## 🔨 Build for Production

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Preview production build:**
   ```bash
   npm run preview
   ```

3. **Deploy:**
   The `dist/` folder contains the production-ready files.

## 🐛 Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:5000`
- Check CORS settings in backend
- Verify API_URL in `.env` file

### reCAPTCHA Not Working
- Check site key in `.env` file
- Ensure reCAPTCHA script is loaded in `index.html`
- Verify domain is registered with Google reCAPTCHA

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## 📄 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000` |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA site key | - |
| `VITE_APP_NAME` | Application name | `Medicare` |
| `VITE_APP_VERSION` | Application version | `2.0.0` |

## 🚀 Deployment

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Deploy to Vercel
```bash
npm run build
# Upload dist/ folder to Vercel
```

### Deploy to GitHub Pages
```bash
npm run build
# Configure vite.config.js base path
# Push dist/ to gh-pages branch
```

## 📝 TODO

- [ ] Add product detail page
- [ ] Add checkout page
- [ ] Add order history page
- [ ] Add user profile page
- [ ] Add password reset functionality
- [ ] Add product reviews
- [ ] Add wishlist feature
- [ ] Add payment integration
- [ ] Add email verification
- [ ] Add loading skeletons

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support, email support@medicare.com or create an issue in the repository.

## 📄 License

MIT License - see LICENSE file for details.

---

**Medicare Team** - *Your Health, Our Priority* 🏥
