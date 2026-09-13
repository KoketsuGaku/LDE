// ============================================================
// conlang-dev / components/Pane.tsx
// ============================================================

import { useState } from "react";
import type { AppDB } from "../types";
import { WordList } from "./WordList";
import { WordEditor } from "./WordEditor";
import { GrammarPanel } from "./GrammarPanel";
import { WordGenerator } from "./WordGenerator";
import { createWord } from "../store/db";

type PaneMode = "dict" | "grammar" | "generator";

interface Props {
  db: AppDB;
  onChange: (db: AppDB) => void;
  initialLangId: string | null;
  initialMode?: PaneMode;
  label: string;
  showClose?: boolean;
  onClose?: () => void;
  isMobile: boolean;
}

export function Pane({ db, onChange, initialLangId, initialMode = "dict", label, showClose, onClose, isMobile }: Props) {
  const [langId, setLangId] = useState<string | null>(initialLangId);
  const [mode, setMode] = useState<PaneMode>(initialMode);
  const [wordId, setWordId] = useState<string | null>(null);

  function handleLangChange(id: string) {
    setLangId(id || null);
    setWordId(null);
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text-secondary)",
    border: "none", padding: "2px 8px", fontSize: "10px", cursor: "pointer",
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

      {/* ペインヘッダー（PCのみ） */}
      {!isMobile && (
        <div style={{
          height: "32px", background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "0 var(--gap-sm)", gap: "var(--gap-sm)", flexShrink: 0,
        }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
          <select value={langId ?? ""} onChange={(e) => handleLangChange(e.target.value)}
            style={{ fontSize: "var(--text-xs)", flex: 1, minWidth: 0, background: "var(--bg-base)" }}>
            <option value="">言語を選択…</option>
            {db.languages.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {langId && (
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0 }}>
              <button onClick={() => setMode("dict")} style={btnStyle(mode === "dict")}>辞書</button>
              <button onClick={() => setMode("grammar")} style={btnStyle(mode === "grammar")}>文法</button>
              <button onClick={() => setMode("generator")} style={btnStyle(mode === "generator")}>生成</button>
            </div>
          )}
          {showClose && (
            <button className="btn-icon" style={{ fontSize: "0.7rem", flexShrink: 0 }} onClick={onClose} title="このペインを閉じる">✕</button>
          )}
        </div>
      )}

      {/* コンテンツ */}
      {!langId ? (
        <div className="empty-state">
          <span>言語を選択してください</span>
        </div>
      ) : mode === "dict" ? (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0, flexDirection: isMobile ? "column" : "row" }}>
          {/* モバイル: WordListを上部に小さく表示、WordEditorを大きく */}
          {isMobile ? (
            <>
              <div style={{ height: "48px", flexShrink: 0, overflowX: "auto", overflowY: "hidden", display: "flex", alignItems: "stretch", borderBottom: "1px solid var(--border)", background: "var(--bg-panel)" }}>
                <MobileWordTabs db={db} languageId={langId} selectedWordId={wordId} onSelectWord={(id) => setWordId(id || null)} onChange={onChange} />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                {wordId
                  ? <WordEditor db={db} wordId={wordId} onChange={onChange} />
                  : <div className="empty-state"><span>上のタブから単語を選ぶか、＋で追加</span></div>
                }
              </div>
            </>
          ) : (
            <>
              <WordList db={db} languageId={langId} selectedWordId={wordId} onSelectWord={(id) => setWordId(id || null)} onChange={onChange} />
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {wordId
                  ? <WordEditor db={db} wordId={wordId} onChange={onChange} />
                  : <div className="empty-state"><span>単語を選択してください</span></div>
                }
              </div>
            </>
          )}
        </div>
      ) : mode === "grammar" ? (
        <GrammarPanel db={db} languageId={langId} onChange={onChange} />
      ) : (
        <WordGenerator db={db} languageId={langId} onChange={onChange} />
      )}
    </div>
  );
}

// モバイル用：単語を横スクロールタブで選択
function MobileWordTabs({ db, languageId, selectedWordId, onSelectWord, onChange }: {
  db: AppDB; languageId: string; selectedWordId: string | null;
  onSelectWord: (id: string) => void; onChange: (db: AppDB) => void;
}) {
  const words = db.words.filter((w) => w.languageId === languageId);

  function handleAdd() {
    const name = prompt("語形を入力");
    if (!name?.trim()) return;
    const { db: next, word } = createWord(db, { name: name.trim(), languageId });
    onChange(next);
    onSelectWord(word.id);
  }

  return (
    <div style={{ display: "flex", alignItems: "stretch", minWidth: 0 }}>
      <button onClick={handleAdd} style={{
        flexShrink: 0, padding: "0 12px", background: "var(--accent-dim)", color: "var(--accent)",
        border: "none", borderRight: "1px solid var(--border)", cursor: "pointer", fontSize: "18px",
      }}>＋</button>
      <div style={{ display: "flex", overflowX: "auto", alignItems: "stretch" }}>
        {words.length === 0 && (
          <span style={{ padding: "0 var(--gap-md)", color: "var(--text-muted)", fontSize: "var(--text-xs)", display: "flex", alignItems: "center" }}>
            単語がありません
          </span>
        )}
        {words.map((w) => {
          const active = w.id === selectedWordId;
          return (
            <button key={w.id} onClick={() => onSelectWord(w.id)} style={{
              flexShrink: 0, padding: "0 14px", border: "none", cursor: "pointer", whiteSpace: "nowrap",
              background: active ? "var(--bg-active)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: active ? 600 : 400, fontSize: "var(--text-sm)",
            }}>{w.name}</button>
          );
        })}
      </div>
    </div>
  );
}
