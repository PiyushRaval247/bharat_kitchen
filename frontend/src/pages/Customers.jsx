import React, { useState, useEffect } from 'react';
import { CustomersAPI } from '../api';
import { User, Phone, CreditCard, Calendar, Hash, Search, Download, Eye } from 'lucide-react';
import QRCode from 'qrcode';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
  const [customDate, setCustomDate] = useState('');
  const [allCustomerData, setAllCustomerData] = useState([]); // Store original unfiltered data

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      console.log('Fetching customers from API...');
      const data = await CustomersAPI.list();
      console.log('Customer data received:', data);
      setAllCustomerData(data); // Store original data
      setCustomers(data); // Display all by default
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error loading customer data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Date filtering function
  const filterCustomersByDate = (customers, filter, customDate = '') => {
    if (filter === 'all') return customers;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return customers.filter(customer => {
      const lastVisitDate = new Date(customer.last_visit);
      
      switch (filter) {
        case 'today':
          const customerDate = new Date(lastVisitDate.getFullYear(), lastVisitDate.getMonth(), lastVisitDate.getDate());
          return customerDate.getTime() === today.getTime();
        
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastVisitDate >= weekAgo;
        
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return lastVisitDate >= monthAgo;
        
        case 'custom':
          if (!customDate) return true;
          const selectedDate = new Date(customDate);
          const custDate = new Date(lastVisitDate.getFullYear(), lastVisitDate.getMonth(), lastVisitDate.getDate());
          const selDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          return custDate.getTime() === selDate.getTime();
        
        default:
          return true;
      }
    });
  };

  // Apply filters when filter options change
  useEffect(() => {
    const filtered = filterCustomersByDate(allCustomerData, dateFilter, customDate);
    setCustomers(filtered);
  }, [allCustomerData, dateFilter, customDate]);

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_phone?.includes(searchTerm)
  );

  const formatDate = (dateString) => {
    // The backend now sends IST timestamps, so we can format them directly
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const downloadReceipt = async (bill, customerInfo) => {
    try {
      // Build UPI link with your ID
      const upiLink = `upi://pay?pa=8200638429@pthdfc&pn=Bharat%20Kitchenware&am=${bill.total}&cu=INR`;

      // Generate QR Code Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(upiLink);

      const w = window.open('', '_blank', 'width=400,height=600');
      if (!w) return;

      // Handle customer info for receipt
      const customerName = customerInfo.customer_type === 'anonymous' 
        ? 'Walk-in Customer' 
        : (customerInfo.customer_name === 'N/A' ? 'Walk-in Customer' : customerInfo.customer_name);
      
      const customerPhone = customerInfo.customer_type === 'anonymous' 
        ? 'N/A' 
        : (customerInfo.customer_phone === 'N/A' ? 'N/A' : customerInfo.customer_phone);

      const html = `
        <html>
          <head>
            <title>Bill-${bill.bill_id}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 14px;
                margin: 0;
                padding: 20px;
              }
              .receipt {
                max-width: 350px;
                margin: auto;
                border: 1px dashed #333;
                padding: 15px;
                text-align: center;
              }
              .header {
                text-align: center !important;
                border-bottom: 1px solid #333;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .header h2 {
                margin: 0;
                font-size: 18px;
                text-align: center !important;
              }
              .info {
                margin: 10px 0;
                font-size: 12px;
                text-align: center !important;
              }
              .total {
                border-top: 1px solid #333;
                margin-top: 10px;
                padding-top: 10px;
                text-align: center !important;
                font-weight: bold;
                font-size: 16px;
              }
              .footer {
                margin-top: 15px;
                text-align: center !important;
                font-size: 12px;
                border-top: 1px solid #ccc;
                padding-top: 10px;
                color: #555;
              }
              .qr {
                margin-top: 15px;
                text-align: center !important;
              }
              .qr img {
                width: 180px;
                height: 180px;
                margin: 0 auto;
                display: block;
              }
            </style>
          </head>
          <body onload="window.print(); setTimeout(()=>window.close(), 1000);">
            <div class="receipt">
              <div class="header">
                <h2>Bharat Kitchenware</h2>
                <small>Bill No: BILL-${bill.bill_id.toString().padStart(6, '0')}</small><br/>
                <small>Date: ${formatDate(bill.created_at)}</small>
              </div>

              <div class="info">
                <strong>Customer:</strong> ${customerName}<br/>
                <strong>Phone:</strong> ${customerPhone}<br/>
                <strong>Payment:</strong> ${bill.payment_method || 'cash'}
              </div>

              <div class="total">
                Total: ₹${bill.total.toFixed(2)}
              </div>

              <div class="qr">
                <p>Scan & Pay:</p>
                <img src="${qrCodeDataUrl}" alt="Payment QR" />
              </div>

              <div class="footer">
                Thank you for shopping with us!<br/>
                Visit Again 🙏
              </div>
            </div>
          </body>
        </html>
      `;

      w.document.write(html);
      w.document.close();
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="h-8 w-8 text-blue-600" />
          Customer History
        </h1>
        <div className="text-sm text-gray-500">
          Total Customers: {allCustomerData.length}
          {dateFilter !== 'all' && (
            <span className="ml-2">• Filtered: {filteredCustomers.length}</span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search by customer name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Date Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filter by Date:</span>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Date
            </button>
            
            {/* Clear Filters Button */}
            {(dateFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setDateFilter('all');
                  setCustomDate('');
                  setSearchTerm('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
          
          {/* Custom Date Picker */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
          
          {/* Results Count */}
          <div className="text-sm text-gray-500 ml-auto">
            Showing {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
            {dateFilter !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {dateFilter === 'custom' && customDate 
                  ? `Date: ${new Date(customDate).toLocaleDateString('en-IN')}` 
                  : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)
                }
              </span>
            )}
          </div>
        </div>
        
        {/* Summary Stats for Filtered Period */}
        {filteredCustomers.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-600">Total Revenue</div>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(filteredCustomers.reduce((sum, customer) => sum + customer.total_spent, 0))}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-green-600">Total Bills</div>
              <div className="text-xl font-bold text-green-900">
                {filteredCustomers.reduce((sum, customer) => sum + customer.total_bills, 0)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-purple-600">Avg per Customer</div>
              <div className="text-xl font-bold text-purple-900">
                {formatCurrency(filteredCustomers.length > 0 
                  ? filteredCustomers.reduce((sum, customer) => sum + customer.total_spent, 0) / filteredCustomers.length 
                  : 0
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Bills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Visit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <React.Fragment key={index}>
                    {/* Main Customer Row */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              customer.customer_type === 'anonymous' 
                                ? 'bg-gray-100' 
                                : 'bg-blue-100'
                            }`}>
                              <User className={`h-6 w-6 ${
                                customer.customer_type === 'anonymous' 
                                  ? 'text-gray-600' 
                                  : 'text-blue-600'
                              }`} />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.customer_name || 'Anonymous'}
                              {customer.customer_type === 'anonymous' && (
                                <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                                  Walk-in
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {customer.customer_type === 'anonymous' 
                            ? 'Walk-in Customer' 
                            : (customer.customer_phone || 'N/A')
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Hash className="h-4 w-4 mr-2 text-gray-400" />
                          {customer.total_bills}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-green-600">
                          <CreditCard className="h-4 w-4 mr-2" />
                          {formatCurrency(customer.total_spent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(customer.last_visit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setExpandedCustomer(expandedCustomer === index ? null : index)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          {expandedCustomer === index ? 'Hide Bills' : 'View Bills'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Bills Section */}
                    {expandedCustomer === index && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 mb-3">Bill History ({customer.bills.length} bills)</h4>
                            <div className="space-y-1">
                              {customer.bills.map((bill) => (
                                <div key={bill.bill_id} className="flex items-center justify-between bg-white p-3 rounded border">
                                  <div className="flex items-center space-x-4">
                                    <span className="font-medium text-gray-900">#{bill.bill_id}</span>
                                    <span className="text-sm text-gray-600">{formatDate(bill.created_at)}</span>
                                    <span className="text-sm font-medium text-green-600">{formatCurrency(bill.total)}</span>
                                    <span className="text-sm text-gray-500 capitalize">{bill.payment_method}</span>
                                  </div>
                                  <button
                                    onClick={() => downloadReceipt(bill, customer)}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download Receipt
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}