// ============================================================
// conlang-dev / components/WordEditor.tsx
// 単語詳細エディタ：語形・発音・タグ・意味一覧
// ============================================================

import { useState } from "react";
import type { AppDB, Word, Mean } from "../types";
import {
  updateWord,
  createMean,
  updateMean,
  deleteMean,
  getMeansForWord,
} from "../store/db";
import { MeanEditor } from "./MeanEditor";

interface Props {
  db: AppDB;
  wordId: string;
  onChange: (db: AppDB) => void;
}

type EditingMean = { type: "new" } | { type: "existing"; id: string };

export function WordEditor({ db, wordId, onChange }: Props) {
  const word = db.words.find((w) => w.id === wordId);
  const [editingMean, setEditingMean] = useState<EditingMean | null>(null);

  // 語形・発音のインライン編集
  const [editingField, setEditingField] = useState<"name" | "pron" | null>(null);
  const [fieldVal, setFieldVal] = useState("");

  if (!word) {
    return (
      <div className="empty-state">
        <span>単語を選択してください</span>
      </div>
    );
  }

  const means = getMeansForWord(db, word.id);

  // ---------- 語形・発音の編集 ----------
  function startEdit(field: "name" | "pron") {
    setEditingField(field);
    setFieldVal(
      field === "name" ? word!.name : word!.pronunciations?.[0] ?? ""
    );
  }

  function commitField() {
    if (!editingField || !word) return;
    if (editingField === "name" && fieldVal.trim()) {
      onChange(updateWord(db, word.id, { name: fieldVal.trim() }));
    } else if (editingField === "pron") {
      onChange(
        updateWord(db, word.id, {
          pronunciations: fieldVal.trim() ? [fieldVal.trim()] : undefined,
        })
      );
    }
    setEditingField(null);
  }

  // ---------- 祖語形・語根のセレクト ----------
  function handleProtoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(updateWord(db, word!.id, { protoFormId: e.target.value || undefined }));
  }

  function handleRootChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(updateWord(db, word!.id, { rootId: e.target.value || undefined }));
  }

  // ---------- タグ ----------
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    if (!tagInput.trim()) return;
    const tags = [...(word.tags ?? [])];
    if (!tags.includes(tagInput.trim())) tags.push(tagInput.trim());
    onChange(updateWord(db, word.id, { tags }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    onChange(updateWord(db, word.id, { tags: word.tags?.filter((t) => t !== tag) }));
  }

  // ---------- 意味の保存 ----------
  function saveMean(patch: Partial<Omit<Mean, "id" | "wordId" | "date">>) {
    if (!editingMean) return;
    let next: AppDB;
    if (editingMean.type === "new") {
      const result = createMean(db, word.id, {
        translate: patch.translate ?? "",
        class: patch.class ?? "",
        ...patch,
      });
      next = result.db;
    } else {
      next = updateMean(db, editingMean.id, patch);
    }
    onChange(next);
    setEditingMean(null);
  }

  function handleDeleteMean(meanId: string) {
    if (!confirm("この意味を削除しますか？")) return;
    onChange(deleteMean(db, meanId));
    setEditingMean(null);
  }

  // ---------- 編集中の Mean オブジェクト取得 ----------
  const emptyMean: Mean = {
    id: "",
    wordId: word.id,
    translate: "",
    class: "",
    date: 0,
  };

  function getEditingMeanObj(): Mean {
    if (!editingMean) return emptyMean;
    if (editingMean.type === "new") return emptyMean;
    return db.means.find((m) => m.id === editingMean.id) ?? emptyMean;
  }

  // ---------- 他言語の単語リスト（祖語形・語根候補） ----------
  const otherWords = db.words.filter((w) => w.id !== word.id);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* 語形ヘッダー */}
      <div
        style={{
          padding: "var(--gap-md) var(--gap-lg)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "baseline",
          gap: "var(--gap-md)",
          flexWrap: "wrap",
        }}
      >
        {/* 語形 */}
        {editingField === "name" ? (
          <input
            autoFocus
            value={fieldVal}
            onChange={(e) => setFieldVal(e.target.value)}
            onBlur={commitField}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitField();
              if (e.key === "Escape") setEditingField(null);
            }}
            style={{ fontSize: "var(--text-xl)", fontWeight: 700, width: "12em" }}
          />
        ) : (
          <h2
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              cursor: "pointer",
              borderBottom: "1px dashed var(--border)",
            }}
            title="クリックで編集"
            onClick={() => startEdit("name")}
          >
            {word.name}
          </h2>
        )}

        {/* 発音 */}
        {editingField === "pron" ? (
          <input
            autoFocus
            value={fieldVal}
            onChange={(e) => setFieldVal(e.target.value)}
            onBlur={commitField}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitField();
              if (e.key === "Escape") setEditingField(null);
            }}
            style={{ fontFamily: "var(--font-mono)", width: "10em" }}
            placeholder="/発音/"
          />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              cursor: "pointer",
              borderBottom: "1px dashed var(--border)",
            }}
            title="クリックで編集"
            onClick={() => startEdit("pron")}
          >
            {word.pronunciations?.[0] ? `/${word.pronunciations[0]}/` : "+ 発音を追加"}
          </span>
        )}

        {/* ID（小さく表示） */}
        <span className="mono" style={{ marginLeft: "auto" }}>
          {word.id}
        </span>
      </div>

      {/* スクロールエリア */}
      <div className="scrollable" style={{ padding: "var(--gap-lg)" }}>

        {/* 祖語形・語根 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--gap-md)",
            marginBottom: "var(--gap-lg)",
          }}
        >
          <div className="form-group">
            <label>祖語形（参照先単語）</label>
            <select value={word.protoFormId ?? ""} onChange={handleProtoChange}>
              <option value="">なし</option>
              {otherWords.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>語根（参照先単語）</label>
            <select value={word.rootId ?? ""} onChange={handleRootChange}>
              <option value="">なし</option>
              {otherWords.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* タグ */}
        <div style={{ marginBottom: "var(--gap-lg)" }}>
          <p className="section-label">タグ</p>
          <div style={{ display: "flex", gap: "var(--gap-sm)", marginBottom: "var(--gap-xs)" }}>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="タグを入力…"
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              style={{ maxWidth: "200px" }}
            />
            <button className="btn-ghost" onClick={addTag}>
              追加
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-xs)" }}>
            {(word.tags ?? []).map((tag) => (
              <span key={tag} className="badge" style={{ cursor: "pointer" }} onClick={() => removeTag(tag)}>
                {tag} ✕
              </span>
            ))}
          </div>
        </div>

        <hr className="divider" />

        {/* 意味一覧 */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--gap-md)",
            }}
          >
            <p className="section-label" style={{ marginBottom: 0 }}>
              意味 ({means.length})
            </p>
            {editingMean === null && (
              <button
                className="btn-primary"
                style={{ fontSize: "var(--text-xs)" }}
                onClick={() => setEditingMean({ type: "new" })}
              >
                ＋ 意味を追加
              </button>
            )}
          </div>

          {/* 新規追加フォーム */}
          {editingMean?.type === "new" && (
            <div style={{ marginBottom: "var(--gap-md)" }}>
              <MeanEditor
                mean={getEditingMeanObj()}
                db={db}
                onSave={saveMean}
                onDelete={() => setEditingMean(null)}
                onCancel={() => setEditingMean(null)}
              />
            </div>
          )}

          {/* 既存の意味カード */}
          {means.map((mean, idx) => {
            const isEditing =
              editingMean?.type === "existing" && editingMean.id === mean.id;

            return (
              <div key={mean.id} style={{ marginBottom: "var(--gap-md)" }}>
                {isEditing ? (
                  <MeanEditor
                    mean={mean}
                    db={db}
                    onSave={saveMean}
                    onDelete={() => handleDeleteMean(mean.id)}
                    onCancel={() => setEditingMean(null)}
                  />
                ) : (
                  <MeanCard
                    mean={mean}
                    db={db}
                    index={idx}
                    onEdit={() => setEditingMean({ type: "existing", id: mean.id })}
                  />
                )}
              </div>
            );
          })}

          {means.length === 0 && editingMean === null && (
            <div
              style={{
                padding: "var(--gap-lg)",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              意味が登録されていません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- 意味カード（表示モード） ----------

function MeanCard({
  mean,
  db,
  index,
  onEdit,
}: {
  mean: Mean;
  db: AppDB;
  index: number;
  onEdit: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--gap-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--gap-sm)",
          marginBottom: "var(--gap-sm)",
        }}
      >
        <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
          {index + 1}.
        </span>
        <span style={{ fontWeight: 600 }}>{mean.translate}</span>
        <span className="badge">{mean.class}</span>
        <button
          className="btn-icon"
          style={{ marginLeft: "auto" }}
          onClick={onEdit}
          title="編集"
        >
          ✎
        </button>
      </div>

      {mean.description && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--gap-sm)" }}>
          {mean.description}
        </p>
      )}

      {/* 活用形 */}
      {mean.conjugatedForms && Object.keys(mean.conjugatedForms).length > 0 && (
        <div style={{ marginBottom: "var(--gap-sm)" }}>
          <span className="section-label">活用形</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-xs)" }}>
            {Object.entries(mean.conjugatedForms).map(([k, v]) => (
              <span key={k} className="badge" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                {k}：{v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 関連語 */}
      {mean.relatedTerms && Object.keys(mean.relatedTerms).length > 0 && (
        <div style={{ marginBottom: "var(--gap-sm)" }}>
          <span className="section-label">関連語</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-xs)" }}>
            {Object.entries(mean.relatedTerms).map(([k, wid]) => {
              const w = db.words.find((x) => x.id === wid);
              return (
                <span key={k} className="badge">
                  {k}：{w ? w.name : "?"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 例文 */}
      {mean.examples && mean.examples.length > 0 && (
        <div>
          <span className="section-label">例文</span>
          {mean.examples.map((ex, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-base)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                marginBottom: "var(--gap-xs)",
                fontSize: "var(--text-sm)",
              }}
            >
              <div>{ex.original}</div>
              <div style={{ color: "var(--text-muted)" }}>{ex.translation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
