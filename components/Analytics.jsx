import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { 
  FaTimes, 
  FaChartBar, 
  FaWarehouse,
  FaBoxes,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle,
  FaInfoCircle,
  FaFilter
} from "react-icons/fa";
import VerticalNavbar from "./VerticalNavbar.jsx";
import InventoryManager from "./main_page_inventory.jsx";
import "./Analytics.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

export default function Analytics() {
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('30'); // Last 30 days
  const [showInventory, setShowInventory] = useState(false); // State to control inventory view

  // Analytics data states
  const [warehouseDistribution, setWarehouseDistribution] = useState({ labels: [], data: [] });
  const [topItems, setTopItems] = useState({ labels: [], data: [] });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [issuesTrend, setIssuesTrend] = useState({ labels: [], data: [] });
  const [dailyActivity, setDailyActivity] = useState({ labels: [], data: [] });
  const [kpiMetrics, setKpiMetrics] = useState({
    totalItems: 0,
    lowStockCount: 0,
    totalIssues: 0,
    averageIssueValue: 0,
    topWarehouse: '',
    utilizationRate: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFilter]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWarehouseDistribution(),
        fetchTopItems(),
        fetchLowStockItems(),
        fetchIssuesTrend(),
        fetchDailyActivity(),
        fetchKPIMetrics()
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeFilter));
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  // Replace direct database calls with IPC calls
  const fetchWarehouseDistribution = async () => {
    try {
      const data = await window.electronAPI.getInventory();
      
      const warehouseMap = {};
      (data || []).forEach(item => {
        const warehouseName = item.warehouse_name || 'Unknown';
        warehouseMap[warehouseName] = (warehouseMap[warehouseName] || 0) + item.quantity;
      });
      
      setWarehouseDistribution({
        labels: Object.keys(warehouseMap),
        data: Object.values(warehouseMap)
      });
    } catch (error) {
      console.error('Error fetching warehouse distribution:', error);
    }
  };

  const fetchTopItems = async () => {
    try {
      const dateFilter = getDateFilter();
      const data = await window.electronAPI.getOutwardPassItems(
        dateFilter.start,
        dateFilter.end
      );
      
      const itemMap = {};
      (data || []).forEach(item => {
        itemMap[item.item_name] = (itemMap[item.item_name] || 0) + item.quantity;
      });
      
      const sortedItems = Object.entries(itemMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      setTopItems({
        labels: sortedItems.map(([name]) => name),
        data: sortedItems.map(([,quantity]) => quantity)
      });
    } catch (error) {
      console.error('Error fetching top items:', error);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const data = await window.electronAPI.getLowStockItems(10);
      setLowStockItems(data || []);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
    }
  };

  const fetchIssuesTrend = async () => {
    try {
      const dateFilter = getDateFilter();
      const data = await window.electronAPI.getOutwardPasses(
        dateFilter.start,
        dateFilter.end
      );
      
      const dateMap = {};
      (data || []).forEach(item => {
        const date = new Date(item.date_issued).toLocaleDateString();
        dateMap[date] = (dateMap[date] || 0) + 1;
      });
      
      setIssuesTrend({
        labels: Object.keys(dateMap),
        data: Object.values(dateMap)
      });
    } catch (error) {
      console.error('Error fetching issues trend:', error);
    }
  };

  const fetchDailyActivity = async () => {
    try {
      const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });
      
      const activityData = await Promise.all(
        last7Days.map(async (date) => {
          const passes = await window.electronAPI.getOutwardPasses(
            date,
            `${date}T23:59:59`
          );
          return passes.length;
        })
      );
      
      setDailyActivity({
        labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
        data: activityData
      });
    } catch (error) {
      console.error('Error fetching daily activity:', error);
    }
  };

  const fetchKPIMetrics = async () => {
    try {
      // Total items and inventory count
      const inventoryData = await window.electronAPI.getInventory();
      
      const totalItems = (inventoryData || []).reduce((sum, item) => sum + item.quantity, 0);
      
      // Low stock count
      const lowStockCount = (inventoryData || []).filter(item => item.quantity < 10).length;
      
      // Total issues in selected period
      const dateFilter = getDateFilter();
      const issuesData = await window.electronAPI.getOutwardPasses(
        dateFilter.start,
        dateFilter.end
      );
      
      const totalIssues = (issuesData || []).length;
      
      // Top warehouse by inventory
      const warehouseInventory = {};
      (inventoryData || []).forEach(item => {
        const warehouseName = item.warehouse_name || 'Unknown';
        warehouseInventory[warehouseName] = (warehouseInventory[warehouseName] || 0) + item.quantity;
      });
      
      const topWarehouse = Object.entries(warehouseInventory)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
      
      setKpiMetrics({
        totalItems,
        lowStockCount,
        totalIssues,
        averageIssueValue: totalIssues > 0 ? Math.round(totalItems / totalIssues) : 0,
        topWarehouse,
        utilizationRate: Math.round((totalIssues / Math.max(totalItems, 1)) * 100)
      });
    } catch (error) {
      console.error('Error fetching KPI metrics:', error);
    }
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div className="analytics-app">
      {showInventory ? (
        <InventoryManager />
      ) : (
        <>
          <VerticalNavbar 
            onInventoryClick={() => setShowInventory(true)} // Navigate to inventory
            onIssueNoteClick={() => {
              // We would need to implement navigation to other pages
              // For now, we'll just log the action
              console.log('Navigate to Issue Note');
            }}
            onInwardNoteClick={() => {
              console.log('Navigate to Inward Note');
            }}
            onReportClick={() => {
              console.log('Navigate to Report');
            }}
            onTransferClick={() => {
              console.log('Navigate to Transfer');
            }}
          />
          <div className="analytics-container">
            <div className="analytics-overlay">
              <div className="analytics-container">
                <div className="analytics-header">
                  <div className="header-left">
                    <h2>📊 Inventory Analytics Dashboard</h2>
                    <p>Comprehensive insights into your inventory performance</p>
                  </div>
                  <div className="header-right">
                    <div className="time-filter">
                      <label><FaCalendarAlt /> Time Period:</label>
                      <select 
                        value={timeFilter} 
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last year</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Analyzing inventory data...</p>
                  </div>
                ) : (
                  <>
                    {/* KPI Cards */}
                    <div className="kpi-cards">
                      <div className="kpi-card total-items">
                        <div className="kpi-icon">
                          <FaBoxes />
                        </div>
                        <div className="kpi-content">
                          <h3>{kpiMetrics.totalItems}</h3>
                          <p>Total Items</p>
                        </div>
                        <div className="kpi-trend positive">
                          <FaArrowUp /> 12%
                        </div>
                      </div>
                      
                      <div className="kpi-card low-stock">
                        <div className="kpi-icon">
                          <FaExclamationTriangle />
                        </div>
                        <div className="kpi-content">
                          <h3>{kpiMetrics.lowStockCount}</h3>
                          <p>Low Stock Items</p>
                        </div>
                        <div className="kpi-trend negative">
                          <FaArrowDown /> 5%
                        </div>
                      </div>
                      
                      <div className="kpi-card issues">
                        <div className="kpi-icon">
                          <FaChartBar />
                        </div>
                        <div className="kpi-content">
                          <h3>{kpiMetrics.totalIssues}</h3>
                          <p>Total Issues</p>
                        </div>
                        <div className="kpi-trend positive">
                          <FaArrowUp /> 8%
                        </div>
                      </div>
                      
                      <div className="kpi-card warehouse">
                        <div className="kpi-icon">
                          <FaWarehouse />
                        </div>
                        <div className="kpi-content">
                          <h3>{kpiMetrics.topWarehouse || 'N/A'}</h3>
                          <p>Top Warehouse</p>
                        </div>
                        <div className="kpi-info">
                          <FaInfoCircle />
                        </div>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="charts-grid">
                      {/* Warehouse Distribution */}
                      <div className="chart-card">
                        <h3>Warehouse Distribution</h3>
                        <div className="chart-container">
                          <Doughnut
                            data={{
                              labels: warehouseDistribution.labels,
                              datasets: [{
                                data: warehouseDistribution.data,
                                backgroundColor: [
                                  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                                  '#9966FF', '#FF9F40', '#C9CBCF'
                                ],
                                borderWidth: 2,
                                borderColor: '#fff'
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: {
                                    padding: 20,
                                    usePointStyle: true
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Top Items */}
                      <div className="chart-card">
                        <h3>Top Issued Items</h3>
                        <div className="chart-container">
                          <Bar
                            data={{
                              labels: topItems.labels,
                              datasets: [{
                                label: 'Quantity Issued',
                                data: topItems.data,
                                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Issues Trend */}
                      <div className="chart-card">
                        <h3>Issues Trend</h3>
                        <div className="chart-container">
                          <Line
                            data={{
                              labels: issuesTrend.labels,
                              datasets: [{
                                label: 'Daily Issues',
                                data: issuesTrend.data,
                                borderColor: 'rgb(255, 99, 132)',
                                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                                tension: 0.4,
                                fill: true
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Weekly Activity */}
                      <div className="chart-card">
                        <h3>Weekly Activity Overview</h3>
                        <div className="chart-container">
                          <Bar
                            data={{
                              labels: dailyActivity.labels,
                              datasets: [{
                                label: 'Daily Issues',
                                data: dailyActivity.data,
                                backgroundColor: [
                                  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                                  '#9966FF', '#FF9F40', '#C9CBCF'
                                ],
                                borderWidth: 1
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false
                            }}
                          />
                        </div>
                      </div>

                      {/* Low Stock Alert Table */}
                      <div className="chart-card table-card">
                        <h3>Low Stock Alerts</h3>
                        <div className="table-container">
                          {lowStockItems.length > 0 ? (
                            <table className="low-stock-table">
                              <thead>
                                <tr>
                                  <th>Item Name</th>
                                  <th>Quantity</th>
                                  <th>Warehouse</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lowStockItems.map((item, index) => (
                                  <tr key={index}>
                                    <td>{item.product_name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.warehouse_name || 'Unknown'}</td>
                                    <td>
                                      <span className={`status ${item.quantity < 5 ? 'critical' : 'warning'}`}>
                                        {item.quantity < 5 ? 'Critical' : 'Low'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="no-data">No low stock items found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}