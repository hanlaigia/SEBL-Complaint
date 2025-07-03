// src/complaintOptions.js
// Complaint options generated from Complaint_grouping_cleaned.csv
// The structure is hierarchical for cascading dropdowns

// Instead of importing CSV, fetch and parse it at runtime using papaparse
// Place Complaint_grouping_cleaned.csv in the public folder
// Usage: see getComplaintOptions below

import Papa from 'papaparse';

const CSV_URL = '/Complaint_grouping_cleaned.csv';

// Fetch and parse CSV, return a promise that resolves to the parsed data
export function getComplaintOptions() {
  return fetch(CSV_URL)
    .then(response => response.text())
    .then(csvText => {
      const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      return data;
    });
}

// Helper to extract unique values at each level
function getUnique(arr, key) {
  return [...new Set(arr.map(item => item[key]))];
}

// productOptions is no longer exported. Use getProductOptions(data) after loading data.
// Remove or update any import of productOptions in your code.

export function getProductOptions(data) {
  return getUnique(data, 'Product').map(p => ({ value: p, label: p }));
}

export function getSubProductOptions(data, product) {
  return getUnique(
    data.filter(row => row.Product === product),
    'Sub-product'
  ).map(sp => ({ value: sp, label: sp }));
}

export function getIssueOptions(data, product, subProduct) {
  return getUnique(
    data.filter(row => row.Product === product && row['Sub-product'] === subProduct),
    'Issue'
  ).map(i => ({ value: i, label: i }));
}

export function getSubIssueOptions(data, product, subProduct, issue) {
  return getUnique(
    data.filter(row => row.Product === product && row['Sub-product'] === subProduct && row['Issue'] === issue),
    'Sub-issue'
  ).map(si => ({ value: si, label: si }));
}
