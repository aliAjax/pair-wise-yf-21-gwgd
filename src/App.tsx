import "./styles.css";
import { useStudioStore } from "./useStudioStore";
import ColorCards from "./components/ColorCards";
import ArchiveList from "./components/ArchiveList";
import ChangeLogPanel from "./components/ChangeLogPanel";

const STUDIO = {
  id: "hxyfront-62009",
  title: "地毯修复纹样档案 · 染料批次管理",
  intro:
    "同一色号的染料按到货批次分别留档：每个颜色维护批次、到货日期与余量；破损区补线必须选定具体批次。批次因褪色停用后，其余批次和其他档案照常施工，受影响区域自动转待复核并保留原用量；复核换批后余量、进度与产地筛选同步更新，所有换批记录持久保存。",
};

function App() {
  const { state, actions, toast } = useStudioStore();

  if (!state) {
    return (
      <main className="app">
        <p className="loading">正在调取修复档案…</p>
      </main>
    );
  }

  const allAreas = state.archives.flatMap((a) => a.areas);
  const pending = allAreas.filter((a) => a.status !== "已完工").length;
  const review = allAreas.filter((a) => a.status === "待复核").length;
  const finished = allAreas.filter((a) => a.status === "已完工").length;
  const finishRate = allAreas.length
    ? Math.round((finished / allAreas.length) * 100)
    : 0;
  const activeBatches = state.batches.filter((b) => b.status === "active").length;

  return (
    <main className="app">
      <section className="hero">
        <p>{STUDIO.id}</p>
        <h1>{STUDIO.title}</h1>
        <span>{STUDIO.intro}</span>
      </section>

      <section className="metrics">
        <article>
          <small>待修复区域</small>
          <strong>{pending}</strong>
          {review > 0 && <em className="metric-flag">其中 {review} 处待复核</em>}
        </article>
        <article>
          <small>纹样档案</small>
          <strong>{state.archives.length}</strong>
        </article>
        <article>
          <small>色卡 / 在用批次</small>
          <strong>
            {state.colors.length}
            <em className="metric-sub"> / {activeBatches}</em>
          </strong>
        </article>
        <article>
          <small>区域完工率</small>
          <strong>{finishRate}%</strong>
        </article>
      </section>

      <ColorCards state={state} actions={actions} />
      <ArchiveList state={state} actions={actions} />
      <ChangeLogPanel state={state} />

      <footer className="toolbar">
        <button onClick={actions.resetAll}>恢复示例档案</button>
        <span>档案保存在本机浏览器，刷新或关闭页面后再次打开仍保留全部批次与换批记录。</span>
      </footer>

      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.message}
        </div>
      )}
    </main>
  );
}

export default App;
