import { useState, useMemo } from "react";
import "./styles.css";

interface Batch {
  id: string;
  batchNo: string;
  orderNo: string;
  customerName: string;
  expectedDate: string;
  remark: string;
  pendingCount: number;
  confirmedCount: number;
  defectCount: number;
  createdAt: string;
}

interface BatchFormData {
  batchNo: string;
  orderNo: string;
  customerName: string;
  expectedDate: string;
  remark: string;
}

interface Gemstone {
  id: string;
  code: string;
  type: string;
  shape: string;
  carat: number;
  sizeL: number;
  sizeW: number;
  setting: string;
  clarity: string;
  color: string;
  cut: string;
  status: string;
}

const project = {
  "sourceNo": 8,
  "id": "hxyfront-62006",
  "port": 62006,
  "title": "珠宝镶嵌宝石分拣",
  "domain": "珠宝镶嵌",
  "prompt": "我需要一个面向珠宝镶嵌工作室的宝石分拣前端系统，可以记录宝石编号、种类、形状、克拉重量、尺寸、净度、颜色、切工、镶嵌位置和分拣状态。页面需要有分拣批次、尺寸筛选、镶嵌位置示意图、缺陷备注和按订单查看的宝石清单。",
  "palette": [
    "#be123c",
    "#0f766e",
    "#a855f7"
  ],
  "metrics": [
    "分拣批次",
    "待镶嵌",
    "缺陷备注",
    "总克拉"
  ],
  "filters": [
    "圆形",
    "椭圆",
    "梨形",
    "祖母绿切"
  ],
  "fields": [
    "宝石编号",
    "种类",
    "形状",
    "克拉重量",
    "尺寸",
    "镶嵌位置"
  ],
  "records": [
    [
      "ST-2048",
      "蓝宝石",
      "椭圆6x4mm",
      "主石位"
    ],
    [
      "ST-2061",
      "钻石",
      "圆形0.08ct",
      "围石A组"
    ],
    [
      "ST-2099",
      "祖母绿",
      "内含物明显",
      "需客户确认"
    ]
  ]
};

const SHAPE_OPTIONS = ["圆形", "椭圆", "梨形", "祖母绿切", "心形", "马眼形"];

const gemstones: Gemstone[] = [
  { id: "g1", code: "ST-2048", type: "蓝宝石", shape: "椭圆", carat: 0.85, sizeL: 6.0, sizeW: 4.0, setting: "主石位", clarity: "VS1", color: "皇家蓝", cut: "明亮式", status: "待镶嵌" },
  { id: "g2", code: "ST-2061", type: "钻石", shape: "圆形", carat: 0.08, sizeL: 2.5, sizeW: 2.5, setting: "围石A组", clarity: "VVS1", color: "D", cut: "理想切工", status: "待镶嵌" },
  { id: "g3", code: "ST-2099", type: "祖母绿", shape: "祖母绿切", carat: 1.20, sizeL: 7.0, sizeW: 5.0, setting: "主石位", clarity: "VS2", color: "翠绿", cut: "阶梯式", status: "需客户确认" },
  { id: "g4", code: "ST-2105", type: "红宝石", shape: "椭圆", carat: 1.05, sizeL: 7.0, sizeW: 5.0, setting: "主石位", clarity: "VS1", color: "鸽血红", cut: "明亮式", status: "已确认" },
  { id: "g5", code: "ST-2112", type: "钻石", shape: "圆形", carat: 0.05, sizeL: 2.0, sizeW: 2.0, setting: "围石B组", clarity: "VVS2", color: "E", cut: "极优良", status: "待镶嵌" },
  { id: "g6", code: "ST-2128", type: "碧玺", shape: "梨形", carat: 2.30, sizeL: 10.0, sizeW: 7.0, setting: "吊坠位", clarity: "SI1", color: "帕拉伊巴", cut: "明亮式", status: "待镶嵌" },
  { id: "g7", code: "ST-2135", type: "钻石", shape: "心形", carat: 0.50, sizeL: 5.0, sizeW: 5.0, setting: "副石位", clarity: "VS1", color: "F", cut: "理想切工", status: "已确认" },
  { id: "g8", code: "ST-2142", type: "蓝宝石", shape: "马眼形", carat: 0.75, sizeL: 8.0, sizeW: 4.0, setting: "围石C组", clarity: "VS2", color: "矢车菊蓝", cut: "明亮式", status: "待镶嵌" },
  { id: "g9", code: "ST-2150", type: "钻石", shape: "圆形", carat: 0.12, sizeL: 3.0, sizeW: 3.0, setting: "围石A组", clarity: "VVS1", color: "G", cut: "优良", status: "已确认" },
  { id: "g10", code: "ST-2167", type: "坦桑石", shape: "梨形", carat: 3.10, sizeL: 12.0, sizeW: 8.0, setting: "主石位", clarity: "SI2", color: "蓝紫", cut: "混合式", status: "需客户确认" },
  { id: "g11", code: "ST-2173", type: "钻石", shape: "椭圆", carat: 0.30, sizeL: 5.0, sizeW: 3.5, setting: "围石B组", clarity: "VS2", color: "H", cut: "极优良", status: "待镶嵌" },
  { id: "g12", code: "ST-2189", type: "红宝石", shape: "圆形", carat: 0.20, sizeL: 3.5, sizeW: 3.5, setting: "围石C组", clarity: "SI1", color: "玫红", cut: "明亮式", status: "已确认" },
  { id: "g13", code: "ST-2195", type: "祖母绿", shape: "祖母绿切", carat: 0.65, sizeL: 6.0, sizeW: 4.5, setting: "副石位", clarity: "VS1", color: "绿", cut: "阶梯式", status: "待镶嵌" },
  { id: "g14", code: "ST-2201", type: "钻石", shape: "马眼形", carat: 0.40, sizeL: 6.0, sizeW: 3.0, setting: "围石A组", clarity: "VVS1", color: "E", cut: "理想切工", status: "待镶嵌" },
  { id: "g15", code: "ST-2218", type: "尖晶石", shape: "心形", carat: 1.80, sizeL: 7.5, sizeW: 7.5, setting: "吊坠位", clarity: "VS2", color: "绝地武士", cut: "明亮式", status: "已确认" },
  { id: "g16", code: "ST-2225", type: "钻石", shape: "圆形", carat: 0.03, sizeL: 1.5, sizeW: 1.5, setting: "围石B组", clarity: "VVS1", color: "D", cut: "理想切工", status: "待镶嵌" },
  { id: "g17", code: "ST-2231", type: "蓝宝石", shape: "梨形", carat: 1.50, sizeL: 9.0, sizeW: 6.0, setting: "主石位", clarity: "IF", color: "帕帕拉恰", cut: "明亮式", status: "需客户确认" },
  { id: "g18", code: "ST-2248", type: "钻石", shape: "椭圆", carat: 0.15, sizeL: 4.0, sizeW: 3.0, setting: "围石C组", clarity: "VS1", color: "F", cut: "优良", status: "已确认" },
];

