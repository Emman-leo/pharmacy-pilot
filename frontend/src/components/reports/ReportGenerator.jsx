import { useState } from 'react';
import { IconFileText } from './icons';
import './ReportsPage.css';

const REPORT_TYPES = [
  { value: 'sales-summary', label: 'Sales Summary' },
  { value: 'inventory-status', label: 'Inventory Status' },
  { value: 'profit-analysis', label: 'Profit Analysis', adminOnly: true },
  { value: 'low-stock', label: 'Low Stock Alert' },
  { value: 'expiry', label: 'Expiry Report' },
  { value: 'customer-analysis', label: 'Customer Analysis', adminOnly: true },
];

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportGenerator({
  reportType,
  setReportType,
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onGenerate,
  onExportCSV,
  onPrint,
  generatedReport,
  generating,
  isAdmin,
}) {
  const reportTypes = REPORT_TYPES.filter((t) => !t.adminOnly || isAdmin);
  const showCustomRange = period === 'custom';

  return (
    <section className="reports-generator">
      <h2>Report Generator</h2>
      <div className="generator-form">
        <div className="form-row">
          <label>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {reportTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {showCustomRange && (
          <div className="form-row form-row-dates">
            <div>
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        )}
        <div className="generator-actions">
          <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Report'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onExportCSV} disabled={!generatedReport}>
            <IconFileText /> Export CSV
          </button>
          <button type="button" className="btn btn-ghost" onClick={onPrint} disabled={!generatedReport}>
            Print Report
          </button>
        </div>
      </div>
      {generatedReport && (
        <div className="generated-report no-print" id="report-content">
          <h3>Report Result</h3>
          {generatedReport.empty && <p className="empty-state">No data for the selected criteria.</p>}
          {!generatedReport.empty && generatedReport.content}
        </div>
      )}
    </section>
  );
}
