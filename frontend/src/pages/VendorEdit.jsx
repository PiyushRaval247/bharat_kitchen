import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendorsAPI } from '../api';

function VendorEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    payment_terms_days: 30
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ensure we're correctly identifying new vendors
  const isNewVendor = id === 'new' || id === undefined || id === null || (typeof id === 'string' && isNaN(parseInt(id)));

  useEffect(() => {
    if (!isNewVendor) {
      loadVendor();
    } else {
      // Reset form data when creating a new vendor
      setFormData({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
        payment_terms_days: 30
      });
    }
  }, [id]);

  const loadVendor = async () => {
    try {
      // Validate that we have a valid numeric ID before attempting to load
      if (!id || id === 'new' || isNaN(parseInt(id))) {
        return;
      }
      
      const vendor = await VendorsAPI.getById(id);
      setFormData({
        name: vendor.name || '',
        contact_name: vendor.contact_name || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        gst_number: vendor.gst_number || '',
        payment_terms_days: vendor.payment_terms_days || 30
      });
    } catch (err) {
      setError('Failed to load vendor details: ' + (err.message || 'Unknown error'));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vendor name is required');
      return;
    }

    try {
      setLoading(true);
      
      // Ensure we're correctly identifying new vendors
      if (isNewVendor) {
        // Create new vendor
        const newVendor = await VendorsAPI.create(formData);
        setSuccess('Vendor created successfully!');
        
        // Navigate to the newly created vendor's profile
        setTimeout(() => {
          navigate(`/vendors/${newVendor.id}`);
        }, 1500);
      } else {
        // Validate that we have a valid numeric ID before updating
        if (!id || isNaN(parseInt(id))) {
          throw new Error('Invalid vendor ID for update');
        }
        
        // Update existing vendor
        await VendorsAPI.update(id, formData);
        setSuccess('Vendor updated successfully!');
        
        // Navigate back to the vendor's profile
        setTimeout(() => {
          navigate(`/vendors/${id}`);
        }, 1500);
      }
      
    } catch (err) {
      setError(`Failed to ${isNewVendor ? 'create' : 'update'} vendor: ` + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => navigate(isNewVendor ? '/vendors' : `/vendors/${id}`)}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to {isNewVendor ? 'Vendors' : 'Vendor Profile'}
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isNewVendor ? 'Add New Vendor' : 'Edit Vendor Profile'}
        </h1>
        <p className="text-gray-600">
          {isNewVendor ? 'Create a new vendor profile' : 'Update vendor information'}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Vendor Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter vendor/company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Primary contact person name"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Complete business address"
              />
            </div>
          </div>

          {/* Business Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1">Format: 22AAAAA0000A1Z5</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms (Days)
                </label>
                <select
                  name="payment_terms_days"
                  value={formData.payment_terms_days}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>Immediate (0 days)</option>
                  <option value={7}>1 Week (7 days)</option>
                  <option value={15}>15 Days</option>
                  <option value={30}>1 Month (30 days)</option>
                  <option value={45}>45 Days</option>
                  <option value={60}>2 Months (60 days)</option>
                  <option value={90}>3 Months (90 days)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Credit period allowed for payments
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isNewVendor ? 'Creating...' : 'Updating...') 
                : (isNewVendor ? 'Create Vendor' : 'Update Vendor')
              }
            </button>
            <button
              type="button"
              onClick={() => navigate(isNewVendor ? '/vendors' : `/vendors/${id}`)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Information Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Information Note:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Only vendor name is required, all other fields are optional</li>
          <li>• GST number should be valid 15-character format if provided</li>
          <li>• Payment terms determine the credit period for this vendor</li>
          <li>• You can update this information anytime from the vendor profile</li>
        </ul>
      </div>
    </div>
  );
}

export default VendorEdit;