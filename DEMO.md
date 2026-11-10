# PipelineOps Copilot · Two-minute interview demo

**Scenario:** A support engineer is covering a late morning release. The board still shows an older snapshot. What should the engineer do, and who can approve a manual publication?

### 0:00–0:20 · Select the application

Open Dispatch Board. Point out the selected application and its source library. [Start the demo](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/?app=dispatch)

> I built this independent demo around a common support problem. An engineer can find several plausible recovery procedures, but needs the one that applies to this application and this version. The desk uses synthetic documents for eight applications.

### 0:20–0:55 · Ask one operational question

Choose **Late release**. Show the two excerpts and their distinct citations. [Open the prepared question](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/?app=dispatch&q=What+should+I+do+when+Dispatch+Board+misses+its+cutoff%2C+and+who+can+approve+manual+publication%3F#answer)

> The cutoff is 08:05 UTC. If the release is late, the board keeps the last published snapshot visible. Routing Operations confirms the release before a retry. A separate question is who can approve manual publication. That authority belongs to Dispatch Operations.

### 0:55–1:25 · Verify the evidence

Follow the citation beneath the first excerpt. Point to **DB-410 missing release** in runbook v1.1. Use **Back to answer**, then open the second citation and show **Support ownership** in handbook v1.1.

> Each clause gets its own search within the selected application's permitted documents. The answer quotes the retrieved passage, and the link opens the exact section. Here I can verify both the recovery instruction and the approval authority before acting.

### 1:25–2:00 · Test the boundary

Search for **DB-410** under Dispatch Board. Switch to Route Ledger, enter the same code, and show **Insufficient evidence**. [Dispatch Board lookup](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/?app=dispatch&q=DB-410#answer) · [Route Ledger lookup](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/?app=ledger&q=DB-410#answer)

> These applications exchange data and even use similar incident numbers. The backend filters by application and document permissions before ranking passages. When Route Ledger has no evidence for this code, the desk declines to give a recovery instruction.

**If asked about the AI architecture:** The public demo uses lexical retrieval and verbatim excerpts. I evaluated a local embedding fallback separately and measured its effect on unsupported questions as well as successful lookups. On the current 153-question single-part set, the public retriever produced 145 expected outcomes, eight unanswered supported questions, and zero wrong citations. [Evaluation methods and results](README.md#multi-part-answer-evaluation)
