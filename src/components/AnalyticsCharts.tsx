'use client';

import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface AnalyticsChartsProps {
  submissions: any[];
  categories: any[];
  schools: any[];
  variant?: 'full' | 'compact'; // full = admin, compact = school
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  revision: '#8b5cf6',
};
const STATUS_LABELS: Record<string, string> = {
  approved: 'Disetujui',
  pending: 'Menunggu',
  rejected: 'Ditolak',
  revision: 'Revisi',
};

export default function AnalyticsCharts({ submissions, categories, schools, variant = 'full' }: AnalyticsChartsProps) {
  // Proteksi input array 100% aman
  const validSubmissions = Array.isArray(submissions) ? submissions : [];
  const validCategories = Array.isArray(categories) ? categories : [];
  const validSchools = Array.isArray(schools) ? schools : [];

  // --- 1. Monthly Trend ---
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    return months.map((name, idx) => {
      const monthSubs = validSubmissions.filter(s => {
        if (!s?.submittedAt) return false;
        const d = new Date(s.submittedAt);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      });
      return {
        name,
        total: monthSubs.length,
        approved: monthSubs.filter(s => s.status === 'approved').length,
        rejected: monthSubs.filter(s => s.status === 'rejected').length,
      };
    });
  }, [validSubmissions]);

  // --- 2. Status Donut ---
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    validSubmissions.forEach(s => {
      if (!s) return;
      const st = s.status || 'pending';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
      color: STATUS_COLORS[key] || '#6b7280',
    }));
  }, [validSubmissions]);

  // --- 3. Category Completion ---
  const categoryData = useMemo(() => {
    return validCategories.slice(0, 8).map((cat: any) => {
      if (!cat) return { name: '', persen: 0, approved: 0, total: 1 };
      const catSubs = validSubmissions.filter(s => s?.categoryId === cat.id);
      const approved = catSubs.filter(s => s?.status === 'approved').length;
      const total = validSchools.length || 1;
      const pct = Math.round((approved / total) * 100);
      return {
        name: cat.name?.length > 18 ? cat.name.substring(0, 18) + '…' : (cat.name || ''),
        persen: pct,
        approved,
        total,
      };
    });
  }, [validCategories, validSubmissions, validSchools]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-glass)',
    border: '1px solid var(--card-border)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  // Compact variant = only status donut
  if (variant === 'compact') {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>
          <i className="fa-solid fa-chart-pie" style={{ color: '#3b82f6' }}></i>
          Status Berkas Anda
        </div>
        {statusData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', gap: '8px' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', color: 'var(--text-secondary)', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Belum ada berkas yang diunggah.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} stroke="none">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val} berkas`]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {statusData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, flexShrink: 0 }}></div>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant = all 3 charts
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
      {/* Monthly Trend */}
      <div style={cardStyle} className="animate-fade-in">
        <div style={titleStyle}>
          <i className="fa-solid fa-chart-area" style={{ color: '#3b82f6' }}></i>
          Tren Pengumpulan Bulanan {new Date().getFullYear()}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <Tooltip
              contentStyle={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#gradTotal)" name="Total" />
            <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#gradApproved)" name="Disetujui" />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status Donut */}
      <div style={cardStyle} className="animate-fade-in">
        <div style={titleStyle}>
          <i className="fa-solid fa-chart-pie" style={{ color: '#f59e0b' }}></i>
          Distribusi Status Berkas
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} stroke="none">
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val: any) => [`${val} berkas`]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statusData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: item.color, flexShrink: 0 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                <strong style={{ marginLeft: 'auto' }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Completion Bar */}
      <div style={{ ...cardStyle, gridColumn: 'span 2' }} className="animate-fade-in">
        <div style={titleStyle}>
          <i className="fa-solid fa-bars-progress" style={{ color: '#8b5cf6' }}></i>
          Kelengkapan per Kategori Berkas
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--text-muted)" unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} stroke="var(--text-muted)" />
            <Tooltip
              formatter={(val: any) => [`${val}%`]}
              contentStyle={{ background: 'var(--card-glass)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px' }}
            />
            <Bar dataKey="persen" name="Kelengkapan" radius={[0, 6, 6, 0]} barSize={16}>
              {categoryData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
