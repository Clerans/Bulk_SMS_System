import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";

export function useDashboardStats() {
  const usageQuery = useQuery({
    queryKey: ["sms-usage-trend"],
    queryFn: reportApi.getSmsUsageTrend,
  });

  const gatewayQuery = useQuery({
    queryKey: ["gateway-performance"],
    queryFn: reportApi.getGatewayPerformance,
  });

  const campaignDistQuery = useQuery({
    queryKey: ["campaign-status-dist"],
    queryFn: reportApi.getCampaignStatusDistribution,
  });

  return {
    usageTrend: usageQuery.data || [],
    gatewayPerf: gatewayQuery.data || [],
    campaignDist: campaignDistQuery.data || [],
    isLoading: usageQuery.isLoading || gatewayQuery.isLoading || campaignDistQuery.isLoading,
    error: usageQuery.error || gatewayQuery.error || campaignDistQuery.error,
  };
}

export function useCostReports() {
  const query = useQuery({
    queryKey: ["cost-reports"],
    queryFn: reportApi.getMonthlyCostBreakdown,
  });

  return {
    costBreakdown: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useAuditLogs() {
  const query = useQuery({
    queryKey: ["audit-logs"],
    queryFn: reportApi.getAuditLogs,
  });

  return {
    auditLogs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
