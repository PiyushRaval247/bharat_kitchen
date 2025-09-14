import React, { useState } from "react";

export default function PaymentCustomerForm({
  paymentMethod,
  setPaymentMethod,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  checkout,
  clearItems,
  items,
  loading,
}) {
  const [amountReceived, setAmountReceived] = useState("");

  if (!items.length) return null;

  // Calculate total from items (prices already include GST)
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  // Calculate change
  const change = Number(amountReceived || 0) - total;

  return (
<div className="mt-4">
  {/* Total (GST Included) */}
  <div className="mb-4">
    <span className="text-lg font-bold">
      Total (incl. GST): <span className="text-blue-600">₹{total.toFixed(2)}</span>
    </span>
  </div>

  {/* Row 1: Payment Method + Amount Received */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
    {/* Payment Method */}
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        Payment Method
      </label>
      <select
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
      >
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="upi">UPI</option>
        <option value="online">Online</option>
      </select>
    </div>

    {/* Amount Received (only if Cash) */}
    {paymentMethod === "cash" && (
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Amount Received
        </label>
        <input
          type="number"
          className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
          placeholder="Enter amount"
          value={amountReceived}
          onChange={(e) => setAmountReceived(e.target.value)}
        />
      </div>
    )}
  </div>

  {/* Row 2: Customer Name + Phone */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
    {/* Customer Name */}
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        Customer Name
      </label>
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        placeholder="Optional"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />
    </div>

    {/* Customer Phone */}
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        Customer Phone
      </label>
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        placeholder="Optional"
        value={customerPhone}
        onChange={(e) => setCustomerPhone(e.target.value)}
      />
    </div>
  </div>

  {/* Change/Due + Actions */}
  <div className="flex flex-wrap items-center justify-between mt-6 gap-3">
    {/* Change or Due */}
    {paymentMethod === "cash" && amountReceived && (
      <span
        className={`px-3 py-1 rounded-md font-semibold w-full ${
          change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {change >= 0
          ? `Change to Return: ₹${change.toFixed(2)}`
          : `Still Due: ₹${Math.abs(change).toFixed(2)}`}
      </span>
    )}

    {/* Buttons */}
    <div className="flex gap-3">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        onClick={checkout}
        disabled={loading || items.length === 0}
      >
        Checkout
      </button>
      <button
        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition"
        onClick={clearItems}
      >
        Clear All
      </button>
    </div>
  </div>
</div>


  );
}
