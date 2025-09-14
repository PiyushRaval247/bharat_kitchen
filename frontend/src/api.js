import axios from "axios";

// Environment-aware API configuration
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  // Fallback for development
  return "http://localhost:3001/api";
};

const api = axios.create({ 
  baseURL: getApiBaseUrl(),
  timeout: 10000 // 10 second timeout
});

export const ProductsAPI = {
  list: () => api.get("/products").then((r) => r.data),
  create: (data) => api.post("/products", data).then((r) => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
  scan: (code) =>
    api.get(`/products/scan/${encodeURIComponent(code)}`).then((r) => r.data),
};

export const BillsAPI = {
  create: (items, paymentMethod = "cash", customerName, customerPhone, priceMode = "retail") =>
    api.post("/bills", { items, paymentMethod, customerName, customerPhone, priceMode })
       .then((r) => r.data),
  list: () => api.get("/bills").then((r) => r.data),
};


export const SalesAPI = {
  analytics: (period = "today") =>
    api.get(`/bills/analytics?period=${period}`).then((r) => r.data),
  dailySales: (days = 30) =>
    api.get(`/bills/daily-sales?days=${days}`).then((r) => r.data),
  topProducts: (period = "month", limit = 10) =>
    api
      .get(`/bills/top-products?period=${period}&limit=${limit}`)
      .then((r) => r.data),
};

export const VendorsAPI = {
  list: () => api.get("/vendors").then(r => r.data),
  listWithProducts: () => api.get("/vendors/with-products").then(r => r.data),
  create: (vendorData) => api.post("/vendors", vendorData).then(r => r.data),
  update: (id, vendorData) => api.put(`/vendors/${id}`, vendorData).then(r => r.data),
  getById: (id) => api.get(`/vendors/${id}`).then(r => r.data),
  getBalance: (id) => api.get(`/vendors/${id}/balance`).then(r => r.data),
  getPayments: (id) => api.get(`/vendors/${id}/payments`).then(r => r.data),
  addPayment: (id, paymentData) => api.post(`/vendors/${id}/payments`, paymentData).then(r => r.data),
  remove: (id) => api.delete(`/vendors/${id}`).then(r => r.data),
};

export const PurchasesAPI = {
  list: () => api.get("/purchases").then(r => r.data),
  create: (data) => api.post("/purchases", data).then(r => r.data),
  import: (formData) =>
    api.post("/purchases/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data),
  getByProductAndVendor: (product_id, vendor_id) =>
    api.get("/purchases/getByProductAndVendor", {
      params: { product_id, vendor_id },
    }).then(r => r.data),

    remove: (id) => api.delete(`/purchases/${id}`).then(r => r.data),
};

export const CustomersAPI = {
  list: () => api.get("/customers").then(r => r.data),
};

export const PrinterAPI = {
  getAvailablePrinters: () => api.get("/printer/available").then(r => r.data),
  testPrinter: (printerInterface) => api.post("/printer/test", { printerInterface }).then(r => r.data),
  printLabel: (productId, copies = 1, labelConfig = {}) => 
    api.post("/printer/label", { productId, copies, labelConfig }).then(r => r.data),
  printLabelsBatch: (products, labelConfig = {}) => 
    api.post("/printer/labels/batch", { products, labelConfig }).then(r => r.data),
};


// Convenience functions for the SalesHistory component
export const getSalesAnalytics = (period) => SalesAPI.analytics(period);
export const getDailySales = (days) => SalesAPI.dailySales(days);
export const getTopProducts = (period, limit) =>
  SalesAPI.topProducts(period, limit);
