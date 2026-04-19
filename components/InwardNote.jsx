import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaTimes, FaFileExport, FaToggleOn, FaToggleOff } from "react-icons/fa";
import "./IssueNote.css"; // Reusing the same CSS
import GoodReceiptNote from "./good_receipt_note.jsx";

export default function InwardNote() {
  const navigate = useNavigate();
  console.log('InwardNote component rendered');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedItems, setSelectedItems] = useState([
    { itemName: "", uom: "", quantity: 1 }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGoodReceiptNote, setShowGoodReceiptNote] = useState(false);
  // Add state for transporter name and bill number
  const [transporterName, setTransporterName] = useState("");
  const [billNo, setBillNo] = useState("");
  // Add state for additional fields
  const [contactPerson, setContactPerson] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [storeIncharge, setStoreIncharge] = useState("");
  // Add state for inventory update toggle
  const [addToInventory, setAddToInventory] = useState(true);

  useEffect(() => {
    console.log('InwardNote useEffect - fetching warehouses');
    fetchWarehouses();
  }, []);

  useEffect(() => {
    console.log('InwardNote useEffect - selectedWarehouse changed:', selectedWarehouse);
    if (selectedWarehouse) {
      fetchInventoryItems();
    } else {
      setInventoryItems([]);
      // Reset selected items when warehouse changes
      setSelectedItems([{ itemName: "", uom: "", quantity: 1 }]);
    }
  }, [selectedWarehouse]);

  // Replace direct database calls with IPC calls
  async function fetchWarehouses() {
    try {
      console.log('Fetching warehouses from electronAPI');
      const data = await window.electronAPI.getWarehouses();
      console.log('Warehouses data received:', data);
      setWarehouses(data || []);
    } catch (error) {
      console.error("Warehouses fetch error:", error);
    }
  }

  async function fetchInventoryItems() {
    if (!selectedWarehouse) return;
    
    try {
      console.log('Fetching inventory items for warehouse:', selectedWarehouse);
      const data = await window.electronAPI.getInventory(selectedWarehouse);
      console.log('Inventory items data received:', data);
      
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
    console.log('handleWarehouseChange called with:', warehouseId);
    setSelectedWarehouse(warehouseId);
    // Reset selected items when warehouse changes
    setSelectedItems([{ itemName: "", uom: "", quantity: 1 }]);
  };

  const handleCloseGoodReceiptNote = () => {
    console.log('handleCloseGoodReceiptNote called');
    setShowGoodReceiptNote(false);
    // Refresh inventory when good receipt note is closed after successful operation
    // Note: We can't refresh inventory from here since we're not in the inventory context
  };

  // Add a dummy function for inventory update since we're not in the inventory context
  const handleInventoryUpdate = () => {
    console.log("Inventory update requested");
    // In a real implementation, this would refresh the inventory data
  };

  const handleItemChange = (index, field, value) => {
    console.log('handleItemChange called:', { index, field, value });
    const updatedItems = [...selectedItems];
    
    updatedItems[index][field] = value;
    
    setSelectedItems(updatedItems);
  };

  const handleAddItem = () => {
    console.log('handleAddItem called');
    setSelectedItems([
      ...selectedItems,
      { itemName: "", uom: "", quantity: 1 }
    ]);
  };

  const handleRemoveItem = (index) => {
    console.log('handleRemoveItem called with index:', index);
    if (selectedItems.length <= 1) return; // Prevent removing the last item
    
    const updatedItems = [...selectedItems];
    updatedItems.splice(index, 1);
    setSelectedItems(updatedItems);
  };

  const getSelectedWarehouseName = () => {
    const warehouse = warehouses.find(w => w.id == selectedWarehouse);
    return warehouse ? warehouse.name : "";
  };

  const handleGenerateGatePass = async () => {
    console.log('handleGenerateGatePass called');
    // Validate all items are selected and have valid quantities
    const validItems = selectedItems.filter(item => 
      item.itemName.trim() && 
      item.uom.trim() &&
      item.quantity > 0
    );

    if (validItems.length === 0) {
      alert("Please enter at least one item with a valid name, UOM, and quantity.");
      return;
    }

    if (validItems.length !== selectedItems.length) {
      alert("Please ensure all items have valid names, UOMs, and quantities.");
      return;
    }

    // Validate transporter name and bill number
    if (!transporterName.trim()) {
      alert("Please enter the transporter name.");
      return;
    }

    if (!billNo.trim()) {
      alert("Please enter the bill number.");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Show the Good Receipt Note component
      console.log("Generating receipt gate pass for items:", validItems);
      
      setShowGoodReceiptNote(true);
      
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
    item.itemName.trim() && 
    item.uom.trim() &&
    item.quantity > 0
  ) && transporterName.trim() && billNo.trim(); // Add transporter name and bill no validation

  console.log('InwardNote rendering with state:', {
    showGoodReceiptNote,
    selectedWarehouse,
    selectedItems,
    isGenerating
  });

  return (
    <div className="issue-note-overlay">
      <div className="issue-note-container">
        <div className="issue-note-header">
          <h2>Generate Receipt Note</h2>
          <button className="close-button" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Transporter Name and Bill No Section */}
        <div className="party-bill-section">
          <div className="input-group">
            <label>Transporter Name:</label>
            <input
              type="text"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className="input-field"
              placeholder="Enter transporter name"
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

        {/* Add to Inventory Toggle */}
        <div className="toggle-section">
          <div className="toggle-container">
            <span className="toggle-label">Add items to inventory:</span>
            <button 
              className={`toggle-button ${addToInventory ? 'on' : 'off'}`}
              onClick={() => setAddToInventory(!addToInventory)}
            >
              {addToInventory ? <FaToggleOn /> : <FaToggleOff />}
              <span className="toggle-text">{addToInventory ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          <p className="toggle-description">
            {addToInventory 
              ? "Items will be added to inventory when generating the receipt note" 
              : "Items will NOT be added to inventory when generating the receipt note"}
          </p>
        </div>

        <div className="items-section">
          <div className="section-header">
            <h3>Enter Items to Receive</h3>
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
              <div key={index} className="item-entry-card">
                <div className="item-input-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                    className="item-name-input"
                    placeholder="Enter item name"
                    disabled={!selectedWarehouse}
                  />
                </div>

                <div className="item-input-group">
                  <label>UOM</label>
                  <input
                    type="text"
                    value={item.uom}
                    onChange={(e) => handleItemChange(index, "uom", e.target.value)}
                    className="uom-field"
                    placeholder="Enter UOM"
                    disabled={!selectedWarehouse}
                  />
                </div>

                <div className="item-input-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                    className="quantity-field"
                    disabled={!selectedWarehouse}
                  />
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
            <span>Total Items: {selectedItems.filter(item => item.itemName.trim()).length}</span>
          </div>
          <button 
            className={`generate-gate-pass-btn ${!isValidToGenerate || isGenerating ? 'disabled' : ''}`}
            onClick={handleGenerateGatePass}
            disabled={!isValidToGenerate || isGenerating}
          >
            <FaFileExport />
            {isGenerating ? "Generating..." : "Generate Receipt Note"}
          </button>
        </div>
      </div>
      
      {/* Good Receipt Note Modal */}
      {showGoodReceiptNote && (
        <GoodReceiptNote 
          selectedItems={selectedItems.filter(item => item.itemName.trim())}
          selectedWarehouse={getSelectedWarehouseName()}
          onClose={handleCloseGoodReceiptNote}
          onInventoryUpdate={handleInventoryUpdate}
          transporterName={transporterName}
          billNo={billNo}
          contactPerson={contactPerson}
          approvedBy={approvedBy}
          storeIncharge={storeIncharge}
          addToInventory={addToInventory}
          warehouseId={selectedWarehouse}
        />
      )}
    </div>
  );
}