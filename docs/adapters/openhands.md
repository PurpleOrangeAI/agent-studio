# OpenHands Adapter

Status: planned, not shipped yet.

This guide describes the intended integration shape for OpenHands. There is no published adapter package in this repo today.

## Intended goal

When it lands, the OpenHands adapter should map OpenHands runtime data into the same Agent Studio contract used by the rest of the product:

- workflow
- run
- replay
- operational context

## Intended shape

The adapter should sit between OpenHands and Agent Studio and translate:

- workflow identity
- run identity
- step or phase execution
- cost and duration
- evidence and replay context

## Planned usage model

The intended flow is:

1. Read OpenHands runtime data.
2. Convert it into Agent Studio payloads.
3. Send those payloads through the API or SDK.
4. Use `Live`, `Replay`, and `Optimize` the same way as any other runtime.

## What is not true yet

- There is no shipped `packages/adapters/openhands` implementation in this repo.
- There is no install command to run for OpenHands today.
- This guide is a planning document, not a usage guide for a live package.

## What to expect from the eventual adapter

The adapter should be able to explain:

- what OpenHands session was imported
- which run produced the data
- how the replay was reconstructed
- which evidence supports a candidate release

Until that package exists, use the LangGraph adapter or the generic SDK path.
