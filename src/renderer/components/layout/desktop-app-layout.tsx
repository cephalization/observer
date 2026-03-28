import type { ReactNode } from "react";
import type { Layout } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface LayoutController {
  defaultLayout?: Layout;
  onLayoutChanged?: (layout: Layout) => void;
}

export const DesktopAppLayout = ({
  chatPanel,
  detailPanel,
  isChatPinned,
  layoutIds,
  pinnedLayout,
  rootLayout,
  sidebar,
  tracePanel,
  unpinnedLayout,
}: {
  chatPanel: ReactNode;
  detailPanel: ReactNode;
  isChatPinned: boolean;
  layoutIds: { pinned: string; root: string; unpinned: string };
  pinnedLayout: LayoutController;
  rootLayout: LayoutController;
  sidebar: ReactNode;
  tracePanel: ReactNode;
  unpinnedLayout: LayoutController;
}) => (
  <div className="hidden h-screen p-3 xl:block">
    <ResizablePanelGroup
      className="h-[calc(100vh-1.5rem)] gap-3"
      defaultLayout={
        rootLayout.defaultLayout ?? {
          "observer-sidebar-panel": 320,
          "observer-workspace-panel": 1,
        }
      }
      id={layoutIds.root}
      onLayoutChanged={rootLayout.onLayoutChanged}
      orientation="horizontal"
    >
      <ResizablePanel
        defaultSize="320px"
        groupResizeBehavior="preserve-pixel-size"
        id="observer-sidebar-panel"
        maxSize="420px"
        minSize="280px"
      >
        <div className="h-full min-h-0">{sidebar}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={1} id="observer-workspace-panel" minSize="720px">
        <div className="relative h-full">
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex h-full min-w-max gap-3 pr-3">
              {isChatPinned ? (
                <ResizablePanelGroup
                  className="h-full min-w-[990px] gap-3"
                  defaultLayout={
                    pinnedLayout.defaultLayout ?? {
                      "observer-traces-panel": 560,
                      "observer-detail-panel": 430,
                    }
                  }
                  id={layoutIds.pinned}
                  onLayoutChanged={pinnedLayout.onLayoutChanged}
                  orientation="horizontal"
                >
                  <ResizablePanel
                    defaultSize="560px"
                    groupResizeBehavior="preserve-pixel-size"
                    id="observer-traces-panel"
                    minSize="460px"
                  >
                    <div className="h-full min-h-0 overflow-hidden">{tracePanel}</div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                    defaultSize="430px"
                    groupResizeBehavior="preserve-pixel-size"
                    id="observer-detail-panel"
                    minSize="360px"
                  >
                    <div className="h-full min-h-0 overflow-hidden">{detailPanel}</div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <ResizablePanelGroup
                  className="h-full min-w-[1390px] gap-3"
                  defaultLayout={
                    unpinnedLayout.defaultLayout ?? {
                      "observer-traces-panel": 560,
                      "observer-detail-panel": 410,
                      "observer-chat-panel": 420,
                    }
                  }
                  id={layoutIds.unpinned}
                  onLayoutChanged={unpinnedLayout.onLayoutChanged}
                  orientation="horizontal"
                >
                  <ResizablePanel
                    defaultSize="560px"
                    groupResizeBehavior="preserve-pixel-size"
                    id="observer-traces-panel"
                    minSize="460px"
                  >
                    <div className="h-full min-h-0 overflow-hidden">{tracePanel}</div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                    defaultSize="410px"
                    groupResizeBehavior="preserve-pixel-size"
                    id="observer-detail-panel"
                    minSize="340px"
                  >
                    <div className="h-full min-h-0 overflow-hidden">{detailPanel}</div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                    defaultSize="420px"
                    groupResizeBehavior="preserve-pixel-size"
                    id="observer-chat-panel"
                    minSize="360px"
                  >
                    <div className="h-full min-h-0 overflow-hidden">{chatPanel}</div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}
            </div>
          </div>

          {isChatPinned ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-[min(430px,42vw)] min-w-[380px] max-w-[460px] items-stretch pr-0">
              <div className="pointer-events-auto h-full w-full rounded-[24px] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                {chatPanel}
              </div>
            </div>
          ) : null}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
);
