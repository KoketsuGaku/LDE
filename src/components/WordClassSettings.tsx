// ============================================================
// conlang-dev / components/WordClassSettings.tsx
// 品詞定義・親言語からの継承管理
// ============================================================

import { useState } from "react";
import type { AppDB, WordClass } from "../types";
import {
  createWordClass, updateWordClass, deleteWordClass,
  getEffectiveWordClasses, inheritWordClasses,
} from "../store/db";

interface Props {
  db: AppDB;
  languageId: string;
  onChange: (db: AppDB) => void;
}

export function WordClassSettings({ db, languageId, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const lang = db.languages.find((l) => l.id === languageId);
  const parentLang = lang?.parentId
    ? db.languages.find((l) => l.id === lang.parentId)
    : null;

  // この言語に直接定義されている品詞（継承含む）
  const ownClasses = db.wordClasses.filter((c) => c.languageId === languageId);
  // 有効な品詞一覧（継承済み・削除済み除外）
  const effective = getEffectiveWordClasses(db, languageId);

  function handleAdd() {
    if (!newName.trim()) return;
    const { db: next } = createWordClass(db, {
      languageId,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
    });
    onChange(next);
    setNewName("");
    setNewDesc("");
  }

  function startEdit(wc: WordClass) {
    setEditingId(wc.id);
    setEditName(wc.name);
    setEditDesc(wc.description ?? "");
  }

  function commitEdit() {
    if (!editingId || !editName.trim()) return;
    onChange(updateWordClass(db, editingId, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
    }));
    setEditingId(null);
  }

  function handleDelete(wc: WordClass) {
    if (wc.inheritedFrom) {
      // 継承エントリに deleted フラグを立てる
      if (!confirm(`継承品詞「${wc.name}」をこの言語で無効化しますか？`)) return;
      onChange(updateWordClass(db, wc.id, { deleted: true }));
    } else {
      if (!confirm(`品詞「${wc.name}」を削除しますか？`)) return;
      onChange(deleteWordClass(db, wc.id));
    }
  }

  function handleRestore(wc: WordClass) {
    onChange(updateWordClass(db, wc.id, { deleted: false }));
  }

  function handleInherit() {
    if (!parentLang) return;
    if (!confirm(`親言語「${parentLang.name}」の品詞を継承しますか？\n既に継承済みのものはスキップされます。`)) return;
    onChange(inheritWordClasses(db, languageId, parentLang.id));
  }

  // 削除済み継承品詞（復元可能なもの）
  const deletedInherited = ownClasses.filter((c) => c.inheritedFrom && c.deleted);

  const row: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "var(--gap-sm)",
    padding: "6px var(--gap-sm)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-card)",
    marginBottom: "var(--gap-xs)",
  };

  return (
    <div style={{ padding: "var(--gap-lg)", maxWidth: "600px" }}>
      <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--gap-lg)" }}>
        品詞の定義
      </h3>

      {/* 親言語からの継承ボタン */}
      {parentLang && (
        <div
          style={{
            padding: "var(--gap-md)",
            background: "var(--accent-dim)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--gap-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--gap-md)",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
              親言語：{parentLang.name}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
              親言語の品詞を継承して、ここで追加・削除できます
            </div>
          </div>
          <button className="btn-primary" style={{ fontSize: "var(--text-xs)", flexShrink: 0 }} onClick={handleInherit}>
            品詞を継承
          </button>
        </div>
      )}

      {/* 有効な品詞一覧 */}
      <p className="section-label">有効な品詞（{effective.length}件）</p>

      {effective.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--gap-lg)" }}>
          品詞が登録されていません
        </div>
      )}

      {effective.map((wc) => {
        const isOwn = wc.languageId === languageId;
        const isInherited = !!wc.inheritedFrom || wc.languageId !== languageId;
        const ownEntry = ownClasses.find((c) => c.inheritedFrom === wc.id);

        return (
          <div key={wc.id} style={row}>
            {editingId === (ownEntry?.id ?? wc.id) ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="説明"
                  style={{ flex: 2 }}
                />
                <button className="btn-primary" style={{ fontSize: "var(--text-xs)" }} onClick={commitEdit}>保存</button>
                <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => setEditingId(null)}>取消</button>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", minWidth: "80px" }}>{wc.name}</span>
                {wc.description && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", flex: 1 }}>{wc.description}</span>
                )}
                {!wc.description && <span style={{ flex: 1 }} />}
                {isInherited && !isOwn && (
                  <span className="badge" style={{ fontSize: "10px" }}>継承</span>
                )}
                {ownEntry?.inheritedFrom && (
                  <span className="badge" style={{ fontSize: "10px" }}>継承・編集済</span>
                )}
                <button className="btn-icon" title="編集" onClick={() => startEdit(ownEntry ?? wc)}>✎</button>
                <button
                  className="btn-icon"
                  title="削除"
                  style={{ color: "var(--danger)" }}
                  onClick={() => handleDelete(ownEntry ?? wc)}
                >✕</button>
              </>
            )}
          </div>
        );
      })}

      {/* 削除済み継承品詞（復元可能） */}
      {deletedInherited.length > 0 && (
        <>
          <p className="section-label" style={{ marginTop: "var(--gap-lg)" }}>
            無効化された継承品詞
          </p>
          {deletedInherited.map((wc) => {
            const parentWc = db.wordClasses.find((c) => c.id === wc.inheritedFrom);
            return (
              <div key={wc.id} style={{ ...row, opacity: 0.5 }}>
                <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", minWidth: "80px", textDecoration: "line-through" }}>
                  {wc.name || parentWc?.name}
                </span>
                <span style={{ flex: 1 }} />
                <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => handleRestore(wc)}>
                  復元
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* 新規追加フォーム */}
      <div style={{ marginTop: "var(--gap-lg)", borderTop: "1px solid var(--border)", paddingTop: "var(--gap-lg)" }}>
        <p className="section-label">新しい品詞を追加</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "var(--gap-sm)", alignItems: "end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>品詞名 *</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例：名詞、動詞"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>説明</label>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="省略可"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <button className="btn-primary" onClick={handleAdd} style={{ marginBottom: "1px" }}>
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
