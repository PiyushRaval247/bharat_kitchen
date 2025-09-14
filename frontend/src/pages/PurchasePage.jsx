import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Select from "react-select";
import { VendorsAPI, ProductsAPI, PurchasesAPI } from "../api";

function PurchasePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vendorId = searchParams.get("vendor");
  const [vendor, setVendor] = useState(null);
  const [vendorBalance, setVendorBalance] = useState(null);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState({ product_id: "", quantity: 1, price: "" });
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    notes: "",
    payment_mode: "cash",
  });
  const [paymentHistory, setPaymentHistory] = useState([]);

  async function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("vendor_id", vendorId);

      // use axios wrapper instead of fetch
      await PurchasesAPI.import(formData);

      // reload purchases
      const ps = await PurchasesAPI.list();
      setPurchases(ps.filter((p) => p.vendor_id === Number(vendorId)));

      alert("✅ Import completed");
    } catch (err) {
      alert("❌ Import failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  useEffect(() => {
    if (vendorId) {
      // Load vendor details and balance
      Promise.all([
        VendorsAPI.list(),
        VendorsAPI.getBalance(vendorId),
        VendorsAPI.getPayments(vendorId),
      ])
        .then(([vendors, balance, payments]) => {
          setVendor(vendors.find((v) => v.id === Number(vendorId)));
          setVendorBalance(balance);
          setPaymentHistory(payments.slice(0, 5)); // Last 5 payments
        })
        .catch((err) => {
          console.error("Failed to load vendor data:", err);
        });

      // Reload purchases without filtering to ensure we get all records
      PurchasesAPI.list().then((ps) => {
        const vendorPurchases = ps.filter((p) => p.vendor_id === Number(vendorId));
        console.log('Loaded purchases for vendor:', vendorId, vendorPurchases.length, 'purchases');
        setPurchases(vendorPurchases);
      });
      // Filter products to show only those belonging to this vendor
      ProductsAPI.list().then((allProducts) => {
        const vendorProducts = allProducts.filter(
          (product) =>
            product.primary_vendor &&
            product.primary_vendor.id === Number(vendorId)
        );
        setProducts(vendorProducts);
      });
    }
  }, [vendorId]);

  const getBalanceColor = (status) => {
    switch (status) {
      case "due":
        return "text-red-600 bg-red-50 border-red-200";
      case "advance":
        return "text-green-600 bg-green-50 border-green-200";
      case "settled":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "due":
        return "⚠️";
      case "advance":
        return "✅";
      case "settled":
        return "⚪";
      default:
        return "⚪";
    }
  };

  const refreshVendorBalance = async () => {
    try {
      const balance = await VendorsAPI.getBalance(vendorId);
      setVendorBalance(balance);
      // Also refresh payment history
      const payments = await VendorsAPI.getPayments(vendorId);
      setPaymentHistory(payments.slice(0, 5));
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  };

  const handleQuickPayment = async (amount) => {
    try {
      await VendorsAPI.addPayment(vendorId, {
        amount: Number(amount),
        payment_mode: "cash",
        notes: `Quick settlement - ${new Date().toLocaleDateString()}`,
        payment_date: new Date().toISOString().split("T")[0],
      });
      await refreshVendorBalance();
      alert("✅ Payment recorded successfully!");
    } catch (err) {
      alert(
        "❌ Failed to record payment: " +
          (err?.response?.data?.error || err.message)
      );
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    try {
      await VendorsAPI.addPayment(vendorId, {
        amount: Number(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        notes: paymentForm.notes,
        payment_date: new Date().toISOString().split("T")[0],
      });
      await refreshVendorBalance();
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", notes: "", payment_mode: "cash" });
      alert("✅ Payment recorded successfully!");
    } catch (err) {
      alert(
        "❌ Failed to record payment: " +
          (err?.response?.data?.error || err.message)
      );
    }
  };
  const handleChange = (selectedOption) => {
    const selectedProduct = products.find((p) => p.id === selectedOption.value);
    setForm({
      ...form,
      product_id: selectedOption.value,
      price: selectedProduct
        ? selectedProduct.wholesale_price || selectedProduct.price
        : "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Creating purchase:', { ...form, vendor_id: vendorId });
      
      const createdPurchase = await PurchasesAPI.create({ ...form, vendor_id: vendorId });
      console.log('Purchase created successfully:', createdPurchase);

      setMsg("✅ Purchase recorded successfully!");

      setForm({ product_id: "", quantity: 1, price: "" });
      
      // Force reload purchases to get updated data with a small delay to ensure database consistency
      setTimeout(() => {
        PurchasesAPI.list().then((ps) => {
          const vendorPurchases = ps.filter((p) => p.vendor_id === Number(vendorId));
          console.log('Reloaded purchases after creation:', vendorPurchases.length, 'total purchases');
          console.log('Latest purchase for this vendor:', vendorPurchases[0]);
          setPurchases(vendorPurchases);
        });
      }, 500);
      
      // Refresh vendor balance after adding purchase
      refreshVendorBalance();
    } catch (err) {
      console.error('Purchase creation error:', err);
      setMsg("❌ Error: " + (err?.response?.data?.error || err.message));
    }
  };

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this purchase?"))
      return;

    try {
      await PurchasesAPI.remove(id);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      // Refresh vendor balance after deleting purchase
      refreshVendorBalance();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete purchase");
    }
  }

  // dropdown options for react-select
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const filteredPurchases = purchases.filter((p) => {
    if (!filterDate) return true; // no filter applied
    // Ensure proper date comparison - extract date part from purchase timestamp
    const purchaseDate = p.purchased_at ? p.purchased_at.split('T')[0] : p.purchased_at;
    return purchaseDate === filterDate;
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Purchases for Vendor:{" "}
            <span className="text-blue-600">
              {vendor ? vendor.name : vendorId}
            </span>
          </h2>
          <p className="text-gray-600 mt-1">
            Manage purchases and track vendor payments
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/vendors/${vendorId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Vendor Profile
          </button>
          <button
            onClick={() => navigate("/vendors")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back to Vendors
          </button>
        </div>
      </div>

      {/* Vendor Balance Summary */}
      {vendorBalance && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Account Summary
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Add Payment
              </button>
              <button
                onClick={() => navigate(`/vendors/${vendorId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                View Profile
              </button>
              <button
                onClick={refreshVendorBalance}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">
                Total Purchases
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ₹{vendorBalance.totalPurchases.toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">
                Total Payments
              </div>
              <div className="text-2xl font-bold text-green-900">
                ₹{vendorBalance.totalPayments.toFixed(2)}
              </div>
            </div>
            <div
              className={`p-4 rounded-lg border ${getBalanceColor(
                vendorBalance.status
              )}`}
            >
              <div className="text-sm font-medium flex items-center gap-2">
                <span>{getStatusIcon(vendorBalance.status)}</span>
                Outstanding Balance
              </div>
              <div className="text-2xl font-bold">
                ₹{Math.abs(vendorBalance.outstandingBalance).toFixed(2)}
              </div>
              <div className="text-xs mt-1">
                {vendorBalance.status === "due" && "Amount Due"}
                {vendorBalance.status === "advance" && "Advance Payment"}
                {vendorBalance.status === "settled" && "Fully Settled"}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">
                Payment Terms
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {vendor?.payment_terms_days || 30} days
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {vendorBalance.status === "due" &&
            vendorBalance.outstandingBalance > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-medium text-red-800">
                      ⚠️ Payment Due
                    </div>
                    <div className="text-sm text-red-600">
                      Outstanding amount: ₹
                      {vendorBalance.outstandingBalance.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Settle Payment
                  </button>
                </div>

                {/* Quick Payment Buttons */}
                <div className="flex gap-2 mt-3">
                  <span className="text-sm text-red-700 font-medium mr-2">
                    Quick Pay:
                  </span>
                  <button
                    onClick={() =>
                      handleQuickPayment(vendorBalance.outstandingBalance / 2)
                    }
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                  >
                    50% (₹{(vendorBalance.outstandingBalance / 2).toFixed(2)})
                  </button>
                  <button
                    onClick={() =>
                      handleQuickPayment(vendorBalance.outstandingBalance)
                    }
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Full (₹{vendorBalance.outstandingBalance.toFixed(2)})
                  </button>
                  {vendorBalance.outstandingBalance >= 1000 && (
                    <button
                      onClick={() => handleQuickPayment(1000)}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                    >
                      ₹1,000
                    </button>
                  )}
                  {vendorBalance.outstandingBalance >= 5000 && (
                    <button
                      onClick={() => handleQuickPayment(5000)}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                    >
                      ₹5,000
                    </button>
                  )}
                </div>
              </div>
            )}

          {vendorBalance.status === "advance" && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-green-800">
                    ✅ Advance Payment
                  </div>
                  <div className="text-sm text-green-600">
                    Credit balance: ₹
                    {Math.abs(vendorBalance.outstandingBalance).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/vendors/${vendorId}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  View Profile
                </button>
              </div>
            </div>
          )}

          {/* Recent Payment History Preview */}
          {paymentHistory.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-800">Recent Payments</h4>
                <button
                  onClick={() => navigate(`/vendors/${vendorId}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {paymentHistory.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-600">
                        {payment.payment_date}
                      </span>
                      {payment.notes && (
                        <span className="text-gray-500">- {payment.notes}</span>
                      )}
                    </div>
                    <span className="font-medium text-green-700">
                      ₹{payment.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Section */}

      {/* Purchase Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="block mb-2">
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={onImport}
            disabled={importing}
            className=""
          />
          {importing && <span className="text-blue-600">Importing...</span>}
        </div>
        <h3 className="text-lg font-semibold mb-4">Add New Purchase</h3>
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap gap-3 items-end"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product
            </label>
            <Select
              options={productOptions}
              value={productOptions.find(
                (opt) => opt.value === form.product_id
              )}
              onChange={handleChange}
              placeholder="Search or select product..."
              isSearchable
              styles={{
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
                menuList: (base) => ({
                  ...base,
                  maxHeight: 200,
                  overflowY: "auto",
                }),
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              min="1"
              onChange={handleInputChange}
              required
              className="w-24 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (Wholesale)
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              min="0"
              step="0.01"
              onChange={handleInputChange}
              required
              className="w-28 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Add Purchase
          </button>
        </form>

        {msg && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
            {msg}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 mt-3">
          <label className="text-sm font-medium text-gray-700">
            Filter by Date:
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-md p-2"
          />
        </div>

        <table className="w-full border-collapse border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left">ID</th>
              <th className="border px-3 py-2 text-left">Vendor</th>
              <th className="border px-3 py-2 text-left">Product</th>
              <th className="border px-3 py-2 text-right">Quantity</th>
              <th className="border px-3 py-2 text-right">Unit Price</th>
              <th className="border px-3 py-2 text-right">Total</th>{" "}
              {/* 👈 NEW */}
              <th className="border px-3 py-2 text-left">Purchased At</th>
              <th className="border px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPurchases.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2">{p.id}</td>
                <td className="border px-3 py-2">{p.vendors?.name || "—"}</td>
                <td className="border px-3 py-2">{p.products?.name || "—"}</td>
                <td className="border px-3 py-2 text-right">{p.quantity}</td>
                <td className="border px-3 py-2 text-right">₹{p.price}</td>
                <td className="border px-3 py-2 text-right">
                  ₹{(p.price * p.quantity).toFixed(2)}
                </td>{" "}
                {/* 👈 NEW */}
                <td className="border px-3 py-2">
                  {p.purchased_at
                    ? new Date(p.purchased_at + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "—"}
                </td>
                <td className="border px-3 py-2 text-center">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={5} className="border px-3 py-2 text-right">
                Grand Total
              </td>
              <td className="border px-3 py-2 text-right">
                ₹
                {filteredPurchases
                  .reduce((sum, p) => sum + (p.price * p.quantity || 0), 0)
                  .toFixed(2)}
              </td>
              <td colSpan={2} className="border px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Payment
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentForm({
                    amount: "",
                    notes: "",
                    payment_mode: "cash",
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_mode: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  placeholder="Payment notes or reference"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Quick Amount Buttons */}
              {vendorBalance && vendorBalance.outstandingBalance > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Select
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: (
                            vendorBalance.outstandingBalance / 2
                          ).toString(),
                        })
                      }
                      className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                    >
                      50% (₹{(vendorBalance.outstandingBalance / 2).toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: vendorBalance.outstandingBalance.toString(),
                        })
                      }
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Full (₹{vendorBalance.outstandingBalance.toFixed(2)})
                    </button>
                    {[1000, 5000, 10000].map((amount) => {
                      if (amount <= vendorBalance.outstandingBalance) {
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() =>
                              setPaymentForm({
                                ...paymentForm,
                                amount: amount.toString(),
                              })
                            }
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            ₹{amount.toLocaleString()}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentForm({
                      amount: "",
                      notes: "",
                      payment_mode: "cash",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchasePage;
