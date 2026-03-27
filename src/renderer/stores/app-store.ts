import { create } from "zustand";

interface AppStore {
  activeTraceId: string | null;
  selectedTraceIds: string[];
  settingsOpen: boolean;
  setActiveTraceId: (traceId: string | null) => void;
  setSelectedTraceIds: (traceIds: string[]) => void;
  toggleTrace: (traceId: string) => void;
  clearSelection: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTraceId: null,
  selectedTraceIds: [],
  settingsOpen: false,
  setActiveTraceId: (activeTraceId) => set({ activeTraceId }),
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
