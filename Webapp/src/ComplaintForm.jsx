import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, MenuItem, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

function ComplaintForm({
  product, setProduct,
  subProduct, setSubProduct,
  issue, setIssue,
  subIssue, setSubIssue,
  complaint, setComplaint,
  productOptions, subProducts, issues, subIssues,
  loading, loadingOptions, handleSubmit, response,
  complaintId, onSaveSuccess // Add these props
}) {
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState(null);

  React.useEffect(() => {
    // Try to parse response as JSON array if it's a string
    if (typeof response === 'string') {
      try {
        const arr = JSON.parse(response);
        if (Array.isArray(arr) && arr.length > 0 && arr[0].Priority) {
          setResultData(arr[0]);
          setResultOpen(true);
        }
      } catch {
        // If not JSON, do nothing (or optionally show a fallback)
      }
    } else if (Array.isArray(response) && response.length > 0 && response[0].Priority) {
      setResultData(response[0]);
      setResultOpen(true);
    } else if (response && typeof response === 'object' && response.Priority) {
      // Handle plain object response
      setResultData(response);
      setResultOpen(true);
    } else if (typeof response === 'string' && response !== '' && response !== 'Invalid response format' && response !== 'Failed to parse response') {
      // Show fallback dialog for any non-empty, non-error string
      setResultData({
        Priority: '-',
        IssueGroup: '-',
        Response: response
      });
      setResultOpen(true);
    }
    console.log('Response data:', response);
  }, [response]);

  const handleClose = () => setResultOpen(false);
  const handleSave = () => {
    // Save to database, let backend generate ID if complaintId is empty
    let apiUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiUrl = 'http://localhost:3001/api/save';
    } else {
      apiUrl = 'http://backend:3001/api/save'; // Docker Compose network, use HTTPS
    }
    // Build payload, omit id if complaintId is empty
    const payload = {
      AI_Response: resultData.Response,
      AI_IssueGroup: resultData.IssueGroup,
      Priority: resultData.Priority
    };
    if (complaintId) {
      payload.id = complaintId;
    } else {
      // Add required fields for insert with correct PascalCase keys
      payload.Product = product;
      payload.SubProduct = subProduct;
      payload.Issue = issue;
      payload.SubIssue = subIssue;
      payload.Complaint = complaint;
    }
    fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update complaint');
        return res.json();
      })
      .then((data) => {
        setResultOpen(false);
        // If backend returns a new complaint ID, pass it to onSaveSuccess
        if (onSaveSuccess) {
          if (data && data.id && !complaintId) {
            onSaveSuccess(`Complaint added successfully! New Complaint ID: ${data.id}`);
          } else {
            onSaveSuccess('Complaint updated successfully!');
          }
        }
      })
      .catch(() => {
        setResultOpen(false);
        if (onSaveSuccess) onSaveSuccess('Failed to update complaint.');
      });
  };

  return (
    <Paper elevation={3} sx={{ width: '100%', p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ color: 'primary.main' }}>
        Complaint Details
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
              setComplaint(''); // Reset complaint when product changes
            }}
            required
            fullWidth
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    maxWidth: 400,
                    '& .MuiMenuItem-root': {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="" disabled>Select Product</MenuItem>
            {productOptions.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
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
              setComplaint(''); // Reset complaint when sub-product changes
            }}
            required
            disabled={!product}
            fullWidth
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    maxWidth: 400,
                    '& .MuiMenuItem-root': {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="" disabled>Select Sub-product</MenuItem>
            {subProducts.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Issue"
            value={issue}
            onChange={e => {
              setIssue(e.target.value);
              setSubIssue('');
              setComplaint(''); // Reset complaint when issue changes
            }}
            required
            disabled={!subProduct}
            fullWidth
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    maxWidth: 400,
                    '& .MuiMenuItem-root': {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="" disabled>Select Issue</MenuItem>
            {issues.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Sub-issue"
            value={subIssue}
            onChange={e => {
                setSubIssue(e.target.value);
                setComplaint(''); // Reset complaint when sub-issue changes
            }}
            required
            disabled={!issue}
            fullWidth
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    maxWidth: 400,
                    '& .MuiMenuItem-root': {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="" disabled>Select Sub-issue</MenuItem>
            {subIssues.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
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
      <Dialog open={resultOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Result</DialogTitle>
        <DialogContent>
          {resultData && (
            <Box>
              <Typography>Priority: <b>{resultData.Priority}</b></Typography>
              <Typography>Issue Group: <b>{resultData.IssueGroup}</b></Typography>
              <Typography>Recommended Response: <b>{resultData.Response}</b></Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="outlined">Close</Button>
          <Button onClick={handleSave} variant="contained">Save to database</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ComplaintForm;
