const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Dialog methods
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showErrorBox: (title, content) => ipcRenderer.invoke('show-error-box', title, content),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Path methods
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  getTempPath: () => ipcRenderer.invoke('get-temp-path'),
  
  // Update methods
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Database methods
  getWarehouses: () => ipcRenderer.invoke('db-get-warehouses'),
  getInventory: (warehouseId) => ipcRenderer.invoke('db-get-inventory', warehouseId),
  addInventoryItem: (item) => ipcRenderer.invoke('db-add-inventory-item', item),
  updateInventoryItem: (id, item) => ipcRenderer.invoke('db-update-inventory-item', id, item),
  deleteInventoryItem: (id) => ipcRenderer.invoke('db-delete-inventory-item', id),
  getProductWarehouseQuantities: () => ipcRenderer.invoke('db-get-product-warehouse-quantities'),
  getOutwardPasses: (startDate, endDate, godown) => ipcRenderer.invoke('db-get-outward-passes', startDate, endDate, godown),
  getOutwardPassWithItems: (id) => ipcRenderer.invoke('db-get-outward-pass-with-items', id),
  addOutwardPass: (pass) => ipcRenderer.invoke('db-add-outward-pass', pass),
  addOutwardPassItems: (items) => ipcRenderer.invoke('db-add-outward-pass-items', items),
  getInwardPasses: (startDate, endDate, godown) => ipcRenderer.invoke('db-get-inward-passes', startDate, endDate, godown), // New method for inward passes
  getInwardPassWithItems: (id) => ipcRenderer.invoke('db-get-inward-pass-with-items', id),
  addInwardPass: (pass) => ipcRenderer.invoke('db-add-inward-pass', pass),
  addInwardPassItems: (items) => ipcRenderer.invoke('db-add-inward-pass-items', items),
  updateInventoryQuantity: (id, newQuantity) => ipcRenderer.invoke('db-update-inventory-quantity', id, newQuantity),
  getNextGinNumber: () => ipcRenderer.invoke('db-get-next-gin-number'),
  getNextGrnNumber: () => ipcRenderer.invoke('db-get-next-grn-number'),
  getOutwardPassItems: (startDate, endDate, godown) => ipcRenderer.invoke('db-get-outward-pass-items', startDate, endDate, godown),
  getInwardPassItems: (startDate, endDate, godown) => ipcRenderer.invoke('db-get-inward-pass-items', startDate, endDate, godown),
  getLowStockItems: (threshold) => ipcRenderer.invoke('db-get-low-stock-items', threshold),
  
  // Product Movement methods
  addInwardProductMovement: (movement) => ipcRenderer.invoke('db-add-inward-product-movement', movement),
  addOutwardProductMovement: (movement) => ipcRenderer.invoke('db-add-outward-product-movement', movement),
  getInwardProductMovements: (startDate, endDate, warehouseName) => ipcRenderer.invoke('db-get-inward-product-movements', startDate, endDate, warehouseName),
  getOutwardProductMovements: (startDate, endDate, warehouseName) => ipcRenderer.invoke('db-get-outward-product-movements', startDate, endDate, warehouseName),
  eraseAllData: () => ipcRenderer.invoke('erase-all-data'),

  // Menu event listeners
  onMenuNewItem: (callback) => ipcRenderer.on('menu-new-item', callback),
  onMenuAddItem: (callback) => ipcRenderer.on('menu-add-item', callback),
  onMenuIssueNote: (callback) => ipcRenderer.on('menu-issue-note', callback),
  onMenuRefresh: (callback) => ipcRenderer.on('menu-refresh', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Utility functions
  platform: process.platform,
  isPackaged: process.type === 'renderer' && process.mas !== undefined
})

// Expose Node.js process info (read-only)
contextBridge.exposeInMainWorld('processAPI', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions
})