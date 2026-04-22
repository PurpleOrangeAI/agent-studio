export function formatDateTime(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDuration(durationMs?: number) {
  if (!durationMs) {
    return '0m';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function formatCredits(credits?: number) {
  if (credits === undefined) {
    return '—';
  }

  const rounded = Math.round(credits);
  return `${rounded} ${Math.abs(rounded) === 1 ? 'credit' : 'credits'}`;
}

export function formatDelta(value: number) {
  if (value === 0) {
    return '0';
  }

  return value > 0 ? `+${value}` : `${value}`;
}

export function titleCaseStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
