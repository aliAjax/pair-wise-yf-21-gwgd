import { useMemo, useState } from "react";
import "./styles.css";
import { useArchiveState } from "./state/useArchiveState";
import { MetricsBar } from "./components/MetricsBar";
import { ArchiveList } from "./components/ArchiveList";
import { RugDetail } from "./components/RugDetail";
import { ColorCardPanel } from "./components/ColorCardPanel";
import { ChangeLog } from "./components/ChangeLog";

function App() {
  const { state, error, actions } = useArchiveState();

  // 页面本地状态：筛选与选中，不写入档案
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedRugId, setSelectedRugId] = useState<string | null>(null);

  const origins = useMemo(
    () => Array.from(new Set(state.rugs.map((r) => r.origin))),
    [state.rugs]
  );
  const selectedRug =
    state.rugs.find((r) => r.id === selectedRugId) ?? state.rugs[0];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62009 · 手工地毯修复工作室</p>
        <h1>地毯修复纹样档案 · 染料批次台账</h1>
        <span>
          同一色号按批次记录到货日期与余量；破损区域补线时选定具体批次。
          批次因褪色停用后，仅用过该批的区域转「待复核」并保留原用量，
          其它批次与档案照常施工；复核改用新批次后，色卡余量、区域进度与产地列表同步更新，
          每次换批都留痕，关掉页面再回来记录仍在。
        </span>
      </section>

      <MetricsBar state={state} />

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={actions.dismissError}>知道了</button>
        </div>
      )}

      <section className="workspace">
        <ArchiveList
          state={state}
          origins={origins}
          selectedOrigin={selectedOrigin}
          onSelectOrigin={setSelectedOrigin}
          selectedRugId={selectedRug?.id ?? null}
          onSelectRug={setSelectedRugId}
        />
        {selectedRug && (
          <RugDetail state={state} rug={selectedRug} actions={actions} />
        )}
      </section>

      <ColorCardPanel state={state} actions={actions} />

      <ChangeLog state={state} />

      <footer className="footer">
        <button className="ghost" onClick={actions.resetAll}>
          恢复初始档案（清空本地改动）
        </button>
      </footer>
    </main>
  );
}

export default App;
