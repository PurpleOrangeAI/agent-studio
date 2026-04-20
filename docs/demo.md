# Demo

The seeded demo shows the product loop in one place:

- `Live`
- `Replay`
- `Optimize`

## What the seeded workflow is

The demo uses one workflow, `Weekly Operations Brief`, to prove the control loop.

It has:

- a healthy baseline run
- a degraded run that fails the replay
- an improved run that preserves the review gate while lowering cost and duration

That gives the demo coherent, representative data to compare instead of synthetic UI states.

## Live

`Live` shows the current workflow, current run, and the active operating state.

Use it to answer:

- What is the system doing right now?
- Which runtime or workflow am I looking at?
- Where should I inspect first?

## Replay

`Replay` explains what happened in a run and how it compares to the healthy baseline.

The seeded demo shows:

- the baseline control run
- the degraded run that widened fan-out and weakened the review gate
- the evidence trail that points to the failure point

Use it to answer:

- What changed?
- Where did quality break?
- Which part of the workflow deserves a fix?

## Optimize

`Optimize` shows the candidate release path.

The seeded demo proves a simple but important point:

- the improved plan kept the review step intact
- it reduced duplicate source fan-out
- it improved credits and duration without lowering the output quality bar

Use it to answer:

- What should be promoted?
- What should be held back?
- What evidence supports the release decision?

## What the demo proves

- Agent Studio is runtime-agnostic at the product layer.
- The product is organized around workflows, runs, replays, policies, and recommendations.
- The optimization loop is evidence-backed, not speculative.
- The public surface is safe to run because it is seeded and read-only.
