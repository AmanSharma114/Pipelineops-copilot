# Local retrieval-augmented generation

Ask an operational question and generate a cited answer on your CPU. The Node adapter invokes the desk's compiled request handler in-process as an anonymous visitor. For each supported part, Python sends the retrieved passage and question to a local instruction model. The application attaches the versioned citation supplied by the retriever. The public website continues to serve its extractive answers.

## Reproduce the example

Use Node.js 22+, Python 3.12, and a virtual environment. Run these commands from the repository root with that environment activated:

```sh
python -m pip install --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu llama-cpp-python==0.3.36
curl -fL https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf -o qwen-local.gguf
python local-rag/generate.py --model qwen-local.gguf
```

The initial model download is about 491 MB. Inference runs locally with no API credentials. Supply your own question with `--app ledger --question "What does RL-410 mean?"`. To inspect the evidence on its own, run `node local-rag/run.mjs`. [Model card](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF)

## Observed CPU run

**Question:** What should I do when Dispatch Board misses its cutoff, and who can approve manual publication?

| Retrieved section | Generated answer |
| --- | --- |
| [Dispatch Board runbook v1.1, DB-410 missing release](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/source?app=dispatch&doc=runbook&v=1.1#s1) | Check the release marker against the ledger partition ID. Ask Routing Operations to confirm release before retrying publication. |
| [Dispatch Board handbook v1.1, Support ownership](https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site/source?app=dispatch&doc=handbook&v=1.1#s0) | Dispatch Operations |

The CLI also returns the model's evidence quote. A missing passage produces an abstention before inference. A malformed answer or a quote absent from the passage is withheld. Exact quote matching establishes provenance; assessing whether every generated claim follows from the quote still requires review. In this run the first generated answer omitted the instruction to leave the board pointer unchanged. The accompanying quote preserved that detail. The published retrieval scores measure the extractive baseline, not generation quality.
