import React, { useEffect, useState } from "react";
import { VendorsAPI } from "../api";
import { useNavigate } from "react-router-dom";

function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [vendorBalances, setVendorBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadVendorsWithBalances();
  }, []);

  const loadVendorsWithBalances = async () => {
    try {
      const vendorsList = await VendorsAPI.list();
      setVendors(vendorsList);
      
      // Load balances for all vendors
      const balances = {};
      await Promise.all(
        vendorsList.map(async (vendor) => {
          try {
            const balance = await VendorsAPI.getBalance(vendor.id);
            balances[vendor.id] = balance;
          } catch (err) {
            // If balance fails, set default
            balances[vendor.id] = {
              outstandingBalance: 0,
              status: 'settled'
            };
          }
        })
      );
      setVendorBalances(balances);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBalanceColor = (status) => {
    switch (status) {
      case 'due': return '#dc2626'; // red
      case 'advance': return '#16a34a'; // green
      case 'settled': return '#6b7280'; // gray
      default: return '#6b7280';
    }
  };

  const getBalanceIcon = (status) => {
    switch (status) {
      case 'due': return '⚠️';
      case 'advance': return '✅';
      case 'settled': return '⚪';
      default: return '⚪';
    }
  };

  const deleteVendor = async id => {
    if (!window.confirm("Delete this vendor?")) return;
    
    try {
      await VendorsAPI.remove(id);
      setVendors(vs => vs.filter(v => v.id !== id));
      // Remove balance data for deleted vendor
      setVendorBalances(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete vendor:', err);
      
      // Show specific error message to user
      const errorMessage = err?.response?.data?.error || err.message || 'Failed to delete vendor';
      alert(errorMessage);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "20px auto", padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#111827" }}>📦 Vendors</h2>
          <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "16px" }}>Manage vendor profiles, track payments, and monitor outstanding balances</p>
        </div>
        <button
          onClick={() => navigate('/vendors/new')}
          style={{
            padding: "12px 24px",
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          + Add Vendor
        </button>
      </div>

      {/* Vendor List */}
      {loading ? (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "200px",
          backgroundColor: "white",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}>
          <p style={{ fontSize: "18px", color: "#6b7280" }}>Loading vendors...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div style={{
          backgroundColor: "white",
          padding: 40,
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "48px", marginBottom: 16 }}>📁</div>
          <h3 style={{ margin: "0 0 8px 0", color: "#374151" }}>No Vendors Found</h3>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>Get started by adding your first vendor</p>
          <button
            onClick={() => navigate('/vendors/new')}
            style={{
              padding: "12px 24px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            + Add First Vendor
          </button>
        </div>
      ) : (
  <table
    style={{
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "white",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    }}
  >
    <thead style={{ background: "#f3f4f6" }}>
      <tr>
        <th style={{ textAlign: "left", padding: 12 }}>Vendor Name</th>
        <th style={{ textAlign: "left", padding: 12 }}>Contact</th>
        <th style={{ textAlign: "center", padding: 12 }}>Balance Status</th>
        <th style={{ textAlign: "right", padding: 12 }}>Outstanding</th>
        <th style={{ textAlign: "center", padding: 12 }}>Actions</th>
      </tr>
    </thead>
    <tbody>
      {vendors.map(v => {
        const balance = vendorBalances[v.id] || { outstandingBalance: 0, status: 'settled' };
        return (
          <tr key={v.id} style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: 12 }}>
              <div>
                <div style={{ fontWeight: "600", color: "#111827" }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {v.id}</div>
              </div>
            </td>
            <td style={{ padding: 12, color: "#4b5563" }}>
              {v.phone || v.email || "No contact info"}
            </td>
            <td style={{ padding: 12, textAlign: "center" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: "500",
                backgroundColor: balance.status === 'due' ? '#fef2f2' : 
                                balance.status === 'advance' ? '#f0fdf4' : '#f9fafb',
                color: getBalanceColor(balance.status)
              }}>
                {getBalanceIcon(balance.status)}
                {balance.status === 'due' ? 'Due' : 
                 balance.status === 'advance' ? 'Advance' : 'Settled'}
              </span>
            </td>
            <td style={{ 
              padding: 12, 
              textAlign: "right",
              fontWeight: "600",
              color: getBalanceColor(balance.status)
            }}>
              ₹{Math.abs(balance.outstandingBalance).toFixed(2)}
            </td>
            <td style={{ padding: 12, textAlign: "center" }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  onClick={() => navigate(`/vendors/${v.id}`)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Profile
                </button>
                <button
                  onClick={() => navigate(`/purchases?vendor=${v.id}`)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Purchases
                </button>
                <button
                  onClick={() => deleteVendor(v.id)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
      )}

    </div>
  );
}

export default VendorsPage;
