import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('src_user')); } catch { return null; }
  });
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!localStorage.getItem('src_token')) return;
    try {
      const res = await api.get('/cart');
      setCartCount(res.data.reduce((sum, item) => sum + item.quantity, 0));
    } catch { setCartCount(0); }
  }, []);

  const fetchWishlist = useCallback(async () => {
    if (!localStorage.getItem('src_token')) return;
    try {
      const res = await api.get('/users/wishlist');
      setWishlistCount(res.data.length);
    } catch { setWishlistCount(0); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('src_token');
    if (!token) { setLoading(false); return; }

    // Timeout: if backend takes >8s (cold start), unblock the UI
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('src_user', JSON.stringify(res.data));
        fetchCart();
        fetchWishlist();
      })
      .catch(() => {
        localStorage.removeItem('src_token');
        localStorage.removeItem('src_user');
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [fetchCart, fetchWishlist]);

  const login = (token, userData) => {
    localStorage.setItem('src_token', token);
    localStorage.setItem('src_user', JSON.stringify(userData));
    setUser(userData);
    fetchCart();
    fetchWishlist();
  };

  const logout = () => {
    localStorage.removeItem('src_token');
    localStorage.removeItem('src_user');
    setUser(null);
    setCartCount(0);
    setWishlistCount(0);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, cartCount, fetchCart, wishlistCount, fetchWishlist }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
