// Test script to verify IPC calls
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Mock the main process functions
const mockElectronAPI = {
  getWarehouses: async () => {
    return [
      { id: 1, name: 'Main Warehouse' },
      { id: 2, name: 'Secondary Warehouse' },
      { id: 3, name: 'third warehouse' },
      { id: 4, name: 'fourth warehouse' }
    ];
  },
  
  getProductWarehouseQuantities: async () => {
    return [
      { product_name: 'daleem', warehouse_name: 'Main Warehouse', quantity: 9 },
      { product_name: 'daleem', warehouse_name: 'Secondary Warehouse', quantity: 10 },
      { product_name: 'biryani', warehouse_name: 'Secondary Warehouse', quantity: 1000 }
    ];
  }
};

// Test the data processing logic
async function testProcessing() {
  try {
    const allWarehouses = await mockElectronAPI.getWarehouses();
    console.log('All warehouses:', allWarehouses);
    
    const productQuantities = await mockElectronAPI.getProductWarehouseQuantities();
    console.log('Raw product quantities:', productQuantities);
    
    // Normalize product names for better matching
    const normalizeProductName = (name) => {
      if (!name) return '';
      return name.trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    // Group items by product name and warehouse
    const productWarehouseMap = {};
    
    // First pass: collect all unique product names
    const uniqueProducts = new Set();
    productQuantities.forEach(item => {
      const normalizedName = normalizeProductName(item.product_name);
      if (normalizedName) {
        uniqueProducts.add(normalizedName);
      }
    });
    
    console.log('Unique products:', uniqueProducts);
    
    // Initialize map with all products and warehouses
    uniqueProducts.forEach(normalizedName => {
      productWarehouseMap[normalizedName] = {
        product: normalizedName
      };
      // Initialize all warehouses with 0 quantity
      allWarehouses.forEach(warehouse => {
        productWarehouseMap[normalizedName][warehouse.name] = 0;
      });
      productWarehouseMap[normalizedName].total = 0;
    });
    
    console.log('Initialized product map:', productWarehouseMap);
    
    // Second pass: aggregate quantities
    productQuantities.forEach(item => {
      const normalizedName = normalizeProductName(item.product_name);
      const warehouseName = item.warehouse_name;
      const quantity = parseInt(item.quantity) || 0;
      
      console.log('Processing item:', { normalizedName, warehouseName, quantity });
      
      // Add quantity to the specific warehouse only if product name is valid
      if (normalizedName && productWarehouseMap[normalizedName]) {
        productWarehouseMap[normalizedName][warehouseName] = 
          (productWarehouseMap[normalizedName][warehouseName] || 0) + quantity;
        
        // Update total
        productWarehouseMap[normalizedName].total += quantity;
        
        console.log('Updated product map entry:', productWarehouseMap[normalizedName]);
      }
    });
    
    // Convert to array format
    const productData = Object.values(productWarehouseMap);
    console.log('Final product data:', productData);
    
    // Test CSV generation - FIXED VERSION
    const warehouseHeaders = allWarehouses.map(warehouse => warehouse.name);
    const headers = ['Product', ...warehouseHeaders, 'Total'];
    
    const csvContent = [
      headers.join(','),
      ...productData.map(row => {
        // Create an array with the product name first, then warehouse quantities, then total
        const values = [
          `"${row.product.toString().replace(/"/g, '""')}"`, // Product name
          ...warehouseHeaders.map(header => `"${(row[header] || 0).toString().replace(/"/g, '""')}"`), // Warehouse quantities
          `"${row.total.toString().replace(/"/g, '""')}"` // Total
        ];
        return values.join(',');
      })
    ].join('\n');
    
    console.log('CSV content:', csvContent);
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testProcessing();