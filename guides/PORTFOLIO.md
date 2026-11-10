# PipelineOps Copilot

## Portfolio description

When a pipeline fails, a support engineer needs to know which recovery procedure applies and where it came from. I built PipelineOps Copilot to search the selected application's permitted documents and return a passage the engineer can verify. The public demo covers eight synthetic applications and can answer a two-part incident question with separate citations for the recovery steps and the person or team authorized to act.

[Live demo](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/) · [Two-minute walkthrough](DEMO.md)

## How I explain the architecture

> I built the retrieval layer first because a plausible recovery instruction for the wrong application can be harmful. At build time I split versioned support documents by heading and index their current sections. At request time the backend limits candidates to documents the caller can read for the selected application. It ranks those sections using text and technical identifiers. When one passage has sufficient evidence, the desk quotes it and links to its exact version and section. A two-part question can retrieve two independently cited passages.

**Where RAG fits.** The public desk returns exact passages. The GitHub project also runs end-to-end RAG locally: a quantized Qwen model generates answers from the same permission-filtered passages and the application attaches source links. [Run the example](../local-rag/README.md)

**Why start with lexical search?** Similar incident codes can refer to different failures, and an exact match is inexpensive to inspect and test. I compared this baseline with an offline MiniLM embedding fallback. In the first 56-question comparison it recovered two supported paraphrases but also introduced one incorrect citation. I kept the extractive baseline available for comparison as the corpus grew. [Experiment and results](engineering.md#semantic-fallback-experiment)

**Next evaluation.** Compare locally generated answers against the cited passages for unsupported claims, omitted recovery steps, and correct abstentions. The published retrieval scores apply to the extractive path.

## Resume bullets

- Built and deployed a JavaScript support assistant for eight synthetic applications, filtering by application and document permissions before searching 68 sections across 31 public documents.
- Implemented version-aware document ingestion with SHA-256 change detection, reuse of unchanged sections, and atomic bundle replacement so retired procedures leave search and failed imports preserve the last good build.
- Evaluated retrieval on 153 labeled questions. The assistant returned the expected citation or abstention on 145, declined the eight remaining questions, and produced zero incorrect citations on that set.
