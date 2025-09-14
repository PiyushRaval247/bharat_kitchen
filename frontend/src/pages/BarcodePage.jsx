import React, { useEffect, useState } from "react";
import { ProductsAPI, PrinterAPI } from "../api";
import CustomLabelPage from "./CustomLabelPage";

export default function BarcodePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [printQuantities, setPrintQuantities] = useState({});
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  
  // Print settings - Direct print only
  
  // Tab management
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' or 'custom'
  
  // Label configuration
  const [labelConfig, setLabelConfig] = useState({
    width: 48,
    height: 38,
    margin: 0,
    includeName: true,
    includePrice: true,
    includeBarcode: true,
    layout: '2up' // New: 2-up layout for 100mm page
  });

  // Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await ProductsAPI.list();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Print single product label
  const printLabel = async (product, copies = 1) => {
    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.printLabel) {
        // Use Electron IPC printing
        try {
          const result = await window.electronAPI.printLabel(product, copies, labelConfig);
          if (!result.success) {
            console.error('Label printing failed:', result.error);
            alert('❌ Label printing failed: ' + result.error);
          } else {
            // Show brief success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            toast.textContent = `✅ ${copies} label(s) sent to printer`;
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 2000);
          }
        } catch (error) {
          console.error('Label printing error:', error);
          alert('❌ Label printing error: ' + error.message);
        }
        return;
      }

      // Direct Windows print without preview
      const result = await PrinterAPI.printLabel(product.id, copies, labelConfig);
      if (result.success) {
        // Open Windows print dialog immediately
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
          alert('Please allow popups for printing');
          return;
        }
          
        const html = `
          <html>
            <head>
              <title>Print Labels - ${product.name}</title>
              <style>
                body { font-family: Arial; margin: 0; }
                .page { width: 108mm; margin: 0 auto; } /* Changed from 100mm to 108mm */
                .label-row { display: flex; gap: 2mm; margin-bottom: 2mm; justify-content: space-between; }
                .label { 
                  border: none; 
                  padding: 0; 
                  width: ${labelConfig.layout === '2up' ? '53mm' : '104mm'}; /* Adjusted for perfect fit */
                  height: ${labelConfig.height}mm;
                  text-align: center !important;
                  font-size: ${labelConfig.layout === '2up' ? '14px' : '16px'}; /* Increased text size */
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  gap: 8px;
                  page-break-inside: avoid;
                  flex-shrink: 0;
                }
                .barcode { font-family: monospace; font-size: ${labelConfig.layout === '2up' ? '12px' : '14px'}; margin: 0; text-align: center !important; } /* Increased barcode font */
                .barcode-image { max-width: ${labelConfig.layout === '2up' ? '45mm' : '85mm'}; height: auto; margin: 0; display: block; margin-left: auto; margin-right: auto; }
                .name { font-weight: bold; margin: 0; font-size: ${labelConfig.layout === '2up' ? '16px' : '20px'}; line-height: 1.2; text-align: center !important; } /* Increased name font size */
                .price { color: #000; font-size: ${labelConfig.layout === '2up' ? '18px' : '24px'}; font-weight: bold; margin: 0; text-align: center !important; } /* Increased price font size */
                @media print {
                  body { margin: 0; }
                  .page { width: 108mm; margin: 0; } /* Changed from 100mm to 108mm */
                  .label { border: none; }
                  .label-row { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="page">
                ${labelConfig.layout === '2up' ? 
                  // 2-up layout: arrange labels in pairs
                  Array.from({length: Math.ceil(copies / 2)}, (_, rowIndex) => {
                    const labelsInRow = Math.min(2, copies - (rowIndex * 2));
                    return `
                      <div class="label-row">
                        ${Array.from({length: labelsInRow}, (_, colIndex) => `
                          <div class="label">
                            <div class="name">${product.name}</div>
                            <div class="price">₹${product.price}</div>
                            ${product.barcode_path ? `<img src="${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" />` : ''}
                          </div>
                        `).join('')}
                      </div>
                    `;
                  }).join('') :
                  // Single layout: one label per row
                  Array.from({length: copies}, (_, i) => `
                    <div class="label-row">
                      <div class="label">
                        <div class="name">${product.name}</div>
                        <div class="price">₹${product.price}</div>
                        ${product.wholesale_price ? `<div class="price">W: ₹${product.wholesale_price}</div>` : ''}
                        ${product.barcode ? `
                          <div class="barcode">${product.barcode}</div>
                          ${product.barcode_path ? `<img src="${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" />` : ''}
                        ` : '<div class="barcode">No barcode</div>'}
                      </div>
                    </div>
                  `).join('')
                }
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 2000);
                }
              </script>
            </body>
          </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
      }
        
      // Show brief success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `✅ ${copies} label(s) sent to printer`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      alert('❌ Print failed: ' + error.message);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      // Also remove quantity when deselecting
      const newQuantities = { ...printQuantities };
      delete newQuantities[productId];
      setPrintQuantities(newQuantities);
    } else {
      newSelected.add(productId);
      // Set default quantity of 1 when selecting
      setPrintQuantities({
        ...printQuantities,
        [productId]: printQuantities[productId] || 1
      });
    }
    setSelectedProducts(newSelected);
  };

  // Select/Deselect all products
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      // Deselect all
      setSelectedProducts(new Set());
      setPrintQuantities({});
    } else {
      // Select all
      const allIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProducts(allIds);
      const newQuantities = {};
      filteredProducts.forEach(p => {
        newQuantities[p.id] = printQuantities[p.id] || 1;
      });
      setPrintQuantities(newQuantities);
    }
  };

  // Print multiple selected products
  const printSelectedLabels = async () => {
    const selectedProductsData = Array.from(selectedProducts)
      .map(productId => ({
        id: productId,
        copies: printQuantities[productId] || 1
      }));

    if (selectedProductsData.length === 0) {
      alert('Please select products to print');
      return;
    }

    try {
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.printLabelsBatch) {
        // Use Electron IPC printing for batch
        const selectedProductDetails = selectedProductsData.map(item => {
          const product = products.find(p => p.id === item.id);
          return { ...product, copies: item.copies };
        });
        
        try {
          const result = await window.electronAPI.printLabelsBatch(selectedProductDetails, labelConfig);
          if (!result.success) {
            console.error('Batch label printing failed:', result.error);
            alert('❌ Batch label printing failed: ' + result.error);
          } else {
            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            toast.textContent = `✅ ${selectedProductDetails.reduce((sum, p) => sum + p.copies, 0)} labels sent to printer`;
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 3000);
            // Reset selections after successful print
            setSelectedProducts(new Set());
            setPrintQuantities({});
          }
        } catch (error) {
          console.error('Batch label printing error:', error);
          alert('❌ Batch label printing error: ' + error.message);
        }
        return;
      }

      // Direct batch print
      const result = await PrinterAPI.printLabelsBatch(selectedProductsData, labelConfig);
      if (result.success) {
        // Open Windows print dialog for batch
        const printWindow = window.open('', '_blank', 'width=500,height=700');
        if (!printWindow) {
          alert('Please allow popups for printing');
          return;
        }
          
          const selectedProductDetails = selectedProductsData.map(item => {
            const product = products.find(p => p.id === item.id);
            return { ...product, copies: item.copies };
          });
          
          const html = `
            <html>
              <head>
                <title>Batch Print Labels</title>
                <style>
                  body { font-family: Arial; margin: 0; }
                  .page { width: 108mm; margin: 0 auto; } /* Changed from 100mm to 108mm */
                  .label-row { display: flex; gap: 2mm; margin-bottom: 2mm; justify-content: space-between; }
                  .label { 
                    border: none; 
                    padding: 0; 
                    width: ${labelConfig.layout === '2up' ? '53mm' : '104mm'}; /* Adjusted for perfect fit */
                    height: ${labelConfig.height}mm;
                    text-align: center !important;
                    font-size: ${labelConfig.layout === '2up' ? '14px' : '16px'}; /* Increased text size */
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    page-break-inside: avoid;
                    flex-shrink: 0;
                  }
                  .barcode { font-family: monospace; font-size: ${labelConfig.layout === '2up' ? '12px' : '14px'}; margin: 0; text-align: center !important; } /* Increased barcode font */
                  .barcode-image { max-width: ${labelConfig.layout === '2up' ? '45mm' : '85mm'}; height: auto; margin: 0; display: block; margin-left: auto; margin-right: auto; }
                  .name { font-weight: bold; margin: 0; font-size: ${labelConfig.layout === '2up' ? '16px' : '20px'}; line-height: 1.2; text-align: center !important; } /* Increased name font size */
                  .price { color: #000; font-size: ${labelConfig.layout === '2up' ? '18px' : '24px'}; font-weight: bold; margin: 0; text-align: center !important; } /* Increased price font size */
                  @media print {
                    body { margin: 0; }
                    .page { width: 108mm; margin: 0; } /* Changed from 100mm to 108mm */
                    .label { border: none; }
                    .label-row { page-break-inside: avoid; }
                  }
                </style>
              </head>
              <body>
                <div class="page">
                  ${labelConfig.layout === '2up' ? 
                    // 2-up layout: arrange all labels in pairs
                    (() => {
                      const allLabels = selectedProductDetails.flatMap(product => 
                        Array.from({length: product.copies}, () => product)
                      );
                      return Array.from({length: Math.ceil(allLabels.length / 2)}, (_, rowIndex) => {
                        const labelsInRow = allLabels.slice(rowIndex * 2, (rowIndex * 2) + 2);
                        return `
                          <div class="label-row">
                            ${labelsInRow.map(product => `
                              <div class="label">
                                <div class="name">${product.name}</div>
                                <div class="price">₹${product.price}</div>
                                ${product.barcode_path ? `<img src="${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" />` : ''}
                              </div>
                            `).join('')}
                          </div>
                        `;
                      }).join('');
                    })() :
                    // Single layout: one label per row, all copies
                    selectedProductDetails.map(product => 
                      Array.from({length: product.copies}, (_, i) => `
                        <div class="label-row">
                          <div class="label">
                            <div class="name">${product.name}</div>
                            <div class="price">₹${product.price}</div>
                            ${product.barcode_path ? `<img src="${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}" class="barcode-image" alt="Barcode" />` : ''}
                          </div>
                        </div>
                      `).join('')
                    ).join('')
                  }
                </div>
                <script>
                  window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 2000);
                  }
                </script>
              </body>
            </html>
          `;
          
          printWindow.document.write(html);
          printWindow.document.close();
        }
        
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = `✅ ${result.message}`;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
        // Reset selections after successful print
        setSelectedProducts(new Set());
        setPrintQuantities({});
    } catch (error) {
      alert('❌ Batch print failed: ' + error.message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    (product.barcode && product.barcode.includes(search))
  );

  const totalSelectedLabels = Array.from(selectedProducts)
    .reduce((sum, productId) => sum + (printQuantities[productId] || 1), 0);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Tabs */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🏷️ Label Printing System</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('standard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'standard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Standard Barcode Labels
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'custom'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏷️ Custom Text Labels
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'standard' ? (
        <div>
          <p className="text-gray-600 mb-6">Print barcode labels for your products with automatic product information</p>

      {/* Enhanced Print Settings Panel */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🖨️ Print Configuration
            </h2>
            <p className="text-sm text-gray-600 mt-1">Configure label dimensions, layout, and print preferences</p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            Selected: <span className="font-semibold text-blue-600">{selectedProducts.size}</span> products
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Label Specifications Section */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              📐 Label Configuration
            </h3>
            
            {/* Custom Dimensions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimensions (mm)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={labelConfig.width}
                    onChange={(e) => setLabelConfig({...labelConfig, width: Number(e.target.value)})}
                    placeholder="Width"
                    min="10"
                    max="200"
                  />
                  <label className="text-xs text-gray-500 mt-1 block">Width</label>
                </div>
                <div className="text-gray-400 font-bold">×</div>
                <div className="flex-1">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={labelConfig.height}
                    onChange={(e) => setLabelConfig({...labelConfig, height: Number(e.target.value)})}
                    placeholder="Height"
                    min="10"
                    max="200"
                  />
                  <label className="text-xs text-gray-500 mt-1 block">Height</label>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setLabelConfig({...labelConfig, width: 50, height: 38, layout: '2up'})}
                  className={`text-left px-3 py-2 rounded border text-sm ${
                    labelConfig.width === 50 && labelConfig.height === 38 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📋 Standard (50×38 mm) - Ideal for most products
                </button>
                <button
                  onClick={() => setLabelConfig({...labelConfig, width: 50, height: 25, layout: '2up'})}
                  className={`text-left px-3 py-2 rounded border text-sm ${
                    labelConfig.width === 50 && labelConfig.height === 25 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🏷️ Compact (50×25 mm) - Space-saving
                </button>
              </div>
            </div>

            {/* Layout Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Layout
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-2 rounded border cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="layout"
                    checked={labelConfig.layout === '2up'}
                    onChange={() => setLabelConfig({...labelConfig, layout: '2up'})}
                    className="w-4 h-4 text-blue-600 mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium">2-Up Layout</div>
                    <div className="text-xs text-gray-500">Two labels per row</div>
                  </div>
                </label>
                <label className="flex items-center p-2 rounded border cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="layout"
                    checked={labelConfig.layout === '1up'}
                    onChange={() => setLabelConfig({...labelConfig, layout: '1up'})}
                    className="w-4 h-4 text-blue-600 mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium">Single Layout</div>
                    <div className="text-xs text-gray-500">One label per row</div>
                  </div>
                </label>
              </div>
            </div>
          
          </div>

          {/* Bulk Actions & Content Section */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              🎯 Print Actions
            </h3>
            
            {/* Label Content Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Content
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={labelConfig.includeName}
                    onChange={(e) => setLabelConfig({...labelConfig, includeName: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded mr-2"
                  />
                  Product Name
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={labelConfig.includePrice}
                    onChange={(e) => setLabelConfig({...labelConfig, includePrice: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded mr-2"
                  />
                  Price Information
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={labelConfig.includeBarcode}
                    onChange={(e) => setLabelConfig({...labelConfig, includeBarcode: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded mr-2"
                  />
                  Barcode Image
                </label>
              </div>
            </div>

            {/* Selection Summary */}
            <div className="mb-4 p-3 bg-white rounded border">
              <div className="text-sm text-gray-600">Selection Summary</div>
              <div className="text-lg font-semibold text-gray-900">
                {selectedProducts.size} products
              </div>
              <div className="text-sm text-blue-600">
                {totalSelectedLabels} total labels
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={toggleSelectAll}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>{selectedProducts.size === filteredProducts.length ? '☑️' : '☐'}</span>
                {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
              </button>
              
              <button
                onClick={printSelectedLabels}
                disabled={selectedProducts.size === 0}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  selectedProducts.size > 0 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>🖨️</span>
                Print Selected
                {selectedProducts.size > 0 && ` (${selectedProducts.size})`}
              </button>

              {selectedProducts.size > 0 && (
                <button
                  onClick={() => {
                    setSelectedProducts(new Set());
                    setPrintQuantities({});
                  }}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <span>🗑️</span>
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products by name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600 py-2">
            Showing {filteredProducts.length} products
          </div>
        </div>
      </div>

      {/* Products List View */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading products...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id);
                  return (
                    <tr 
                      key={product.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      {/* Selection Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          {isSelected && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              ✓
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product Details Column */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs">
                          {product.name}
                        </div>
                      </td>

                      {/* Prices Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium text-green-600">₹{product.price}</div>
                          <div className="text-blue-600">W: ₹{product.wholesale_price || '0.00'}</div>
                        </div>
                      </td>

                      {/* Barcode Column */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="font-mono text-xs mb-1">{product.barcode || 'N/A'}</div>
                          {product.barcode_path && (
                            <img 
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${product.barcode_path}`} 
                              alt="Barcode" 
                              className="h-6 max-w-20"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Quantity Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={printQuantities[product.id] || 1}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setPrintQuantities({
                                ...printQuantities,
                                [product.id]: newQty
                              });
                              // Auto-select if quantity is set and not already selected
                              if (newQty > 0 && !isSelected) {
                                setSelectedProducts(new Set([...selectedProducts, product.id]));
                              }
                            }}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                            disabled={!isSelected}
                          />
                          <button
                            onClick={() => {
                              const newQty = (printQuantities[product.id] || 1) + 1;
                              setPrintQuantities({
                                ...printQuantities,
                                [product.id]: newQty
                              });
                              // Auto-select when adding quantity
                              if (!isSelected) {
                                setSelectedProducts(new Set([...selectedProducts, product.id]));
                              }
                            }}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => printLabel(product, 1)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          🖨️ Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border p-4 min-w-64">
          <div className="text-sm font-medium text-gray-700 mb-2">
            📋 Selection Summary
          </div>
          <div className="text-sm text-gray-600 mb-3">
            {selectedProducts.size} products selected • {totalSelectedLabels} labels total
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedProducts(new Set());
                setPrintQuantities({});
              }}
              className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
            >
              Clear All
            </button>
            <button
              onClick={printSelectedLabels}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              🖨️ Print All
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No products found</div>
          <div className="text-sm text-gray-400">Try adjusting your search terms</div>
        </div>
      )}
        </div>
      ) : (
        <div>
          <CustomLabelPage />
        </div>
      )}
    </div>
  );
}
