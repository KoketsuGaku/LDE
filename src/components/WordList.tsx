// ============================================================
// conlang-dev / components/WordList.tsx
// 単語一覧・検索・追加
// ============================================================

import { useState } from "react";
import type { AppDB, Word } from "../types";
import { createWord, deleteWord, searchWords } from "../store/db";

interface Props {
  db: AppDB;
  languageId: string;
  selectedWordId: string | null;
  onSelectWord: (id: string) => void;
  onChange: (db: AppDB) => void;
}

export function WordList({ db, languageId, selectedWordId, onSelectWord, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPron, setNewPron] = useState("");

  const words = searchWords(db, languageId, query);

  function handleAdd() {
    if (!newName.trim()) return;
    const { db: next, word } = createWord(db, {
      name: newName.trim(),
      languageId,
      pronunciations: newPron.trim() ? [newPron.trim()] : undefined,
    });
    onChange(next);
    onSelectWord(word.id);
    setNewName("");
    setNewPron("");
    setAdding(false);
  }

  function handleDelete(word: Word, e: React.MouseEvent) {
    e.stopPropagation();
    const meanCount = db.means.filter((m) => m.wordId === word.id).length;
    const msg =
      meanCount > 0
        ? `「${word.name}」を削除すると、登録済みの意味 ${meanCount} 件も削除されます。よろしいですか？`
        : `「${word.name}」を削除しますか？`;
    if (!confirm(msg)) return;
    onChange(deleteWord(db, word.id));
    if (selectedWordId === word.id) onSelectWord("");
  }

  return (
    <div
      style={{
        width: "220px",
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-panel)",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: "var(--gap-sm) var(--gap-md)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>単語</span>
        <button className="btn-icon" title="単語を追加" onClick={() => setAdding(true)}>
          ＋
        </button>
      </div>

      {/* 検索 */}
      <div style={{ padding: "var(--gap-sm)", borderBottom: "1px solid var(--border)" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="語形・訳語で検索…"
          style={{ fontSize: "var(--text-xs)" }}
        />
      </div>

      {/* 追加フォーム */}
      {adding && (
        <div
          style={{
            padding: "var(--gap-sm)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap-xs)",
          }}
        >
          <input
            autoFocus
            placeholder="語形 *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <input
            placeholder="発音（省略可）"
            value={newPron}
            onChange={(e) => setNewPron(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <div style={{ display: "flex", gap: "var(--gap-xs)" }}>
            <button className="btn-primary" onClick={handleAdd} style={{ flex: 1, fontSize: "var(--text-xs)" }}>
              追加
            </button>
            <button className="btn-ghost" onClick={() => setAdding(false)} style={{ flex: 1, fontSize: "var(--text-xs)" }}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 単語リスト */}
      <div className="scrollable">
        {words.length === 0 && (
          <div className="empty-state" style={{ padding: "var(--gap-lg)" }}>
            {query ? "見つかりません" : "単語がありません"}
          </div>
        )}
        {words.map((word) => {
          const means = db.means.filter((m) => m.wordId === word.id);
          const isSelected = word.id === selectedWordId;

          return (
            <div
              key={word.id}
              onClick={() => onSelectWord(word.id)}
              style={{
                padding: "var(--gap-sm) var(--gap-md)",
                cursor: "pointer",
                background: isSelected ? "var(--bg-active)" : "transparent",
                borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "var(--gap-sm)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: "var(--text-sm)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {word.name}
                </div>
                {word.pronunciations?.[0] && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    /{word.pronunciations[0]}/
                  </div>
                )}
                {means.length > 0 && (
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {means.map((m) => m.translate).join("、")}
                  </div>
                )}
              </div>

              {isSelected && (
                <button
                  className="btn-icon"
                  style={{ color: "var(--danger)", flexShrink: 0 }}
                  title="削除"
                  onClick={(e) => handleDelete(word, e)}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div
        style={{
          padding: "var(--gap-xs) var(--gap-md)",
          borderTop: "1px solid var(--border)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        {words.length} / {db.words.filter((w) => w.languageId === languageId).length} 語
      </div>
    </div>
  );
}
