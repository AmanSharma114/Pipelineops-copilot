"""Generate from permitted passages with a local GGUF model. Run from any directory."""
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = {"type": "object", "properties": {"answer": {"type": "string"}, "quote": {"type": "string"}},
          "required": ["answer", "quote"], "additionalProperties": False}


def generate(parts, model):
    results = []
    for part in parts:
        result = {"question": part["part"]}
        results.append(result)
        if "passage" not in part:
            result["status"] = "insufficient evidence"
            continue
        response = model.create_chat_completion(
            messages=[
                {"role": "system", "content": "Use only the evidence. Answer this support question concisely. Keep the team names and required actions accurate. Return JSON with answer and quote. The quote must be copied exactly from the evidence. If unsupported, leave both strings empty."},
                {"role": "user", "content": json.dumps({"question": part["part"], "evidence": part["passage"]})},
            ], temperature=0, seed=42, max_tokens=300,
            response_format={"type": "json_object", "schema": SCHEMA},
        )
        try:
            generated = json.loads(response["choices"][0]["message"]["content"])
            answer, quote = generated["answer"], generated["quote"]
            if not (isinstance(answer, str) and answer.strip() and isinstance(quote, str)
                    and quote.strip() and quote in part["passage"]):
                raise ValueError("No exact evidence quote")
        except (ValueError, TypeError, KeyError):
            result["status"] = "unverified generation"
            continue
        result.update(status="generated", answer=answer, quote=quote, citation=part["citation"])
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--app", default="dispatch")
    parser.add_argument("--question")
    args = parser.parse_args()
    command = ["node", "local-rag/run.mjs", args.app]
    if args.question:
        command.append(args.question)
    parts = json.loads(subprocess.check_output(command, cwd=ROOT))
    model = None
    if any("passage" in p for p in parts):
        from llama_cpp import Llama
        model = Llama(model_path=str(args.model), n_ctx=2048, n_threads=4, verbose=False)
    print(json.dumps(generate(parts, model), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
