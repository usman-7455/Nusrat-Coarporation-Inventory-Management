import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaTimes, FaFileExport } from "react-icons/fa";
import "./IssueNote.css";
import GoodIssueNote from "./good_issue_note.jsx";

export default function IssueNote() {
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedItems, setSelectedItems] = useState([
    { productId: "", productName: "", availableQuantity: 0, requestedQuantity: 1 }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGoodIssueNote, setShowGoodIssueNote] = useState(false);
  // Add state for party name and bill number
  const [partyName, setPartyName] = useState("");
  const [billNo, setBillNo] = useState("");
  // Add state for additional fields
  const [contactPerson, setContactPerson] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [storeIncharge, setStoreIncharge] = useState("");

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchInventoryItems();
    } else {
      setInventoryItems([]);
      // Reset selected items when warehouse changes
      setSelectedItems([{ productId: "", productName: "", availableQuantity: 0, requestedQuantity: 1 }]);
    }
  }, [selectedWarehouse]);

  // Replace direct database calls with IPC calls
  async function fetchWarehouses() {
    try {
      const data = await window.electronAPI.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error("Warehouses fetch error:", error);
    }
  }

  async function fetchInventoryItems() {
    if (!selectedWarehouse) return;
    
    try {
      const data = await window.electronAPI.getInventory(selectedWarehouse);
      
      // Transform data to match the expected format
      const transformedData = data.map(item => ({
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
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }

  const handleWarehouseChange = (warehouseId) => {
    setSelectedWarehouse(warehouseId);
    // Reset selected items when warehouse changes
    setSelectedItems([{ productId: "", productName: "", availableQuantity: 0, requestedQuantity: 1 }]);
  };

  const handleCloseGoodIssueNote = () => {
    setShowGoodIssueNote(false);
    // Refresh inventory when good issue note is closed after successful operation
    // Note: We can't refresh inventory from here since we're not in the inventory context
  };

  // Add a dummy function for inventory update since we're not in the inventory context
  const handleInventoryUpdate = () => {
    console.log("Inventory update requested");
    // In a real implementation, this would refresh the inventory data
  };

  const getSelectedWarehouseName = () => {
    const warehouse = warehouses.find(w => w.id == selectedWarehouse);
    return warehouse ? warehouse.name : "";
  };

  const handleAddItem = () => {
    setSelectedItems([
      ...selectedItems,
      { productId: "", productName: "", availableQuantity: 0, requestedQuantity: 1 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...selectedItems];
    
    if (field === "productId") {
      const selectedProduct = inventoryItems.find(item => item.id === parseInt(value));
      if (selectedProduct) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value,
          productName: selectedProduct.product_name,
          availableQuantity: selectedProduct.quantity,
          requestedQuantity: Math.min(updatedItems[index].requestedQuantity, selectedProduct.quantity)
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: "",
          productName: "",
          availableQuantity: 0,
          requestedQuantity: 1
        };
      }
    } else {
      updatedItems[index][field] = value;
    }
    
    setSelectedItems(updatedItems);
  };

  const handleGenerateGatePass = async () => {
    // Validate all items are selected and have valid quantities
    const validItems = selectedItems.filter(item => 
      item.productId && 
      item.requestedQuantity > 0 && 
      item.requestedQuantity <= item.availableQuantity
    );

    if (validItems.length === 0) {
      alert("Please select at least one item with a valid quantity.");
      return;
    }

    if (validItems.length !== selectedItems.length) {
      alert("Please ensure all selected items have valid quantities.");
      return;
    }

    // Validate party name and bill number
    if (!partyName.trim()) {
      alert("Please enter the party name.");
      return;
    }

    if (!billNo.trim()) {
      alert("Please enter the bill number.");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Instead of simulating API call, show the Good Issue Note
      console.log("Generating gate pass for items:", validItems);
      
      // Show the Good Issue Note component
      setShowGoodIssueNote(true);
      
    } catch (error) {
      console.error("Error generating gate pass:", error);
      alert("Error generating gate pass. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    // Navigate back to the previous page or to the analytics dashboard
    navigate(-1); // Go back to the previous page
  };

  const isValidToGenerate = selectedWarehouse && selectedItems.every(item => 
    item.productId && 
    item.requestedQuantity > 0 && 
    item.requestedQuantity <= item.availableQuantity
  ) && partyName.trim() && billNo.trim(); // Add party name and bill no validation

  return (
    <div className="issue-note-overlay">
      <div className="issue-note-container">
        <div className="issue-note-header">
          <h2>Generate Issue Note</h2>
          <button className="close-button" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Party Name and Bill No Section */}
        <div className="party-bill-section">
          <div className="input-group">
            <label>Party Name:</label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="input-field"
              placeholder="Enter party name"
            />
          </div>
          <div className="input-group">
            <label>Bill No:</label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              className="input-field"
              placeholder="Enter bill number"
            />
          </div>
        </div>

        <div className="warehouse-selection">
          <label>Select Warehouse:</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            className="warehouse-select"
          >
            <option value="">Select Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div className="items-section">
          <div className="section-header">
            <h3>Select Items to Issue</h3>
            <button 
              className="add-item-btn" 
              onClick={handleAddItem}
              disabled={!selectedWarehouse}
            >
              <FaPlus /> Add Item
            </button>
          </div>

          <div className="items-list">
            {selectedItems.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-select">
                  <label>Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                    className="product-select"
                    disabled={!selectedWarehouse}
                  >
                    <option value="">
                      {selectedWarehouse ? "Select Product" : "Select Warehouse First"}
                    </option>
                    {inventoryItems.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.product_name} (Available: {product.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="quantity-input">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={item.availableQuantity}
                    value={item.requestedQuantity}
                    onChange={(e) => handleItemChange(index, "requestedQuantity", parseInt(e.target.value) || 1)}
                    className="quantity-field"
                    disabled={!item.productId}
                  />
                  {item.productId && (
                    <span className="available-qty">
                      / {item.availableQuantity} available
                    </span>
                  )}
                </div>

                <div className="item-actions">
                  <button 
                    className="remove-item-btn"
                    onClick={() => handleRemoveItem(index)}
                    disabled={selectedItems.length === 1}
                    title="Remove Item"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Fields Section */}
        <div className="additional-fields">
          <h3>Additional Information</h3>
          <div className="fields-grid">
            <div className="field-group">
              <label>Contact Person:</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="input-field"
                placeholder="Enter contact person"
              />
            </div>
            <div className="field-group">
              <label>Approved By:</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="input-field"
                placeholder="Enter approver name"
              />
            </div>
            <div className="field-group">
              <label>Store Incharge:</label>
              <input
                type="text"
                value={storeIncharge}
                onChange={(e) => setStoreIncharge(e.target.value)}
                className="input-field"
                placeholder="Enter store incharge"
              />
            </div>
          </div>
        </div>

        <div className="issue-note-footer">
          <div className="summary">
            <span>Total Items: {selectedItems.filter(item => item.productId).length}</span>
          </div>
          <button 
            className={`generate-gate-pass-btn ${!isValidToGenerate || isGenerating ? 'disabled' : ''}`}
            onClick={handleGenerateGatePass}
            disabled={!isValidToGenerate || isGenerating}
          >
            <FaFileExport />
            {isGenerating ? "Generating..." : "Generate Gate Pass"}
          </button>
        </div>
      </div>
      
      {/* Good Issue Note Modal */}
      {showGoodIssueNote && (
        <GoodIssueNote 
          selectedItems={selectedItems.filter(item => item.productId)}
          selectedWarehouse={getSelectedWarehouseName()}
          onClose={handleCloseGoodIssueNote}
          onInventoryUpdate={handleInventoryUpdate}
          partyName={partyName}
          billNo={billNo}
          contactPerson={contactPerson}
          approvedBy={approvedBy}
          storeIncharge={storeIncharge}
        />
      )}
    </div>
  );
}