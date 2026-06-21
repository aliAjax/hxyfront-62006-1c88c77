import { useState } from "react";
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
