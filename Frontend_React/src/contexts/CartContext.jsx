// Cart Context for managing shopping cart state
import React, { createContext, useContext, useState, useEffect } from "react";
import config from "../config";
import { mockCartResponse } from "../services/mockData";

const CartContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    const seedMockCart = () => {
      const seededCart = (mockCartResponse.items || []).map((item) => ({
        ...item,
        id: item.productId || item.id || item.product_id,
        quantity: item.quantity || 1,
        price: Number(item.price || item.subtotal || 0),
      }));
      setCartItems(seededCart);
      localStorage.setItem(
        config.STORAGE_KEYS.CART,
        JSON.stringify(seededCart)
      );
    };

    const storedCart = localStorage.getItem(config.STORAGE_KEYS.CART);
    if (storedCart) {
      try {
        const cart = JSON.parse(storedCart);
        if (Array.isArray(cart) && cart.length > 0) {
          setCartItems(cart);
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        if (config.USE_ADMIN_MOCKS) {
          seedMockCart();
        }
      }
    } else if (config.USE_ADMIN_MOCKS) {
      seedMockCart();
    }
  }, []);

  // Update cart count and total when items change
  useEffect(() => {
    const count = cartItems.reduce((total, item) => total + item.quantity, 0);
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    setCartCount(count);
    setCartTotal(total);

    // Save to localStorage
    localStorage.setItem(config.STORAGE_KEYS.CART, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems((prevItems) => {
      // Normalize product ID (handle both _id and id)
      const productId = product._id || product.id;
      const normalizedProduct = {
        ...product,
        id: productId,
        _id: undefined // Remove _id to avoid confusion
      };

      const existingItem = prevItems.find((item) => item.id === productId);

      if (existingItem) {
        // Update quantity if item exists
        return prevItems.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        return [...prevItems, { ...normalizedProduct, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(config.STORAGE_KEYS.CART);
  };

  const getItemQuantity = (productId) => {
    const item = cartItems.find((item) => item.id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;
