import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function ReceiptModal({ receipt, printReceipt, closeReceipt }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  useEffect(() => {
    if (receipt) {
      generateQRCode();
    }
  }, [receipt]);

  const generateQRCode = async () => {
    try {
      // Build UPI link with your ID
      const upiLink = `upi://pay?pa=8200638429@pthdfc&pn=Bharat%20Kitchenware&am=${receipt.total}&cu=INR`;
      
      // Generate QR Code Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(upiLink);
      setQrCodeDataUrl(qrCodeDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handlePrint = async () => {
    // Check if running in Electron
    if (window.electronAPI && window.electronAPI.printReceipt) {
      // Use Electron IPC printing
      try {
        const result = await window.electronAPI.printReceipt(receipt);
        if (!result.success) {
          console.error('Printing failed:', result.error);
        }
      } catch (error) {
        console.error('Printing error:', error);
      }
    } else {
      // Fall back to web printing
      printReceipt();
    }
    closeReceipt();
  };

  if (!receipt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-0">
      {/* Perfectly centered receipt modal with exact 72mm width simulation */}
      <div className="bg-white rounded-lg shadow-xl w-[72mm] max-w-[72mm] max-h-[90vh] overflow-y-auto p-0 m-0">
        {/* Header with perfect centering */}
        <div className="pb-3 mb-4 flex justify-between items-center px-2 pt-4 relative">
          <div className="w-4"></div> {/* Minimal spacer for balance */}
          <h2 className="text-xl font-bold text-gray-900 absolute left-1/2 transform -translate-x-1/2">Receipt #{receipt.billNumber}</h2>
          <button onClick={closeReceipt} className="text-gray-700 hover:text-red-600 transition text-lg font-bold z-10 w-4">✕</button>
        </div>

        {/* Logo and Business Details - Perfectly centered */}
        <div className="text-center mb-6 px-2" style={{ paddingRight: '1px' }}>
          {/* Logo - Perfectly centered */}
          <div className="mb-3 flex justify-center">
            <img 
              src="../../assets/logo.png" 
              alt="Bharat Kitchenware Logo" 
              className="h-16 w-16 object-contain mx-auto"
              style={{ marginRight: '1px' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900">BHARAT KITCHENWARE</h3>
          <p className="text-sm font-bold text-gray-800">Contact: +91 91061 98615</p>
          <p className="text-sm font-bold text-gray-700 mt-2">Thank you for shopping with us!</p>
          <div className="my-3 border-t-2 border-gray-400 w-full"></div>
        </div>

        {/* Customer & Meta Info - Perfectly centered */}
        <div className="text-sm font-bold text-gray-900 mb-4 grid grid-cols-2 gap-2 bg-gray-100 p-2 rounded-lg mx-2" style={{ paddingRight: '1px' }}>
          <p className="text-center"><strong>BILL #:</strong> {receipt.billNumber}</p>
          <p className="text-center"><strong>DATE:</strong> {receipt.date}</p>
          <p className="text-center"><strong>ITEMS:</strong> {receipt.items.length}</p>
          {receipt.customerName && <p className="text-center"><strong>CUSTOMER:</strong> {receipt.customerName}</p>}
          {receipt.customerPhone && <p className="text-center"><strong>PHONE:</strong> {receipt.customerPhone}</p>}
          <p className="text-center col-span-2"><strong>PAYMENT:</strong> {receipt.paymentMethod ? receipt.paymentMethod.toUpperCase() : 'CASH'}</p>
        </div>

        {/* Items List - Left aligned for proper column formatting */}
        <div className="mb-4 px-2" style={{ paddingRight: '1px' }}>
          <div className="grid grid-cols-12 gap-1 text-sm font-bold text-gray-900 border-b-2 border-gray-400 pb-2 mb-2">
            <div className="col-span-6 text-left">ITEM</div>
            <div className="col-span-2 text-center">QTY</div>
            <div className="col-span-4 text-right">PRICE</div>
          </div>
          {receipt.items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 text-sm font-bold text-gray-800 py-2 border-b border-gray-200 last:border-0" style={{ paddingRight: '1px' }}>
              <div className="col-span-6 truncate">{item.name}</div>
              <div className="col-span-2 text-center">x{item.quantity}</div>
              <div className="col-span-4 text-right">₹{(item.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Total - Perfectly centered */}
        <div className="flex justify-between items-center text-xl font-bold py-3 bg-gray-200 rounded-lg mx-2" style={{ paddingRight: '1px' }}>
          <span className="flex-1 text-center">TOTAL</span>
          <span className="text-green-800 flex-1 text-center">₹{receipt.total.toFixed(2)}</span>
        </div>

        {/* Payment QR Code - Perfectly centered */}
        {qrCodeDataUrl && (
          <div className="text-center my-6 p-3 bg-gray-100 rounded-lg mx-2" style={{ paddingRight: '1px' }}>
            <p className="text-base font-bold text-gray-900 mb-3">SCAN & PAY WITH UPI</p>
            <img 
              src={qrCodeDataUrl} 
              alt="Payment QR Code" 
              className="w-40 h-40 mx-auto border-2 border-gray-400 rounded-lg p-2 bg-white"
              style={{ marginRight: '1px' }}
            />
            <p className="text-sm font-bold text-gray-800 mt-2">UPI ID: 8200638429@pthdfc</p>
          </div>
        )}

        {/* Footer - Perfectly centered */}
        <div className="text-center text-sm font-bold text-gray-900 my-4 px-2" style={{ paddingRight: '1px' }}>
          <p>VISIT AGAIN!</p>
          <p className="mt-2">--- THANK YOU ---</p>
        </div>

        {/* Footer Buttons - Perfectly centered */}
        <div className="flex justify-center gap-3 mt-4 px-2 pb-4" style={{ paddingRight: '1px' }}>
          <button onClick={closeReceipt} className="px-5 py-2 text-base bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition font-bold">CLOSE</button>
          <button onClick={handlePrint} className="px-5 py-2 text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold">PRINT</button>
        </div>
      </div>
    </div>
  );
}