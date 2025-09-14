import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import StatusBar from './components/StatusBar'
import Products from './pages/Products'
import POS from './pages/POS'
import Customers from './pages/Customers'
import BarcodePage from './pages/BarcodePage'
import CustomLabelPage from './pages/CustomLabelPage'
import Login from './components/Login'
import './styles/global.css'
import PurchasePage from './pages/PurchasePage'
import VendorsPage from './pages/VendorsPage'
import VendorProfile from './pages/VendorProfile'
import VendorEdit from './pages/VendorEdit'
import AddPayment from './pages/AddPayment'
import UserManagement from './pages/UserManagement' // Added UserManagement

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')
  const [isElectron, setIsElectron] = useState(false)

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(window.electronAPI !== undefined);
    
    // Listen for Electron navigation events
    if (window.electronAPI) {
      const handleNavigation = (event, path) => {
        window.location.href = path;
      };
      
      window.electronAPI.onNavigate(handleNavigation);
      
      return () => {
        if (window.electronAPI.removeAllListeners) {
          window.electronAPI.removeAllListeners('navigate-to');
        }
      };
    }
  }, []);

useEffect(() => {
  const savedAuth = localStorage.getItem('pos_auth')
  if (savedAuth) {
    try {
      const auth = JSON.parse(savedAuth)
      if (auth.username && auth.timestamp) {
        const now = Date.now()
        if (now - auth.timestamp < 24 * 60 * 60 * 1000) {
          setIsAuthenticated(true)
          setUsername(auth.username)
          setRole(auth.role)   // ✅ restore role
        } else {
          localStorage.removeItem('pos_auth')
        }
      }
    } catch (e) {
      localStorage.removeItem('pos_auth')
    }
  }
}, [])

const handleLogin = (user, userRole) => {
  setIsAuthenticated(true)
  setUsername(user)
  setRole(userRole)

  localStorage.setItem('pos_auth', JSON.stringify({
    username: user,
    role: userRole,
    timestamp: Date.now()
  }))
}


  const handleLogout = () => {
    setIsAuthenticated(false)
    setUsername('')
    setRole('')
    localStorage.removeItem('pos_auth')
  }

  // Role-based protected route
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/pos" replace />
    return children
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app min-h-screen flex flex-col bg-gray-50">
      <Navbar username={username} role={role} onLogout={handleLogout} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full px-6 py-4 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/pos" replace />} />

            {/* Employee & Admin */}
            <Route path="/pos" element={<ProtectedRoute allowedRoles={['employee','admin']}><POS /></ProtectedRoute>} />

            {/* Only Admin */}
            <Route path="/products" element={<ProtectedRoute allowedRoles={['admin']}><Products /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin']}><Customers /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute allowedRoles={['admin']}><PurchasePage /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute allowedRoles={['admin']}><VendorsPage /></ProtectedRoute>} />
            <Route path="/vendors/new" element={<ProtectedRoute allowedRoles={['admin']}><VendorEdit key="new" /></ProtectedRoute>} />
            <Route path="/vendors/:id" element={<ProtectedRoute allowedRoles={['admin']}><VendorProfile /></ProtectedRoute>} />
            <Route path="/vendors/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><VendorEdit key="edit" /></ProtectedRoute>} />
            <Route path="/vendors/:id/add-payment" element={<ProtectedRoute allowedRoles={['admin']}><AddPayment /></ProtectedRoute>} />
            <Route path="/barcode" element={<ProtectedRoute allowedRoles={['admin']}><BarcodePage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} /> {/* Added UserManagement route */}

            <Route path="/login" element={<Navigate to="/pos" replace />} />
            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Routes>
        </div>
      </main>
      
      {/* Status Bar (Desktop only) */}
      {isElectron && <StatusBar />}
    </div>
  )
}
