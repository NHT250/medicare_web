// Configuration file for Medicare React App

const config = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",

  // reCAPTCHA Configuration
  RECAPTCHA_SITE_KEY:
    import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
    "6LfGbvwrAAAAAOCXGdw0YWlf4VQ6pk6FI5nN8Bke",

  // App Configuration
  APP_NAME: "Medicare",
  APP_VERSION: "2.0.0",

  // Pagination
  PRODUCTS_PER_PAGE: 8,

  // Local Storage Keys
  STORAGE_KEYS: {
    USER: "medicare_user",
    TOKEN: "medicare_token",
    CART: "medicare_cart",
    LOGGED_IN: "medicare_logged_in",
    ROLE: "medicare_role",
  },
};

export default config;
