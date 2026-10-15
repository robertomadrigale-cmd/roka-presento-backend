import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 180000, // 3 min for slow LLM generation
});

export function clearSessionToken() {
  // Backwards compatibility, but not needed anymore with httpOnly cookies
}

// Backend connection
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
