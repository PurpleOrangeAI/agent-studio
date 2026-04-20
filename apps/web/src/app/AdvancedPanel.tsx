import type { ReactNode } from 'react';

interface AdvancedPanelProps {
  eyebrow: string;
  title: string;
  body: string;
  open: boolean;
  openLabel: string;
  closeLabel: string;
  onToggle: () => void;
  children: ReactNode;
}

export function AdvancedPanel({
  eyebrow,
  title,
  body,
  open,
  openLabel,
  closeLabel,
  onToggle,
  children,
}: AdvancedPanelProps) {
  return (
    <section className="surface advanced-panel">
      <div className="advanced-panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p className="muted">{body}</p>
        </div>
        <button className="ghost-button" type="button" onClick={onToggle}>
          {open ? closeLabel : openLabel}
        </button>
      </div>
      {open ? <div className="advanced-panel__content">{children}</div> : null}
    </section>
  );
}
