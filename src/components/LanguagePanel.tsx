// ============================================================
// conlang-dev / components/LanguagePanel.tsx
// 左サイドバー：言語系統ツリー・作成・選択
// ============================================================

import { useState } from "react";
import type { AppDB, Language } from "../types";
import {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  buildLangTree,
  flattenLangTree,
} from "../store/db";

interface Props {
  db: AppDB;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (db: AppDB) => void;
}

// 言語追加・編集フォームの状態
interface FormState {
  name: string;
  description: string;
  parentId: string;
}

const EMPTY_FORM: FormState = { name: "", description: "", parentId: "" };

export function LanguagePanel({ db, selectedId, onSelect, onChange }: Props) {
  const [mode, setMode] = useState<
    | { type: "idle" }
    | { type: "adding" }
    | { type: "editing"; id: string }
  >({ type: "idle" });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ---------- 系統ツリーをフラットに展開 ----------
  const tree = buildLangTree(db.languages);
  const flat = flattenLangTree(tree);

  // ---------- 追加モード開始 ----------
  function startAdd(defaultParentId = "") {
    setForm({ ...EMPTY_FORM, parentId: defaultParentId });
    setMode({ type: "adding" });
  }

  // ---------- 編集モード開始 ----------
  function startEdit(lang: Language) {
    setForm({
      name: lang.name,
      description: lang.description ?? "",
      parentId: lang.parentId ?? "",
    });
    setMode({ type: "editing", id: lang.id });
  }

  // ---------- 追加確定 ----------
  function handleAdd() {
    if (!form.name.trim()) return;
    const { db: next, language } = createLanguage(db, {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      parentId: form.parentId || undefined,
    });
    onChange(next);
    onSelect(language.id);
    setMode({ type: "idle" });
  }

  // ---------- 編集確定 ----------
  function handleEdit() {
    if (mode.type !== "editing" || !form.name.trim()) return;
    // 自分自身を parentId にしようとしていたら無視
    const safeParentId = form.parentId === mode.id ? "" : form.parentId;
    onChange(
      updateLanguage(db, mode.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        parentId: safeParentId || undefined,
      })
    );
    setMode({ type: "idle" });
  }

  // ---------- 削除 ----------
  function handleDelete(id: string) {
    const lang = db.languages.find((l) => l.id === id);
    if (!lang) return;
    const wordCount = db.words.filter((w) => w.languageId === id).length;
    const childCount = db.languages.filter((l) => l.parentId === id).length;
    const lines = [
      `「${lang.name}」を削除しますか？`,
      wordCount > 0 ? `・登録済みの単語 ${wordCount} 件も削除されます` : "",
      childCount > 0 ? `・子言語 ${childCount} 件の親参照が解除されます` : "",
    ]
      .filter(Boolean)
      .join("\n");
    if (!confirm(lines)) return;

    // 子言語の parentId を解除してから削除
    let next = db;
    db.languages
      .filter((l) => l.parentId === id)
      .forEach((l) => {
        next = updateLanguage(next, l.id, { parentId: undefined });
      });
    next = deleteLanguage(next, id);
    onChange(next);
    if (selectedId === id) onSelect("");
  }

  // ---------- フォーム UI ----------
  const isFormOpen = mode.type === "adding" || mode.type === "editing";
  const formTitle = mode.type === "adding" ? "言語を追加" : "言語を編集";

  // 親候補（自分自身は除く）
  const parentCandidates = db.languages.filter(
    (l) => mode.type !== "editing" || l.id !== mode.id
  );

  return (
    <aside
      style={{
        width: "var(--panel-width)",
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
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
        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>言語系統</span>
        <button
          className="btn-icon"
          title="言語を追加"
          onClick={() => startAdd()}
        >
          ＋
        </button>
      </div>

      {/* 追加・編集フォーム */}
      {isFormOpen && (
        <div
          style={{
            padding: "var(--gap-md)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap-sm)",
            background: "var(--bg-card)",
          }}
        >
          <p className="section-label" style={{ marginBottom: 0 }}>
            {formTitle}
          </p>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>言語名 *</label>
            <input
              autoFocus
              placeholder="例：共通祖語、現代語A"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  mode.type === "adding" ? handleAdd() : handleEdit();
                if (e.key === "Escape") setMode({ type: "idle" });
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>説明</label>
            <input
              placeholder="省略可"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>親言語（祖語）</label>
            <select
              value={form.parentId}
              onChange={(e) =>
                setForm((f) => ({ ...f, parentId: e.target.value }))
              }
              style={{ background: "var(--bg-base)" }}
            >
              <option value="">なし（ルート）</option>
              {parentCandidates.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "var(--gap-sm)" }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: "var(--text-xs)" }}
              onClick={mode.type === "adding" ? handleAdd : handleEdit}
            >
              {mode.type === "adding" ? "作成" : "保存"}
            </button>
            <button
              className="btn-ghost"
              style={{ flex: 1, fontSize: "var(--text-xs)" }}
              onClick={() => setMode({ type: "idle" })}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 系統ツリーリスト */}
      <div className="scrollable" style={{ padding: "var(--gap-xs) 0" }}>
        {flat.length === 0 && (
          <p
            style={{
              padding: "var(--gap-md)",
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
              textAlign: "center",
            }}
          >
            言語がありません
          </p>
        )}

        {flat.map(({ language: lang, depth, children }) => {
          const isSelected = lang.id === selectedId;
          const wordCount = db.words.filter((w) => w.languageId === lang.id).length;
          const hasChildren = children.length > 0;
          const isRoot = !lang.parentId;

          return (
            <div
              key={lang.id}
              style={{
                paddingLeft: `calc(var(--gap-md) + ${depth * 16}px)`,
                paddingRight: "var(--gap-sm)",
                paddingTop: "5px",
                paddingBottom: "5px",
                cursor: "pointer",
                background: isSelected ? "var(--bg-active)" : "transparent",
                borderLeft: isSelected
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "var(--gap-xs)",
              }}
              onClick={() => onSelect(lang.id)}
            >
              {/* ツリー接続線のインジケータ */}
              {depth > 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", flexShrink: 0 }}>
                  └
                </span>
              )}

              {/* 言語アイコン */}
              <span style={{ fontSize: "0.7rem", flexShrink: 0, opacity: 0.6 }}>
                {isRoot && !hasChildren ? "◆" : hasChildren ? "◈" : "◇"}
              </span>

              {/* 言語名・カウント */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: "var(--text-sm)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: isRoot ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {lang.name}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  {wordCount} 語
                  {lang.description && (
                    <span
                      style={{ marginLeft: "6px", opacity: 0.7 }}
                      title={lang.description}
                    >
                      · {lang.description.slice(0, 12)}{lang.description.length > 12 ? "…" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* 操作ボタン（選択中のみ） */}
              {isSelected && (
                <div
                  style={{ display: "flex", gap: "2px", flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn-icon"
                    title="子言語を追加"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => startAdd(lang.id)}
                  >
                    ＋
                  </button>
                  <button
                    className="btn-icon"
                    title="編集"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => startEdit(lang)}
                  >
                    ✎
                  </button>
                  <button
                    className="btn-icon"
                    title="削除"
                    style={{ fontSize: "0.75rem", color: "var(--danger)" }}
                    onClick={() => handleDelete(lang.id)}
                  >
                    ✕
                  </button>
                </div>
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
        {db.languages.length} 言語 / {db.words.length} 語
      </div>
    </aside>
  );
}
