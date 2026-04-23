import { useState } from 'react';

import type { SystemReadinessSummary } from '../../app/control-plane';

const ENV_VARS = [
  'LANGGRAPH_API_URL=https://your-langgraph.example',
  'LANGGRAPH_THREAD_ID=thread_123',
  'LANGGRAPH_ASSISTANT_ID=assistant_123',
  'AGENT_STUDIO_API_URL=http://localhost:4000',
];

const RUN_COMMAND = [
  'cd packages/adapters/langgraph',
  'corepack pnpm dlx tsx examples/basic.ts',
].join('\n');

const LANGGRAPH_DOC_URL = 'https://github.com/PurpleOrangeAI/agent-studio/blob/main/docs/adapters/langgraph.md';

interface LangGraphQuickstartPanelProps {
  systemName: string;
  readiness: SystemReadinessSummary;
}

function getChecklist(readiness: SystemReadinessSummary, systemName: string) {
  return [
    {
      id: 'overview',
      title: 'Overview recognizes the system',
      detail: `${systemName} should appear in the system picker and the registered systems overview.`,
      ready: readiness.stageId !== 'register',
    },
    {
      id: 'live',
      title: 'Live shows agents and topology',
      detail: 'Live should stop behaving like a placeholder once the roster and topology are present.',
      ready: readiness.agentCount > 0 && readiness.hasTopology,
    },
    {
      id: 'replay',
      title: 'Replay shows the break tree',
      detail: 'Replay becomes useful once executions and spans exist together.',
      ready: readiness.executionCount > 0 && readiness.spanCount > 0,
    },
    {
      id: 'optimize',
      title: 'Optimize has release evidence',
      detail: 'Optimize should only make a real release call after evaluations or releases are imported.',
      ready: readiness.evaluationCount > 0 || readiness.releaseCount > 0,
    },
  ];
}

async function copyText(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== 'undefined') {
    const element = document.createElement('textarea');
    element.value = text;
    element.setAttribute('readonly', '');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);
    return;
  }

  throw new Error('Clipboard API unavailable.');
}

export function LangGraphQuickstartPanel({ systemName, readiness }: LangGraphQuickstartPanelProps) {
  const [copiedBlock, setCopiedBlock] = useState<'env' | 'command' | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const checklist = getChecklist(readiness, systemName);

  async function handleCopy(block: 'env' | 'command') {
    try {
      setCopyError(null);
      await copyText(block === 'env' ? ENV_VARS.join('\n') : RUN_COMMAND);
      setCopiedBlock(block);
      window.setTimeout(() => {
        setCopiedBlock((current) => (current === block ? null : current));
      }, 1800);
    } catch (error) {
      setCopiedBlock(null);
      setCopyError(error instanceof Error ? error.message : 'Failed to copy to the clipboard.');
    }
  }

  return (
    <section className="mini-surface">
      <p className="eyebrow">LangGraph quickstart</p>
      <h3>Fastest shipped adapter path</h3>
      <p className="muted">
        If you already run LangGraph, this is the cleanest path into Agent Studio today. The adapter is read-only: it
        imports runtime state into Studio, but does not create LangGraph runs or mutate LangGraph state.
      </p>

      <div className="guide-stack">
        <article className="guide-step guide-step--ready">
          <strong>1. Start Agent Studio locally</strong>
          <p>Run the API first so the adapter has a control-plane target to write into.</p>
        </article>
        <article className="guide-step guide-step--ready">
          <div className="guide-step__header">
            <strong>2. Export the required environment</strong>
            <button type="button" className="ghost-button ghost-button--small" onClick={() => void handleCopy('env')}>
              {copiedBlock === 'env' ? 'Copied env block' : 'Copy env block'}
            </button>
          </div>
          <div className="code-panel-card">
            <pre className="code-panel"><code>{ENV_VARS.join('\n')}</code></pre>
          </div>
          <p className="tiny-copy">Use `LANGGRAPH_GRAPH_ID` instead of `LANGGRAPH_ASSISTANT_ID` if your deployment is graph-first.</p>
        </article>
        <article className="guide-step guide-step--ready">
          <div className="guide-step__header">
            <strong>3. Run the shipped example import</strong>
            <button type="button" className="ghost-button ghost-button--small" onClick={() => void handleCopy('command')}>
              {copiedBlock === 'command' ? 'Copied command' : 'Copy import command'}
            </button>
          </div>
          <div className="code-panel-card">
            <pre className="code-panel"><code>{RUN_COMMAND}</code></pre>
          </div>
        </article>
        <article className="guide-step guide-step--ready">
          <strong>4. Refresh Studio</strong>
          <p>Open Overview, then use Live, Replay, and Optimize as the imported system fills in.</p>
        </article>
      </div>

      <div className="boundary-note boundary-note--soft">
        <strong>After import, you should see:</strong>
        <div className="guide-stack">
          {checklist.map((item) => (
            <article key={item.id} className={`guide-step ${item.ready ? 'guide-step--ready' : 'guide-step--partial'}`}>
              <div className="guide-step__header">
                <strong>{item.title}</strong>
                <span className="meta-chip">{item.ready ? 'Ready' : 'Still missing'}</span>
              </div>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </div>

      {copyError ? (
        <div className="inline-callout inline-callout--warning">
          <span className="eyebrow">Clipboard error</span>
          <p>{copyError}</p>
        </div>
      ) : null}

      <div className="boundary-note boundary-note--soft">
        <strong>Docs:</strong>{' '}
        <a className="inline-link" href={LANGGRAPH_DOC_URL} target="_blank" rel="noreferrer">
          Full LangGraph adapter guide
        </a>{' '}
        shows the full env list, example command, and the current limits of the adapter.
      </div>
    </section>
  );
}
