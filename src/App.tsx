// ============================================================
// conlang-dev / App.tsx
// ============================================================

import { useState, useEffect, useRef } from "react";
import type { AppDB } from "./types";
import { loadDB, saveDB, exportDB, importDB, getAncestors } from "./store/db";
import { LanguagePanel } from "./components/LanguagePanel";
import { Pane } from "./components/Pane";

const AUTOSAVE_DELAY = 800;

// モバイル判定フック
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// モバイルのボトムナビタブ
type MobileTab = "lang" | "dict" | "grammar" | "generator";

const MOBILE_TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "lang",      label: "言語",  icon: "🌐" },
  { id: "dict",      label: "辞書",  icon: "📖" },
  { id: "grammar",   label: "文法",  icon: "📝" },
  { id: "generator", label: "生成",  icon: "✨" },
];

export default function App() {
  const [db, setDB] = useState<AppDB>(() => loadDB());
  const [selectedLangId, setSelectedLangId] = useState<string | null>(null);
  const [split, setSplit] = useState(false);
  const [rightPaneKey, setRightPaneKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved">("saved");
  const [mobileTab, setMobileTab] = useState<MobileTab>("lang");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  function handleDBChange(next: AppDB) {
    setDB(next);
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveDB(next); setSaveStatus("saved"); }, AUTOSAVE_DELAY);
  }

  useEffect(() => {
    return () => { if (saveTimer.current) { clearTimeout(saveTimer.current); saveDB(db); } };
  }, [db]);

  function handleLangSelect(id: string) {
    setSelectedLangId(id || null);
    // モバイルで言語を選んだら辞書タブへ移動
    if (isMobile && id) setMobileTab("dict");
  }

  function handleToggleSplit() {
    setSplit((v) => {
      if (!v) setRightPaneKey((k) => k + 1);
      return !v;
    });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importDB(file);
      handleDBChange(imported);
      setSelectedLangId(null);
      alert("インポートしました。");
    } catch { alert("インポートに失敗しました。"); }
    e.target.value = "";
  }

  const selectedLang = db.languages.find((l) => l.id === selectedLangId) ?? null;
  const ancestors = selectedLang ? getAncestors(db.languages, selectedLang.id) : [];

  // ========== モバイルレイアウト ==========
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
        {/* モバイルヘッダー */}
        <header style={{
          height: "48px", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "0 var(--gap-md)", gap: "var(--gap-sm)", flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedLang
              ? `${[...ancestors].reverse().map(a => a.name).concat(selectedLang.name).join(" › ")}`
              : "言語開発環境"}
          </span>
          <span style={{ fontSize: "10px", color: saveStatus === "saved" ? "var(--success)" : "var(--text-muted)", flexShrink: 0 }}>
            {saveStatus === "saved" ? "●" : "○"}
          </span>
          <button className="btn-ghost" style={{ fontSize: "10px", padding: "4px 8px", flexShrink: 0 }} onClick={() => exportDB(db)}>書出</button>
          <button className="btn-ghost" style={{ fontSize: "10px", padding: "4px 8px", flexShrink: 0 }} onClick={() => fileRef.current?.click()}>読込</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
        </header>

        {/* モバイルコンテンツ */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mobileTab === "lang" && (
            <LanguagePanel db={db} selectedId={selectedLangId} onSelect={handleLangSelect} onChange={handleDBChange} />
          )}
          {mobileTab !== "lang" && selectedLangId && (
            <Pane
              key={`mobile-${selectedLangId}`}
              db={db}
              onChange={handleDBChange}
              initialLangId={selectedLangId}
              initialMode={mobileTab === "dict" ? "dict" : mobileTab === "grammar" ? "grammar" : "generator"}
              label=""
              showClose={false}
              isMobile={true}
            />
          )}
          {mobileTab !== "lang" && !selectedLangId && (
            <div className="empty-state">
              <span style={{ fontSize: "var(--text-xl)" }}>🌐</span>
              <span>まず「言語」タブから言語を選択してください</span>
            </div>
          )}
        </div>

        {/* ボトムナビ */}
        <nav style={{
          height: "56px", background: "var(--bg-panel)", borderTop: "1px solid var(--border)",
          display: "flex", flexShrink: 0,
        }}>
          {MOBILE_TABS.map((tab) => {
            const active = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: "2px", border: "none", cursor: "pointer",
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
                  fontSize: "18px", transition: "background 0.1s",
                }}
              >
                <span>{tab.icon}</span>
                <span style={{ fontSize: "9px", fontWeight: active ? 600 : 400 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // ========== PCレイアウト ==========
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <header style={{
        height: "44px", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", padding: "0 var(--gap-lg)", gap: "var(--gap-sm)", flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", letterSpacing: "0.03em", flexShrink: 0 }}>
          言語開発環境
        </span>
        {selectedLang && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>›</span>
            {[...ancestors].reverse().map((anc) => (
              <span key={anc.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" }}
                  onClick={() => handleLangSelect(anc.id)}>{anc.name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>›</span>
              </span>
            ))}
            <span style={{ fontSize: "var(--text-sm)", color: "var(--accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {selectedLang.name}
            </span>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--gap-sm)", flexShrink: 0 }}>
          {selectedLangId && (
            <button className={split ? "btn-primary" : "btn-ghost"} style={{ fontSize: "var(--text-xs)" }} onClick={handleToggleSplit}>
              {split ? "✦ 分割中" : "⧉ 分割"}
            </button>
          )}
          <span style={{ fontSize: "var(--text-xs)", color: saveStatus === "saved" ? "var(--success)" : "var(--text-muted)" }}>
            {saveStatus === "saved" ? "● 保存済み" : "○ 未保存"}
          </span>
          <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => { saveDB(db); setSaveStatus("saved"); }}>保存</button>
          <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => exportDB(db)}>書出</button>
          <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={() => fileRef.current?.click()}>読込</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <LanguagePanel db={db} selectedId={selectedLangId} onSelect={handleLangSelect} onChange={handleDBChange} />
        {selectedLangId ? (
          <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
            <Pane key={`left-${selectedLangId}`} db={db} onChange={handleDBChange}
              initialLangId={selectedLangId} label="左" showClose={false} isMobile={false} />
            {split && <div style={{ width: "1px", background: "var(--border)", flexShrink: 0 }} />}
            {split && (
              <Pane key={`right-${rightPaneKey}`} db={db} onChange={handleDBChange}
                initialLangId={selectedLangId} label="右" showClose={true} onClose={() => setSplit(false)} isMobile={false} />
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1 }}>
            <span style={{ fontSize: "2rem" }}>✦</span>
            <span>左のパネルから言語を選択または作成してください</span>
          </div>
        )}
      </div>
    </div>
  );
}
