import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, CompanyInfo } from "@/api/settings.api";

export function useGateways() {
  const queryClient = useQueryClient();

  const gatewaysQuery = useQuery({
    queryKey: ["gateways"],
    queryFn: settingsApi.getGateways,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "inactive" }) =>
      settingsApi.updateGatewayStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] });
    },
  });

  return {
    gateways: gatewaysQuery.data || [],
    isLoading: gatewaysQuery.isLoading,
    error: gatewaysQuery.error,
    toggleGatewayStatus: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
  };
}

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ["company-info"],
    queryFn: settingsApi.getCompanyInfo,
  });

  const updateCompanyMutation = useMutation({
    mutationFn: settingsApi.updateCompanyInfo,
    onSuccess: (updated) => {
      queryClient.setQueryData(["company-info"], updated);
    },
  });

  return {
    companyInfo: companyQuery.data,
    isLoading: companyQuery.isLoading,
    error: companyQuery.error,
    updateCompany: updateCompanyMutation.mutateAsync,
    isUpdating: updateCompanyMutation.isPending,
  };
}

export function useSecuritySettings() {
  const queryClient = useQueryClient();

  const securityQuery = useQuery({
    queryKey: ["security-settings"],
    queryFn: settingsApi.getSecuritySettings,
  });

  const toggleSecurityMutation = useMutation({
    mutationFn: settingsApi.toggleSecuritySetting,
    onSuccess: (updatedList) => {
      queryClient.setQueryData(["security-settings"], updatedList);
    },
  });

  return {
    securitySettings: securityQuery.data || [],
    isLoading: securityQuery.isLoading,
    error: securityQuery.error,
    toggleSecurity: toggleSecurityMutation.mutateAsync,
    isToggling: toggleSecurityMutation.isPending,
  };
}

export function useApiKeys() {
  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: settingsApi.getApiKeys,
  });

  return {
    apiKeys: keysQuery.data || [],
    isLoading: keysQuery.isLoading,
    error: keysQuery.error,
  };
}
