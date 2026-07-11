import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignApi, Campaign } from "@/api/campaign.api";

export function useCampaigns() {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignApi.list,
  });

  const createCampaignMutation = useMutation({
    mutationFn: campaignApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: campaignApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    error: campaignsQuery.error,
    refetch: campaignsQuery.refetch,
    createCampaign: createCampaignMutation.mutateAsync,
    isCreating: createCampaignMutation.isPending,
    deleteCampaign: deleteCampaignMutation.mutateAsync,
    isDeleting: deleteCampaignMutation.isPending,
  };
}

export function useCampaignDetails(id: number) {
  const queryClient = useQueryClient();

  const campaignQuery = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignApi.getById(id),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: any }) => campaignApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  return {
    campaign: campaignQuery.data,
    isLoading: campaignQuery.isLoading,
    error: campaignQuery.error,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}

export function useDeliveryLogs() {
  const query = useQuery({
    queryKey: ["delivery-logs"],
    queryFn: campaignApi.getDeliveryLogs,
  });

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
