import React, { useEffect, useState, useMemo } from "react";
import { ProductsAPI, VendorsAPI } from "../api";
import LowStock from "./LowStock";
import SalesHistory from "./SalesHistory";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");

  // Tab management
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'lowstock', or 'dashboard'

  // ✅ Separate Add & Edit states
  const [addForm, setAddForm] = useState({
    name: "",
    price: "", // Final retail price (with GST)
    wholesale_price: "", // Final wholesale price (with GST)
    stock: "",
    barcode: "",
    vendor_id: "",
    gst_rate: "18",
    is_gst_exempt: false,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    price: "", // Final retail price (with GST)
    wholesale_price: "", // Final wholesale price (with GST)
    stock: "",
    barcode: "",
    vendor_id: "",
    gst_rate: "18",
    is_gst_exempt: false,
  });

  const [editingId, setEditingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [importing, setImporting] = useState(false);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // Show all vendors in the dropdown for product assignment
  const relevantVendors = useMemo(() => {
    return vendors; // Show all vendors, not just those with existing products
  }, [vendors]);

  const load = async () => {
    const data = await ProductsAPI.list();
    setProducts(data);
  };

  const loadVendors = async () => {
    const vendorData = await VendorsAPI.list();
    setVendors(vendorData);
  };

  useEffect(() => {
    load();
    loadVendors();
  }, []);

  // ---------- ADD FORM ----------
  const onAddSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: addForm.name,
      price: Number(addForm.price),
      wholesale_price: Number(addForm.wholesale_price || 0),
      stock: Number(addForm.stock || 0),
      barcode: addForm.barcode || undefined,
      vendor_id: addForm.vendor_id ? Number(addForm.vendor_id) : undefined,
      gst_rate: Number(addForm.gst_rate || 18),
      is_gst_exempt: addForm.is_gst_exempt,
    };
    
    await ProductsAPI.create(payload);
    setAddForm({
      name: "",
      price: "",
      wholesale_price: "",
      stock: "",
      barcode: "",
      vendor_id: "",
      gst_rate: "18",
      is_gst_exempt: false,
    });
    await load();
  };

  // ---------- EDIT FORM ----------
  const onEditSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: editForm.name,
      price: Number(editForm.price),
      wholesale_price: Number(editForm.wholesale_price || 0),
      stock: Number(editForm.stock || 0),
      barcode: editForm.barcode || undefined,
      vendor_id: editForm.vendor_id ? Number(editForm.vendor_id) : undefined,
      gst_rate: Number(editForm.gst_rate || 18),
      is_gst_exempt: editForm.is_gst_exempt,
    };
    
    if (editingId) {
      await ProductsAPI.update(editingId, payload);
    }
    setShowEditModal(false);
    setEditingId(null);
    setEditForm({
      name: "",
      price: "",
      wholesale_price: "",
      stock: "",
      barcode: "",
      vendor_id: "",
      gst_rate: "18",
      is_gst_exempt: false,
    });
    await load();
  };

  const onEdit = (p) => {
    setEditingId(p.id);
    
    setEditForm({
      name: p.name,
      price: String(p.price || 0),
      wholesale_price: String(p.wholesale_price || 0),
      stock: String(p.stock),
      barcode: p.barcode || "",
      vendor_id: p.primary_vendor ? String(p.primary_vendor.id) : "",
      gst_rate: String(p.gst_rate || 18),
      is_gst_exempt: p.is_gst_exempt || false,
    });
    setShowEditModal(true);
  };

  const onDelete = async (p) => {
    if (!confirm("Delete product?")) return;
    await ProductsAPI.remove(p.id);
    await load();
  };

  async function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await uploadImport(file);
      await load();
      alert("Import completed");
    } catch (err) {
      alert("Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Tabs */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📦 Inventory Management</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Products & Stock
            </button>
            <button
              onClick={() => setActiveTab('lowstock')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lowstock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚠️ Low Stock Alerts
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Sales Dashboard
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' ? (
        <div>
          <p className="text-gray-600 mb-6">Manage your product inventory, pricing, and stock levels</p>
    <div className="products">
      {/* Add Product Form */}
      <div className="card">
  <h2 className="text-xl font-semibold mb-4">Add Product</h2>

  <form onSubmit={onAddSubmit} className="space-y-6">
    {/* First Row - Product + Vendor */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        placeholder="Product Name"
        value={addForm.name}
        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
        required
      />
      <select
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        value={addForm.vendor_id}
        onChange={(e) =>
          setAddForm({ ...addForm, vendor_id: e.target.value })
        }
      >
        <option value="">Select Vendor (Optional)</option>
        {relevantVendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.name}
          </option>
        ))}
      </select>
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        placeholder="Barcode (Optional)"
        value={addForm.barcode}
        onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })}
      />
    </div>

    {/* Second Row - Prices + Stock */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        type="number"
        step="0.01"
        placeholder="Wholesale Price (Final)"
        value={addForm.wholesale_price}
        onChange={(e) =>
          setAddForm({ ...addForm, wholesale_price: e.target.value })
        }
      />
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        type="number"
        step="0.01"
        placeholder="Retail Price (Final)"
        value={addForm.price}
        onChange={(e) =>
          setAddForm({ ...addForm, price: e.target.value })
        }
        required
      />
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        type="number"
        placeholder="Stock"
        value={addForm.stock}
        onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
      />
    </div>

    {/* Third Row - GST + Exempt + Button */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <select
        className="border rounded-md px-3 py-2 w-full focus:ring focus:ring-blue-200"
        value={addForm.gst_rate}
        onChange={(e) =>
          setAddForm({ ...addForm, gst_rate: e.target.value })
        }
      >
        <option value="0">0% GST</option>
        <option value="5">5% GST</option>
        <option value="12">12% GST</option>
        <option value="18">18% GST</option>
        <option value="28">28% GST</option>
      </select>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={addForm.is_gst_exempt}
          onChange={(e) =>
            setAddForm({ ...addForm, is_gst_exempt: e.target.checked })
          }
        />
        <span className="text-gray-700">GST Exempt</span>
      </label>

      <button
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition w-full md:w-auto"
        type="submit"
      >
        Add Product
      </button>
    </div>
  </form>
</div>


      {/* Product Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2>Products</h2>
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            🏷️ Need to print labels? Use the dedicated <strong>Barcode</strong> page from the menu!
          </div>
        </div>

        {/* Import Section */}
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={onImport}
            disabled={importing}
          />
          {importing ? <span> Importing…</span> : null}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search product by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-64"
          />
          <div className="text-sm text-gray-600">
            Showing {filteredProducts.length} products • {relevantVendors.length} active vendors
          </div>
        </div>
        {/* Table */}
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Vendor</th>
              <th>Final Wholesale</th>
              <th>Final Retail</th>
              <th>GST Rate</th>
              <th>Stock</th>
              <th>Barcode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>
                    {p.primary_vendor ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {p.primary_vendor.name}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                        No Vendor
                      </span>
                    )}
                  </td>
                  <td>₹{Number(p.wholesale_price || 0).toFixed(2)}</td>
                  <td>₹{Number(p.price).toFixed(2)}</td>
                  <td>
                    {p.is_gst_exempt ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                        Exempt
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {p.gst_rate || 18}%
                      </span>
                    )}
                  </td>
                  <td>{p.stock}</td>
                  <td>
                    {p.barcode_path ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${p.barcode_path}`}
                        alt="barcode"
                        width={128}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="flex gap-2">
                    <button
                      onClick={() => onEdit(p)}
                      className="px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(p)}
                      className="px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingId(null);
                    setEditForm({
                      name: "",
                      price: "",
                      wholesale_price: "",
                      stock: "",
                      barcode: "",
                      vendor_id: "",
                      gst_rate: "18",
                      is_gst_exempt: false,
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={onEditSubmit} className="space-y-6">
                {/* Basic Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-1 block">Product Name</span>
                    <input
                      className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      required
                    />
                  </label>
                  
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-1 block">Vendor</span>
                    <select
                      className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editForm.vendor_id}
                      onChange={(e) =>
                        setEditForm({ ...editForm, vendor_id: e.target.value })
                      }
                    >
                      <option value="">Select Vendor (Optional)</option>
                      {relevantVendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Pricing Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-1 block">Wholesale Price (Final)</span>
                      <input
                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        type="number"
                        step="0.01"
                        value={editForm.wholesale_price}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            wholesale_price: e.target.value,
                          })
                        }
                      />
                    </label>
                    
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-1 block">Retail Price (Final)</span>
                      <input
                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value })
                        }
                        required
                      />
                    </label>
                  </div>
                </div>

                {/* Tax Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-1 block">GST Rate</span>
                      <select
                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editForm.gst_rate}
                        onChange={(e) => setEditForm({ ...editForm, gst_rate: e.target.value })}
                      >
                        <option value="0">0% GST</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </select>
                    </label>
                    
                    <div className="flex items-center">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={editForm.is_gst_exempt}
                          onChange={(e) => setEditForm({ ...editForm, is_gst_exempt: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">GST Exempt</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Other Details Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Other Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-1 block">Stock</span>
                      <input
                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        type="number"
                        value={editForm.stock}
                        onChange={(e) =>
                          setEditForm({ ...editForm, stock: e.target.value })
                        }
                      />
                    </label>
                    
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-1 block">Barcode</span>
                      <input
                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editForm.barcode}
                        onChange={(e) =>
                          setEditForm({ ...editForm, barcode: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Fixed Footer with Buttons */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingId(null);
                  setEditForm({
                    name: "",
                    price: "",
                    wholesale_price: "",
                    stock: "",
                    barcode: "",
                    vendor_id: "",
                    gst_rate: "18",
                    is_gst_exempt: false,
                  });
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editForm"
                onClick={onEditSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
        </div>
      ) : activeTab === 'lowstock' ? (
        <div>
          <LowStock />
        </div>
      ) : (
        <div>
          <SalesHistory />
        </div>
      )}
    </div>
  );
}

async function uploadImport(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products/import`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let message = "Import failed";
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch (_) {
      try {
        message = await res.text();
      } catch (_) {}
    }
    throw new Error(message);
  }
  return res.json();
}
