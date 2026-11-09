"""Compare production lexical retrieval with a pipeline-scoped MiniLM fallback."""
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from time import perf_counter

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

ROOT = Path(__file__).resolve().parents[1]
MODEL = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".bench/model"
# Fixed before evaluating the fresh split. Route technical lookups through production.
MIN_COSINE = 0.40
MIN_MARGIN = 0.08
IDENTIFIER = re.compile(r"\d|\w[_.-]\w")


def encoder():
    tokenizer = Tokenizer.from_file(str(MODEL / "tokenizer.json"))
    tokenizer.enable_truncation(max_length=256)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(MODEL / "model.onnx"), options,
                                   providers=["CPUExecutionProvider"])

    def encode(text):
        tokens = tokenizer.encode(text)
        inputs = {"input_ids": tokens.ids, "attention_mask": tokens.attention_mask,
                  "token_type_ids": tokens.type_ids}
        tensors = {i.name: np.array([inputs[i.name]], dtype=np.int64)
                   for i in session.get_inputs()}
        hidden = session.run(None, tensors)[0][0]
        pooled = np.average(hidden, axis=0, weights=tokens.attention_mask)
        return pooled / np.linalg.norm(pooled)

    return encode


def main():
    bundle = json.loads(subprocess.check_output(["node", "eval/benchmark-input.mjs"], cwd=ROOT))
    encode = encoder()
    index = {}
    for doc in bundle["docs"]:
        scoped = index.setdefault(doc["app"], [])
        for i, section in enumerate(doc["sections"]):
            vector = encode(section["title"] + ". " + section["body"])
            scoped.append(({"doc": doc["id"], "section": i}, vector))

    counts = Counter()
    durations = []
    for row in bundle["questions"]:
        lexical = row["lexical"]
        hybrid = lexical
        if lexical is None and not row["requiredFact"] and not IDENTIFIER.search(row["question"]):
            start = perf_counter()
            query = encode(row["question"])
            ranked = sorted(((float(query @ vector), ref) for ref, vector in index[row["app"]]),
                            key=lambda item: item[0], reverse=True)
            if len(ranked) >= 2 and ranked[0][0] >= MIN_COSINE and ranked[0][0] - ranked[1][0] >= MIN_MARGIN:
                hybrid = ranked[0][1]
            durations.append(1000 * (perf_counter() - start))
        for name, result in [("lexical", lexical), ("hybrid", hybrid)]:
            if result == row["expected"]:
                outcome = "correct"
            elif result is None:
                outcome = "miss"
            else:
                outcome = "wrong citation"
            counts[row["split"], name, outcome] += 1
        if lexical != hybrid:
            print(f'{row["split"]} | {row["question"]} | fallback {hybrid} | expected {row["expected"]}')
    for split in dict.fromkeys(row["split"] for row in bundle["questions"]):
        for name in ["lexical", "hybrid"]:
            print(split, name, {k: counts[split, name, k] for k in ("correct", "miss", "wrong citation")})
    if durations:
        print(f'Fallback calls {len(durations)}, local warm median {np.median(durations):.1f} ms, '
              f'p95 {np.percentile(durations, 95):.1f} ms')


if __name__ == "__main__":
    main()
