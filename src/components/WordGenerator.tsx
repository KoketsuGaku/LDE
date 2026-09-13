// ============================================================
// conlang-dev / components/WordGenerator.tsx
// 音節構造ベースの単語自動生成
// ============================================================

import { useState, useCallback } from "react";
import type { AppDB } from "../types";
import { createWord } from "../store/db";

interface Props {
  db: AppDB;
  languageId: string;
  onChange: (db: AppDB) => void;
}

interface GeneratorSettings {
  consonants: string;   // スペース区切り
  vowels: string;       // スペース区切り
  templates: string[];  // ["CV", "CVC", "CCV"] など
  minSyllables: number;
  maxSyllables: number;
  count: number;
  forbidden: string;    // スペース区切りの禁止音連続
}

const DEFAULT_SETTINGS: GeneratorSettings = {
  consonants: "p t k b d g m n s r l",
  vowels: "a i u e o",
  templates: ["CV", "CVC"],
  minSyllables: 2,
  maxSyllables: 3,
  count: 20,
  forbidden: "",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateWord(
  consonants: string[],
  vowels: string[],
  templates: string[],
  syllableCount: number,
  forbidden: string[]
): string | null {
  // 最大リトライ回数
  for (let attempt = 0; attempt < 50; attempt++) {
    let word = "";
    let ok = true;

    for (let s = 0; s < syllableCount; s++) {
      const template = pickRandom(templates);
      let syllable = "";
      for (const ch of template) {
        if (ch === "C") syllable += pickRandom(consonants);
        else if (ch === "V") syllable += pickRandom(vowels);
        else syllable += ch;
      }
      word += syllable;
    }

    // 禁止音チェック
    for (const f of forbidden) {
      if (word.includes(f)) { ok = false; break; }
    }
    if (ok) return word;
  }
  return null; // 生成失敗
}

export function WordGenerator({ db, languageId, onChange }: Props) {
  const [settings, setSettings] = useState<GeneratorSettings>(DEFAULT_SETTINGS);
  const [templateInput, setTemplateInput] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addStatus, setAddStatus] = useState<string>("");

  const lang = db.languages.find((l) => l.id === languageId);

  // 設定を部分更新
  function set<K extends keyof GeneratorSettings>(key: K, val: GeneratorSettings[K]) {
    setSettings((s) => ({ ...s, [key]: val }));
  }

  // 音節テンプレート追加
  function addTemplate() {
    const t = templateInput.trim().toUpperCase().replace(/[^CV]/g, "");
    if (!t || settings.templates.includes(t)) { setTemplateInput(""); return; }
    set("templates", [...settings.templates, t]);
    setTemplateInput("");
  }

  function removeTemplate(t: string) {
    set("templates", settings.templates.filter((x) => x !== t));
  }

  // 生成実行
  const handleGenerate = useCallback(() => {
    const consonants = settings.consonants.trim().split(/\s+/).filter(Boolean);
    const vowels = settings.vowels.trim().split(/\s+/).filter(Boolean);
    const forbidden = settings.forbidden.trim().split(/\s+/).filter(Boolean);

    if (consonants.length === 0 || vowels.length === 0 || settings.templates.length === 0) {
      alert("子音・母音・音節テンプレートを設定してください");
      return;
    }

    const results: string[] = [];
    const seen = new Set<string>();
    const minS = Math.max(1, settings.minSyllables);
    const maxS = Math.max(minS, settings.maxSyllables);

    let attempts = 0;
    while (results.length < settings.count && attempts < settings.count * 30) {
      attempts++;
      const syllableCount = minS + Math.floor(Math.random() * (maxS - minS + 1));
      const word = generateWord(consonants, vowels, settings.templates, syllableCount, forbidden);
      if (word && !seen.has(word)) {
        seen.add(word);
        results.push(word);
      }
    }

    setGenerated(results);
    setSelected(new Set());
    setAddStatus("");
  }, [settings]);

  // 選択トグル
  function toggleSelect(word: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(generated)); }
  function deselectAll() { setSelected(new Set()); }

  // 選択した単語を辞書に追加
  function handleAddToDict() {
    if (selected.size === 0) return;
    let current = db;
    const existing = new Set(current.words.filter((w) => w.languageId === languageId).map((w) => w.name));
    let added = 0;
    let skipped = 0;

    for (const word of selected) {
      if (existing.has(word)) { skipped++; continue; }
      const { db: next } = createWord(current, { name: word, languageId });
      current = next;
      added++;
    }

    onChange(current);
    setAddStatus(`${added} 語を追加しました${skipped > 0 ? `（${skipped} 語は重複のためスキップ）` : ""}`);
    // 追加済みを生成リストから除去
    setGenerated((g) => g.filter((w) => !selected.has(w)));
    setSelected(new Set());
  }

  // --- スタイル定数 ---
  const col2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-md)" };
  const sectionTitle = { fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600, marginBottom: "var(--gap-xs)" };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", minWidth: 0 }}>

      {/* 左：設定パネル */}
      <div style={{
        width: "320px", flexShrink: 0, borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", background: "var(--bg-panel)", overflow: "hidden",
      }}>
        <div style={{ padding: "var(--gap-sm) var(--gap-md)", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>単語生成 — {lang?.name}</span>
        </div>

        <div className="scrollable" style={{ padding: "var(--gap-md)", display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>

          {/* 子音 */}
          <div>
            <p style={sectionTitle}>子音 C（スペース区切り）</p>
            <textarea
              value={settings.consonants}
              onChange={(e) => set("consonants", e.target.value)}
              style={{ minHeight: "60px", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
              placeholder="p t k b d g m n s r l"
            />
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "4px" }}>
              {settings.consonants.trim().split(/\s+/).filter(Boolean).length} 個
            </p>
          </div>

          {/* 母音 */}
          <div>
            <p style={sectionTitle}>母音 V（スペース区切り）</p>
            <textarea
              value={settings.vowels}
              onChange={(e) => set("vowels", e.target.value)}
              style={{ minHeight: "48px", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
              placeholder="a i u e o"
            />
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "4px" }}>
              {settings.vowels.trim().split(/\s+/).filter(Boolean).length} 個
            </p>
          </div>

          {/* 音節テンプレート */}
          <div>
            <p style={sectionTitle}>音節構造テンプレート</p>
            <div style={{ display: "flex", gap: "var(--gap-xs)", marginBottom: "var(--gap-xs)" }}>
              <input
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value.toUpperCase().replace(/[^CVcv]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && addTemplate()}
                placeholder="例: CV CVC CCVC"
                style={{ flex: 1, fontFamily: "var(--font-mono)" }}
                maxLength={8}
              />
              <button className="btn-ghost" onClick={addTemplate}>追加</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-xs)" }}>
              {settings.templates.length === 0 && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>テンプレートなし</span>
              )}
              {settings.templates.map((t) => (
                <span key={t} className="badge" style={{ cursor: "pointer", fontFamily: "var(--font-mono)" }} onClick={() => removeTemplate(t)}>
                  {t} ✕
                </span>
              ))}
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--gap-xs)" }}>
              C=子音、V=母音。クリックで削除。
            </p>
          </div>

          {/* 音節数・生成数 */}
          <div style={col2}>
            <div>
              <p style={sectionTitle}>最小音節数</p>
              <input type="number" min={1} max={10}
                value={settings.minSyllables}
                onChange={(e) => set("minSyllables", Math.max(1, parseInt(e.target.value) || 1))}
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div>
              <p style={sectionTitle}>最大音節数</p>
              <input type="number" min={1} max={10}
                value={settings.maxSyllables}
                onChange={(e) => set("maxSyllables", Math.max(1, parseInt(e.target.value) || 1))}
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          <div>
            <p style={sectionTitle}>生成数</p>
            <input type="number" min={1} max={500}
              value={settings.count}
              onChange={(e) => set("count", Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>

          {/* 禁止音連続 */}
          <div>
            <p style={sectionTitle}>禁止音連続（スペース区切り）</p>
            <input
              value={settings.forbidden}
              onChange={(e) => set("forbidden", e.target.value)}
              placeholder="例: ks mb ng"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
            />
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "4px" }}>
              単語中にこの音の連続を含む場合は除外されます
            </p>
          </div>

        </div>

        {/* 生成ボタン */}
        <div style={{ padding: "var(--gap-md)", borderTop: "1px solid var(--border)" }}>
          <button className="btn-primary" onClick={handleGenerate} style={{ width: "100%", padding: "10px" }}>
            ▶ 生成
          </button>
        </div>
      </div>

      {/* 右：生成結果 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* 結果ヘッダー */}
        <div style={{
          padding: "var(--gap-sm) var(--gap-md)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: "var(--gap-sm)", flexShrink: 0,
        }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            生成結果 {generated.length > 0 ? `（${generated.length} 語）` : ""}
          </span>
          {generated.length > 0 && (
            <>
              <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={selectAll}>すべて選択</button>
              <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={deselectAll}>選択解除</button>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{selected.size} 語選択中</span>
              <button
                className="btn-primary"
                style={{ fontSize: "var(--text-xs)", marginLeft: "auto" }}
                onClick={handleAddToDict}
                disabled={selected.size === 0}
              >
                ＋ 辞書に追加（{selected.size}）
              </button>
            </>
          )}
        </div>

        {/* ステータス */}
        {addStatus && (
          <div style={{ padding: "var(--gap-xs) var(--gap-md)", background: "var(--accent-dim)", fontSize: "var(--text-xs)", color: "var(--accent)" }}>
            {addStatus}
          </div>
        )}

        {/* 単語グリッド */}
        <div className="scrollable" style={{ padding: "var(--gap-md)" }}>
          {generated.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: "var(--text-xl)" }}>✦</span>
              <span>左のパネルで設定して「生成」を押してください</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                生成された単語をクリックして選択し、辞書に追加できます
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-xs)", alignContent: "flex-start" }}>
              {generated.map((word) => {
                const isSelected = selected.has(word);
                return (
                  <span
                    key={word}
                    onClick={() => toggleSelect(word)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      padding: "5px 12px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      background: isSelected ? "var(--accent)" : "var(--bg-card)",
                      color: isSelected ? "#fff" : "var(--text-primary)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      userSelect: "none",
                      transition: "background 0.1s, color 0.1s",
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
