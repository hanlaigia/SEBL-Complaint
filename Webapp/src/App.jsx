import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, MenuItem, TextField, Button, CircularProgress, Typography, Paper } from '@mui/material';
import theme from './theme';
import {
  getComplaintOptions,
  getProductOptions,
  getSubProductOptions,
  getIssueOptions,
  getSubIssueOptions,
} from './complaintOptions';

function App() {
  const [product, setProduct] = useState('');
  const [subProduct, setSubProduct] = useState('');
  const [issue, setIssue] = useState('');
  const [subIssue, setSubIssue] = useState('');
  const [complaint, setComplaint] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [complaintData, setComplaintData] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    getComplaintOptions().then(data => {
      setComplaintData(data);
      setLoadingOptions(false);
    });
  }, []);

  // API URL and environment variables logging removed
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, subProduct, issue, subIssue, complaint }),
      });
      const text = await res.text();
      const data = (() => {
        try {
          const obj = JSON.parse(text);
          // Console log for parsed response removed
          return obj?.output || 'Invalid response format';
        } catch {
          return 'Failed to parse response';
        }
      })();
      setResponse(data);
    } catch (err) {
      setResponse('Failed to submit complaint.');
    }
    setLoading(false);
  };

  const productOptions = getProductOptions(complaintData);
  const subProducts = product ? getSubProductOptions(complaintData, product) : [];
  const issues = product && subProduct ? getIssueOptions(complaintData, product, subProduct) : [];
  const subIssues = product && subProduct && issue ? getSubIssueOptions(complaintData, product, subProduct, issue) : [];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 1, sm: 2, md: 4 },
          }}
        >
          <Paper elevation={3} sx={{ width: '100%', maxWidth: 600, p: { xs: 2, sm: 4 } }}>
            <Typography variant="h4" align="center" gutterBottom sx={{ color: 'primary.main' }}>
              Submit a Complaint
            </Typography>
            {loadingOptions ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress />
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Product"
                  value={product}
                  onChange={e => {
                    setProduct(e.target.value);
                    setSubProduct('');
                    setIssue('');
                    setSubIssue('');
                  }}
                  required
                >
                  <MenuItem value="" disabled>Select Product</MenuItem>
                  {productOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Sub-product"
                  value={subProduct}
                  onChange={e => {
                    setSubProduct(e.target.value);
                    setIssue('');
                    setSubIssue('');
                  }}
                  required
                  disabled={!product}
                >
                  <MenuItem value="" disabled>Select Sub-product</MenuItem>
                  {subProducts.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Issue"
                  value={issue}
                  onChange={e => {
                    setIssue(e.target.value);
                    setSubIssue('');
                  }}
                  required
                  disabled={!subProduct}
                >
                  <MenuItem value="" disabled>Select Issue</MenuItem>
                  {issues.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Sub-issue"
                  value={subIssue}
                  onChange={e => setSubIssue(e.target.value)}
                  required
                  disabled={!issue}
                >
                  <MenuItem value="" disabled>Select Sub-issue</MenuItem>
                  {subIssues.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Complaint"
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                  required
                  multiline
                  minRows={4}
                  placeholder="Describe your complaint in detail..."
                />
                <Button type="submit" variant="contained" color="primary" disabled={loading} size="large">
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
                </Button>
              </Box>
            )}
            {response && (
              <Box mt={4}>
                <Typography variant="h6" color="primary">Response:</Typography>
                <Paper sx={{ p: 2, mt: 1, background: '#f5faff' }}>
                  <Typography>{response}</Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
