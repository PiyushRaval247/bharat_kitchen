import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendorsAPI } from '../api';

function VendorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [balance, setBalance] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVendorData();
  }, [id]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      // Validate that we have a valid vendor ID
      if (!id) {
        setError('Invalid vendor ID');
        setLoading(false);
        return;
      }
      
      const vendorId = parseInt(id);
      if (isNaN(vendorId)) {
        setError('Invalid vendor ID format');
        setLoading(false);
        return;
      }
      
      const [vendorData, balanceData, paymentsData] = await Promise.all([
        VendorsAPI.getById(vendorId),
        VendorsAPI.getBalance(vendorId),
        VendorsAPI.getPayments(vendorId)
      ]);
      
      setVendor(vendorData);
      setBalance(balanceData);
      setPayments(paymentsData);
      setError('');
    } catch (err) {
      console.error('Failed to load vendor data:', err);
      setError('Failed to load vendor details: ' + (err.message || 'Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const getBalanceColor = (status) => {
    switch (status) {
      case 'due': return 'text-red-600 bg-red-50';
      case 'advance': return 'text-green-600 bg-green-50';
      case 'settled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading vendor profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={() => navigate('/vendors')}
          className="mt-2 text-red-600 hover:text-red-800"
        >
          ← Back to Vendors
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button 
            onClick={() => navigate('/vendors')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Vendors
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{vendor?.name}</h1>
          <p className="text-gray-600">Vendor Profile & Account Details</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/vendors/${id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Profile
          </button>
          <button
            onClick={() => navigate(`/purchases?vendor=${id}`)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            View Purchases
          </button>
        </div>
      </div>

      {/* Balance Summary Card */}
      {balance && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Purchases</div>
              <div className="text-2xl font-bold text-blue-900">₹{balance.totalPurchases.toFixed(2)}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Payments</div>
              <div className="text-2xl font-bold text-green-900">₹{balance.totalPayments.toFixed(2)}</div>
            </div>
            <div className={`p-4 rounded-lg ${getBalanceColor(balance.status)}`}>
              <div className="text-sm font-medium">Outstanding Balance</div>
              <div className="text-2xl font-bold">₹{Math.abs(balance.outstandingBalance).toFixed(2)}</div>
              <div className="text-xs mt-1">
                {balance.status === 'due' && 'Amount Due'}
                {balance.status === 'advance' && 'Advance Payment'}
                {balance.status === 'settled' && 'Fully Settled'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Payment Terms</div>
              <div className="text-2xl font-bold text-gray-900">{vendor?.payment_terms_days || 30} days</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'profile' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'payments' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Payment History ({payments.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Contact Person</label>
                    <p className="font-medium">{vendor?.contact_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone Number</label>
                    <p className="font-medium">{vendor?.phone || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email Address</label>
                    <p className="font-medium">{vendor?.email || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">GST Number</label>
                    <p className="font-medium">{vendor?.gst_number || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Payment Terms</label>
                    <p className="font-medium">{vendor?.payment_terms_days || 30} days credit</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Address</label>
                    <p className="font-medium">{vendor?.address || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Payment History</h3>
                <button
                  onClick={() => navigate(`/vendors/${id}/add-payment`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Payment
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments recorded yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{Number(payment.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {payment.payment_mode}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.reference_number || payment.transaction_id || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {payment.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorProfile;