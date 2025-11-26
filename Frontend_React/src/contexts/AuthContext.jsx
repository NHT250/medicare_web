// Auth Context for managing authentication state
import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import config from "../config";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
    const storedUser = localStorage.getItem(config.STORAGE_KEYS.USER);
    const storedRole = localStorage.getItem(config.STORAGE_KEYS.ROLE);
    const isLoggedIn =
      localStorage.getItem(config.STORAGE_KEYS.LOGGED_IN) === "true";

    if (storedToken && storedUser && isLoggedIn) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setRole(storedRole || parsedUser?.role || "customer");
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error parsing user data:", error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      console.log("📤 Sending login request to backend...", { email: credentials.email });
      const data = await authAPI.login(credentials);
      console.log("📥 Backend response:", data);

      if (data.token && data.user) {
        const resolvedRole = data.role || data.user?.role || "customer";
        const normalizedUser = { ...data.user, role: resolvedRole };
        data.user = normalizedUser;
        data.role = resolvedRole;
        // Save to localStorage
        localStorage.setItem(config.STORAGE_KEYS.TOKEN, data.token);
        localStorage.setItem(
          config.STORAGE_KEYS.USER,
          JSON.stringify(normalizedUser)
        );
        localStorage.setItem(config.STORAGE_KEYS.LOGGED_IN, "true");
        localStorage.setItem(config.STORAGE_KEYS.ROLE, resolvedRole);

        // Update state
        setToken(data.token);
        setUser(normalizedUser);
        setRole(resolvedRole);
        setIsAuthenticated(true);

        console.log("✅ Login successful, user:", normalizedUser);
        return { success: true, data };
      } else {
        console.error("❌ Invalid response from server:", data);
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Login failed. Please try again.",
      };
    }
  };

  const register = async (userData) => {
    try {
      const data = await authAPI.register(userData);

      if (data.message) {
        return { success: true, data };
      }

      throw new Error("Invalid response from server");
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error:
          error.response?.data?.error ||
          "Registration failed. Please try again.",
      };
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem(config.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.USER);
    localStorage.removeItem(config.STORAGE_KEYS.LOGGED_IN);
    localStorage.removeItem(config.STORAGE_KEYS.CART);
    localStorage.removeItem(config.STORAGE_KEYS.ROLE);

    // Clear state
    setToken(null);
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);

    authAPI.logout();
  };

  const updateUser = (updatedUserData) => {
    // Update user data in state and localStorage
    const newUserData = {
      ...user,
      ...updatedUserData
    };

    setUser(newUserData);
    localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(newUserData));
  };

  const value = {
    user,
    token,
    role,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
