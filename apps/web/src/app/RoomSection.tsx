import type { ReactNode } from 'react';

interface RoomSectionProps {
  eyebrow: string;
  title: string;
  body: string;
  items: string[];
  children?: ReactNode;
}

export function RoomSection({ eyebrow, title, body, items, children }: RoomSectionProps) {
  return (
    <section className="surface room-section">
      <div className="room-section__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted room-section__body">{body}</p>
        </div>
        {children ? <div className="room-section__actions">{children}</div> : null}
      </div>
      <div className="room-section__items">
        {items.map((item) => (
          <div key={item} className="mini-note">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
