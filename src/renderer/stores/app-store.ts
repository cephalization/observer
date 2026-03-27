import { create } from "zustand";

interface AppStore {
  selectedTraceIds: string[];
  settingsOpen: boolean;
  setSelectedTraceIds: (traceIds: string[]) => void;
  toggleTrace: (traceId: string) => void;
  clearSelection: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedTraceIds: [],
  settingsOpen: false,
  setSelectedTraceIds: (selectedTraceIds) => set({ selectedTraceIds }),
  toggleTrace: (traceId) =>
    set((state) => ({
      selectedTraceIds: state.selectedTraceIds.includes(traceId)
        ? state.selectedTraceIds.filter((id) => id !== traceId)
        : [...state.selectedTraceIds, traceId],
    })),
  clearSelection: () => set({ selectedTraceIds: [] }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
