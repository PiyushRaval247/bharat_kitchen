import React, { useEffect } from "react";

export default function UnknownProductForm({
  unknownCode,
  newProduct,
  setNewProduct,
  createFromUnknown,
  cancel,
  vendors = [],
}) {
  // Handle Escape key to close modal and Enter to submit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        cancel();
      } else if (e.key === "Enter" && newProduct.name && newProduct.price) {
        e.preventDefault();
        createFromUnknown();
      }
    };

    if (unknownCode) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [unknownCode, cancel, createFromUnknown, newProduct.name, newProduct.price]);

  if (!unknownCode) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Create New Product
          </h3>
          <button
            onClick={cancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scanned Code
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50"
              value={unknownCode}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product name"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹)
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, price: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="number"
                placeholder="0"
                value={newProduct.stock}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, stock: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wholesale Price (₹)
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newProduct.wholesale_price || ""}
              onChange={(e) =>
                setNewProduct({ ...newProduct, wholesale_price: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor (Optional)
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newProduct.vendor_id || ""}
              onChange={(e) =>
                setNewProduct({ ...newProduct, vendor_id: e.target.value })
              }
            >
              <option value="">Select a vendor...</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <button
            onClick={cancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={createFromUnknown}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            disabled={!newProduct.name || !newProduct.price}
          >
            Create & Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
