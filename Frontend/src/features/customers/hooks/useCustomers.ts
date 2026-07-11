import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi, Customer, CustomerGroup } from "@/api/customer.api";

export function useCustomerGroups() {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["customer-groups"],
    queryFn: customerApi.getGroups,
  });

  const createGroupMutation = useMutation({
    mutationFn: customerApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    error: groupsQuery.error,
    createGroup: createGroupMutation.mutateAsync,
    isCreating: createGroupMutation.isPending,
  };
}

export function useCustomers() {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: customerApi.getCustomers,
  });

  const createCustomerMutation = useMutation({
    mutationFn: customerApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
      customerApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: customerApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
    },
  });

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    error: customersQuery.error,
    createCustomer: createCustomerMutation.mutateAsync,
    isCreating: createCustomerMutation.isPending,
    updateCustomer: updateCustomerMutation.mutateAsync,
    isUpdating: updateCustomerMutation.isPending,
    deleteCustomer: deleteCustomerMutation.mutateAsync,
    isDeleting: deleteCustomerMutation.isPending,
  };
}
