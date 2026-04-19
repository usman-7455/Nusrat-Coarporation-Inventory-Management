import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./good_issue_note.css"; // Reusing the same CSS
import logo from './logo.png';

export default function GoodReceiptNote({ 
  selectedItems = [], 
  selectedWarehouse = "", 
  onClose, 
  onInventoryUpdate, 
  transporterName = "", 
  billNo = "",
  contactPerson = "",
  approvedBy = "",
  storeIncharge = "",
  addToInventory = true,
  warehouseId = ""
}) {
  console.log('GoodReceiptNote component rendered with props:', { selectedItems, selectedWarehouse });
  const printRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [nextGrnNumber, setNextGrnNumber] = useState(null);

  // Fetch the next GRN number from database
  const fetchNextGrnNumber = async () => {
    try {
      console.log('Fetching next GRN number');
      const nextNumber = await window.electronAPI.getNextGrnNumber();
      console.log('Next GRN number received:', nextNumber);
      return nextNumber;
    } catch (error) {
      console.error('Error fetching next GRN number:', error);
      return 1; // Default to 1 if error
    }
  };

  // Initialize GRN number on component mount
  useEffect(() => {
    console.log('GoodReceiptNote useEffect - initializing GRN number');
    const initializeGrnNumber = async () => {
      const grnNumber = await fetchNextGrnNumber();
      setNextGrnNumber(grnNumber);
    };
    initializeGrnNumber();
  }, []);

  // Get current date in DD-MMM-YY format
  const getCurrentDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const year = now.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const [form, setForm] = useState({
    grnNo: '', // Will be set when nextGrnNumber is loaded
    date: getCurrentDate(),
    godown: selectedWarehouse,
    transporterName: transporterName || "XYZ Transport",
    billNo: billNo || "4321",
    item: selectedItems.length > 0 ? selectedItems[0].itemName : "Starch Sethi 50 KG",
    uom: selectedItems.length > 0 ? selectedItems[0].uom : "Bag",
    qty: selectedItems.length > 0 ? selectedItems[0].quantity.toString() : "2",
    contactPerson: contactPerson || "Malik Qasim 0306-3303831 Abdul Raziq :- 0345-7840040",
    approvedBy: approvedBy || "",
    storeIncharge: storeIncharge || "",
  });

  // Update form GRN number when nextGrnNumber is fetched
  useEffect(() => {
    console.log('GoodReceiptNote useEffect - nextGrnNumber changed:', nextGrnNumber);
    if (nextGrnNumber !== null) {
      setForm(prev => ({ ...prev, grnNo: nextGrnNumber.toString() }));
    }
  }, [nextGrnNumber]);

  // Update form when props change
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      transporterName: transporterName || prev.transporterName,
      billNo: billNo || prev.billNo,
      contactPerson: contactPerson || prev.contactPerson,
      approvedBy: approvedBy || prev.approvedBy,
      storeIncharge: storeIncharge || prev.storeIncharge
    }));
  }, [transporterName, billNo, contactPerson, approvedBy, storeIncharge]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const saveInwardPassToDatabase = async () => {
    try {
      console.log('Saving inward pass to database with data:', form);
      // First, save the inward pass record
      const inwardPassData = {
        grn_no: parseInt(form.grnNo),
        bill_no: form.billNo,
        date_received: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        godown: form.godown,
        supplier_name: form.transporterName,
        contact_person: form.contactPerson,
        approved_by: form.approvedBy || null
      };

      const inwardId = await window.electronAPI.addInwardPass(inwardPassData);
      console.log('Inward pass saved with ID:', inwardId);

      // Get inventory state BEFORE making changes
      const inventoryBefore = await window.electronAPI.getInventory();
      const inventoryBeforeMap = {};
      inventoryBefore.forEach(item => {
        const productName = item.product_name?.trim().toLowerCase() || '';
        if (productName) {
          if (!inventoryBeforeMap[productName]) {
            inventoryBeforeMap[productName] = 0;
          }
          inventoryBeforeMap[productName] += item.quantity || 0;
        }
      });

      // Prepare items data for inward_pass_item table
      const itemsData = selectedItems.map((item, index) => ({
        inward_id: inwardId,
        sr_no: index + 1,
        item_name: item.itemName,
        uom: item.uom,
        quantity: item.quantity
      }));

      // Save items to inward_pass_item table
      await window.electronAPI.addInwardPassItems(itemsData);
      console.log('Inward pass items saved');

      // Update inventory quantities if addToInventory is true
      if (addToInventory) {
        console.log('Adding items to inventory for warehouse:', warehouseId);
        for (const item of selectedItems) {
          const productName = item.itemName?.trim().toLowerCase() || '';
          const quantityBefore = inventoryBeforeMap[productName] || 0;
          const quantityAdded = item.quantity;
          const quantityAfter = quantityBefore + quantityAdded;
          
          // Record the product movement using the captured before state
          await window.electronAPI.addInwardProductMovement({
            inward_id: inwardId,
            product_name: item.itemName,
            warehouse_name: form.godown,
            quantity_before: quantityBefore,
            quantity_added: quantityAdded,
            quantity_after: quantityAfter,
            movement_date: new Date().toISOString(),
            grn_no: parseInt(form.grnNo),
            supplier_name: form.transporterName
          });
          
          // Check if item already exists in inventory with better string matching
          const existingItems = await window.electronAPI.getInventory(warehouseId);
          
          // Find existing item with fuzzy matching (case insensitive and trimmed)
          const existingItem = existingItems.find(i => {
            // Normalize both item names for comparison
            const existingName = i.product_name?.trim().toLowerCase();
            const newItemName = item.itemName?.trim().toLowerCase();
            
            // Exact match
            if (existingName === newItemName) {
              return true;
            }
            
            // Partial match (one name contains the other)
            if (existingName && newItemName && 
                (existingName.includes(newItemName) || newItemName.includes(existingName))) {
              return true;
            }
            
            return false;
          });
          
          if (existingItem) {
            // Update existing item quantity
            await window.electronAPI.updateInventoryQuantity(
              existingItem.id,
              existingItem.quantity + item.quantity
            );
            console.log(`Updated existing item ${item.itemName} quantity to ${existingItem.quantity + item.quantity}`);
          } else {
            // Add new item to inventory
            await window.electronAPI.addInventoryItem({
              warehouse_id: warehouseId,
              product_name: item.itemName,
              quantity: item.quantity
            });
            console.log(`Added new item ${item.itemName} with quantity ${item.quantity}`);
          }
        }
      }

      console.log('Inward pass saved successfully with ID:', inwardId);
      return true;

    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Error saving to database: ' + error.message);
      return false;
    }
  };

  const generatePDF = async () => {
    console.log('generatePDF called');
    setIsGeneratingPDF(true);
    
    try {
      // First, save to database
      const dbSaveSuccess = await saveInwardPassToDatabase();
      
      if (!dbSaveSuccess) {
        // If database save fails, don't generate PDF
        console.log('Database save failed, not generating PDF');
        return;
      }

      // Then generate PDF
      const element = printRef.current;
      
      // Wait a bit to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        height: element.scrollHeight,
        width: element.scrollWidth,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      pdf.save(`Good_Receipt_Note_${form.grnNo}.pdf`);
      
      // Show success message
      if (addToInventory) {
        alert('Good Receipt Note saved to database, items added to inventory, and PDF generated successfully!');
      } else {
        alert('Good Receipt Note saved to database and PDF generated successfully! Items were NOT added to inventory.');
      }
      
      // Trigger inventory refresh
      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  console.log('GoodReceiptNote rendering with state:', { 
    isGeneratingPDF, 
    nextGrnNumber, 
    form 
  });

  return (
    <div className="note-overlay">
      <div className="note-container">
        <div className="note-header-controls">
          <button 
            className="print-pdf-btn" 
            onClick={generatePDF}
            disabled={isGeneratingPDF || nextGrnNumber === null}
          >
            {isGeneratingPDF 
              ? "Saving & Generating..." 
              : nextGrnNumber === null 
                ? "Loading GRN Number..." 
                : "📄 Save & Download PDF"
            }
          </button>
          <button className="close-note-btn" onClick={onClose}>✕</button>
        </div>
        
        {/* Printable Content */}
        <div ref={printRef} className="printable-content">
          {/* Header with Logo */}
          <div className="header-section">
            <div className="header-left">
              <h1 className="main-title">Good Receipt Note</h1>
              <div className="document-info">
                <p className="info-line">
                  <span className="info-label">GRN No:</span>
                  <input name="grnNo" value={form.grnNo} onChange={handleChange} className="underline-input" />
                </p>
                <p className="info-line">
                  <span className="info-label">Date:</span>
                  <input name="date" value={form.date} onChange={handleChange} className="underline-input" />
                </p>
                <p className="info-line">
                  <span className="info-label">Godown:</span>
                  <input name="godown" value={form.godown} onChange={handleChange} className="underline-input godown-input" />
                </p>
              </div>
            </div>
            <div className="header-right">
              <div className="logo-section">
                <img src={logo} alt="NUSRAT CORPORATION Logo" className="company-logo" />
                <div className="company-info">
                  <p className="company-name">A Member of the Doulat Group</p>
                  <p className="company-address">P-68 Gole Karyana Bazar. FSD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transporter and Bill Information */}
          <div className="party-bill-section">
            <div className="party-info">
              <span className="field-label">Transporter:</span>
              <input
                name="transporterName"
                value={form.transporterName}
                onChange={handleChange}
                className="underline-input party-input"
              />
            </div>
            <div className="bill-info">
              <span className="field-label">Bill No:</span>
              <input
                name="billNo"
                value={form.billNo}
                onChange={handleChange}
                className="underline-input bill-input"
              />
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th className="sr-col">Sr.</th>
                <th className="item-col">Item</th>
                <th className="uom-col">UOM</th>
                <th className="qty-col">Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.length > 0 ? (
                selectedItems.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        value={item.itemName}
                        readOnly
                        className="full-input"
                      />
                    </td>
                    <td>
                      <input
                        value={item.uom}
                        readOnly
                      />
                    </td>
                    <td>
                      <input
                        value={item.quantity}
                        readOnly
                        className="qty-input"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td>1</td>
                  <td>
                    <input
                      name="item"
                      value={form.item}
                      onChange={handleChange}
                      className="full-input"
                    />
                  </td>
                  <td>
                    <input
                      name="uom"
                      value={form.uom}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <input
                      name="qty"
                      value={form.qty}
                      onChange={handleChange}
                      className="qty-input"
                    />
                  </td>
                </tr>
              )}
              {/* Fill remaining rows to ensure 8 total rows */}
              {[...Array(Math.max(0, 8 - (selectedItems.length || 1)))].map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td>{(selectedItems.length || 1) + i + 1}</td>
                  <td>
                    <input className="full-input" readOnly />
                  </td>
                  <td>
                    <input readOnly />
                  </td>
                  <td>
                    <input className="qty-input" readOnly />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Contact Information */}
          <div className="contact-section">
            <span className="field-label">Contact Person:</span>
            <input
              name="contactPerson"
              value={form.contactPerson}
              onChange={handleChange}
              className="underline-input contact-input"
            />
          </div>

          {/* Approval Section */}
          <div className="approval-section">
            <div className="approval-field">
              <span className="field-label">Approved By:</span>
              <input
                name="approvedBy"
                value={form.approvedBy}
                onChange={handleChange}
                className="underline-input approval-input"
              />
            </div>
            <div className="approval-field">
              <span className="field-label">Store Incharge:</span>
              <input
                name="storeIncharge"
                value={form.storeIncharge}
                onChange={handleChange}
                className="underline-input approval-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}