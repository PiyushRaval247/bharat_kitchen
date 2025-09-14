import React from "react";
import { Plus, Minus, X } from "lucide-react";

export default function ProductTable({ items, changeQty, removeItem, priceMode }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 italic">
        No products yet. Please scan or add a product.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white ">
      <table className="w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700 text-sm uppercase">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">
              {priceMode === "retail" ? "Retail Price" : "Wholesale Price"}
            </th>
            <th className="p-3 text-center">Qty</th>
            <th className="p-3 text-right">Subtotal</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const price =
              priceMode === "retail" ? it.price : it.wholesale_price ?? it.price;

            return (
              <tr
                key={it.productId}
                className="border-b hover:bg-gray-50 transition"
              >
                {/* Name */}
                <td className="p-3 font-medium text-gray-800">{it.name}</td>

                {/* Price */}
                <td className="p-3 text-gray-600">₹{price.toFixed(2)}</td>

                {/* Quantity Controls */}
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => changeQty(i, Math.max(1, it.quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="text"
                      value={it.quantity}
                      readOnly
                      className="w-12 text-center border rounded-md bg-gray-50"
                    />
                    <button
                      onClick={() => changeQty(i, it.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </td>

                {/* Subtotal */}
                <td className="p-3 text-right font-semibold text-gray-900">
                  ₹{(price * it.quantity).toFixed(2)}
                </td>

                {/* Actions */}
                <td className="p-3 text-center">
                  <button
                    onClick={() => removeItem(i)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                  >
                    <X size={14} /> Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
