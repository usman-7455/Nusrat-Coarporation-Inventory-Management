import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { 
  FaTimes, 
  FaExchangeAlt, 
  FaPlus, 
  FaMinus, 
  FaCheck,
  FaWarehouse,
  FaBoxes,
  FaArrowRight
} from "react-icons/fa";
import "./Transfer.css";

export default function Transfer({ onInventoryUpdate }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState("");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Add error state

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (sourceWarehouse) {
      fetchInventoryItems();
    } else {
      setInventoryItems([]);
      setSelectedItems([]);
    }
  }, [sourceWarehouse]);

  // Replace direct database calls with IPC calls
  const fetchWarehouses = async () => {
    try {
      const data = await window.electronAPI.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const fetchInventoryItems = async () => {
    if (!sourceWarehouse) return;
    
    try {
      const data = await window.electronAPI.getInventory(sourceWarehouse);
      
      // Filter items with available quantity
      const filteredData = data.filter(item => item.quantity > 0);
      
      // Transform data to match the expected format
      const transformedData = filteredData.map(item => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        warehouse_id: item.warehouse_id,
        updated_at: item.updated_at,
        warehouses: {
          id: item.warehouse_id,
          name: item.warehouse_name
        }
      }));
      
      setInventoryItems(transformedData || []);
      setSelectedItems([]); // Reset selected items when source changes
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  const handleItemSelection = (item) => {
    const existingIndex = selectedItems.findIndex(selected => selected.id === item.id);
    
    if (existingIndex >= 0) {
      // Remove item if already selected
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      // Add item with default quantity of 1
      setSelectedItems([...selectedItems, {
        id: item.id,
        product_name: item.product_name,
        available_quantity: item.quantity,
        transfer_quantity: 1
      }]);
    }
    
    // Clear error when user selects/deselects items
    if (errorMessage) setErrorMessage("");
  };

  const updateTransferQuantity = (itemId, newQuantity) => {
    // Validate that quantity is not negative
    if (newQuantity < 0) {
      setErrorMessage("Quantity cannot be negative.");
      return;
    }
    
    const quantity = Math.max(1, Math.min(newQuantity, getAvailableQuantity(itemId)));
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId ? { ...item, transfer_quantity: quantity } : item
    ));
    
    // Clear error when user updates quantity
    if (errorMessage) setErrorMessage("");
  };

  const getAvailableQuantity = (itemId) => {
    const item = inventoryItems.find(inv => inv.id === itemId);
    return item ? item.quantity : 0;
  };

  const executeTransfer = async () => {
    // Clear previous error messages
    setErrorMessage("");
    
    if (!sourceWarehouse || !destinationWarehouse || selectedItems.length === 0) {
      setErrorMessage("Please select source warehouse, destination warehouse, and at least one item to transfer.");
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      setErrorMessage("Source and destination warehouses cannot be the same.");
      return;
    }

    // Validate that transfer quantities are not negative
    for (const selectedItem of selectedItems) {
      if (selectedItem.transfer_quantity < 0) {
        setErrorMessage("Transfer quantity cannot be negative. Please correct the quantities.");
        return;
      }
      
      if (selectedItem.transfer_quantity === 0) {
        setErrorMessage("Transfer quantity must be greater than zero. Please correct the quantities.");
        return;
      }
      
      if (selectedItem.transfer_quantity > selectedItem.available_quantity) {
        setErrorMessage(`Transfer quantity for ${selectedItem.product_name} cannot exceed available quantity.`);
        return;
      }
    }

    setLoading(true);
    
    try {
      // Process each selected item
      for (const selectedItem of selectedItems) {
        // Check if we need to transfer full quantity or partial
        if (selectedItem.transfer_quantity === selectedItem.available_quantity) {
          // Transfer full quantity - just update warehouse_id
          await window.electronAPI.updateInventoryItem(selectedItem.id, {
            warehouse_id: parseInt(destinationWarehouse)
          });
        } else {
          // Partial transfer - reduce source quantity and add to destination
          
          // Update source item (reduce quantity)
          const newSourceQuantity = selectedItem.available_quantity - selectedItem.transfer_quantity;
          await window.electronAPI.updateInventoryQuantity(
            selectedItem.id,
            newSourceQuantity
          );

          // Check if item exists in destination warehouse
          const allInventory = await window.electronAPI.getInventory(destinationWarehouse);
          const existingItem = allInventory.find(
            item => item.product_name === selectedItem.product_name
          );

          if (existingItem) {
            // Update existing item in destination warehouse (increase quantity)
            const newDestinationQuantity = existingItem.quantity + selectedItem.transfer_quantity;
            await window.electronAPI.updateInventoryItem(existingItem.id, {
              quantity: newDestinationQuantity
            });
          } else {
            // Create new item in destination warehouse
            await window.electronAPI.addInventoryItem({
              warehouse_id: parseInt(destinationWarehouse),
              product_name: selectedItem.product_name,
              quantity: selectedItem.transfer_quantity
            });
          }
        }
      }

      // Success message
      setErrorMessage("Transfer completed successfully!");
      
      // Reset form after a short delay to allow user to see success message
      setTimeout(() => {
        setSelectedItems([]);
        setSourceWarehouse("");
        setDestinationWarehouse("");
        setErrorMessage("");
        
        // Refresh data
        fetchInventoryItems();
        
        // Notify parent to refresh inventory if callback exists
        if (onInventoryUpdate) {
          onInventoryUpdate();
        }
        
        // Navigate to inventory page to show updated data
        navigate('/inventory');
      }, 1500);

    } catch (error) {
      console.error("Transfer error:", error);
      setErrorMessage("Error executing transfer: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Navigate back to the previous page or to the analytics dashboard
    navigate(-1); // Go back to the previous page
  };

  const filteredItems = inventoryItems.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="transfer-overlay">
      <div className="transfer-modal">
        <div className="transfer-header">
          <h2>
            <FaExchangeAlt className="header-icon" />
            Transfer Items Between Warehouses
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="transfer-content">
          {/* Error message display */}
          {errorMessage && (
            <div className={`error-message ${errorMessage.includes("successfully") ? "success" : "error"}`} 
                 style={{ 
                   color: errorMessage.includes("successfully") ? 'green' : 'red', 
                   padding: '10px', 
                   marginBottom: '10px',
                   borderRadius: '4px',
                   backgroundColor: errorMessage.includes("successfully") ? '#d4edda' : '#f8d7da',
                   border: `1px solid ${errorMessage.includes("successfully") ? '#c3e6cb' : '#f5c6cb'}`
                 }}>
              {errorMessage}
            </div>
          )}
          
          {/* Warehouse Selection */}
          <div className="warehouse-selection">
            <div className="warehouse-group">
              <label>
                <FaWarehouse /> Source Warehouse
              </label>
              <select 
                value={sourceWarehouse} 
                onChange={(e) => {
                  setSourceWarehouse(e.target.value);
                  // Clear error when user makes selection
                  if (errorMessage) setErrorMessage("");
                }}
                className="warehouse-select"
              >
                <option value="">Select Source Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="transfer-arrow">
              <FaArrowRight />
            </div>

            <div className="warehouse-group">
              <label>
                <FaWarehouse /> Destination Warehouse
              </label>
              <select 
                value={destinationWarehouse} 
                onChange={(e) => {
                  setDestinationWarehouse(e.target.value);
                  // Clear error when user makes selection
                  if (errorMessage) setErrorMessage("");
                }}
                className="warehouse-select"
              >
                <option value="">Select Destination Warehouse</option>
                {warehouses
                  .filter(w => w.id.toString() !== sourceWarehouse)
                  .map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Selection */}
          {sourceWarehouse && (
            <div className="item-selection">
              <div className="section-header">
                <h3>
                  <FaBoxes /> Available Items
                </h3>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    // Clear error when user types
                    if (errorMessage) setErrorMessage("");
                  }}
                  className="search-input"
                />
              </div>

              <div className="items-grid">
                {filteredItems.map(item => {
                  const isSelected = selectedItems.some(selected => selected.id === item.id);
                  const selectedItem = selectedItems.find(selected => selected.id === item.id);
                  
                  return (
                    <div key={item.id} className={`item-card ${isSelected ? 'selected' : ''}`}>
                      <div className="item-info">
                        <h4>{item.product_name}</h4>
                        <p>Available: {item.quantity}</p>
                      </div>
                      
                      <div className="item-actions">
                        {!isSelected ? (
                          <button 
                            className="select-btn"
                            onClick={() => handleItemSelection(item)}
                          >
                            <FaPlus /> Select
                          </button>
                        ) : (
                          <div className="quantity-controls">
                            <div className="quantity-input">
                              <button 
                                onClick={() => updateTransferQuantity(item.id, selectedItem.transfer_quantity - 1)}
                                disabled={selectedItem.transfer_quantity <= 1}
                              >
                                <FaMinus />
                              </button>
                              <span>{selectedItem.transfer_quantity}</span>
                              <button 
                                onClick={() => updateTransferQuantity(item.id, selectedItem.transfer_quantity + 1)}
                                disabled={selectedItem.transfer_quantity >= item.quantity}
                              >
                                <FaPlus />
                              </button>
                            </div>
                            <button 
                              className="remove-btn"
                              onClick={() => handleItemSelection(item)}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <p className="no-items">
                  {searchTerm ? 'No items match your search.' : 'No items available in selected warehouse.'}
                </p>
              )}
            </div>
          )}

          {/* Selected Items Summary */}
          {selectedItems.length > 0 && (
            <div className="selected-summary">
              <h3>Transfer Summary</h3>
              <div className="summary-info">
                <p>Transferring {selectedItems.length} item(s) from <strong>{warehouses.find(w => w.id.toString() === sourceWarehouse)?.name}</strong> to <strong>{warehouses.find(w => w.id.toString() === destinationWarehouse)?.name}</strong></p>
              </div>
              <div className="summary-items">
                {selectedItems.map(item => (
                  <div key={item.id} className="summary-item">
                    <span>{item.product_name}</span>
                    <span>Qty: {item.transfer_quantity}</span>
                  </div>
                ))}
              </div>
              
              <div className="transfer-actions">
                <button 
                  className="execute-btn"
                  onClick={executeTransfer}
                  disabled={loading || !sourceWarehouse || !destinationWarehouse}
                >
                  <FaCheck /> {loading ? 'Processing...' : 'Execute Transfer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}