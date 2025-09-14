import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Minimize2, Maximize2, Minus } from "lucide-react";
import logo from "../../assets/logo.png";

export default function Navbar({ username, role, onLogout }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isElectron, setIsElectron] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(window.electronAPI !== undefined);
  }, []);

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            window.location.href = '/pos';
            break;
          case 'p':
            e.preventDefault();
            if (role === 'admin') window.location.href = '/products';
            break;
          case 'u':
            e.preventDefault();
            if (role === 'admin') window.location.href = '/customers';
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [role]);

  const isActive = (path) =>
    location.pathname === path
      ? "text-blue-600 font-semibold border-b-2 border-blue-600 flex items-center gap-2 px-3 py-2 rounded-t-lg bg-blue-50"
      : "text-gray-600 hover:text-blue-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200";

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 shadow-lg border-b border-gray-200">
      {/* Main Navigation Bar */}
      <nav className="px-6 py-4 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-4">
          <Link to="/pos" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-12 w-12 flex items-center justify-center text-white font-bold text-xl">
              <img src={logo} alt="Bharat Kitchenware" srcset="" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Bharat Kitchenware</h1>
              <p className="text-xs text-gray-500">Mall POS System</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className={`${isCollapsed ? 'hidden' : 'flex'} items-center gap-2`}>
          {/* Always visible */}
          <Link to="/pos" className={isActive("/pos")} title="New Sale (Ctrl+N)">
            <span className="text-lg">🛒</span>
            <span className="hidden lg:inline">Billing</span>
          </Link>

          {/* Admin-only links */}
          {role === "admin" && (
            <>
              <Link to="/products" className={isActive("/products")} title="Products (Ctrl+P)">
                <span className="text-lg">📦</span>
                <span className="hidden lg:inline">Inventory</span>
              </Link>
              <Link to="/customers" className={isActive("/customers")} title="Customers (Ctrl+U)">
                <span className="text-lg">👥</span>
                <span className="hidden lg:inline">Customers</span>
              </Link>
              <Link to="/vendors" className={isActive("/vendors")} title="Vendors">
                <span className="text-lg">🏢</span>
                <span className="hidden lg:inline">Vendors</span>
              </Link>
              <Link to="/barcode" className={isActive("/barcode")} title="Barcode">
                <span className="text-lg">🏷️</span>
                <span className="hidden lg:inline">Barcode</span>
              </Link>
              <Link to="/users" className={isActive("/users")} title="User Management">
                <span className="text-lg">🔑</span>
                <span className="hidden lg:inline">Users</span>
              </Link>
            </>
          )}
        </div>

        {/* Right Side - Time, User, Controls */}
        <div className="flex items-center gap-4">
          {/* Date & Time Display */}
          <div className="hidden md:flex flex-col items-end text-sm">
            <div className="text-gray-800 font-medium">{formatTime(currentTime)}</div>
            <div className="text-gray-500 text-xs">{formatDate(currentTime)}</div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800">{username}</div>
              <div className="text-xs text-gray-500 capitalize">{role}</div>
            </div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
              {username.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            title="Logout"
          >
            <span className="hidden sm:inline">Logout</span>
            <X size={16} className="sm:hidden" />
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isCollapsed && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-2">
            <Link to="/pos" className={`${isActive("/pos")} justify-start`}>
              <span className="text-lg">🛒</span>
              Billing
            </Link>
            {role === "admin" && (
              <>
                <Link to="/products" className={`${isActive("/products")} justify-start`}>
                  <span className="text-lg">📦</span>
                  Inventory
                </Link>
                <Link to="/customers" className={`${isActive("/customers")} justify-start`}>
                  <span className="text-lg">👥</span>
                  Customers
                </Link>
                <Link to="/vendors" className={`${isActive("/vendors")} justify-start`}>
                  <span className="text-lg">🏢</span>
                  Vendors
                </Link>
                <Link to="/barcode" className={`${isActive("/barcode")} justify-start`}>
                  <span className="text-lg">🏷️</span>
                  Barcode
                </Link>
                <Link to="/users" className={`${isActive("/users")} justify-start`}>
                  <span className="text-lg">🔑</span>
                  Users
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}