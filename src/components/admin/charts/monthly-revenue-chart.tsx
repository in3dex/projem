"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";

interface MonthlyRevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Recharts renklerini tema ile uyumlu hale getirelim
  const axisColor = isDarkMode ? "#a1a1aa" : "#71717a"; // zinc-400 : zinc-500
  const barColor = "#3b82f6"; // blue-500
  const tooltipBg = isDarkMode ? "#27272a" : "#ffffff"; // zinc-800 : white
  const tooltipText = isDarkMode ? "#f4f4f5" : "#18181b"; // zinc-100 : zinc-900

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#3f3f46" : "#e4e4e7"} /> {/* zinc-700 : zinc-200 */}
        <XAxis
          dataKey="month"
          stroke={axisColor}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={axisColor}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}₺`}
        />
        <Tooltip 
            cursor={{ fill: isDarkMode ? 'rgba(113, 113, 122, 0.2)' : 'rgba(200, 200, 200, 0.3)' }} // zinc-500 with opacity
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${isDarkMode ? '#52525b' : '#d4d4d8'}`, borderRadius: '0.5rem' }} // zinc-600 : zinc-300
            labelStyle={{ color: tooltipText, fontWeight: 'bold' }}
            itemStyle={{ color: tooltipText }}
            formatter={(value: number) => [`${value.toFixed(2)} ₺`, 'Gelir']}
        />
        {/* <Legend /> */}
        <Bar dataKey="revenue" fill={barColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
} 