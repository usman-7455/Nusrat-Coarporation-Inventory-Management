import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaDownload, 
  FaEye, 
  FaCalendarAlt, 
  FaWarehouse,
  FaFileAlt,
  FaBoxes,
  FaChartLine,
  FaFilter,
  FaSearch,
  FaTimes,
  FaPrint
} from "react-icons/fa";
import "./Report.css";

export default function Report() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // Add this state for tabs
  
  // Data states
  const [outwardPasses, setOutwardPasses] = useState([]);
  const [inwardPasses, setInwardPasses] = useState([]); // New state for inward passes
  const [warehouses, setWarehouses] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalPasses: 0,
    totalItems: 0,
    totalQuantity: 0,
    uniqueItems: 0
  });
  const [topItems, setTopItems] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState([]);
  const [selectedPassDetails, setSelectedPassDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // New state for product-wise report data
  const [productWiseData, setProductWiseData] = useState([]);
  const [loadingProductWise, setLoadingProductWise] = useState(false);

  // New state for product movement report
  const [productMovementData, setProductMovementData] = useState([]);
  const [loadingProductMovement, setLoadingProductMovement] = useState(false);

  // New state for inward product movement report
  const [inwardProductMovementData, setInwardProductMovementData] = useState([]);
  const [loadingInwardProductMovement, setLoadingInwardProductMovement] = useState(false);

  useEffect(() => {
    fetchWarehouses();
    setDefaultDateRange();
  }, []);

  useEffect(() => {
    console.log('Date range or warehouse changed:', { dateRange, selectedWarehouse });
    fetchReportData();
  }, [dateRange, selectedWarehouse]);

  useEffect(() => {
    // Fetch product-wise data when switching to that tab
    if (activeTab === 'product') {
      fetchProductWiseData();
    }
    // Fetch inward passes when switching to inward tab
    if (activeTab === 'inward') {
      fetchInwardPasses();
    }
    // Fetch product movement data when switching to product movement tab
    if (activeTab === 'productMovement') {
      fetchProductMovementData();
    }
    // Fetch inward product movement data when switching to inward product movement tab
    if (activeTab === 'inwardProductMovement') {
      fetchInwardProductMovementData();
    }
  }, [activeTab]);

  const setDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Last 3 months instead of 1 month
    
    // Format dates as YYYY-MM-DD to match database format
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    console.log('Setting default date range:', { startDateStr, endDateStr });
    
    setDateRange({
      startDate: startDateStr,
      endDate: endDateStr
    });
  };

  const handleClose = () => {
    // Navigate back to the previous page or to the analytics dashboard
    navigate(-1); // Go back to the previous page
  };

  // Replace direct database calls with IPC calls
  const fetchWarehouses = async () => {
    try {
      const data = await window.electronAPI.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOutwardPasses(),
        fetchSummaryStats(),
        fetchTopItems(),
        fetchWarehouseStats()
      ]);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch inward passes
  const fetchInwardPasses = async () => {
    try {
      console.log('Fetching inward passes with params:', { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate, 
        selectedWarehouse 
      });
      
      const data = await window.electronAPI.getInwardPasses(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );
      
      console.log('Raw inward passes data:', data);
      
      // Fetch items for each pass
      const passesWithItems = await Promise.all(data.map(async pass => {
        try {
          console.log('Fetching items for inward pass:', pass.inward_id);
          // Fetch the detailed pass with items
          const detailedPass = await window.electronAPI.getInwardPassWithItems(pass.inward_id);
          console.log('Detailed inward pass data:', detailedPass);
          
          if (detailedPass) {
            return detailedPass;
          } else {
            console.warn('No detailed inward pass found for ID:', pass.inward_id);
            return {
              ...pass,
              inward_pass_item: []
            };
          }
        } catch (error) {
          console.error('Error fetching items for inward pass:', pass.inward_id, error);
          return {
            ...pass,
            inward_pass_item: []
          };
        }
      }));
      
      console.log('Fetched inward passes with items:', passesWithItems?.length || 0, 'records');
      console.log('Full inward passes with items data:', passesWithItems);
      setInwardPasses(passesWithItems || []);
    } catch (error) {
      console.error('Error fetching inward passes:', error);
      setInwardPasses([]); // Set empty array on error
    }
  };

  const fetchOutwardPasses = async () => {
    try {
      console.log('Fetching outward passes with params:', { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate, 
        selectedWarehouse 
      });
      
      const data = await window.electronAPI.getOutwardPasses(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );
      
      console.log('Raw outward passes data:', data);
      
      // Fetch items for each pass
      const passesWithItems = await Promise.all(data.map(async pass => {
        try {
          console.log('Fetching items for pass:', pass.outward_id);
          // Fetch the detailed pass with items
          const detailedPass = await window.electronAPI.getOutwardPassWithItems(pass.outward_id);
          console.log('Detailed pass data:', detailedPass);
          
          if (detailedPass) {
            return detailedPass;
          } else {
            console.warn('No detailed pass found for ID:', pass.outward_id);
            return {
              ...pass,
              outward_pass_item: []
            };
          }
        } catch (error) {
          console.error('Error fetching items for pass:', pass.outward_id, error);
          return {
            ...pass,
            outward_pass_item: []
          };
        }
      }));
      
      console.log('Fetched outward passes with items:', passesWithItems?.length || 0, 'records');
      console.log('Full passes with items data:', passesWithItems);
      setOutwardPasses(passesWithItems || []);
    } catch (error) {
      console.error('Error fetching outward passes:', error);
      setOutwardPasses([]); // Set empty array on error
    }
  };

  const fetchSummaryStats = async () => {
    try {
      const passes = await window.electronAPI.getOutwardPasses(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );
      
      const items = await window.electronAPI.getOutwardPassItems(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );

      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const uniqueItems = new Set(items.map(item => item.item_name)).size;

      setSummaryStats({
        totalPasses: passes.length,
        totalItems: items.length,
        totalQuantity,
        uniqueItems
      });
    } catch (error) {
      console.error('Error fetching summary stats:', error);
    }
  };

  const fetchTopItems = async () => {
    try {
      const items = await window.electronAPI.getOutwardPassItems(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );

      // Group by item name and sum quantities
      const itemMap = {};
      (items || []).forEach(item => {
        if (itemMap[item.item_name]) {
          itemMap[item.item_name].totalQuantity += item.quantity;
          itemMap[item.item_name].passCount += 1;
        } else {
          itemMap[item.item_name] = {
            itemName: item.item_name,
            totalQuantity: item.quantity,
            passCount: 1
          };
        }
      });

      const topItemsList = Object.values(itemMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      setTopItems(topItemsList);
    } catch (error) {
      console.error('Error fetching top items:', error);
    }
  };

  const fetchWarehouseStats = async () => {
    try {
      const passes = await window.electronAPI.getOutwardPasses(
        dateRange.startDate, 
        dateRange.endDate
      );

      // Group by warehouse
      const warehouseMap = {};
      (passes || []).forEach(pass => {
        const warehouseName = pass.godown || 'Unknown';
        // We'll need to get items for each pass to calculate total quantity
        // For now, we'll just count passes
        if (warehouseMap[warehouseName]) {
          warehouseMap[warehouseName].totalPasses += 1;
        } else {
          warehouseMap[warehouseName] = {
            warehouseName,
            totalPasses: 1,
            totalQuantity: 0 // We'll need to implement item fetching to get this
          };
        }
      });

      setWarehouseStats(Object.values(warehouseMap));
    } catch (error) {
      console.error('Error fetching warehouse stats:', error);
    }
  };

  const handleViewDetails = async (passId, passType) => {
    try {
      let data;
      if (passType === 'inward') {
        data = await window.electronAPI.getInwardPassWithItems(passId);
      } else {
        data = await window.electronAPI.getOutwardPassWithItems(passId);
      }
      setSelectedPassDetails({...data, passType});
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching pass details:', error);
    }
  };

  // New function to export inward passes to CSV
  const exportInwardToCSV = () => {
    console.log('Exporting inward passes to CSV, inwardPasses:', inwardPasses);
    
    // Create detailed CSV data with items for each inward pass
    const csvData = [];
    
    if (!inwardPasses || inwardPasses.length === 0) {
      console.warn('No inward passes to export');
      alert('No data to export. Please make sure you have fetched the report data first.');
      return;
    }
    
    inwardPasses.forEach((pass, passIndex) => {
      console.log(`Processing inward pass ${passIndex + 1}:`, pass);
      
      const basePassData = {
        'GRN No': pass.grn_no || '',
        'Date': pass.date_received ? new Date(pass.date_received).toLocaleDateString() : '',
        'Godown': pass.godown || '',
        'Supplier Name': pass.supplier_name || '',
        'Bill No': pass.bill_no || '',
        'Approved By': pass.approved_by || 'N/A'
      };
      
      console.log('Base inward pass data:', basePassData);
      console.log('Items for this inward pass:', pass.inward_pass_item);
      
      // Check if items exist and are properly structured
      if (pass.inward_pass_item && Array.isArray(pass.inward_pass_item) && pass.inward_pass_item.length > 0) {
        console.log(`Inward pass ${pass.inward_id} has ${pass.inward_pass_item.length} items`);
        
        pass.inward_pass_item.forEach((item, itemIndex) => {
          console.log(`Processing item ${itemIndex + 1} for inward pass ${pass.inward_id}:`, item);
          
          // Validate item structure
          if (item && typeof item === 'object') {
            csvData.push({
              ...basePassData,
              'Item Sr No': item.sr_no || '',
              'Item Name': item.item_name || '',
              'UOM': item.uom || '',
              'Quantity': item.quantity !== undefined ? item.quantity : ''
            });
            console.log('Added row to CSV data');
          } else {
            console.warn(`Invalid item structure for inward pass ${pass.inward_id}, item ${itemIndex}:`, item);
          }
        });
      } else {
        console.log(`Inward pass ${pass.inward_id} has no items, adding placeholder row`);
        // If no items, still include the pass data
        csvData.push({
          ...basePassData,
          'Item Sr No': '',
          'Item Name': 'No items',
          'UOM': '',
          'Quantity': ''
        });
      }
    });

    console.log('Final CSV data array:', csvData);

    if (csvData.length === 0) {
      console.warn('No CSV data generated');
      alert('No data to export. Please make sure you have fetched the report data first.');
      return;
    }

    const headers = [
      'GRN No', 'Date', 'Godown', 'Supplier Name', 'Bill No', 
      'Approved By', 'Item Sr No', 
      'Item Name', 'UOM', 'Quantity'
    ];
    
    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => {
        return headers.map(header => {
          const value = row[header] !== undefined ? row[header] : '';
          // Properly escape CSV values
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return `"${value}"`;
          }
        }).join(',');
      })
    ].join('\n');

    console.log('Generated CSV content:', csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inward_passes_detailed_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    console.log('Exporting to CSV, outwardPasses:', outwardPasses);
    
    // Create detailed CSV data with items for each outward pass
    const csvData = [];
    
    if (!outwardPasses || outwardPasses.length === 0) {
      console.warn('No outward passes to export');
      alert('No data to export. Please make sure you have fetched the report data first.');
      return;
    }
    
    outwardPasses.forEach((pass, passIndex) => {
      console.log(`Processing pass ${passIndex + 1}:`, pass);
      
      // Removed Contact Person from basePassData as requested
      const basePassData = {
        'GIN No': pass.gin_no || '',
        'Date': pass.date_issued ? new Date(pass.date_issued).toLocaleDateString() : '',
        'Godown': pass.godown || '',
        'Part Name': pass.part_name || '',
        'Bill No': pass.bill_no || '',
        'Approved By': pass.approved_by || 'N/A'
      };
      
      console.log('Base pass data:', basePassData);
      console.log('Items for this pass:', pass.outward_pass_item);
      
      // Check if items exist and are properly structured
      if (pass.outward_pass_item && Array.isArray(pass.outward_pass_item) && pass.outward_pass_item.length > 0) {
        console.log(`Pass ${pass.outward_id} has ${pass.outward_pass_item.length} items`);
        
        pass.outward_pass_item.forEach((item, itemIndex) => {
          console.log(`Processing item ${itemIndex + 1} for pass ${pass.outward_id}:`, item);
          
          // Validate item structure
          if (item && typeof item === 'object') {
            csvData.push({
              ...basePassData,
              'Item Sr No': item.sr_no || '',
              'Item Name': item.item_name || '',
              'UOM': item.uom || '',
              'Quantity': item.quantity !== undefined ? item.quantity : ''
            });
            console.log('Added row to CSV data');
          } else {
            console.warn(`Invalid item structure for pass ${pass.outward_id}, item ${itemIndex}:`, item);
          }
        });
      } else {
        console.log(`Pass ${pass.outward_id} has no items, adding placeholder row`);
        // If no items, still include the pass data
        csvData.push({
          ...basePassData,
          'Item Sr No': '',
          'Item Name': 'No items',
          'UOM': '',
          'Quantity': ''
        });
      }
    });

    console.log('Final CSV data array:', csvData);

    if (csvData.length === 0) {
      console.warn('No CSV data generated');
      alert('No data to export. Please make sure you have fetched the report data first.');
      return;
    }

    // Removed Contact Person from headers as requested
    const headers = [
      'GIN No', 'Date', 'Godown', 'Part Name', 'Bill No', 
      'Approved By', 'Item Sr No', 
      'Item Name', 'UOM', 'Quantity'
    ];
    
    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => {
        return headers.map(header => {
          const value = row[header] !== undefined ? row[header] : '';
          // Properly escape CSV values
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return `"${value}"`;
          }
        }).join(',');
      })
    ].join('\n');

    console.log('Generated CSV content:', csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outward_passes_detailed_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // New function to export product-wise report based on actual inventory
  const exportProductWiseCSV = async () => {
    try {
      setLoading(true);
      
      // Get all warehouses
      const allWarehouses = await window.electronAPI.getWarehouses();
      console.log('Export - All warehouses:', allWarehouses);
      
      // Get product quantities by warehouse from actual inventory
      const productQuantities = await window.electronAPI.getProductWarehouseQuantities();
      console.log('Export - Raw product quantities:', productQuantities);
      
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
      
      console.log('Export - Unique products:', uniqueProducts);
      
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
      
      // Second pass: aggregate quantities
      productQuantities.forEach(item => {
        const normalizedName = normalizeProductName(item.product_name);
        const warehouseName = item.warehouse_name;
        const quantity = parseInt(item.quantity) || 0;
        
        // Add quantity to the specific warehouse only if product name is valid
        if (normalizedName && productWarehouseMap[normalizedName]) {
          productWarehouseMap[normalizedName][warehouseName] = 
            (productWarehouseMap[normalizedName][warehouseName] || 0) + quantity;
          
          // Update total
          productWarehouseMap[normalizedName].total += quantity;
        }
      });
      
      // Convert to array format for CSV
      const csvData = Object.values(productWarehouseMap);
      console.log('Export - Final CSV data:', csvData);
      
      // Create headers: product, warehouse1, warehouse2, warehouse3, warehouse4, total
      const warehouseHeaders = allWarehouses.map(warehouse => warehouse.name);
      const headers = ['Product', ...warehouseHeaders, 'Total'];
      
      // Create CSV content - FIXED VERSION
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => {
          // Create an array with the product name first, then warehouse quantities, then total
          const values = [
            `"${row.product.toString().replace(/"/g, '""')}"`, // Product name
            ...warehouseHeaders.map(header => `"${(row[header] || 0).toString().replace(/"/g, '""')}"`), // Warehouse quantities
            `"${row.total.toString().replace(/"/g, '""')}"` // Total
          ];
          return values.join(',');
        })
      ].join('\n');
      
      console.log('Export - CSV content:', csvContent);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product_wise_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting product-wise CSV:', error);
      alert('Error exporting product-wise CSV. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch product-wise report data
  const fetchProductWiseData = async () => {
    setLoadingProductWise(true);
    try {
      // Get all warehouses
      const allWarehouses = await window.electronAPI.getWarehouses();
      console.log('All warehouses:', allWarehouses);
      setWarehouses(allWarehouses);
      
      // Get product quantities by warehouse from actual inventory
      const productQuantities = await window.electronAPI.getProductWarehouseQuantities();
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
      setProductWiseData(productData);
    } catch (error) {
      console.error('Error fetching product-wise data:', error);
      setProductWiseData([]);
    } finally {
      setLoadingProductWise(false);
    }
  };

  const filteredOutwardPasses = outwardPasses.filter(pass => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pass.gin_no?.toString().includes(searchTerm) ||
      pass.part_name?.toLowerCase().includes(searchLower) ||
      pass.godown?.toLowerCase().includes(searchLower) ||
      pass.bill_no?.toLowerCase().includes(searchLower)
    );
  });

  // New filter for inward passes
  const filteredInwardPasses = inwardPasses.filter(pass => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pass.grn_no?.toString().includes(searchTerm) ||
      pass.supplier_name?.toLowerCase().includes(searchLower) ||
      pass.godown?.toLowerCase().includes(searchLower) ||
      pass.bill_no?.toLowerCase().includes(searchLower)
    );
  });

  console.log('Outward passes:', outwardPasses.length); // Debug log
  console.log('Filtered outward passes:', filteredOutwardPasses.length); // Debug log
  console.log('Inward passes:', inwardPasses.length); // Debug log
  console.log('Filtered inward passes:', filteredInwardPasses.length); // Debug log
  console.log('Search term:', searchTerm); // Debug log

  const renderOverviewTab = () => (
    <div className="overview-content">
      {/* Date Range Info */}
      <div className="date-range-info">
        <h3>📊 Report Summary</h3>
        <p>Showing data from <strong>{new Date(dateRange.startDate).toLocaleDateString()}</strong> to <strong>{new Date(dateRange.endDate).toLocaleDateString()}</strong></p>
        {selectedWarehouse && (
          <p>Filtered by warehouse: <strong>{selectedWarehouse}</strong></p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card total-passes">
          <div className="card-icon">
            <FaFileAlt />
          </div>
          <div className="card-content">
            <h3>{summaryStats.totalPasses}</h3>
            <p>Total Issue Notes</p>
            <small>Number of outward passes created</small>
          </div>
        </div>
        
        <div className="summary-card total-items">
          <div className="card-icon">
            <FaBoxes />
          </div>
          <div className="card-content">
            <h3>{summaryStats.totalItems}</h3>
            <p>Total Item Entries</p>
            <small>Individual items issued across all passes</small>
          </div>
        </div>
        
        <div className="summary-card total-quantity">
          <div className="card-icon">
            <FaChartLine />
          </div>
          <div className="card-content">
            <h3>{summaryStats.totalQuantity}</h3>
            <p>Total Quantity Issued</p>
            <small>Sum of all quantities moved out</small>
          </div>
        </div>
        
        <div className="summary-card unique-items">
          <div className="card-icon">
            <FaBoxes />
          </div>
          <div className="card-content">
            <h3>{summaryStats.uniqueItems}</h3>
            <p>Different Products</p>
            <small>Unique product types issued</small>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="main-sections">
        {/* Most Issued Items */}
        <div className="section-card">
          <div className="section-header">
            <h4>🔥 Most Issued Items</h4>
            <p>Products with highest quantities issued</p>
          </div>
          <div className="most-issued-items">
            {topItems.length > 0 ? (
              topItems.slice(0, 8).map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-rank">#{index + 1}</div>
                  <div className="item-details">
                    <div className="item-name">{item.itemName}</div>
                    <div className="item-stats">
                      <span className="quantity">{item.totalQuantity} units</span>
                      <span className="passes">{item.passCount} times issued</span>
                    </div>
                  </div>
                  <div className="item-visual">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${(item.totalQuantity / topItems[0]?.totalQuantity) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data-message">
                <p>📦 No items found for the selected period</p>
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Activity */}
        <div className="section-card">
          <div className="section-header">
            <h4>🏪 Warehouse Activity</h4>
            <p>Issue activity by warehouse location</p>
          </div>
          <div className="warehouse-activity">
            {warehouseStats.length > 0 ? (
              warehouseStats.map((warehouse, index) => {
                const maxActivity = Math.max(...warehouseStats.map(w => w.totalPasses))
                const activityPercentage = (warehouse.totalPasses / maxActivity) * 100
                
                return (
                  <div key={index} className="warehouse-card">
                    <div className="warehouse-header">
                      <div className="warehouse-name">{warehouse.warehouseName}</div>
                      <div className="warehouse-badge">
                        {warehouse.totalPasses === maxActivity ? '🏆 Most Active' : '📍 Active'}
                      </div>
                    </div>
                    <div className="warehouse-metrics">
                      <div className="metric">
                        <span className="metric-value">{warehouse.totalPasses}</span>
                        <span className="metric-label">Issue Notes</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{warehouse.totalQuantity}</span>
                        <span className="metric-label">Total Quantity</span>
                      </div>
                    </div>
                    <div className="activity-bar">
                      <div 
                        className="activity-fill" 
                        style={{ width: `${activityPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="no-data-message">
                <p>🏪 No warehouse activity found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Preview */}
      <div className="section-card">
        <div className="section-header">
          <h4>📋 Recent Issue Notes</h4>
          <p>Latest outward passes (showing first 5)</p>
        </div>
        <div className="recent-activity">
          {outwardPasses.slice(0, 5).map((pass) => (
            <div key={pass.outward_id} className="activity-item">
              <div className="activity-icon">📄</div>
              <div className="activity-details">
                <div className="activity-main">
                  <strong>GIN #{pass.gin_no}</strong> - {pass.part_name}
                </div>
                <div className="activity-meta">
                  {new Date(pass.date_issued).toLocaleDateString()} • 
                  {pass.godown} • 
                  {pass.outward_pass_item?.length || 0} items
                </div>
              </div>
              <button
                className="quick-view-btn"
                onClick={() => handleViewDetails(pass.outward_id, 'outward')}
              >
                View Details
              </button>
            </div>
          ))}
          {outwardPasses.length === 0 && (
            <div className="no-data-message">
              <p>📋 No recent activity found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // New function to render inward passes tab
  const renderInwardTab = () => (
    <div className="inward-content">
      <div className="section-card">
        <div className="section-header">
          <h4>📥 Inward Passes (Good Receipt Notes)</h4>
          <p>All inward passes within the selected date range</p>
        </div>
        
        <div className="table-container">
          <table className="passes-table">
            <thead>
              <tr>
                <th>GRN No</th>
                <th>Date Received</th>
                <th>Godown</th>
                <th>Supplier Name</th>
                <th>Bill No</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInwardPasses.length > 0 ? (
                filteredInwardPasses.map((pass) => (
                  <tr key={pass.inward_id}>
                    <td>{pass.grn_no}</td>
                    <td>{new Date(pass.date_received).toLocaleDateString()}</td>
                    <td>{pass.godown}</td>
                    <td>{pass.supplier_name}</td>
                    <td>{pass.bill_no || 'N/A'}</td>
                    <td>{pass.inward_pass_item?.length || 0}</td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(pass.inward_id, 'inward')}
                      >
                        <FaEye /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    <div className="no-data-message">
                      <p>📥 No inward passes found for the selected criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // New function to render product-wise report tab
  const renderProductWiseTab = () => (
    <div className="product-wise-content">
      <div className="section-card">
        <div className="section-header">
          <h4>📦 Product-wise Inventory Report</h4>
          <p>Current inventory quantities by warehouse</p>
        </div>
        
        {loadingProductWise ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading product-wise data...</p>
          </div>
        ) : productWiseData.length > 0 ? (
          <div className="table-container">
            <table className="product-wise-table">
              <thead>
                <tr>
                  <th>Product</th>
                  {warehouses.map(warehouse => (
                    <th key={warehouse.id || warehouse.name}>{warehouse.name}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {productWiseData.map((product, index) => (
                  <tr key={index}>
                    <td className="product-name">
                      {product.product.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ')}
                    </td>
                    {warehouses.map(warehouse => (
                      <td key={`${index}-${warehouse.id || warehouse.name}`} className="quantity-cell">
                        {product[warehouse.name] || 0}
                      </td>
                    ))}
                    <td className="total-cell">{product.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <p>📦 No product data found</p>
          </div>
        )}
      </div>
    </div>
  );

  // New function to fetch product movement data
  const fetchProductMovementData = async () => {
    setLoadingProductMovement(true);
    try {
      // Get outward product movements for the selected date range
      const movements = await window.electronAPI.getOutwardProductMovements(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );
      
      // Sort by date (newest first)
      movements.sort((a, b) => new Date(b.movement_date) - new Date(a.movement_date));
      
      setProductMovementData(movements);
    } catch (error) {
      console.error('Error fetching product movement data:', error);
      setProductMovementData([]);
    } finally {
      setLoadingProductMovement(false);
    }
  };

  // New function to render product movement report tab
  const renderProductMovementTab = () => (
    <div className="product-movement-content">
      <div className="section-card">
        <div className="section-header">
          <h4>📦 Product Movement Report</h4>
          <p>Track product movements by gate pass/issue note</p>
        </div>
        
        {loadingProductMovement ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading product movement data...</p>
          </div>
        ) : productMovementData.length > 0 ? (
          <div className="table-container-scrollable">
            <table className="product-movement-table">
              <thead>
                <tr>
                  <th>Outward ID</th>
                  <th>GIN No</th>
                  <th>Product Name</th>
                  <th>Stock Before Issue</th>
                  <th>Quantity Issued</th>
                  <th>Remaining Stock</th>
                  <th>Party Name</th>
                  <th>Warehouse</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {productMovementData.map((record, index) => (
                  <tr key={index}>
                    <td>{record.outward_id}</td>
                    <td>{record.gin_no || 'N/A'}</td>
                    <td className="product-name">{record.product_name}</td>
                    <td className="quantity-cell">{record.quantity_before}</td>
                    <td className="quantity-cell negative">-{record.quantity_issued}</td>
                    <td className="quantity-cell">{record.quantity_after}</td>
                    <td>{record.part_name || 'N/A'}</td>
                    <td>{record.warehouse_name || 'N/A'}</td>
                    <td>{new Date(record.movement_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <p>📦 No product movement data found</p>
          </div>
        )}
      </div>
    </div>
  );

  // New function to export product movement report to CSV
  const exportProductMovementToCSV = () => {
    console.log('Exporting product movement data to CSV, productMovementData:', productMovementData);
    
    if (!productMovementData || productMovementData.length === 0) {
      console.warn('No product movement data to export');
      alert('No data to export. Please make sure you have fetched the report data first.');
      return;
    }
    
    const headers = [
      'Outward ID', 'GIN No', 'Product Name', 'Stock Before Issue', 
      'Quantity Issued', 'Remaining Stock', 'Party Name', 'Warehouse', 'Date'
    ];
    
    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(','),
      ...productMovementData.map(row => {
        return headers.map(header => {
          let value;
          switch (header) {
            case 'Outward ID':
              value = row.outward_id || '';
              break;
            case 'GIN No':
              value = row.gin_no || 'N/A';
              break;
            case 'Product Name':
              value = row.product_name || '';
              break;
            case 'Stock Before Issue':
              value = row.quantity_before || 0;
              break;
            case 'Quantity Issued':
              value = -(row.quantity_issued || 0); // Negative to show subtraction
              break;
            case 'Remaining Stock':
              value = row.quantity_after || 0;
              break;
            case 'Party Name':
              value = row.part_name || 'N/A';
              break;
            case 'Warehouse':
              value = row.warehouse_name || 'N/A';
              break;
            case 'Date':
              value = row.movement_date ? new Date(row.movement_date).toLocaleDateString() : '';
              break;
            default:
              value = '';
          }
          
          // Properly escape CSV values
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return `"${value}"`;
          }
        }).join(',');
      })
    ].join('\n');

    console.log('Generated CSV content:', csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product_movement_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // New function to fetch inward product movement data
  const fetchInwardProductMovementData = async () => {
    setLoadingInwardProductMovement(true);
    try {
      // Get inward product movements for the selected date range
      const movements = await window.electronAPI.getInwardProductMovements(
        dateRange.startDate, 
        dateRange.endDate, 
        selectedWarehouse
      );
      
      // Sort by date (newest first)
      movements.sort((a, b) => new Date(b.movement_date) - new Date(a.movement_date));
      
      setInwardProductMovementData(movements);
    } catch (error) {
      console.error('Error fetching inward product movement data:', error);
      setInwardProductMovementData([]);
    } finally {
      setLoadingInwardProductMovement(false);
    }
  };

  // New function to render inward product movement report tab
  const renderInwardProductMovementTab = () => (
    <div className="inward-product-movement-content">
      <div className="section-card">
        <div className="section-header">
          <h4>📥 Inward Product Movement Report</h4>
          <p>Track product movements by receipt note</p>
        </div>
        
        {loadingInwardProductMovement ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading inward product movement data...</p>
          </div>
        ) : inwardProductMovementData.length > 0 ? (
          <div className="table-container-scrollable">
            <table className="product-movement-table">
              <thead>
                <tr>
                  <th>Inward ID</th>
                  <th>GRN No</th>
                  <th>Product Name</th>
                  <th>Stock Before Receipt</th>
                  <th>Quantity Added</th>
                  <th>Total Stock After</th>
                  <th>Supplier Name</th>
                  <th>Warehouse</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {inwardProductMovementData.map((record, index) => (
                  <tr key={index}>
                    <td>{record.inward_id}</td>
                    <td>{record.grn_no || 'N/A'}</td>
                    <td className="product-name">{record.product_name}</td>
                    <td className="quantity-cell">{record.quantity_before}</td>
                    <td className="quantity-cell positive">+{record.quantity_added}</td>
                    <td className="quantity-cell">{record.quantity_after}</td>
                    <td>{record.supplier_name || 'N/A'}</td>
                    <td>{record.warehouse_name || 'N/A'}</td>
                    <td>{new Date(record.movement_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <p>📥 No inward product movement data found</p>
          </div>
        )}
      </div>
    </div>
  );

  // New function to export inward product movement report to CSV
  const exportInwardProductMovementToCSV = () => {
    console.log('Exporting inward product movement data to CSV, inwardProductMovementData:', inwardProductMovementData);
    
    if (!inwardProductMovementData || inwardProductMovementData.length === 0) {
      console.warn('No inward product movement data to export');
      alert('No data to export. Please make sure you have fetched the report data first.');
      return;
    }
    
    const headers = [
      'Inward ID', 'GRN No', 'Product Name', 'Stock Before Receipt', 
      'Quantity Added', 'Total Stock After', 'Warehouse', 'Date'
    ];
    
    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(','),
      ...inwardProductMovementData.map(row => {
        return headers.map(header => {
          let value;
          switch (header) {
            case 'Inward ID':
              value = row.inward_id || '';
              break;
            case 'GRN No':
              value = row.grn_no || 'N/A';
              break;
            case 'Product Name':
              value = row.product_name || '';
              break;
            case 'Stock Before Receipt':
              value = row.quantity_before || 0;
              break;
            case 'Quantity Added':
              value = row.quantity_added || 0;
              break;
            case 'Total Stock After':
              value = row.quantity_after || 0;
              break;
            case 'Warehouse':
              value = row.warehouse_name || 'N/A';
              break;
            case 'Date':
              value = row.movement_date ? new Date(row.movement_date).toLocaleDateString() : '';
              break;
            default:
              value = '';
          }
          
          // Properly escape CSV values
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return `"${value}"`;
          }
        }).join(',');
      })
    ].join('\n');

    console.log('Generated CSV content:', csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inward_product_movement_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="report-overlay">
      <div className="report-container">
        {/* Header */}
        <div className="report-header">
          <div className="header-left">
            <h2>Inventory Reports</h2>
            <p>Comprehensive analysis of inventory movements</p>
          </div>
          <div className="header-actions">
            {activeTab === 'inward' && (
              <button className="export-btn" onClick={exportInwardToCSV}>
                <FaDownload /> Export Inward CSV
              </button>
            )}
            {activeTab === 'overview' && (
              <button className="export-btn" onClick={exportToCSV}>
                <FaDownload /> Export Detailed CSV
              </button>
            )}
            {activeTab === 'product' && (
              <button className="export-btn" onClick={exportProductWiseCSV}>
                <FaDownload /> Export Product-wise CSV
              </button>
            )}
            {activeTab === 'productMovement' && (
              <button className="export-btn" onClick={exportProductMovementToCSV}>
                <FaDownload /> Export Product Movement CSV
              </button>
            )}
            {activeTab === 'inwardProductMovement' && (
              <button className="export-btn" onClick={exportInwardProductMovementToCSV}>
                <FaDownload /> Export Inward Product Movement CSV
              </button>
            )}
            <button className="close-btn" onClick={handleClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>
              <FaCalendarAlt /> Date Range:
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label>
              <FaWarehouse /> Warehouse:
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.name}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group search-group">
            <label>
              <FaSearch /> Search:
            </label>
            <input
              type="text"
              placeholder="Search by ID, name, or bill no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="report-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'outward' ? 'active' : ''}`}
            onClick={() => setActiveTab('outward')}
          >
            Outward Passes
          </button>
          <button 
            className={`tab-button ${activeTab === 'inward' ? 'active' : ''}`}
            onClick={() => setActiveTab('inward')}
          >
            Inward Passes
          </button>
          <button 
            className={`tab-button ${activeTab === 'product' ? 'active' : ''}`}
            onClick={() => setActiveTab('product')}
          >
            Product-wise Report
          </button>
          <button 
            className={`tab-button ${activeTab === 'productMovement' ? 'active' : ''}`}
            onClick={() => setActiveTab('productMovement')}
          >
            Outward Product Movement
          </button>
          <button 
            className={`tab-button ${activeTab === 'inwardProductMovement' ? 'active' : ''}`}
            onClick={() => setActiveTab('inwardProductMovement')}
          >
            Inward Product Movement
          </button>
        </div>

        {/* Tab Content */}
        <div className="report-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading report data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'outward' && (
                <div className="outward-content">
                  <div className="section-card">
                    <div className="section-header">
                      <h4>📤 Outward Passes (Good Issue Notes)</h4>
                      <p>All outward passes within the selected date range</p>
                    </div>
                    
                    <div className="table-container">
                      <table className="passes-table">
                        <thead>
                          <tr>
                            <th>GIN No</th>
                            <th>Date Issued</th>
                            <th>Godown</th>
                            <th>Part Name</th>
                            <th>Bill No</th>
                            <th>Items</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOutwardPasses.length > 0 ? (
                            filteredOutwardPasses.map((pass) => (
                              <tr key={pass.outward_id}>
                                <td>{pass.gin_no}</td>
                                <td>{new Date(pass.date_issued).toLocaleDateString()}</td>
                                <td>{pass.godown}</td>
                                <td>{pass.part_name}</td>
                                <td>{pass.bill_no || 'N/A'}</td>
                                <td>{pass.outward_pass_item?.length || 0}</td>
                                <td>
                                  <button 
                                    className="action-btn view-btn"
                                    onClick={() => handleViewDetails(pass.outward_id, 'outward')}
                                  >
                                    <FaEye /> View
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="no-data">
                                <div className="no-data-message">
                                  <p>📤 No outward passes found for the selected criteria</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'inward' && renderInwardTab()}
              {activeTab === 'product' && renderProductWiseTab()}
              {activeTab === 'productMovement' && renderProductMovementTab()}
              {activeTab === 'inwardProductMovement' && renderInwardProductMovementTab()}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPassDetails && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                {selectedPassDetails.passType === 'inward' 
                  ? `Inward Pass Details - GRN #${selectedPassDetails.grn_no}` 
                  : `Outward Pass Details - GIN #${selectedPassDetails.gin_no}`}
              </h3>
              <button onClick={() => setShowDetailsModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="details-grid">
                {selectedPassDetails.passType === 'inward' ? (
                  <>
                    <div className="detail-item">
                      <label>Date Received:</label>
                      <span>{new Date(selectedPassDetails.date_received).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Godown:</label>
                      <span>{selectedPassDetails.godown}</span>
                    </div>
                    <div className="detail-item">
                      <label>Supplier Name:</label>
                      <span>{selectedPassDetails.supplier_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Bill No:</label>
                      <span>{selectedPassDetails.bill_no || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Approved By:</label>
                      <span>{selectedPassDetails.approved_by || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="detail-item">
                      <label>Date Issued:</label>
                      <span>{new Date(selectedPassDetails.date_issued).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Godown:</label>
                      <span>{selectedPassDetails.godown}</span>
                    </div>
                    <div className="detail-item">
                      <label>Party Name:</label>
                      <span>{selectedPassDetails.part_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Bill No:</label>
                      <span>{selectedPassDetails.bill_no}</span>
                    </div>
                    <div className="detail-item">
                      <label>Approved By:</label>
                      <span>{selectedPassDetails.approved_by || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="items-section">
                <h4>Items Details</h4>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Sr. No</th>
                      <th>Item Name</th>
                      <th>UOM</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPassDetails.passType === 'inward' 
                      ? selectedPassDetails.inward_pass_item 
                      : selectedPassDetails.outward_pass_item
                    )?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.sr_no}</td>
                        <td>{item.item_name}</td>
                        <td>{item.uom}</td>
                        <td>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}