# PipelineOps Copilot

PipelineOps Copilot helps support engineers find the recovery procedure for the application they’re supporting. The public desk shows exact passages from synthetic runbooks. The local RAG example uses those same permission-filtered passages to generate cited answers on CPU.

**[Try the live support desk](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/)** · **[See the local AI RAG example](local-rag/README.md)**

## A real RAG trace from Dispatch Board

> What should I do when Dispatch Board misses its cutoff, and who can approve manual publication?

The retriever found one passage for each part. Here are excerpts from those passages alongside the answers Qwen generated in the recorded local run.

| Retrieved evidence | Generated answer | Citation |
| --- | --- | --- |
| “Check the release marker against the ledger partition ID. Ask Routing Operations to confirm release before retrying publication. Leave the board pointer unchanged until the marker is present.” | “Check the release marker against the ledger partition ID. Ask Routing Operations to confirm release before retrying publication.” | [Runbook v1.1 · DB-410 missing release](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/source?app=dispatch&doc=runbook&v=1.1#s1) |
| “Dispatch Operations owns the board and approves manual publication of the board.” | “Dispatch Operations” | [Handbook v1.1 · Support ownership](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/source?app=dispatch&doc=handbook&v=1.1#s0) |

**What the model missed.** The recovery answer omitted the instruction to leave the board pointer unchanged until the marker is present. Following the first citation reveals the missing step.

![Carrier Intake workspace with the application sidebar, question field and a sourced CI-204 sample incident](assets/support-desk.png)

## How it works

1. The build selects current document revisions and indexes their sections. The public corpus covers 31 synthetic documents across eight applications.
2. The request handler checks application and document permissions before ranking passages. Each cited answer links to its versioned source. Unsupported questions receive an explicit abstention.
3. The optional local RAG pipeline passes that evidence to Qwen and returns the generated answer, its supporting quote, and the source link.

## Run locally

From the repository root, use Node.js 22 or newer:

```sh
npm start
```

Open [the local desk](http://127.0.0.1:4173). Run `npm test` for regression checks. The web app requires no dependency installation. Model setup and the verified CPU run are in the [local RAG walkthrough](local-rag/README.md).

## Evaluation

| What was tested | Result | Reproduce |
| --- | --- | --- |
| Single-part retrieval | 145/153 expected outcomes, eight supported questions unanswered, zero wrong citations | `node eval.mjs` |
| Multi-part retrieval | 20/20 questions, 26/26 citations verified, 15/15 correct abstentions | `npm run eval:compound` |

These counts measure retrieval and source selection. The local generation example above illustrates a separate quality check for omitted instructions.

## Explore the project

- [Engineering guide](guides/engineering.md) — application map, permissions, document synchronization, embedding experiment, and benchmarks.
- [Two-minute demo](guides/DEMO.md) — follow a freight incident through recovery, approval, and a cross-application lookup.
- [Interview notes](guides/PORTFOLIO.md) — project description, architecture explanation, and resume bullets.