const initialFormData: BatchFormData = {
  batchNo: "",
  orderNo: "",
  customerName: "",
  expectedDate: "",
  remark: "",
};

function App() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  const [showBatchForm, setShowBatchForm] = useState(false);

  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [caratMin, setCaratMin] = useState("");
  const [caratMax, setCaratMax] = useState("");

  const toggleShape = (shape: string) => {
    setSelectedShapes((prev) =>
      prev.includes(shape) ? prev.filter((s) => s !== shape) : [...prev, shape]
    );
  };

  const resetFilters = () => {
    setSelectedShapes([]);
    setSizeMin("");
    setSizeMax("");
    setCaratMin("");
    setCaratMax("");
  };

  const hasActiveFilters =
    selectedShapes.length > 0 ||
    sizeMin !== "" ||
    sizeMax !== "" ||
    caratMin !== "" ||
    caratMax !== "";

  const filteredGemstones = useMemo(() => {
    return gemstones.filter((g) => {
      if (selectedShapes.length > 0 && !selectedShapes.includes(g.shape)) return false;
      if (sizeMin !== "") {
        const min = parseFloat(sizeMin);
        if (!isNaN(min) && (g.sizeL < min || g.sizeW < min)) return false;
      }
      if (sizeMax !== "") {
        const max = parseFloat(sizeMax);
        if (!isNaN(max) && (g.sizeL > max || g.sizeW > max)) return false;
      }
      if (caratMin !== "") {
        const min = parseFloat(caratMin);
        if (!isNaN(min) && g.carat < min) return false;
      }
      if (caratMax !== "") {
        const max = parseFloat(caratMax);
        if (!isNaN(max) && g.carat > max) return false;
      }
      return true;
    });
  }, [selectedShapes, sizeMin, sizeMax, caratMin, caratMax]);

  const displayedGemstones = hasActiveFilters ? filteredGemstones : gemstones;

  const handleFormChange = (field: keyof BatchFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateBatch = () => {
    if (!formData.batchNo || !formData.orderNo || !formData.customerName) {
      alert("请填写批次编号、订单号和客户名称");
      return;
    }

    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      batchNo: formData.batchNo,
      orderNo: formData.orderNo,
      customerName: formData.customerName,
      expectedDate: formData.expectedDate,
      remark: formData.remark,
      pendingCount: Math.floor(Math.random() * 20) + 5,
      confirmedCount: Math.floor(Math.random() * 15),
      defectCount: Math.floor(Math.random() * 5),
      createdAt: new Date().toLocaleString("zh-CN"),
    };

    setBatches((prev) => [newBatch, ...prev]);
    setFormData(initialFormData);
    setShowBatchForm(false);
  };

  const totalPending = batches.reduce((sum, b) => sum + b.pendingCount, 0);
  const totalConfirmed = batches.reduce((sum, b) => sum + b.confirmedCount, 0);
  const totalDefect = batches.reduce((sum, b) => sum + b.defectCount, 0);

  return (
    <main className="app">
      <section className="hero">
        <p>{project.id} · 源提示词{project.sourceNo} · Port {project.port}</p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        {project.metrics.map((metric: string, index: number) => (
          <article key={metric}>
            <small>{metric}</small>
            <strong>{[batches.length || 86, totalPending || 14, totalDefect || 7, 32][index] ?? 12}</strong>
          </article>
        ))}
      </section>

      <section className="batch-section">
        <div className="batch-summary">
          <article className="summary-card pending">
            <div className="summary-icon">⏳</div>
            <div>
              <small>待分拣总数</small>
              <strong>{totalPending}</strong>
            </div>
          </article>
          <article className="summary-card confirmed">
            <div className="summary-icon">✅</div>
            <div>
              <small>已确认总数</small>
              <strong>{totalConfirmed}</strong>
            </div>
          </article>
          <article className="summary-card defect">
            <div className="summary-icon">⚠️</div>
            <div>
              <small>缺陷总数</small>
              <strong>{totalDefect}</strong>
            </div>
          </article>
          <article className="summary-card total">
            <div className="summary-icon">📦</div>
            <div>
              <small>批次总数</small>
              <strong>{batches.length}</strong>
            </div>
          </article>
        </div>

        <section className="panel batch-panel">
          <div className="heading">
            <div>
              <p>批次管理</p>
              <h2>宝石批次工作台</h2>
            </div>
            <button
              className="primary"
              onClick={() => setShowBatchForm(!showBatchForm)}
            >
              {showBatchForm ? "取消创建" : "+ 创建批次"}
            </button>
          </div>

          {showBatchForm && (
            <div className="batch-form">
              <h3>新建宝石批次</h3>
              <div className="field-grid batch-form-grid">
                <label>
                  <span>批次编号 *</span>
                  <input
                    placeholder="如：BATCH-202606001"
                    value={formData.batchNo}
                    onChange={(e) => handleFormChange("batchNo", e.target.value)}
                  />
                </label>
                <label>
                  <span>订单号 *</span>
                  <input
                    placeholder="如：ORD-88201"
                    value={formData.orderNo}
                    onChange={(e) => handleFormChange("orderNo", e.target.value)}
                  />
                </label>
                <label>
                  <span>客户名称 *</span>
                  <input
                    placeholder="如：周大福珠宝"
                    value={formData.customerName}
                    onChange={(e) => handleFormChange("customerName", e.target.value)}
                  />
                </label>
                <label>
                  <span>预计交付日期</span>
                  <input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => handleFormChange("expectedDate", e.target.value)}
                  />
                </label>
                <label className="full-width">
                  <span>批次备注</span>
                  <input
                    placeholder="填写批次相关备注信息，如宝石来源、特殊要求等"
                    value={formData.remark}
                    onChange={(e) => handleFormChange("remark", e.target.value)}
                  />
                </label>
              </div>
              <div className="batch-form-actions">
                <button onClick={() => setShowBatchForm(false)}>取消</button>
                <button className="primary" onClick={handleCreateBatch}>
                  确认创建
                </button>
              </div>
            </div>
          )}

          <div className="batch-list">
            {batches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💎</div>
                <p>暂无批次数据，点击"创建批次"开始录入</p>
              </div>
            ) : (
              batches.map((batch, index) => (
                <article key={batch.id} className="batch-card">
                  <div className="batch-header">
                    <div className="batch-index">
                      <b>{String(index + 1).padStart(2, "0")}</b>
                    </div>
                    <div className="batch-info">
                      <div className="batch-title-row">
                        <h3>{batch.batchNo}</h3>
                        <span className="batch-tag">订单 {batch.orderNo}</span>
                      </div>
                      <p className="batch-customer">
                        👤 {batch.customerName}
                        {batch.expectedDate && (
                          <span className="batch-date">📅 预计交付：{batch.expectedDate}</span>
                        )}
                      </p>
                      {batch.remark && (
                        <p className="batch-remark">📝 {batch.remark}</p>
                      )}
                    </div>
                  </div>
                  <div className="batch-stats">
                    <div className="stat-item stat-pending">
                      <span className="stat-label">待分拣</span>
                      <span className="stat-value">{batch.pendingCount}</span>
                    </div>
                    <div className="stat-item stat-confirmed">
                      <span className="stat-label">已确认</span>
                      <span className="stat-value">{batch.confirmedCount}</span>
                    </div>
                    <div className="stat-item stat-defect">
                      <span className="stat-label">缺陷</span>
                      <span className="stat-value">{batch.defectCount}</span>
                    </div>
                  </div>
                  <div className="batch-footer">
                    <span>创建时间：{batch.createdAt}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>{project.domain}筛选</h2>
          <div className="chips">
            {project.filters.map((item: string) => (
              <button key={item}>{item}</button>
            ))}
          </div>
        </aside>

        <section className="panel form-panel">
          <div className="heading">
            <div>
              <p>专业字段</p>
              <h2>新增记录</h2>
            </div>
            <button className="primary">保存草稿</button>
          </div>
          <div className="field-grid">
            {project.fields.map((field: string) => (
              <label key={field}>
                <span>{field}</span>
                <input placeholder={"填写" + field} />
              </label>
            ))}
          </div>
        </section>
      </section>

      <section className="filter-module">
        <aside className="panel filter-panel">
          <div className="heading">
            <div>
              <p>尺寸筛选</p>
              <h2>宝石条件过滤</h2>
            </div>
            {hasActiveFilters && (
              <button className="reset-btn" onClick={resetFilters}>
                重置
              </button>
            )}
          </div>

          <div className="filter-group">
            <h3>形状</h3>
            <div className="chips">
              {SHAPE_OPTIONS.map((shape) => (
                <button
                  key={shape}
                  className={selectedShapes.includes(shape) ? "active" : ""}
                  onClick={() => toggleShape(shape)}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h3>尺寸区间 (mm)</h3>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="最小"
                value={sizeMin}
                min="0"
                step="0.5"
                onChange={(e) => setSizeMin(e.target.value)}
              />
              <span className="range-sep">—</span>
              <input
                type="number"
                placeholder="最大"
                value={sizeMax}
                min="0"
                step="0.5"
                onChange={(e) => setSizeMax(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <h3>克拉重量区间 (ct)</h3>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="最小"
                value={caratMin}
                min="0"
                step="0.01"
                onChange={(e) => setCaratMin(e.target.value)}
              />
              <span className="range-sep">—</span>
              <input
                type="number"
                placeholder="最大"
                value={caratMax}
                min="0"
                step="0.01"
                onChange={(e) => setCaratMax(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filter-summary">
              <span className="filter-badge">
                匹配 <strong>{filteredGemstones.length}</strong> / {gemstones.length} 条
              </span>
            </div>
          )}
        </aside>

        <section className="panel filter-results">
          <div className="heading">
            <div>
              <p>实时预览</p>
              <h2>匹配清单</h2>
            </div>
            <span className="result-count">
              共 {displayedGemstones.length} 条记录
            </span>
          </div>

          {displayedGemstones.length === 0 ? (
            <div className="empty-state filter-empty">
              <div className="empty-icon">🔍</div>
              <p>没有找到符合条件的宝石记录</p>
              <button className="reset-btn" onClick={resetFilters}>
                清除筛选条件
              </button>
            </div>
          ) : (
            <div className="gem-list">
              {displayedGemstones.map((g, index) => (
                <article key={g.id} className="gem-card">
                  <div className="gem-index">
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </div>
                  <div className="gem-info">
                    <div className="gem-title-row">
                      <h3>{g.code}</h3>
                      <span className="gem-type-tag">{g.type}</span>
                      <span className={`gem-status gem-status-${g.status === "已确认" ? "confirmed" : g.status === "需客户确认" ? "pending" : "waiting"}`}>
                        {g.status}
                      </span>
                    </div>
                    <div className="gem-details">
                      <span>💎 {g.shape}</span>
                      <span>📐 {g.sizeL}×{g.sizeW}mm</span>
                      <span>⚖️ {g.carat}ct</span>
                      <span>🎨 {g.color}</span>
                      <span>🔍 {g.clarity}</span>
                      <span>✂️ {g.cut}</span>
                    </div>
                    <div className="gem-meta">
                      <span>镶嵌位置：{g.setting}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>历史记录</p>
            <h2>近期工作台</h2>
          </div>
          <button>导出摘要</button>
        </div>
        <div className="records">
          {project.records.map((record: string[], index: number) => (
            <article key={record.join("-")}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <h3>{record[0]}</h3>
                <p>{record.slice(1).join(" · ")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
