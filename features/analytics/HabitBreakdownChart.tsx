'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface HabitBreakdownChartProps {
  data: Array<{ name: string; value: number }>
  title?: string
}

export function HabitBreakdownChart({ data, title }: HabitBreakdownChartProps) {
  const COLOURS = [
    '#6366f1', '#8b5cf6', '#22c55e', '#eab308',
    '#ef4444', '#f97316', '#3b82f6', '#ec4899',
  ]

  return (
    <div>
      {title && <h3 className="text-sm font-semibold mb-3">{title}</h3>}
      <div className="h-48 w-full" role="img" aria-label={title ?? 'Habit breakdown chart'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
              ))}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [value, name]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        {data.map(d => `${d.name}: ${d.value}`).join(', ')}
      </p>
    </div>
  )
}
