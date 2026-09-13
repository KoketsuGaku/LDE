// ============================================================
// conlang-dev / components/MeanEditor.tsx
// 意味の追加・編集フォーム
// ============================================================

import { useState } from "react";
import type { Mean, AppDB } from "../types";

interface Props {
  mean: Mean;
  db: AppDB;
  onSave: (patch: Partial<Omit<Mean, "id" | "wordId" | "date">>) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function MeanEditor({ mean, db, onSave, onDelete, onCancel }: Props) {
  const [translate, setTranslate] = useState(mean.translate);
  const [cls, setCls] = useState(mean.class);
  const [description, setDescription] = useState(mean.description ?? "");

  // 関連語
  const [relKey, setRelKey] = useState("");
  const [relWordId, setRelWordId] = useState("");
  const [relatedTerms, setRelatedTerms] = useState<Record<string, string>>(
    mean.relatedTerms ?? {}
  );

  // 例文
  const [exOrig, setExOrig] = useState("");
  const [exTrans, setExTrans] = useState("");
  const [examples, setExamples] = useState(mean.examples ?? []);

  // 活用形
  const [conjKey, setConjKey] = useState("");
  const [conjVal, setConjVal] = useState("");
  const [conjugatedForms, setConjugatedForms] = useState<Record<string, string>>(
    mean.conjugatedForms ?? {}
  );

  function handleSave() {
    if (!translate.trim() || !cls.trim()) return;
    onSave({
      translate: translate.trim(),
      class: cls.trim(),
      description: description.trim() || undefined,
      relatedTerms: Object.keys(relatedTerms).length > 0 ? relatedTerms : undefined,
      examples: examples.length > 0 ? examples : undefined,
      conjugatedForms: Object.keys(conjugatedForms).length > 0 ? conjugatedForms : undefined,
    });
  }

  function addRelated() {
    if (!relKey.trim() || !relWordId.trim()) return;
    setRelatedTerms((r) => ({ ...r, [relKey.trim()]: relWordId.trim() }));
    setRelKey("");
    setRelWordId("");
  }

  function removeRelated(key: string) {
    setRelatedTerms((r) => {
      const next = { ...r };
      delete next[key];
      return next;
    });
  }

  function addExample() {
    if (!exOrig.trim()) return;
    setExamples((ex) => [
      ...ex,
      { original: exOrig.trim(), translation: exTrans.trim() },
    ]);
    setExOrig("");
    setExTrans("");
  }

  function removeExample(i: number) {
    setExamples((ex) => ex.filter((_, idx) => idx !== i));
  }

  function addConj() {
    if (!conjKey.trim() || !conjVal.trim()) return;
    setConjugatedForms((c) => ({ ...c, [conjKey.trim()]: conjVal.trim() }));
    setConjKey("");
    setConjVal("");
  }

  function removeConj(key: string) {
    setConjugatedForms((c) => {
      const next = { ...c };
      delete next[key];
      return next;
    });
  }

  const s = {
    row: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--gap-sm)",
    } as React.CSSProperties,
    tagRow: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "var(--gap-xs)",
      marginTop: "var(--gap-xs)",
    },
    tag: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      background: "var(--bg-hover)",
      borderRadius: "var(--radius-sm)",
      padding: "2px 8px",
      fontSize: "var(--text-xs)",
    },
    tagDel: {
      cursor: "pointer",
      color: "var(--danger)",
      background: "none",
      border: "none",
      padding: 0,
      lineHeight: 1,
    } as React.CSSProperties,
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--gap-md)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--gap-md)",
      }}
    >
      {/* 基本情報 */}
      <div style={s.row}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>訳語 *</label>
          <input
            autoFocus
            value={translate}
            onChange={(e) => setTranslate(e.target.value)}
            placeholder="例：空、青い、走る"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>品詞 *</label>
          <input
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            placeholder="例：名詞、動詞、形容詞"
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>説明・注記</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ニュアンス、使用文脈、補足など"
          style={{ minHeight: "60px" }}
        />
      </div>

      {/* 活用形 */}
      <div>
        <p className="section-label">活用形</p>
        <div style={s.row}>
          <input
            value={conjKey}
            onChange={(e) => setConjKey(e.target.value)}
            placeholder="例：過去形、複数形"
          />
          <input
            value={conjVal}
            onChange={(e) => setConjVal(e.target.value)}
            placeholder="語形"
            onKeyDown={(e) => e.key === "Enter" && addConj()}
          />
        </div>
        <button
          className="btn-ghost"
          onClick={addConj}
          style={{ marginTop: "var(--gap-xs)", fontSize: "var(--text-xs)" }}
        >
          ＋ 追加
        </button>
        {Object.keys(conjugatedForms).length > 0 && (
          <div style={s.tagRow}>
            {Object.entries(conjugatedForms).map(([k, v]) => (
              <span key={k} style={s.tag}>
                <span style={{ color: "var(--text-secondary)" }}>{k}：</span>
                {v}
                <button style={s.tagDel} onClick={() => removeConj(k)}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 関連語 */}
      <div>
        <p className="section-label">関連語</p>
        <div style={s.row}>
          <input
            value={relKey}
            onChange={(e) => setRelKey(e.target.value)}
            placeholder="関係（例：類義語、対義語）"
          />
          <select
            value={relWordId}
            onChange={(e) => setRelWordId(e.target.value)}
            style={{ background: "var(--bg-card)" }}
          >
            <option value="">単語を選択…</option>
            {db.words.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn-ghost"
          onClick={addRelated}
          style={{ marginTop: "var(--gap-xs)", fontSize: "var(--text-xs)" }}
        >
          ＋ 追加
        </button>
        {Object.keys(relatedTerms).length > 0 && (
          <div style={s.tagRow}>
            {Object.entries(relatedTerms).map(([k, wid]) => {
              const w = db.words.find((x) => x.id === wid);
              return (
                <span key={k} style={s.tag}>
                  <span style={{ color: "var(--text-secondary)" }}>{k}：</span>
                  {w ? w.name : <span style={{ color: "var(--danger)" }}>不明</span>}
                  <button style={s.tagDel} onClick={() => removeRelated(k)}>✕</button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 例文 */}
      <div>
        <p className="section-label">例文</p>
        <div style={s.row}>
          <input
            value={exOrig}
            onChange={(e) => setExOrig(e.target.value)}
            placeholder="原文（自作言語）"
          />
          <input
            value={exTrans}
            onChange={(e) => setExTrans(e.target.value)}
            placeholder="翻訳"
            onKeyDown={(e) => e.key === "Enter" && addExample()}
          />
        </div>
        <button
          className="btn-ghost"
          onClick={addExample}
          style={{ marginTop: "var(--gap-xs)", fontSize: "var(--text-xs)" }}
        >
          ＋ 追加
        </button>
        {examples.map((ex, i) => (
          <div
            key={i}
            style={{
              marginTop: "var(--gap-xs)",
              background: "var(--bg-base)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--gap-sm)",
            }}
          >
            <div style={{ fontSize: "var(--text-xs)", flex: 1 }}>
              <div>{ex.original}</div>
              <div style={{ color: "var(--text-muted)" }}>{ex.translation}</div>
            </div>
            <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => removeExample(i)}>✕</button>
          </div>
        ))}
      </div>

      {/* 操作 */}
      <div style={{ display: "flex", gap: "var(--gap-sm)", marginTop: "var(--gap-xs)" }}>
        <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
          保存
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          キャンセル
        </button>
        <button className="btn-danger" onClick={onDelete}>
          削除
        </button>
      </div>
    </div>
  );
}
