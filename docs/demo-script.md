# Demo Script

This is the short launch script for showing Agent Studio in 30 to 60 seconds.

Use it for:

- a screen recording
- a live founder demo
- a GitHub repo walkthrough

Current recorded clip:

- [agent-studio-demo-operator-loop.webm](./assets/agent-studio-demo-operator-loop.webm)

## Goal

Make three ideas obvious fast:

1. this is for bring-your-own agent systems
2. it is useful because it connects live pressure, replay, and release
3. it gets more valuable as the system runs longer

## 45-second version

### Scene 1: Overview

Show:

- system overview
- fleet pressure
- agent roster

Say:

> Agent Studio is the open control room for multi-agent systems. You bring your runtime. Studio gives you one place to inspect the live system, replay the break, and decide what should change before the next release.

### Scene 2: Connect

Show:

- connection modes
- LangGraph adapter
- generic ingest

Say:

> It does not force you into a new framework. Today it ships a LangGraph adapter and a generic control-plane ingest path, so any system that can emit runtime events can feed the control room.

### Scene 3: Live

Show:

- topology
- pressure point
- current posture

Say:

> Live shows the real system: which agents exist, how work moves, and where pressure is building right now.

### Scene 4: Replay

Show:

- failing trace
- comparison surface

Say:

> Replay explains what actually failed instead of making you infer it from raw logs.

### Scene 5: Optimize

Show:

- release workbench
- intervention evidence

Say:

> Optimize compares interventions, evaluations, and release calls so the next change is evidence-backed.

### Close

Show:

- architecture diagram or README

Say:

> The longer your system runs, the more context Agent Studio has to expose pressure, compare fixes, and support better release decisions.

## 90-second version

Add:

- storage mode and persistence
- imported system example
- the progression from agents -> spans -> evaluations -> releases

## Recording checklist

- use the public demo, not a private dev build
- start from Overview
- keep cursor movement deliberate
- do not read every card
- end on the product wedge, not a feature list

## Suggested social post hook

> Most agent tools stop at runtime, tracing, or evals. Agent Studio is the open control room that connects all three into one operator loop.
