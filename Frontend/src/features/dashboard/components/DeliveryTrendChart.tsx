import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import type { DeliveryTrend } from "../../../types/common";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { Activity } from "lucide-react";

interface DeliveryTrendChartProps {
  data: DeliveryTrend[];
  days?: number;
}

export function DeliveryTrendChart({ data, days = 14 }: DeliveryTrendChartProps) {
  const chartData = useMemo(
    () =>
      data.slice(-days).map((d) => ({
        date: format(parseISO(d.date), "MMM d"),
        Delivered: d.delivered,
        Failed: d.failed,
      })),
    [data, days]
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">
          Delivery Trend — Last {days} Days
        </h2>
      </CardHeader>
      <CardBody>
        {chartData.length === 0 ? (
          <EmptyState icon={Activity} title="No trend data" description="Delivery data will appear here once campaigns are sent." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              <Line
                type="monotone"
                dataKey="Delivered"
                stroke="#8EA58C"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Failed"
                stroke="#D36B6B"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
