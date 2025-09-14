import React, { useState, useEffect, useMemo } from 'react';
import { getSalesAnalytics, getDailySales, getTopProducts, BillsAPI } from '../api';

const SalesHistory = () => {
  const [period, setPeriod] = useState('today');
  const [analytics, setAnalytics] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsData, dailySalesData, topProductsData, billsData] = await Promise.all([
        getSalesAnalytics(period),
        getDailySales(30),
        getTopProducts(period, 5),
        BillsAPI.list()
      ]);
      setAnalytics(analyticsData);
      setDailySales(dailySalesData);
      setTopProducts(topProductsData);
      setBills(billsData || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR' 
    }).format(amount);
    

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString('en-IN', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
  // Filter bills based on current filters
  const filteredBills = useMemo(() => {
    let filtered = [...bills];
    
    // Date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.created_at);
        return billDate >= startDate && billDate <= endDate;
      });
    }
    
    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(bill => 
        bill.payment_method?.toLowerCase() === paymentFilter.toLowerCase()
      );
    }
    
    // Customer search filter
    if (customerSearch.trim()) {
      const searchTerm = customerSearch.toLowerCase().trim();
      filtered = filtered.filter(bill => 
        (bill.customer_name?.toLowerCase().includes(searchTerm)) ||
        (bill.customer_phone?.includes(searchTerm))
      );
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [bills, dateRange, paymentFilter, customerSearch]);
  
  // Export functionality
  const exportToCSV = () => {
    const headers = ['Date', 'Bill ID', 'Total', 'Payment Method', 'Customer Name', 'Customer Phone'];
    const csvData = filteredBills.map(bill => [
      formatDateTime(bill.created_at),
      `BILL-${bill.id.toString().padStart(6, '0')}`,
      bill.total,
      bill.payment_method || 'cash',
      bill.customer_name || '-',
      bill.customer_phone || '-'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  
  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setPaymentFilter('all');
    setCustomerSearch('');
  };
  
  const paymentMethods = ['cash', 'upi', 'card', 'bank_transfer', 'cheque'];
  const activeFiltersCount = [
    dateRange.start && dateRange.end,
    paymentFilter !== 'all',
    customerSearch.trim()
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-lg font-semibold text-gray-600">
        Loading sales data...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
          📊 Sales History & Analytics
        </h1>
        <p className="text-gray-500 mt-1">Track your business performance and sales trends</p>
      </div>

      {/* Period Selector & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-full shadow-inner">
          {['today', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔍 Filters
            {activeFiltersCount > 0 && (
              <span className="bg-white bg-opacity-30 rounded-full px-2 py-0.5 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          <button
            onClick={exportToCSV}
            disabled={filteredBills.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🎛️ Advanced Filters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="End Date"
                />
              </div>
            </div>
            
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Methods</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Customer Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Search</label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={activeFiltersCount === 0}
                className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {/* Filter Summary */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Showing <strong>{filteredBills.length}</strong> transactions out of <strong>{bills.length}</strong> total
                {dateRange.start && dateRange.end && (
                  <span> • Date: {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}</span>
                )}
                {paymentFilter !== 'all' && (
                  <span> • Payment: {paymentFilter.charAt(0).toUpperCase() + paymentFilter.slice(1).replace('_', ' ')}</span>
                )}
                {customerSearch.trim() && (
                  <span> • Customer: "{customerSearch}"</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="space-y-6">
          {/* Primary Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Sales', value: formatCurrency(analytics.total_sales), icon: '💰', color: 'blue', trend: '+12%' },
              { title: 'Transactions', value: analytics.total_transactions, icon: '🛒', color: 'green', trend: '+5%' },
              { title: 'Avg. Transaction', value: formatCurrency(analytics.avg_transaction_value), icon: '📈', color: 'purple', trend: '+8%' },
              {
                title: 'Active Customers',
                value: filteredBills.filter(bill => bill.customer_name).length,
                icon: '👥',
                color: 'orange',
                trend: '+15%'
              }
            ].map((card, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all duration-300 border group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 text-xl rounded-full bg-${card.color}-100 text-${card.color}-600 group-hover:scale-110 transition-transform`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium text-${card.color}-600 bg-${card.color}-50 px-2 py-1 rounded`}>
                    {card.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Secondary Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Transaction Range</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.min_transaction)} - {formatCurrency(analytics.max_transaction)}
                  </p>
                </div>
                <div className="text-3xl opacity-80">📊</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Payment Methods</p>
                  <p className="text-2xl font-bold">
                    {new Set(filteredBills.map(bill => bill.payment_method || 'cash')).size} types
                  </p>
                </div>
                <div className="text-3xl opacity-80">💳</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Returning Customers</p>
                  <p className="text-2xl font-bold">
                    {Math.round((filteredBills.filter(bill => bill.customer_name).length / Math.max(filteredBills.length, 1)) * 100)}%
                  </p>
                </div>
                <div className="text-3xl opacity-80">🔄</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Sales & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Sales Trend */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📅 Daily Sales Trend
            </h3>
            <span className="text-sm text-gray-500">Last 7 days</span>
          </div>
          
          {dailySales.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-500">No sales data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySales.slice(0, 7).map((day, index) => {
                const isToday = new Date(day.date).toDateString() === new Date().toDateString();
                const maxSales = Math.max(...dailySales.slice(0, 7).map(d => d.sales));
                const barWidth = (day.sales / maxSales) * 100;
                
                return (
                  <div key={day.date} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${
                        isToday ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {isToday ? 'Today' : formatDate(day.date)}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{day.transactions} txns</span>
                        <span className={`font-semibold ${
                          isToday ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {formatCurrency(day.sales)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isToday ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🏆 Top Selling Products
            </h3>
            <span className="text-sm text-gray-500">This {period}</span>
          </div>
          
          {topProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-500">No product data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.barcode} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-40">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.barcode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.total_revenue)}</p>
                    <p className="text-sm text-gray-500">{product.total_quantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🧾 Recent Transactions
            <span className="text-sm font-normal text-gray-500">({filteredBills.length} total)</span>
          </h3>
          
          {filteredBills.length > 10 && (
            <p className="text-sm text-gray-500">Showing latest 10 transactions</p>
          )}
        </div>
        
        {filteredBills.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-500">
              {activeFiltersCount > 0 
                ? 'Try adjusting your filters to see more results.' 
                : 'No transactions available for the selected period.'}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBills.slice(0, 10).map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-blue-600">
                      BILL-{bill.id.toString().padStart(6, '0')}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDateTime(bill.created_at).split(', ')[0]}</span>
                        <span className="text-xs text-gray-500">{formatDateTime(bill.created_at).split(', ')[1]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-600">
                      {formatCurrency(bill.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        bill.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                        bill.payment_method === 'upi' ? 'bg-blue-100 text-blue-800' :
                        bill.payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(bill.payment_method || 'cash').charAt(0).toUpperCase() + 
                         (bill.payment_method || 'cash').slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {bill.customer_name ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{bill.customer_name}</span>
                          {bill.customer_phone && (
                            <span className="text-xs text-gray-500">{bill.customer_phone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Walk-in Customer</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className="text-sm">
                        {bill.items ? `${bill.items.length} items` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredBills.length > 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing 10 of {filteredBills.length} transactions. 
              <button 
                onClick={exportToCSV}
                className="text-blue-600 hover:text-blue-800 font-medium ml-1"
              >
                Export all to CSV
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesHistory;
