'use client';

import { Bar, BarChart, Line, LineChart, Pie, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import React from 'react';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface AnimatedChartProps {
  data: ChartData[];
  type?: 'bar' | 'line' | 'pie';
  colors?: string[];
  height?: number;
}

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnimatedChart({ 
  data, 
  type = 'bar', 
  colors = COLORS,
  height = 300 
}: AnimatedChartProps) {
  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              background: 'var(--card-glass)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="var(--text-muted)"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              background: 'var(--card-glass)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={colors[0]} 
            strokeWidth={2}
            dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Default bar chart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
        <XAxis 
          dataKey="name" 
          stroke="var(--text-muted)"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="var(--text-muted)"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{ 
            background: 'var(--card-glass)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)'
          }}
        />
        <Bar dataKey="value" fill={colors[0]} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
