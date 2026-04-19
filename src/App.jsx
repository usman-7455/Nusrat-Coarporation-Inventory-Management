import './App.css'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Analytics from '../components/Analytics.jsx'
import InventoryManager from '../components/main_page_inventory.jsx'
import IssueNote from '../components/IssueNote.jsx'
import InwardNote from '../components/InwardNote.jsx'
import Report from '../components/Report.jsx'
import Transfer from '../components/Transfer.jsx'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Analytics />} />
        <Route path="/inventory" element={<InventoryManager />} />
        <Route path="/issue-note" element={<IssueNote />} />
        <Route path="/receipt-note" element={<InwardNote />} />
        <Route path="/report" element={<Report />} />
        <Route path="/transfer" element={<Transfer />} />
      </Routes>
    </Router>
  )
}

export default App