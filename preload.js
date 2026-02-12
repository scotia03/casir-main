const { contextBridge } = require("electron");
const authService = require("./src/services/authService");
const productService = require("./src/services/productService");
const salesService = require("./src/services/salesService");

const bridgeApi = {
  login: (username, password) => authService.login(username, password),
  register: (payload) => authService.register(payload),
  getProducts: () => productService.getProducts(),
  createProduct: (payload) => productService.createProduct(payload),
  deleteProduct: (productId) => productService.deleteProduct(productId),
  setProductOutOfStock: (productId, isOutOfStock) =>
    productService.setProductOutOfStock(productId, isOutOfStock),
  createSale: (payload) => salesService.createSale(payload),
  getRecentSales: (limit) => salesService.getRecentSales(limit)
};

contextBridge.exposeInMainWorld("api", bridgeApi);
contextBridge.exposeInMainWorld("electronAPI", bridgeApi);
