# PipelineOps Copilot

## Portfolio description

When a pipeline fails, a support engineer needs to know which recovery procedure applies and where it came from. I built PipelineOps Copilot to search the selected application's permitted documents and return a passage the engineer can verify. The public demo covers eight synthetic applications and can answer a two-part incident question with separate citations for the recovery steps and the person or team authorized to act.

[Live demo](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/) · [Two-minute walkthrough](DEMO.md)

## Resume bullets

- Built and deployed a JavaScript support assistant for eight synthetic applications, filtering by application and document permissions before searching 68 sections across 31 public documents.
- Implemented version-aware document ingestion with SHA-256 change detection, reuse of unchanged sections, and atomic bundle replacement so retired procedures leave search and failed imports preserve the last good build.
- Evaluated retrieval on 153 labeled questions. The assistant returned the expected citation or abstention on 145, declined the eight remaining questions, and produced zero incorrect citations on that set.
