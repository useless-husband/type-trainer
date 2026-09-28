#!/usr/bin/env python3
"""由 tools/zh-sentences.txt 產生 src/data/sentences-zh.js（中文句子＋注音）。

用法（pypinyin 只在開發時使用，網頁本身不依賴它）：
    uv run --with pypinyin tools/build-zh.py
    # 或 pip install pypinyin 之後 python3 tools/build-zh.py

輸出的注音是「本調」：不做「一、不」的變調，也不做三聲連讀變調，
因為打字時輸入法收的是字典上的調號。台灣讀音與 pypinyin 預設不同的字，
在 OVERRIDES / PHRASES 裡修正。產生後請人工抽查。
"""
import re
import sys
from pathlib import Path

from pypinyin import Style, lazy_pinyin

ROOT = Path(__file__).resolve().parent.parent
HAN = re.compile(r"[一-鿿]")

# 字級修正：一、不 一律標本調；「著」在這些句子都是助詞 ㄓㄜ˙
OVERRIDES = {"一": "ㄧ", "不": "ㄅㄨˋ", "著": "ㄓㄜ˙"}
# 詞級修正：pypinyin 預設偏向大陸讀法，這裡改成台灣教育部辭典的讀音。
PHRASES = {
    "睡覺": "ㄕㄨㄟˋ ㄐㄧㄠˋ",
    "音樂": "ㄧㄣ ㄩㄝˋ",
    "記得": "ㄐㄧˋ ㄉㄜ˙",
    "過得": "ㄍㄨㄛˋ ㄉㄜ˙",
    "學得": "ㄒㄩㄝˊ ㄉㄜ˙",
    "便宜": "ㄆㄧㄢˊ ㄧˊ",
    "學期": "ㄒㄩㄝˊ ㄑㄧˊ",
    "期末": "ㄑㄧˊ ㄇㄛˋ",
    "媽媽": "ㄇㄚ ㄇㄚ˙",
    "爸爸": "ㄅㄚˋ ㄅㄚ˙",
    "妹妹": "ㄇㄟˋ ㄇㄟ˙",
    "奶奶": "ㄋㄞˇ ㄋㄞ˙",
    "姐姐": "ㄐㄧㄝˇ ㄐㄧㄝ˙",
    "寶寶": "ㄅㄠˇ ㄅㄠ˙",
    "謝謝": "ㄒㄧㄝˋ ㄒㄧㄝ˙",
    "意思": "ㄧˋ ㄙ˙",
}


def zhuyin_of(text: str) -> list[str]:
    han = [c for c in text if HAN.match(c)]
    out = lazy_pinyin(text, style=Style.BOPOMOFO, errors=lambda s: [""] * len(s))
    syl = [s for s in out if s]
    if len(syl) != len(han):
        raise SystemExit(f"音節數不符：{text} {len(syl)} != {len(han)}")
    res = []
    for ch, s in zip(han, syl):
        s = OVERRIDES.get(ch, s)
        res.append(s)
    # 詞級修正（在只含漢字的序列上比對）
    joined = "".join(han)
    for word, zy in PHRASES.items():
        start = joined.find(word)
        while start != -1:
            res[start : start + len(word)] = zy.split(" ")
            start = joined.find(word, start + len(word))
    return res


def main() -> None:
    rows = []
    seen = set()
    for line in (ROOT / "tools" / "zh-sentences.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        cat, text = line.split("|", 1)
        if text in seen:
            raise SystemExit(f"重複：{text}")
        seen.add(text)
        rows.append((cat, text, zhuyin_of(text)))
    lines = [
        "// 由 tools/build-zh.py 產生，請勿手動編輯（改 tools/zh-sentences.txt 後重跑）。",
        "// 每句：t 原文、z 注音（以空白分隔，只含漢字，標點不算）、c 主題。",
        "// 注音為本調，不做「一、不」及三聲連讀變調。",
        "export const SENTENCES_ZH = [",
    ]
    for cat, text, syl in rows:
        lines.append(f'  {{ t: "{text}", z: "{" ".join(syl)}", c: "{cat}" }},')
    lines.append("];")
    (ROOT / "src" / "data" / "sentences-zh.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"寫入 {len(rows)} 句", file=sys.stderr)


if __name__ == "__main__":
    main()
