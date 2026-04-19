import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./main_page_inventory.css";
import VerticalNavbar from "./VerticalNavbar.jsx";
import { FaArrowLeft } from "react-icons/fa";

export default function InventoryManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedWarehouseForAdd, setSelectedWarehouseForAdd] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(""); // Add error state

  // ✅ Fetch inventory and warehouses on load
  useEffect(() => {
    fetchItems();
    fetchWarehouses();
  }, []);

  // ✅ Fetch items when warehouse filter changes
  useEffect(() => {
    fetchItems();
  }, [selectedWarehouse]);

  // Replace direct database calls with IPC calls
  async function fetchItems() {
    try {
      let data;
      if (selectedWarehouse) {
        data = await window.electronAPI.getInventory(selectedWarehouse);
      } else {
        data = await window.electronAPI.getInventory();
      }
      
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
      
      setItems(transformedData || []);
    } catch (error) {
      console.error("Fetch error:", error);
      setItems([]);
    }
  }

  async function fetchWarehouses() {
    try {
      const data = await window.electronAPI.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error("Warehouses fetch error:", error);
      setWarehouses([]);
    }
  }

  async function handleAddOrUpdate() {
    // Clear previous error messages
    setErrorMessage("");
    
    if (!name.trim() || quantity === "" || quantity === null || quantity === undefined) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    
    // Validate that quantity is not negative
    const quantityValue = parseInt(quantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
      setErrorMessage("Quantity cannot be negative. Please enter a valid quantity.");
      return;
    }
    
    // For new items, require warehouse selection
    if (!editingId && !selectedWarehouseForAdd) {
      setErrorMessage("Please select a warehouse for the new item.");
      return;
    }

    try {
      if (editingId) {
        // 🔄 Update existing
        const updateData = {
          product_name: name,
          quantity: quantityValue,
          warehouse_id: selectedWarehouseForAdd ? parseInt(selectedWarehouseForAdd) : undefined
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
          updateData[key] === undefined && delete updateData[key]
        );
        
        await window.electronAPI.updateInventoryItem(editingId, updateData);
      } else {
        // ➕ Insert new
        await window.electronAPI.addInventoryItem({
          warehouse_id: parseInt(selectedWarehouseForAdd),
          product_name: name,
          quantity: quantityValue,
        });
      }

      setName("");
      setQuantity("");
      setSelectedWarehouseForAdd("");
      setEditingId(null);
      fetchItems(); // refresh
    } catch (error) {
      console.error("Add/Update error:", error);
      setErrorMessage("Error occurred while saving item: " + error.message);
    }
  }

  async function handleDelete(id) {
    try {
      await window.electronAPI.deleteInventoryItem(id);
      fetchItems();
    } catch (error) {
      console.error("Delete error:", error);
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setName(item.product_name);
    setQuantity(item.quantity);
    setSelectedWarehouseForAdd(item.warehouse_id);
    setErrorMessage(""); // Clear error when editing
  }

  function handleCancelEdit() {
    setEditingId(null);
    setName("");
    setQuantity("");
    setSelectedWarehouseForAdd("");
    setErrorMessage(""); // Clear error when canceling
  }

  const handleBackToAnalytics = () => {
    // Navigate to the analytics component
    navigate('/');
  };

  return (
    <>
      <VerticalNavbar />
      <div className="inventory-container">
        
        
        {/* Warehouse Filter */}
        <div className="card filter-section">
          <h3>Filter by Warehouse</h3>
          <select
            className="input warehouse-filter"
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        {/* Input Form */}
        <div className="card">
          <h3>{editingId ? "Edit Item" : "Add New Item"}</h3>
          {/* Error message display */}
          {errorMessage && (
            <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
              {errorMessage}
            </div>
          )}
          <input
            className="input"
            placeholder="Item Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // Clear error when user starts typing
              if (errorMessage) setErrorMessage("");
            }}
          />
          <input
            className="input"
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              // Clear error when user starts typing
              if (errorMessage) setErrorMessage("");
            }}
          />
          <select
            className="input"
            value={selectedWarehouseForAdd}
            onChange={(e) => {
              setSelectedWarehouseForAdd(e.target.value);
              // Clear error when user makes selection
              if (errorMessage) setErrorMessage("");
            }}
            required
          >
            <option value="">
              {editingId ? "Keep current warehouse" : "Select Warehouse"}
            </option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <div className="button-group">
            <button className="button add" onClick={handleAddOrUpdate}>
              {editingId ? "Update Item" : "Add Item"}
            </button>
            {editingId && (
              <button className="button cancel" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Inventory List */}
        <div className="list">
          <div className="list-header">
            <h3>
              Inventory Items 
              {selectedWarehouse && warehouses.find(w => w.id == selectedWarehouse) && 
                `- ${warehouses.find(w => w.id == selectedWarehouse).name}`
              }
              <span className="count">({items.length} items)</span>
            </h3>
          </div>
          
          {items.length === 0 && (
            <p className="empty">
              {selectedWarehouse ? 
                "No items found in the selected warehouse." : 
                "No items in inventory."
              }
            </p>
          )}

          {items.map((item) => (
            <div key={item.id} className="card list-item">
              <div>
                <p className="item-name">{item.product_name}</p>
                <p className="item-qty">Quantity: {item.quantity}</p>
                <p className="item-meta">
                  Warehouse: {item.warehouses ? item.warehouses.name : `ID: ${item.warehouse_id}`}
                </p>
                <p className="item-meta">
                  Last Updated:{" "}
                  {item.updated_at
                    ? new Date(item.updated_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="actions">
                <button className="button edit" onClick={() => handleEdit(item)}>
                  Edit
                </button>
                <button
                  className="button delete"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}