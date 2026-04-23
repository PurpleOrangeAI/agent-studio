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

export function LangGraphQuickstartPanel() {
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
          <strong>2. Export the required environment</strong>
          <pre className="code-panel"><code>{ENV_VARS.join('\n')}</code></pre>
          <p className="tiny-copy">Use `LANGGRAPH_GRAPH_ID` instead of `LANGGRAPH_ASSISTANT_ID` if your deployment is graph-first.</p>
        </article>
        <article className="guide-step guide-step--ready">
          <strong>3. Run the shipped example import</strong>
          <pre className="code-panel"><code>{RUN_COMMAND}</code></pre>
        </article>
        <article className="guide-step guide-step--ready">
          <strong>4. Refresh Studio</strong>
          <p>Open Overview, then use Live, Replay, and Optimize as the imported system fills in.</p>
        </article>
      </div>

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
