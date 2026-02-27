import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import Spinner from '../common/Spinner';
import './ReportsPage.css';

const PIE_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#64748b'];

export function SalesTrendChart({ salesByPeriod, loading }) {
  const data = useMemo(() => {
    if (!salesByPeriod?.length) return [];
    return salesByPeriod.map((d) => ({
      name: d.period,
      sales: parseFloat(d.total || 0),
      count: d.count,
    }));
  }, [salesByPeriod]);

  if (loading) {
    return (
      <div className="chart-container">
        <h3>Sales Trend</h3>
        <div className="chart-placeholder">
          <Spinner label="Loading sales trend…" />
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="chart-container">
        <h3>Sales Trend</h3>
        <div className="chart-placeholder">No sales data for this period.</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>Sales Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
          <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `₵${v}`} />
          <Tooltip formatter={(v) => [`₵${Number(v).toFixed(2)}`, 'Sales']} />
          <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Sales" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDistributionChart({ categoryData, loading }) {
  const data = useMemo(() => {
    if (!categoryData?.length) return [];
    return categoryData.map((d) => ({
      name: d.category || 'Uncategorized',
      value: parseFloat(d.amount || 0),
    })).filter((d) => d.value > 0);
  }, [categoryData]);

  if (loading) {
    return (
      <div className="chart-container">
        <h3>Category Distribution</h3>
        <div className="chart-placeholder">
          <Spinner label="Loading categories…" />
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="chart-container">
        <h3>Category Distribution</h3>
        <div className="chart-placeholder">No category data for this period.</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>Category Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`₵${Number(v).toFixed(2)}`, 'Amount']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ChartsSection({ salesByPeriod, categoryData, loading }) {
  return (
    <section className="reports-charts">
      <SalesTrendChart salesByPeriod={salesByPeriod} loading={loading} />
      <CategoryDistributionChart categoryData={categoryData} loading={loading} />
    </section>
  );
}
