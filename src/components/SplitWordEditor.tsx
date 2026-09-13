// ============================================================
// conlang-dev / components/SplitWordEditor.tsx
// 単語エディタの左右分割ペイン
// ============================================================

import { useState } from "react";
import type { AppDB } from "../types";
import { searchWords } from "../store/db";
import { WordEditor } from "./WordEditor";

interface Props {
  db: AppDB;
  languageId: string;
  primaryWordId: string | null;   // 左ペイン（WordListからの選択）
  onChange: (db: AppDB) => void;
  onClose: () => void;            // 分割を閉じる
}

export function SplitWordEditor({
  db,
  languageId,
  primaryWordId,
  onChange,
  onClose,
}: Props) {
  const [secondaryWordId, setSecondaryWordId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const words = searchWords(db, languageId, query);

  const paneStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  };

  const dividerStyle: React.CSSProperties = {
    width: "1px",
    background: "var(--border)",
    flexShrink: 0,
    position: "relative",
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
      {/* 左ペイン（primaryWordId を表示） */}
      <div style={paneStyle}>
        <PaneHeader label="左ペイン" wordId={primaryWordId} db={db} />
        {primaryWordId ? (
          <WordEditor db={db} wordId={primaryWordId} onChange={onChange} />
        ) : (
          <EmptyPane label="単語リストから単語を選択してください" />
        )}
      </div>

      {/* 中央ディバイダー＋閉じるボタン */}
      <div style={dividerStyle}>
        <button
          onClick={onClose}
          title="分割を閉じる"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "99px",
            color: "var(--text-muted)",
            fontSize: "0.65rem",
            padding: "6px 4px",
            cursor: "pointer",
            writingMode: "vertical-rl",
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          ✕分割
        </button>
      </div>

      {/* 右ペイン（secondaryWordId を選択して表示） */}
      <div style={paneStyle}>
        <PaneHeader label="右ペイン" wordId={secondaryWordId} db={db} />

        {secondaryWordId ? (
          <>
            {/* 右ペイン：単語切り替えバー */}
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                padding: "var(--gap-xs) var(--gap-sm)",
                display: "flex",
                alignItems: "center",
                gap: "var(--gap-sm)",
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="別の単語に切り替え…"
                style={{ fontSize: "var(--text-xs)", maxWidth: "180px" }}
              />
              {query && (
                <div
                  style={{
                    position: "absolute",
                    top: "auto",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 10,
                    minWidth: "160px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    marginTop: "2px",
                  }}
                >
                  {words.slice(0, 12).map((w) => (
                    <div
                      key={w.id}
                      style={{
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "var(--text-sm)",
                        background:
                          w.id === secondaryWordId
                            ? "var(--bg-active)"
                            : "transparent",
                      }}
                      onClick={() => {
                        setSecondaryWordId(w.id);
                        setQuery("");
                      }}
                    >
                      {w.name}
                    </div>
                  ))}
                  {words.length === 0 && (
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                      }}
                    >
                      見つかりません
                    </div>
                  )}
                </div>
              )}
              <button
                className="btn-ghost"
                style={{ fontSize: "var(--text-xs)" }}
                onClick={() => setSecondaryWordId(null)}
              >
                クリア
              </button>
            </div>
            <WordEditor db={db} wordId={secondaryWordId} onChange={onChange} />
          </>
        ) : (
          <WordPickerPane
            db={db}
            languageId={languageId}
            onPick={setSecondaryWordId}
          />
        )}
      </div>
    </div>
  );
}

// ---------- ペインヘッダー ----------

function PaneHeader({
  label,
  wordId,
  db,
}: {
  label: string;
  wordId: string | null;
  db: AppDB;
}) {
  const word = wordId ? db.words.find((w) => w.id === wordId) : null;
  return (
    <div
      style={{
        height: "32px",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--gap-md)",
        gap: "var(--gap-sm)",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {label}
      </span>
      {word && (
        <>
          <span style={{ color: "var(--border)" }}>›</span>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            {word.name}
          </span>
        </>
      )}
    </div>
  );
}

// ---------- 右ペイン：単語選択UI ----------

function WordPickerPane({
  db,
  languageId,
  onPick,
}: {
  db: AppDB;
  languageId: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const words = searchWords(db, languageId, query);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "var(--gap-sm)", borderBottom: "1px solid var(--border)" }}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="比較する単語を検索…"
          style={{ fontSize: "var(--text-sm)" }}
        />
      </div>
      <div className="scrollable">
        {words.length === 0 && (
          <div className="empty-state">
            {query ? "見つかりません" : "単語がありません"}
          </div>
        )}
        {words.map((w) => {
          const means = db.means.filter((m) => m.wordId === w.id);
          return (
            <div
              key={w.id}
              onClick={() => onPick(w.id)}
              style={{
                padding: "var(--gap-sm) var(--gap-md)",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background =
                  "var(--bg-hover)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "transparent")
              }
            >
              <div style={{ fontWeight: 500, fontSize: "var(--text-sm)" }}>
                {w.name}
              </div>
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
          );
        })}
      </div>
    </div>
  );
}

// ---------- 空ペイン ----------

function EmptyPane({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <span>{label}</span>
    </div>
  );
}
