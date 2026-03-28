import type { ReactNode } from "react";

export const MobileAppLayout = ({
  chatPanel,
  detailPanel,
  sidebar,
  tracePanel,
}: {
  chatPanel: ReactNode;
  detailPanel: ReactNode;
  sidebar: ReactNode;
  tracePanel: ReactNode;
}) => (
  <div className="flex min-h-screen flex-col xl:hidden">
    <div className="p-4 pb-0 md:p-6 md:pb-0">{sidebar}</div>
    <div className="grid gap-4 p-4 md:gap-6 md:p-6">
      {tracePanel}
      <div className="grid gap-4 md:gap-6">
        {detailPanel}
        {chatPanel}
      </div>
    </div>
  </div>
);
