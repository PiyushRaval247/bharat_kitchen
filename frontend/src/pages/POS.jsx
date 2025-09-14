import React, { useState, useEffect, useMemo } from "react";
import { ProductsAPI, BillsAPI, VendorsAPI } from "../api";

import CodeScannerInput from "../components/CodeScannerInput.jsx";
import PaymentCustomerForm from "../components/PaymentCustomerForm.jsx";
import ProductTable from "../components/ProductTable.jsx";
import ReceiptModal from "../components/ReceiptModal.jsx";
import UnknownProductForm from "../components/UnknownProductForm.jsx";
import QRCode from "qrcode";


export default function POS() {
  const [code, setCode] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unknownCode, setUnknownCode] = useState("");
  const [vendors, setVendors] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    wholesale_price: "",
    stock: "0",
    vendor_id: "",
  });
  const [receipt, setReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priceMode, setPriceMode] = useState("retail"); // "retail" | "wholesale"

const total = useMemo(
  () =>
    items.reduce(
      (s, it) =>
        s + (priceMode === "retail"
          ? it.price
          : it.wholesale_price ?? it.price) * it.quantity,
      0
    ),
  [items, priceMode]
);

  // Load items from localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem("pos_items");
    if (savedItems) setItems(JSON.parse(savedItems));
  }, []);

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const vendorList = await VendorsAPI.list();
        setVendors(vendorList);
      } catch (error) {
        console.error('Failed to load vendors:', error);
      }
    };
    loadVendors();
  }, []);

  // Save items to localStorage
  useEffect(() => {
    if (items.length > 0)
      localStorage.setItem("pos_items", JSON.stringify(items));
    else localStorage.removeItem("pos_items");
  }, [items]);

  // ✅ Scanner handling logic
  useEffect(() => {
    let buffer = "";
    let timer = null;

    const handler = (e) => {
      const active = document.activeElement;
      const isInput =
        active.tagName === "INPUT" ||
        active.tagName === "SELECT" ||
        active.tagName === "TEXTAREA";

      console.log('Key event:', e.key, 'Items:', items.length, 'Is input:', isInput);
      
      // F9 for instant print of current items (no dialog)
      if (e.key === 'F9' && items.length > 0) {
        console.log('F9 key detected and items available');
        e.preventDefault();
        e.stopPropagation(); // Stop the event from propagating
        instantPrint();
        return;
      }

      // Don't capture scanner keys while typing in input fields
      if (isInput) {
        console.log('In input field, ignoring key capture');
        return;
      }

      if (e.key === "Enter") {
        if (buffer) {
          addByCode(buffer);
          buffer = "";
        }
      } else {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => (buffer = ""), 300);
      }
    };

    // Add event listener to both window and document to ensure capture
    window.addEventListener("keydown", handler, true); // Use capture phase
    document.addEventListener("keydown", handler, true); // Use capture phase
    
    return () => {
      window.removeEventListener("keydown", handler, true);
      document.removeEventListener("keydown", handler, true);
    };
  }, [items]);

  // Add product by code
  const addByCode = async (inputCode) => {
    const usedCode = inputCode ?? code;
    if (!usedCode) return;
    setLoading(true);
    try {
      const p = await ProductsAPI.scan(usedCode);
      const idx = items.findIndex((i) => i.productId === p.id);
      if (idx >= 0) {
        const next = [...items];
        next[idx].quantity += 1;
        setItems(next);
      } else {
        setItems([
          ...items,
          {
            productId: p.id,
            name: p.name,
            price: Number(p.price), // Final price with GST
            wholesale_price: Number(p.wholesale_price ?? 0), // Final wholesale with GST
            quantity: 1,
          },
        ]);
      }
      setCode("");
    } catch (e) {
      const suggestion = e?.response?.data?.suggestion;
      setUnknownCode(usedCode);
      setNewProduct({
        name: suggestion?.name || "",
        price: suggestion?.price != null ? String(suggestion.price) : "",
        wholesale_price: "",
        stock: "0",
        vendor_id: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const changeQty = (i, qty) => {
    const q = Math.max(1, Number(qty || 1));
    const next = [...items];
    next[i].quantity = q;
    setItems(next);
  };

  const checkout = async () => {
    if (!items.length) return;
    setLoading(true);
    try {
      const payload = items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      }));
      const res = await BillsAPI.create(
        payload,
        paymentMethod,
        customerName,
        customerPhone,
        priceMode
      );
      
      // Create receipt data for immediate printing
      const receiptData = {
        id: res.id,
        date: new Date().toLocaleString(),
        items: [...items],
        total: res.total, // Total with GST already included
        billNumber: `BILL-${res.id.toString().padStart(6, "0")}`,
        paymentMethod,
        customerName,
        customerPhone,
      };
      
      // Print receipt directly without opening modal
      // Check if running in Electron
      if (window.electronAPI && window.electronAPI.printReceipt) {
        // Use Electron IPC printing
        try {
          const result = await window.electronAPI.printReceipt(receiptData);
          if (!result.success) {
            console.error('Printing failed:', result.error);
            alert('Printing failed: ' + result.error);
          }
        } catch (error) {
          console.error('Printing error:', error);
          alert('Printing error: ' + error.message);
        }
      } else {
        // Fall back to web printing
        printReceiptWeb(receiptData);
      }
      
      // Clear items after printing
      clearItemsAfterPrint();
    } catch (e) {
      alert("Failed to save bill");
    } finally {
      setLoading(false);
    }
  };

  const createFromUnknown = async () => {
    if (!unknownCode) return;
    try {
      const payload = {
        name: newProduct.name || `Product ${unknownCode}`,
        price: Number(newProduct.price || 0),
        wholesale_price: Number(newProduct.wholesale_price || 0),
        stock: Number(newProduct.stock || 0),
        barcode: unknownCode,
        vendor_id: newProduct.vendor_id ? Number(newProduct.vendor_id) : null,
      };

      const p = await ProductsAPI.create(payload);
      setItems([
        ...items,
        {
          productId: p.id,
          name: p.name,
          price: Number(p.price), // Final price with GST
          wholesale_price: Number(p.wholesale_price ?? 0), // Final wholesale with GST
          quantity: 1,
        },
      ]);

      setUnknownCode("");
      setNewProduct({ name: "", price: "", wholesale_price: "", stock: "0", vendor_id: "" });
      setCode("");
    } catch {
      alert("Failed to create product");
    }
  };

  const clearItems = () => {
    if (
      items.length > 0 &&
      confirm("Are you sure you want to clear all items?")
    )
      setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    localStorage.removeItem("pos_items");
  };

const printReceipt = async () => {
  if (!receipt) return;

  // Check if running in Electron
  if (window.electronAPI && window.electronAPI.printReceipt) {
    // Use Electron IPC printing
    try {
      const result = await window.electronAPI.printReceipt(receipt);
      if (!result.success) {
        console.error('Printing failed:', result.error);
      } else {
        // Clear items after successful printing
        setItems([]);
        setCustomerName("");
        setCustomerPhone("");
        setPaymentMethod("cash");
        localStorage.removeItem("pos_items");
      }
    } catch (error) {
      console.error('Printing error:', error);
    }
    return;
  }

  // Fall back to web printing
  printReceiptWeb(receipt);
  // Clear items after printing
  setItems([]);
  setCustomerName("");
  setCustomerPhone("");
  setPaymentMethod("cash");
  localStorage.removeItem("pos_items");
};

// Instant print function - prints current items directly with no dialog
const instantPrint = async () => {
  if (items.length === 0) {
    return;
  }
  
  // Create a temporary receipt for current items
  const instantReceipt = {
    id: Date.now(), // Use timestamp as temporary ID
    date: new Date().toLocaleString(),
    items: [...items],
    total: total, // Use the calculated total
    billNumber: `BILL-${Date.now().toString().slice(-6)}`,
    paymentMethod: "cash",
    customerName: customerName || "",
    customerPhone: customerPhone || "",
  };
  
  // Check if running in Electron
  if (window.electronAPI && window.electronAPI.printReceipt) {
    // Use Electron IPC printing
    try {
      const result = await window.electronAPI.printReceipt(instantReceipt);
      if (!result.success) {
        console.error('Printing failed:', result.error);
        alert('Printing failed: ' + result.error);
      } else {
        // Clear items after successful printing
        clearItemsAfterPrint();
      }
      return;
    } catch (error) {
      console.error('Printing error:', error);
      alert('Printing error: ' + error.message);
      return;
    }
  }
  
  // Fall back to web printing
  printReceiptWeb(instantReceipt);
  // Clear items after printing
  clearItemsAfterPrint();
};

// Function to clear items after printing
const clearItemsAfterPrint = () => {
  setItems([]);
  setCustomerName("");
  setCustomerPhone("");
  setPaymentMethod("cash");
  localStorage.removeItem("pos_items");
};

// Web printing function (extracted for reuse)
const printReceiptWeb = async (receiptData) => {
  // Build UPI link with your ID
  const upiLink = `upi://pay?pa=8200638429@pthdfc&pn=Bharat%20Kitchenware&am=${receiptData.total}&cu=INR`;

  // Generate QR Code Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(upiLink);

  const w = window.open("", "_blank", "width=280,height=700");
  if (!w) return;

const html = `
<html>
  <head>
    <title>${receiptData.billNumber}</title>
    <style>
      @media print {
        @page {
          size: 72mm auto;
          margin: 0 !important;
        }
        body {
         margin: 0 !important;
         padding: 0;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 13px;
        margin: 0;
        padding: 0;
        width: 72mm;
        color: #000;
        background: #fff;
        line-height: 1.5;
        font-weight: bold;

        /* ✅ Center the content horizontally */
        display: flex;
        justify-content: center;
      }
      .receipt {
        width: 70mm; /* ✅ Slightly less than paper width */
        margin: 0 auto;
        padding: 0;
        text-align: center;
      }
      .logo {
        display: block;
        width: 110px; /* ✅ Increased size */
        height: 110px;
        object-fit: contain;
        margin: 15px auto 4px auto;
      }
      .title {
        font-size: 20px;
        text-align: center;
        margin: 0;
      }
      .business-info {
        font-size: 12px;
        margin: 5px 0 12px 0;
        line-height: 1.3;
        text-align: center;
      }
      .section-line {
        border-top: 2px dashed #000;
        margin: 10px 0;
      }
      .items-header {
        font-size: 13px;
        border-bottom: 2px dashed #000;
        padding-bottom: 4px;
        margin-bottom: 6px;
      }
      .item {
        display: grid;
        grid-template-columns: 1fr auto auto;
        font-size: 12px;
        margin: 3px 0;
        text-align: left;
        column-gap: 6px;
      }
      .item div:nth-child(2),
      .item div:nth-child(3) {
        text-align: right;
      }
      .gst-line {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin: 3px 0;
        padding: 0 4px;
      }
      .total {
        border-top: 2px dashed #000;
        border-bottom: 2px dashed #000;
        font-size: 15px;
        margin: 12px 0 6px 0;
        padding: 8px 0;
        text-align: center;
      }
      .qr-section {
        text-align: center;
        margin: 18px 0 12px 0;
      }
      .qr-title {
        font-size: 13px;
        margin-bottom: 6px;
      }
      .qr-code {
        width: 140px;
        height: 140px;
        margin: 0 auto;
        display: block;
        background: #fff;
      }
      .footer {
        margin: 12px 0 6px 0;
        text-align: center;
        font-size: 12px;
      }
    </style>
  </head>
  <body onload="window.print(); setTimeout(()=> {
    window.close();
    // Notify parent window that printing is done
    if (window.opener && window.opener.clearItemsAfterPrint) {
      window.opener.clearItemsAfterPrint();
    }
  }, 1000)">
    <div class="receipt">

      <!-- Logo + Business -->
      <img src="../../assets/logo.png" class="logo" alt="Logo" onerror="this.style.display='none'"/>
      <h2 class="title">Bharat Kitchenware</h2>
      <div class="business-info">
        Contact: +91 91061 98615<br/>
        Bill No: ${receiptData.billNumber}<br/>
        Date: ${new Date().toLocaleDateString()} 
        &nbsp; | &nbsp; 
        Time: ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}<br/>
        Address: 123 Market Road, Rajkot, Gujarat<br/>
        GST No: 24AHMPT3449F1Z3

      </div>

      <div class="section-line"></div>

      <!-- Items -->
      <div class="items-header">
        <div class="item">
          <div>ITEM</div>
          <div>QTY</div>
          <div>PRICE</div>
        </div>
      </div>

      ${receiptData.items.map(it => `
        <div class="item">
          <div>${it.name.length > 18 ? it.name.substring(0,18) : it.name}</div>
          <div>x${it.quantity}</div>
          <div>₹${(it.price*it.quantity).toFixed(2)}</div>
        </div>
      `).join('')}

      <!-- GST Lines -->
      <div class="gst-line">
        <div>CGST (0%)</div>
        <div>₹0.00</div>
      </div>
      <div class="gst-line">
        <div>SGST (0%)</div>
        <div>₹0.00</div>
      </div>

      <!-- Total -->
      <div class="total">
        TOTAL: ₹${receiptData.total.toFixed(2)}
      </div>

      <!-- QR -->
      <div class="qr-section">
        <div class="qr-title">SCAN & PAY WITH UPI</div>
        <img src="${qrCodeDataUrl}" class="qr-code" alt="QR Code"/>
      </div>

      <div class="footer">
        VISIT AGAIN!<br/>--- THANK YOU ---
      </div>
    </div>
  </body>
</html>
`;

  w.document.write(html);
  w.document.close();
};

  const cancel = () => {
    setUnknownCode("");
    setNewProduct({ name: "", price: "", wholesale_price: "", stock: "0", vendor_id: "" });
    setCode("");
  };

  return (
    <>
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            priceMode === "retail" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setPriceMode("retail")}
        >
          Retail
        </button>
        <button
          className={`px-4 py-2 rounded ${
            priceMode === "wholesale" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setPriceMode("wholesale")}
        >
          Wholesale
        </button>
        <div className="text-sm text-gray-600 self-center">
          Press F9 to print receipt
        </div>
        <button
          className="px-4 py-2 rounded bg-green-600 text-white"
          onClick={instantPrint}
        >
          Print Now
        </button>
      </div>

      <div className="pos flex flex-row-reverse gap-5">
        <div className="card w-[30%]">
          <h2>Billing</h2>

          <CodeScannerInput
            addByCode={addByCode}
            loading={loading}
            total={total}
            scanningEnabled={!unknownCode}
          />
          <PaymentCustomerForm
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            items={items}
            checkout={checkout}
            clearItems={clearItems}
            loading={loading}
          />
        </div>

        <div className="card w-[70%]">
          <ProductTable
            items={items}
            changeQty={changeQty}
            removeItem={removeItem}
            priceMode={priceMode}
          />

          <ReceiptModal
            receipt={receipt}
            printReceipt={printReceipt}
            closeReceipt={() => setReceipt(null)}
          />
        </div>
      </div>

      {/* Modal for creating unknown products */}
      <UnknownProductForm
        unknownCode={unknownCode}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        createFromUnknown={createFromUnknown}
        cancel={cancel}
        vendors={vendors}
      />
    </>
  );
}