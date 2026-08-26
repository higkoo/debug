import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Metric {
  name: string;
  value: string | number;
}

interface ResultsChartProps {
  metrics: Metric[];
  rawOutput?: string;
}

export default function ResultsChart({ metrics, rawOutput }: ResultsChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  if (!metrics || metrics.length === 0) {
    if (rawOutput) {
      // Try to extract numeric data from raw output
      const extracted = extractMetricsFromText(rawOutput);
      if (extracted.length > 0) {
        metrics = extracted;
      }
    }
    if (!metrics || metrics.length === 0) {
      return null;
    }
  }

  const chartData = metrics.map((m) => {
    const numValue = typeof m.value === 'string'
      ? parseFloat(m.value.replace(/[%,]/g, ''))
      : m.value;
    return { name: m.name, value: isNaN(numValue) ? 0 : numValue, label: String(m.value) };
  });

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(_value: number, _name: string, props: any) => [props.payload.label, '指标值']}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(_value: number, _name: string, props: any) => [props.payload.label, '指标值']}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#f1f5f9]">分析结果图表</h3>
        <div className="flex gap-1">
          {(['bar', 'line', 'pie'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                chartType === type
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569]'
              }`}
            >
              {type === 'bar' ? '柱状图' : type === 'line' ? '折线图' : '饼图'}
            </button>
          ))}
        </div>
      </div>
      {renderChart()}
    </div>
  );
}

function extractMetricsFromText(text: string): Metric[] {
  const metrics: Metric[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^[-\s]*(\w+(?:\s+\w+)*)\s*[:=]\s*([\d.]+%?)\s*$/);
    if (match) {
      metrics.push({ name: match[1].trim(), value: match[2] });
    }
  }
  return metrics;
}