import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import { exportReportDocument } from '../../utils/exportReportDocument';
import { getRange } from './dateRange';
import StatsCards from './StatsCards';
import { SalesTrendChart, CategoryDistributionChart } from './ChartsSection';
import ReportGenerator from './ReportGenerator';
import QuickReports from './QuickReports';
import './ReportsPage.css';

export default function ReportsPage() {
  const api = useApi();
  const { isAdmin } = useAuth();

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [reportType, setReportType] = useState('sales-summary');
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [salesByPeriod, setSalesByPeriod] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  const range = getRange(
    period,
    period === 'custom' ? startDate : undefined,
    period === 'custom' ? endDate : undefined
  );

  const reportResultRef = useRef(null);

  const fetchOverview = useCallback(() => {
    setOverviewLoading(true);
    api
      .get('/reports/overview')
      .then(setOverview)
      .catch(() => setOverview({}))
      .finally(() => setOverviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCharts = useCallback(() => {
    setChartsLoading(true);
    const params = new URLSearchParams(range);
    Promise.all([
      api.get(`/reports/sales-by-period?${params}`),
      api.get(
        `/reports/category-distribution?start_date=${range.start_date}&end_date=${range.end_date}`
      ),
    ])
      .then(([sales, cat]) => {
        setSalesByPeriod(sales || []);
        setCategoryData(cat || []);
      })
      .catch(() => {
        setSalesByPeriod([]);
        setCategoryData([]);
      })
      .finally(() => setChartsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start_date, range.end_date, range.group]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  // Removed automatic polling to avoid repeated errors; use the Refresh button instead.

  const generateReport = useCallback(async (overrides = {}) => {
    const type = overrides.reportType ?? reportType;
    const per = overrides.period ?? period;
    setGenerating(true);
    setGeneratedReport(null);
    const r = getRange(per, overrides.period === 'custom' ? startDate : undefined, overrides.period === 'custom' ? endDate : undefined);
    try {
      let data;
      let content;
      let empty = true;
      let csvConfig = null;

      switch (type) {
        case 'sales-summary': {
          const res = await api.get(`/reports/sales-summary?start_date=${r.start_date}&end_date=${r.end_date}`);
          const items = res.items || [];
          data = { summary: res, items };
          const grandTotal = (res.total ?? 0);
          content = (
            <>
              <div className="report-summary-inline">
                <p><strong>Total:</strong> ₵{Number(grandTotal).toFixed(2)} · <strong>Transactions:</strong> {res.count ?? 0}</p>
              </div>
              <table className="report-result-table">
                <thead>
                  <tr><th>Drug</th><th>Quantity sold</th><th>Unit price (₵)</th><th>Amount (₵)</th></tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.drug_id}>
                      <td>{row.drug_name}</td>
                      <td>{row.quantity}</td>
                      <td>{Number(row.unit_price).toFixed(2)}</td>
                      <td>{Number(row.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="report-grand-total">
                    <td colSpan={2}><strong>Grand total</strong></td>
                    <td colSpan={2}><strong>₵{Number(grandTotal).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </>
          );
          empty = !res?.count && items.length === 0;
          csvConfig = {
            rows: items,
            cols: [
              { key: 'drug_name', header: 'Drug' },
              { key: 'quantity', header: 'Quantity sold' },
              { key: 'unit_price', header: 'Unit price (₵)' },
              { key: 'amount', header: 'Amount (₵)' },
            ],
            filename: 'sales-summary.csv',
          };
          break;
        }
        case 'inventory-status': {
          const res = await api.get('/reports/inventory-valuation');
          data = res;
          content = (
            <>
              <div className="report-summary-inline"><p><strong>Total value:</strong> ₵{(res.total || 0).toFixed(2)}</p></div>
              <table className="report-result-table">
                <thead><tr><th>Drug</th><th>Quantity</th><th>Value</th></tr></thead>
                <tbody>
                  {(res.byDrug || []).map((d) => (
                    <tr key={d.drug_id}><td>{d.drug_name}</td><td>{d.quantity}</td><td>₵{parseFloat(d.value).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          );
          empty = !(res.byDrug?.length);
          csvConfig = { rows: res.byDrug || [], cols: [{ key: 'drug_name', header: 'Drug' }, { key: 'quantity', header: 'Quantity' }, { key: 'value', header: 'Value' }], filename: 'inventory-status.csv' };
          break;
        }
        case 'profit-analysis': {
          const res = await api.get(`/reports/profit-margin?start_date=${r.start_date}&end_date=${r.end_date}`);
          data = res;
          content = (
            <>
              <div className="report-summary-inline">
                <p><strong>Revenue:</strong> ₵{(res.totalRevenue || 0).toFixed(2)} · <strong>Cost:</strong> ₵{(res.totalCost || 0).toFixed(2)} · <strong>Profit:</strong> ₵{(res.totalProfit || 0).toFixed(2)}</p>
              </div>
              <table className="report-result-table">
                <thead><tr><th>Drug</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin %</th></tr></thead>
                <tbody>
                  {(res.items || []).map((i) => (
                    <tr key={i.drug_id}>
                      <td>{i.drug_name}</td><td>₵{parseFloat(i.revenue).toFixed(2)}</td><td>₵{parseFloat(i.cost).toFixed(2)}</td>
                      <td>₵{parseFloat(i.profit).toFixed(2)}</td><td>{i.margin_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
          empty = !(res.items?.length);
          csvConfig = { rows: res.items || [], cols: [{ key: 'drug_name', header: 'Drug' }, { key: 'revenue', header: 'Revenue' }, { key: 'cost', header: 'Cost' }, { key: 'profit', header: 'Profit' }, { key: 'margin_pct', header: 'Margin %' }], filename: 'profit-analysis.csv' };
          break;
        }
        case 'low-stock': {
          const res = await api.get('/inventory/alerts');
          const rows = res.lowStock || [];
          data = { lowStock: rows };
          content = (
            <table className="report-result-table">
              <thead><tr><th>Drug</th><th>Current</th><th>Min</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.drug_id}><td>{a.drug_name}</td><td>{a.current}</td><td>{a.min}</td></tr>
                ))}
              </tbody>
            </table>
          );
          empty = rows.length === 0;
          csvConfig = { rows, cols: [{ key: 'drug_name', header: 'Drug' }, { key: 'current', header: 'Current' }, { key: 'min', header: 'Min' }], filename: 'low-stock.csv' };
          break;
        }
        case 'expiry': {
          const days = { today: 30, week: 30, month: 90, quarter: 90, year: 365 }[per] || 90;
          const res = await api.get(`/reports/expiry-alerts?days=${days}`);
          const rows = (res || []).map((a) => ({ drug_name: a.drugs?.name || 'Unknown', expiry_date: a.expiry_date, quantity: a.quantity }));
          data = res;
          content = (
            <table className="report-result-table">
              <thead><tr><th>Drug</th><th>Expiry</th><th>Quantity</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}><td>{r.drug_name}</td><td>{r.expiry_date}</td><td>{r.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          );
          empty = rows.length === 0;
          csvConfig = { rows, cols: [{ key: 'drug_name', header: 'Drug' }, { key: 'expiry_date', header: 'Expiry' }, { key: 'quantity', header: 'Quantity' }], filename: 'expiry-report.csv' };
          break;
        }
        case 'customer-analysis': {
          content = <p className="empty-state">Customer Analysis (admin): not implemented yet.</p>;
          empty = true;
          break;
        }
        default:
          content = <p className="empty-state">Select a report type and generate.</p>;
      }

      setGeneratedReport({ data, content, empty, csvConfig });
      setTimeout(() => reportResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (err) {
      setGeneratedReport({ content: <p className="empty-state">Error: {err.message}</p>, empty: true });
    } finally {
      setGenerating(false);
    }
  }, [reportType, period, startDate, endDate, api]);

  const handleExportCSV = useCallback(() => {
    if (!generatedReport?.csvConfig) return;
    const { rows, cols, filename } = generatedReport.csvConfig;
    downloadCSV(filename, rows, cols);
  }, [generatedReport]);

  const REPORT_TYPE_LABELS = {
    'sales-summary': 'Sales Summary',
    'inventory-status': 'Inventory Status',
    'profit-analysis': 'Profit Analysis',
    'low-stock': 'Low Stock Alert',
    'expiry': 'Expiry Report',
    'customer-analysis': 'Customer Analysis',
  };

  const handlePrint = useCallback(() => {
    const el = document.getElementById('report-content');
    if (!el) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Report</title>
      <style>body{font-family:system-ui,sans-serif;padding:20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;} th{background:#f5f5f5;}</style>
      </head><body><h2>Pharmacy Pilot - Report</h2>${el.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  }, []);

  const handleExportDocument = useCallback(() => {
    const el = document.getElementById('report-content');
    if (!el) return;
    const periodLabel =
      period === 'custom' && startDate && endDate
        ? `Custom: ${startDate} to ${endDate}`
        : period.charAt(0).toUpperCase() + period.slice(1);
    exportReportDocument({
      title: REPORT_TYPE_LABELS[reportType] || reportType,
      period: periodLabel,
      contentHtml: el.innerHTML,
    });
  }, [reportType, period, startDate, endDate]);

  const handleQuickReport = useCallback((type, p) => {
    setReportType(type);
    setPeriod(p);
    generateReport({ reportType: type, period: p });
  }, [generateReport]);

  return (
    <div className="reports-page">
      <header className="reports-header">
        <h1>Reports & Analytics</h1>
        <p className="reports-subtitle">Dashboard overview and report generator</p>
      </header>

      <StatsCards overview={overview} loading={overviewLoading} />

      <section className="reports-charts-section">
        <div className="charts-header">
          <div>
            <p className="reports-charts-label">
              Charts for:{' '}
              {period === 'custom' && !startDate && !endDate
                ? 'Select dates below'
                : period.replace(/-/g, ' ')}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost no-print"
            onClick={() => {
              fetchOverview();
              fetchCharts();
            }}
          >
            Refresh Data
          </button>
        </div>
        <div className="reports-charts">
          <SalesTrendChart salesByPeriod={salesByPeriod} loading={chartsLoading} />
          <CategoryDistributionChart categoryData={categoryData} loading={chartsLoading} />
        </div>
      </section>

      <QuickReports onSelect={handleQuickReport} />

      <ReportGenerator
        reportResultRef={reportResultRef}
        reportType={reportType}
        setReportType={setReportType}
        period={period}
        setPeriod={setPeriod}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onGenerate={generateReport}
        onExportCSV={handleExportCSV}
        onExportDocument={handleExportDocument}
        onPrint={handlePrint}
        generatedReport={generatedReport}
        generating={generating}
        isAdmin={isAdmin}
      />
    </div>
  );
}
