import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, TablePagination } from '@mui/material';

function ListView({ onSelect }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // Always use backend for complaints, never n8n
    let apiUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiUrl = 'http://localhost:3001/api/complaints';
    } else {
      apiUrl = 'http://backend:3001/api/complaints'; // Docker Compose network, use HTTPS
    }
    console.log('Fetching complaints from:', apiUrl); // Debug log
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch complaints');
        return res.json();
      })
      .then(data => {
        setRows(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, minHeight: 300, color: 'red', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {error}
      </Paper>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <Paper sx={{ p: 2, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        No complaints found.
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><b>Product</b></TableCell>
            <TableCell><b>Sub-product</b></TableCell>
            <TableCell><b>Issue</b></TableCell>
            <TableCell><b>Sub-issue</b></TableCell>
            <TableCell><b>Consumer complaint narrative</b></TableCell>
            <TableCell><b>Action</b></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.product}</TableCell>
              <TableCell>{row.sub_product}</TableCell>
              <TableCell>{row.issue}</TableCell>
              <TableCell>{row.sub_issue}</TableCell>
              <TableCell sx={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {row.complaint}
              </TableCell>
              <TableCell>
                <Button variant="outlined" size="small" onClick={() => onSelect(row)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
}

export default ListView;
