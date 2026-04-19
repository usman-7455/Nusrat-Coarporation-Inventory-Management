import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./good_issue_note.css";
import logo from './logo.png';

export default function GoodIssueNote({ 
  selectedItems = [], 
  selectedWarehouse = "", 
  onClose, 
  onInventoryUpdate, 
  partyName = "", 
  billNo = "",
  contactPerson = "",
  approvedBy = "",
  storeIncharge = ""
}) {
  const printRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [nextGinNumber, setNextGinNumber] = useState(null);

  // Fetch the next GIN number from database
  const fetchNextGinNumber = async () => {
    try {
      const nextNumber = await window.electronAPI.getNextGinNumber();
      return nextNumber;
    } catch (error) {
      console.error('Error fetching next GIN number:', error);
      return 1; // Default to 1 if error
    }
  };

  // Initialize GIN number on component mount
  useEffect(() => {
    const initializeGinNumber = async () => {
      const ginNumber = await fetchNextGinNumber();
      setNextGinNumber(ginNumber);
    };
    initializeGinNumber();
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
    ginNo: '', // Will be set when nextGinNumber is loaded
    date: getCurrentDate(),
    godown: selectedWarehouse,
    partName: partyName || "XYZ",
    billNo: billNo || "4321",
    item: selectedItems.length > 0 ? selectedItems[0].productName : "Starch Sethi 50 KG",
    uom: "Bag",
    qty: selectedItems.length > 0 ? selectedItems[0].requestedQuantity.toString() : "2",
    contactPerson: contactPerson || "Malik Qasim 0306-3303831 Abdul Raziq :- 0345-7840040",
    approvedBy: approvedBy || "",
    storeIncharge: storeIncharge || "",
  });

  // Update form GIN number when nextGinNumber is fetched
  useEffect(() => {
    if (nextGinNumber !== null) {
      setForm(prev => ({ ...prev, ginNo: nextGinNumber.toString() }));
    }
  }, [nextGinNumber]);

  // Update form when props change
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      partName: partyName || prev.partName,
      billNo: billNo || prev.billNo,
      contactPerson: contactPerson || prev.contactPerson,
      approvedBy: approvedBy || prev.approvedBy,
      storeIncharge: storeIncharge || prev.storeIncharge
    }));
  }, [partyName, billNo, contactPerson, approvedBy, storeIncharge]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const saveOutwardPassToDatabase = async () => {
    try {
      // First, save the outward pass record
      const outwardPassData = {
        gin_no: parseInt(form.ginNo),
        bill_no: form.billNo,
        date_issued: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        godown: form.godown,
        part_name: form.partName,
        contact_person: form.contactPerson,
        approved_by: form.approvedBy || null
      };

      const outwardId = await window.electronAPI.addOutwardPass(outwardPassData);

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

      // Prepare items data for outward_pass_item table
      const itemsData = selectedItems.map((item, index) => ({
        outward_id: outwardId,
        sr_no: index + 1,
        item_name: item.productName,
        uom: 'Bag', // Default UOM
        quantity: item.requestedQuantity
      }));

      // Save items to outward_pass_item table
      await window.electronAPI.addOutwardPassItems(itemsData);

      // Update inventory quantities (subtract issued quantities) and track movements
      for (const item of selectedItems) {
        const productName = item.productName?.trim().toLowerCase() || '';
        const quantityBefore = inventoryBeforeMap[productName] || 0;
        const quantityIssued = item.requestedQuantity;
        const quantityAfter = quantityBefore - quantityIssued;
        
        // Record the product movement using the captured before state
        await window.electronAPI.addOutwardProductMovement({
          outward_id: outwardId,
          product_name: item.productName,
          warehouse_name: form.godown,
          quantity_before: quantityBefore,
          quantity_issued: quantityIssued,
          quantity_after: quantityAfter,
          movement_date: new Date().toISOString(),
          gin_no: parseInt(form.ginNo),
          part_name: form.partName
        });
        
        // Update actual inventory quantity
        await window.electronAPI.updateInventoryQuantity(
          item.productId,
          item.availableQuantity - item.requestedQuantity
        );
      }

      console.log('Outward pass saved successfully with ID:', outwardId);
      return true;

    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Error saving to database: ' + error.message);
      return false;
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // First, save to database
      const dbSaveSuccess = await saveOutwardPassToDatabase();
      
      if (!dbSaveSuccess) {
        // If database save fails, don't generate PDF
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
      pdf.save(`Good_Issue_Note_${form.ginNo}.pdf`);
      
      // Show success message
      alert('Good Issue Note saved to database and PDF generated successfully!');
      
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

  return (
    <div className="note-overlay">
      <div className="note-container">
        <div className="note-header-controls">
          <button 
            className="print-pdf-btn" 
            onClick={generatePDF}
            disabled={isGeneratingPDF || nextGinNumber === null}
          >
            {isGeneratingPDF 
              ? "Saving & Generating..." 
              : nextGinNumber === null 
                ? "Loading GIN Number..." 
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
              <h1 className="main-title">Good Issue Note</h1>
              <div className="document-info">
                <p className="info-line">
                  <span className="info-label">GIN No:</span>
                  <input name="ginNo" value={form.ginNo} onChange={handleChange} className="underline-input" />
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

          {/* Party and Bill Information */}
          <div className="party-bill-section">
            <div className="party-info">
              <span className="field-label">Party Name:</span>
              <input
                name="partName"
                value={form.partName}
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
                        value={item.productName}
                        readOnly
                        className="full-input"
                      />
                    </td>
                    <td>
                      <input
                        value="Bag"
                        readOnly
                      />
                    </td>
                    <td>
                      <input
                        value={item.requestedQuantity}
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