import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, SystemUser, UserRole } from "@/api/user.api";

export function useUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: userApi.getUsers,
  });

  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "inactive" }) =>
      userApi.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    createUser: createUserMutation.mutateAsync,
    isCreating: createUserMutation.isPending,
    toggleUserStatus: toggleUserStatusMutation.mutateAsync,
    isToggling: toggleUserStatusMutation.isPending,
    deleteUser: deleteUserMutation.mutateAsync,
    isDeleting: deleteUserMutation.isPending,
  };
}

export function useRoles() {
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: userApi.getRoles,
  });

  const createRoleMutation = useMutation({
    mutationFn: userApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  return {
    roles: rolesQuery.data || [],
    isLoading: rolesQuery.isLoading,
    error: rolesQuery.error,
    createRole: createRoleMutation.mutateAsync,
    isCreating: createRoleMutation.isPending,
  };
}
