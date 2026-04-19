import React, { useState } from "react";
import { 
  FaFileExport, 
  FaReceipt, 
  FaChartBar, 
  FaExchangeAlt,
  FaBoxes,
  FaChartLine,
  FaTrash
} from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import "./VerticalNavbar.css";

export default function VerticalNavbar() {
  const navigate = useNavigate();
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [eraseKey, setEraseKey] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleNavClick = (action) => {
    console.log(`${action} clicked`);
    
    switch(action) {
      case 'Generate Issue Note':
        navigate('/issue-note');
        break;
      case 'Generate Receipt Note':
        navigate('/receipt-note');
        break;
      case 'Generate Report':
        navigate('/report');
        break;
      case 'Transfer Items':
        navigate('/transfer');
        break;
      case 'Inventory Management':
        navigate('/inventory');
        break;
      case 'Analytics':
        navigate('/');
        break;
      case 'Erase Data':
        setShowEraseModal(true);
        break;
      default:
        console.warn('Unknown action:', action);
        break;
    }
  };

  const handleEraseKeySubmit = (e) => {
    e.preventDefault();
    const correctKey = 'y7$Gq9!Rk#4Nz@X2Lp%V8m&Ue1^Tb0Fw*HcQ6s+I?d-Zj3R';
    
    if (eraseKey === correctKey) {
      setShowConfirmation(true);
    } else {
      alert('Incorrect key. Please try again.');
      setEraseKey('');
    }
  };

  const confirmEraseData = async () => {
    try {
      // Call the electron API to erase all data
      await window.electronAPI.eraseAllData();
      alert('All data has been successfully erased.');
      setShowEraseModal(false);
      setShowConfirmation(false);
      setEraseKey('');
    } catch (error) {
      console.error('Error erasing data:', error);
      alert('Error erasing data. Please try again.');
    }
  };

  return (
    <div className="vertical-navbar">
      <div className="navbar-brand">
        <div className="brand-logo">Inventory</div>
      </div>
      <div className="nav-items">
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Generate Issue Note')}
          title="Generate Issue Note"
        >
          <FaFileExport className="nav-icon" />
          <span className="nav-label">Issue Note</span>
        </div>
        
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Generate Receipt Note')}
          title="Generate Receipt Note"
        >
          <FaReceipt className="nav-icon" />
          <span className="nav-label">Receipt Note</span>
        </div>
        
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Generate Report')}
          title="Generate Report"
        >
          <FaChartBar className="nav-icon" />
          <span className="nav-label">Report</span>
        </div>
        
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Transfer Items')}
          title="Transfer Items Between Warehouses"
        >
          <FaExchangeAlt className="nav-icon" />
          <span className="nav-label">Transfer</span>
        </div>
        
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Inventory Management')}
          title="Inventory Management"
        >
          <FaBoxes className="nav-icon" />
          <span className="nav-label">Inventory</span>
        </div>
        
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Analytics')}
          title="Analytics Dashboard"
        >
          <FaChartLine className="nav-icon" />
          <span className="nav-label">Analytics</span>
        </div>
        
        <div 
          className="nav-item" 
          onClick={() => handleNavClick('Erase Data')}
          title="Erase All Data"
        >
          <FaTrash className="nav-icon" />
          <span className="nav-label">Erase Data</span>
        </div>
      </div>
      
      {/* Erase Data Modal */}
      {showEraseModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Erase All Data</h3>
              <button onClick={() => {
                setShowEraseModal(false);
                setShowConfirmation(false);
                setEraseKey('');
              }}>×</button>
            </div>
            
            <div className="modal-content">
              {!showConfirmation ? (
                <form onSubmit={handleEraseKeySubmit}>
                  <div className="form-group">
                    <label>Enter Security Key:</label>
                    <input
                      type="password"
                      value={eraseKey}
                      onChange={(e) => setEraseKey(e.target.value)}
                      placeholder="Enter the security key"
                      required
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" onClick={() => {
                      setShowEraseModal(false);
                      setShowConfirmation(false);
                      setEraseKey('');
                    }}>
                      Cancel
                    </button>
                    <button type="submit" className="danger-btn">
                      Verify Key
                    </button>
                  </div>
                </form>
              ) : (
                <div className="confirmation-content">
                  <p className="warning-text">
                    ⚠️ Warning: This action will permanently erase ALL data from the database.
                    This includes all inventory items, warehouse records, issue notes, receipt notes,
                    and transfer records. This action cannot be undone.
                  </p>
                  <p>Are you absolutely sure you want to proceed?</p>
                  <div className="modal-actions">
                    <button type="button" onClick={() => {
                      setShowEraseModal(false);
                      setShowConfirmation(false);
                      setEraseKey('');
                    }}>
                      Cancel
                    </button>
                    <button type="button" className="danger-btn" onClick={confirmEraseData}>
                      Yes, Erase All Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}