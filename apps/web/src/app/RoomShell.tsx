import type { ReactNode } from 'react';

import { AdvancedPanel } from './AdvancedPanel';
import { RoomSection } from './RoomSection';

interface RoomShellProps {
  roomId: string;
  eyebrow: string;
  title: string;
  body: string;
  items: string[];
  children: ReactNode;
  advanced?: ReactNode;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  advancedEyebrow: string;
  advancedTitle: string;
  advancedBody: string;
  openLabel: string;
  closeLabel: string;
}

export function RoomShell({
  roomId,
  eyebrow,
  title,
  body,
  items,
  children,
  advanced,
  showAdvanced = false,
  onToggleAdvanced,
  advancedEyebrow,
  advancedTitle,
  advancedBody,
  openLabel,
  closeLabel,
}: RoomShellProps) {
  return (
    <section data-room={roomId} className="room-shell">
      <RoomSection eyebrow={eyebrow} title={title} body={body} items={items} />
      <div className="room-shell__content">{children}</div>
      {advanced ? (
        <AdvancedPanel
          eyebrow={advancedEyebrow}
          title={advancedTitle}
          body={advancedBody}
          open={showAdvanced}
          openLabel={openLabel}
          closeLabel={closeLabel}
          onToggle={onToggleAdvanced ?? (() => undefined)}
        >
          {advanced}
        </AdvancedPanel>
      ) : null}
    </section>
  );
}
