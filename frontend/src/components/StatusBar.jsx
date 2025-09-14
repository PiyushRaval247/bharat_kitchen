import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, AlertCircle, CheckCircle, Activity } from 'lucide-react';

export default function StatusBar() {
  const [systemStatus, setSystemStatus] = useState({
    backend: 'connected',
    database: 'healthy',
    lastSync: new Date(),
    networkStatus: 'online'
  });
  
  const [performance, setPerformance] = useState({
    memoryUsage: 0,
    responseTime: 0
  });

  useEffect(() => {
    // Check backend health
    const checkSystemHealth = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/health');
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          setSystemStatus(prev => ({
            ...prev,
            backend: 'connected',
            database: 'healthy',
            lastSync: new Date()
          }));
          setPerformance(prev => ({
            ...prev,
            responseTime
          }));
        } else {
          setSystemStatus(prev => ({
            ...prev,
            backend: 'error'
          }));
        }
      } catch (error) {
        setSystemStatus(prev => ({
          ...prev,
          backend: 'disconnected'
        }));
      }
    };

    // Check network status
    const updateNetworkStatus = () => {
      setSystemStatus(prev => ({
        ...prev,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      }));
    };

    // Get memory usage (if available)
    const updatePerformance = () => {
      if (performance.memory) {
        const memoryUsage = (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100;
        setPerformance(prev => ({
          ...prev,
          memoryUsage: Math.round(memoryUsage)
        }));
      }
    };

    // Initial checks
    checkSystemHealth();
    updateNetworkStatus();
    updatePerformance();

    // Set up intervals
    const healthInterval = setInterval(checkSystemHealth, 30000); // Every 30 seconds
    const performanceInterval = setInterval(updatePerformance, 10000); // Every 10 seconds

    // Listen for network changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      clearInterval(healthInterval);
      clearInterval(performanceInterval);
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'online':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-yellow-500" />;
      case 'disconnected':
      case 'offline':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <Activity size={14} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'online':
        return 'text-green-600';
      case 'error':
        return 'text-yellow-600';
      case 'disconnected':
      case 'offline':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs">
      {/* Left side - System Status */}
      <div className="flex items-center gap-4">
        {/* Backend Status */}
        <div className="flex items-center gap-1">
          {getStatusIcon(systemStatus.backend)}
          <span className={getStatusColor(systemStatus.backend)}>
            Backend: {systemStatus.backend}
          </span>
        </div>

        {/* Database Status */}
        <div className="flex items-center gap-1">
          <Database size={14} className="text-blue-500" />
          <span className={getStatusColor(systemStatus.database)}>
            DB: {systemStatus.database}
          </span>
        </div>

        {/* Network Status */}
        <div className="flex items-center gap-1">
          {systemStatus.networkStatus === 'online' ? 
            <Wifi size={14} className="text-green-500" /> : 
            <WifiOff size={14} className="text-red-500" />
          }
          <span className={getStatusColor(systemStatus.networkStatus)}>
            {systemStatus.networkStatus}
          </span>
        </div>
      </div>

      {/* Center - Performance */}
      <div className="flex items-center gap-4 text-gray-600">
        {performance.responseTime > 0 && (
          <span>Response: {performance.responseTime}ms</span>
        )}
        {performance.memoryUsage > 0 && (
          <span>Memory: {performance.memoryUsage}%</span>
        )}
      </div>

      {/* Right side - Last sync and app info */}
      <div className="flex items-center gap-4 text-gray-500">
        <span>Last sync: {formatTime(systemStatus.lastSync)}</span>
        <span>Mall POS v1.0.0</span>
      </div>
    </div>
  );
}