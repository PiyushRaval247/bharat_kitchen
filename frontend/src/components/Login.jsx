import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, X, AlertCircle } from 'lucide-react'

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastTimer, setToastTimer] = useState(null)
  const [toastType, setToastType] = useState('error') // 'error' or 'success'
  const [isLoading, setIsLoading] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle password visibility with Ctrl+Shift+H
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        setShowPassword(!showPassword)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showPassword])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Authenticate with the backend
      const response = await fetch('/api/users/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const userData = await response.json();
        onLogin(userData.username, userData.role);
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Invalid username or password! Please check your credentials and try again.')
      }
    } catch (err) {
      showErrorToast('An error occurred during login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show error toast
  const showErrorToast = (message) => {
    // Clear existing timer if any
    if (toastTimer) {
      clearTimeout(toastTimer)
    }
    
    setError(message)
    setShowToast(true)
    setToastType('error')
    
    // Optional: Play error sound (if browser supports it)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCT2W3/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCT2W3/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwMDhL=')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore errors if audio doesn't play
    } catch (e) {
      // Ignore audio errors
    }
    
    // Auto hide toast after 5 seconds
    const timer = setTimeout(() => {
      setShowToast(false)
      setError('')
      setToastTimer(null)
    }, 5000)
    
    setToastTimer(timer)
  }

  return (
    <>
      {/* CSS Animation for toast progress bar */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-progress {
          animation: shrink 5s linear forwards;
        }
      `}</style>
      
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-96 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">MP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Mall POS System</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Please sign in to continue.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-2">Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600 focus:outline-none transition-colors"
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff size={18} className="transition-colors" />
                ) : (
                  <Eye size={18} className="transition-colors" />
                )}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            Please contact your administrator to set up your account.
          </p>
        </div>
      </div>
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 max-w-md transform transition-all duration-300 ease-out">
          <div className={`text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 ${
            toastType === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
            <AlertCircle size={20} className="flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {toastType === 'error' ? 'Login Failed' : 'Success'}
              </p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
            <button
              onClick={() => {
                setShowToast(false)
                setError('')
                if (toastTimer) {
                  clearTimeout(toastTimer)
                  setToastTimer(null)
                }
              }}
              className={`text-white transition-colors p-1 rounded ${
                toastType === 'error' ? 'hover:text-red-200 hover:bg-red-600' : 'hover:text-green-200 hover:bg-green-600'
              }`}
              title="Close notification"
            >
              <X size={16} />
            </button>
          </div>
          {/* Progress bar for auto-dismiss */}
          <div className={`h-1 rounded-b-lg overflow-hidden ${
            toastType === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            <div className={`h-full toast-progress ${
              toastType === 'error' ? 'bg-red-300' : 'bg-green-300'
            }`}></div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}