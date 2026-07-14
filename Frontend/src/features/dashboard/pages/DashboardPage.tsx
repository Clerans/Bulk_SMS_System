import { useState, useEffect, useMemo } from "react";
import { Send, CheckCircle2, XCircle, Wallet, Activity, List } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { ProgressBar } from "../../../components/ui/Progress";
import { MetricCard } from "../components/MetricCard";
import { DeliveryTrendChart } from "../components/DeliveryTrendChart";
import { RecentCampaigns } from "../components/RecentCampaigns";
import { formatNumber, formatPct } from "../../../utils/format";
import { dashboardService } from "../services/dashboard.service";
import { MOCK_CAMPAIGNS } from "../../../mocks/data";
import type { DashboardSummary, DeliveryTrend } from "../../../types/common";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<DeliveryTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getSummary(),
      dashboardService.getDeliveryTrend(),
    ]).then(([sum, tr]) => {
      setSummary(sum);
      setTrend(tr);
      setLoading(false);
    });
  }, []);

  const recentCampaigns = MOCK_CAMPAIGNS.slice(0, 5);

  const deliveryRate = useMemo(
    () => (summary && summary.totalSent > 0 ? (summary.delivered / summary.totalSent) * 100 : 0),
    [summary]
  );
  const failureRate = 100 - deliveryRate;

  if (loading || !summary) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading dashboard...
      </div>
    );
  }


  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Monitor campaign performance and SMS delivery activity."
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Total SMS Sent"
          value={formatNumber(summary.totalSent)}
          trend="+12.5% from last month"
          trendUp
          icon={Send}
        />
        <MetricCard
          label="Delivered"
          value={formatNumber(summary.delivered)}
          sub={`${formatPct(deliveryRate)} delivery rate`}
          icon={CheckCircle2}
          iconClass="text-green-500"
        />
        <MetricCard
          label="Failed"
          value={formatNumber(summary.failed)}
          sub={`${formatPct(failureRate)} failure rate`}
          icon={XCircle}
          iconClass="text-destructive"
        />
        <MetricCard
          label="SMS Balance"
          value={formatNumber(summary.smsBalance)}
          sub="Estimated 8 campaigns remaining"
          icon={Wallet}
        />
        <MetricCard
          label="Active Campaigns"
          value={String(summary.activeCampaigns)}
          sub="Currently running"
          icon={Activity}
          iconClass="text-blue-400"
        />
        <MetricCard
          label="Total Campaigns"
          value={String(summary.campaignCount)}
          sub="All time"
          icon={List}
          iconClass="text-muted-foreground"
        />
      </div>

      {/* Chart + Overview */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <DeliveryTrendChart data={trend} days={14} />

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-foreground">Delivery Overview</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Delivered</span>
                <span className="font-medium text-foreground">{formatPct(deliveryRate)}</span>
              </div>
              <ProgressBar value={deliveryRate} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-medium text-destructive">{formatPct(failureRate)}</span>
              </div>
              <ProgressBar value={failureRate} color="bg-destructive" />
            </div>
            <div className="pt-3 border-t border-border space-y-2.5">
              {[
                { label: "Total Sent",  value: formatNumber(summary.totalSent)   },
                { label: "Delivered",   value: formatNumber(summary.delivered)   },
                { label: "Failed",      value: formatNumber(summary.failed)      },
                { label: "Balance",     value: formatNumber(summary.smsBalance)  },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <RecentCampaigns campaigns={recentCampaigns} />
    </div>
  );
}
