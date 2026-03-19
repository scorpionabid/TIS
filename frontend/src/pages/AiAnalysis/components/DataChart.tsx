import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import type { VisualizationType } from '@/types/aiAnalysis';

// ─── Constants ────────────────────────────────────────────────

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// ─── Props ────────────────────────────────────────────────────

interface DataChartProps {
  data: Record<string, unknown>[];
  columns: string[];
  chartType: VisualizationType;
}

// ─── Column type detection ────────────────────────────────────

interface ColumnMeta {
  name: string;
  isNumeric: boolean;
}

function detectColumnTypes(
  data: Record<string, unknown>[],
  columns: string[]
): ColumnMeta[] {
  return columns.map((col) => {
    const values = data.slice(0, 10).map((row) => row[col]);
    const isNumeric = values.some(
      (v) =>
        typeof v === 'number' ||
        (v !== null && v !== '' && !isNaN(Number(v)))
    );
    return { name: col, isNumeric };
  });
}

// ─── Normalise row values for Recharts ───────────────────────

function normaliseData(
  data: Record<string, unknown>[],
  numericCols: string[]
): Record<string, unknown>[] {
  return data.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const col of numericCols) {
      const v = row[col];
      if (typeof v === 'string' && !isNaN(Number(v)) && v !== '') {
        next[col] = Number(v);
      }
    }
    return next;
  });
}

// ─── Empty state ─────────────────────────────────────────────

function NoChartMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-2">
      <BarChart3 className="h-10 w-10 opacity-30" />
      <p className="text-sm">Qrafik göstərmək üçün uyğun data yoxdur</p>
    </div>
  );
}

// ─── Sub-charts ───────────────────────────────────────────────

interface BarChartViewProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
}

function BarChartView({ data, xKey, yKey }: BarChartViewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>Sütun qrafiki</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: '6px',
              border: '1px solid hsl(var(--border))',
              fontSize: '12px',
            }}
          />
          <Bar dataKey={yKey} fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartViewProps {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
}

function PieChartView({ data, nameKey, valueKey }: PieChartViewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PieChartIcon className="h-3.5 w-3.5" />
        <span>Dairəvi qrafik</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={110}
            label={({ name, percent }) =>
              `${String(name).slice(0, 14)} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '6px',
              border: '1px solid hsl(var(--border))',
              fontSize: '12px',
            }}
          />
          <Legend iconSize={10} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LineChartViewProps {
  data: Record<string, unknown>[];
  xKey: string;
  numericKeys: string[];
}

function LineChartView({ data, xKey, numericKeys }: LineChartViewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Xətt qrafiki</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: '6px',
              border: '1px solid hsl(var(--border))',
              fontSize: '12px',
            }}
          />
          <Legend iconSize={10} />
          {numericKeys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export const DataChart: React.FC<DataChartProps> = ({
  data,
  columns,
  chartType,
}) => {
  if (chartType === 'table' || data.length === 0 || columns.length < 2) {
    return <NoChartMessage />;
  }

  const colMeta = detectColumnTypes(data, columns);
  const stringCols = colMeta.filter((c) => !c.isNumeric).map((c) => c.name);
  const numericCols = colMeta.filter((c) => c.isNumeric).map((c) => c.name);

  if (numericCols.length === 0) {
    return <NoChartMessage />;
  }

  const normalisedData = normaliseData(data, numericCols);

  if (chartType === 'bar') {
    const xKey = stringCols[0] ?? columns[0];
    const yKey = numericCols[0];
    return <BarChartView data={normalisedData} xKey={xKey} yKey={yKey} />;
  }

  if (chartType === 'pie') {
    const nameKey = stringCols[0] ?? columns[0];
    const valueKey = numericCols[0];
    return <PieChartView data={normalisedData} nameKey={nameKey} valueKey={valueKey} />;
  }

  if (chartType === 'line') {
    const xKey = columns[0];
    const lineKeys = numericCols.length > 0 ? numericCols : [columns[1]];
    return <LineChartView data={normalisedData} xKey={xKey} numericKeys={lineKeys} />;
  }

  return <NoChartMessage />;
};
