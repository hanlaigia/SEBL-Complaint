import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, Snackbar, Alert } from '@mui/material';
import theme from './theme';
import ComplaintForm from './ComplaintForm';
import ListView from './ListView';

function App() {
  const [product, setProduct] = useState('');
  const [subProduct, setSubProduct] = useState('');
  const [issue, setIssue] = useState('');
  const [subIssue, setSubIssue] = useState('');
  const [complaint, setComplaint] = useState('');
  const [complaintId, setComplaintId] = useState(null); // Cache complaint ID
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [dbOptions, setDbOptions] = useState({ products: [], sub_products: [], issues: [], sub_issues: [] });
  const [notifOpen, setNotifOpen] = useState(false); // Snackbar for notification
  const [notifMsg, setNotifMsg] = useState('');

  useEffect(() => {
    // Debug: log when effect runs
    console.log('Calling /api/options...');
    fetch('http://localhost:3001/api/options')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch options');
        return res.json();
      })
      .then(data => {
        console.log('Options loaded:', data);
        setDbOptions(data);
        setLoadingOptions(false);
      })
      .catch((err) => {
        console.error('Options fetch error:', err);
        setDbOptions({ products: [], sub_products: [], issues: [], sub_issues: [] });
        setLoadingOptions(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    let apiUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiUrl = 'http://localhost:3001/api/webhook';
    } else {
      apiUrl = 'http://backend:3001/api/webhook'; // Docker Compose network
    }
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, subProduct, issue, subIssue, complaint }),
      });
      // Always read as text first, then try to parse as JSON
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      setResponse(data);
    } catch (err) {
      setResponse('Failed to submit complaint.');
    }
    setLoading(false);
  };

  const handleView = (row) => {
    setProduct(row.product || '');
    setSubProduct(row.sub_product || '');
    setIssue(row.issue || '');
    setSubIssue(row.sub_issue || '');
    setComplaint(row.complaint || '');
    setComplaintId(row.id || null); // Set complaint ID from row
    setResponse('');
  };

  // Filter options based on current selection
  const filteredSubProducts = dbOptions.sub_products.filter(sp =>
    !product || dbOptions.products.includes(product)
  );
  const filteredIssues = dbOptions.issues.filter(is =>
    !subProduct || dbOptions.sub_products.includes(subProduct)
  );
  const filteredSubIssues = dbOptions.sub_issues.filter(si =>
    !issue || dbOptions.issues.includes(issue)
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 0,
        }}
      >
        <Box sx={{ width: '60%', pr: 1, pl: { xs: 1, sm: 2, md: 4 }, py: { xs: 1, sm: 2, md: 4 }, display: 'flex', alignItems: 'flex-start' }}>
          <ListView onSelect={handleView} />
        </Box>
        <Box sx={{ width: '40%', pl: 1, pr: { xs: 1, sm: 2, md: 4 }, py: { xs: 1, sm: 2, md: 4 }, display: 'flex', alignItems: 'flex-start' }}>
          <ComplaintForm
            product={product}
            setProduct={setProduct}
            subProduct={subProduct}
            setSubProduct={setSubProduct}
            issue={issue}
            setIssue={setIssue}
            subIssue={subIssue}
            setSubIssue={setSubIssue}
            complaint={complaint}
            setComplaint={setComplaint}
            productOptions={dbOptions.products}
            subProducts={filteredSubProducts}
            issues={filteredIssues}
            subIssues={filteredSubIssues}
            loading={loading}
            loadingOptions={loadingOptions}
            handleSubmit={handleSubmit}
            response={response}
            complaintId={complaintId} // Pass complaintId
            onSaveSuccess={(msg) => { setNotifMsg(msg); setNotifOpen(true); }} // Pass notification handler
          />
        </Box>
      </Box>
      {/* Snackbar notification */}
      <Snackbar open={notifOpen} autoHideDuration={4000} onClose={() => setNotifOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setNotifOpen(false)} severity="success" sx={{ width: '100%' }}>
          {notifMsg}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
