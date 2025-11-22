import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import config from "./config";

export const RequireSignedIn = ({ children }) => {
  const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
};

export const RequireAdmin = ({ children }) => {
  const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
  const role = localStorage.getItem(config.STORAGE_KEYS.ROLE);
  if (!token || role !== "admin") {
    return <Navigate to="/403" replace />;
  }
  return children;
};
