import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectInput, ProjectUpdate, ThemePreference } from "../../shared/types";

const queryKeys = {
  projects: ["projects"] as const,
  preferences: ["preferences"] as const,
  proxy: ["proxy-status"] as const,
};

export const useProjects = () => {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => window.observer.projects.list(),
  });

  const preferencesQuery = useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => window.observer.preferences.get(),
  });

  const proxyQuery = useQuery({
    queryKey: queryKeys.proxy,
    queryFn: () => window.observer.proxy.getStatus(),
    refetchInterval: 3000,
  });

  const sync = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
      queryClient.invalidateQueries({ queryKey: queryKeys.proxy }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (input: ProjectInput) => window.observer.projects.create(input),
    onSuccess: sync,
  });

  const updateMutation = useMutation({
    mutationFn: (input: ProjectUpdate) => window.observer.projects.update(input),
    onSuccess: sync,
  });

  const removeMutation = useMutation({
    mutationFn: (projectId: string) => window.observer.projects.remove(projectId),
    onSuccess: sync,
  });

  const activateMutation = useMutation({
    mutationFn: (projectId: string | null) => window.observer.projects.activate(projectId),
    onSuccess: sync,
  });

  const themeMutation = useMutation({
    mutationFn: (theme: ThemePreference) => window.observer.preferences.setTheme(theme),
    onSuccess: sync,
  });

  const activeProject = useMemo(() => {
    if (!preferencesQuery.data?.activeProjectId) {
      return null;
    }

    return (
      projectsQuery.data?.find(
        (project) => project.id === preferencesQuery.data?.activeProjectId,
      ) ?? null
    );
  }, [preferencesQuery.data?.activeProjectId, projectsQuery.data]);

  return {
    projects: projectsQuery.data ?? [],
    preferences: preferencesQuery.data,
    proxyStatus: proxyQuery.data,
    activeProject,
    isLoading: projectsQuery.isLoading || preferencesQuery.isLoading,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    removeProject: removeMutation.mutateAsync,
    activateProject: activateMutation.mutateAsync,
    setTheme: themeMutation.mutateAsync,
  };
};
