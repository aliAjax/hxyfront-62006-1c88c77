import { useState, useMemo } from "react";
import "./styles.css";

type SettingPositionType = "主石位" | "围石A组" | "围石B组" | "备用石位";
type ViewType = "workbench" | "orderList" | "orderDetail";
type SortingStatus = "待镶嵌" | "已确认" | "需客户确认";

interface SettingPosition {
  key: SettingPositionType;
  label: string;
  description: string;
  color: string;
  maxSlots: number;
}

const SETTING_POSITIONS: SettingPosition[] = [
  { key: "主石位", label: "主石位", description: "戒指中心主石", color: "var(--primary)", maxSlots: 1 },
  { key: "围石A组", label: "围石A组", description: "内圈围石", color: "var(--secondary)", maxSlots: 8 },
  { key: "围石B组", label: "围石B组", description: "外圈围石", color: "var(--accent)", maxSlots: 12 },
  { key: "备用石位", label: "备用石位", description: "备用宝石槽", color: "#f59e0b", maxSlots: 4 },
];

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
  status: SortingStatus;
  batchId: string;
  orderNo: string;
  defectRemark?: string;
}

interface GemstoneEditForm {
  code: string;
  type: string;
  shape: string;
  carat: string;
  sizeL: string;
  sizeW: string;
  setting: string;
  clarity: string;
  color: string;
  cut: string;
  status: SortingStatus;
  defectRemark: string;
}

interface FormErrors {
  code?: string;
  carat?: string;
  sizeL?: string;
  sizeW?: string;
}

const project = {
  sourceNo: 8,
  id: "hxyfront-62006",
  port: 62006,
  title: "珠宝镶嵌宝石分拣",
  domain: "珠宝镶嵌",
  prompt: "我需要一个面向珠宝镶嵌工作室的宝石分拣前端系统，可以记录宝石编号、种类、形状、克拉重量、尺寸、净度、颜色、切工、镶嵌位置和分拣状态。页面需要有分拣批次、尺寸筛选、镶嵌位置示意图、缺陷备注和按订单查看的宝石清单。",
  palette: ["#be123c", "#0f766e", "#a855f7"],
  metrics: ["分拣批次", "待镶嵌", "缺陷备注", "总克拉"],
  filters: ["圆形", "椭圆", "梨形", "祖母绿切"],
  fields: ["宝石编号", "种类", "形状", "克拉重量", "尺寸", "镶嵌位置"],
  records: [
    ["ST-2048", "蓝宝石", "椭圆6x4mm", "主石位"],
    ["ST-2061", "钻石", "圆形0.08ct", "围石A组"],
    ["ST-2099", "祖母绿", "内含物明显", "需客户确认"],
  ],
};

interface DefectRemark {
  id: string;
  gemId: string;
  gemCode: string;
  defectTypes: string[];
  remark: string;
  needConfirm: boolean;
  createdAt: string;
}

const DEFECT_TYPE_OPTIONS = [
  { label: "内含物明显", icon: "🔬" },
  { label: "颜色偏差", icon: "🎨" },
  { label: "尺寸不符", icon: "📐" },
  { label: "表面划痕", icon: "✦" },
];

const SHAPE_OPTIONS = ["圆形", "椭圆", "梨形", "祖母绿切", "心形", "马眼形"];
const STATUS_OPTIONS: SortingStatus[] = ["待镶嵌", "已确认", "需客户确认"];

const initialGemstones: Gemstone[] = [
  { id: "g1", code: "ST-2048", type: "蓝宝石", shape: "椭圆", carat: 0.85, sizeL: 6.0, sizeW: 4.0, setting: "主石位", clarity: "VS1", color: "皇家蓝", cut: "明亮式", status: "待镶嵌", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g2", code: "ST-2061", type: "钻石", shape: "圆形", carat: 0.08, sizeL: 2.5, sizeW: 2.5, setting: "围石A组", clarity: "VVS1", color: "D", cut: "理想切工", status: "待镶嵌", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g3", code: "ST-2099", type: "祖母绿", shape: "祖母绿切", carat: 1.20, sizeL: 7.0, sizeW: 5.0, setting: "主石位", clarity: "VS2", color: "翠绿", cut: "阶梯式", status: "需客户确认", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "内含物明显，需客户确认是否接受" },
  { id: "g4", code: "ST-2105", type: "红宝石", shape: "椭圆", carat: 1.05, sizeL: 7.0, sizeW: 5.0, setting: "主石位", clarity: "VS1", color: "鸽血红", cut: "明亮式", status: "已确认", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g5", code: "ST-2112", type: "钻石", shape: "圆形", carat: 0.05, sizeL: 2.0, sizeW: 2.0, setting: "围石B组", clarity: "VVS2", color: "E", cut: "极优良", status: "待镶嵌", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g6", code: "ST-2128", type: "碧玺", shape: "梨形", carat: 2.30, sizeL: 10.0, sizeW: 7.0, setting: "吊坠位", clarity: "SI1", color: "帕拉伊巴", cut: "明亮式", status: "待镶嵌", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "颜色饱和度高，内部有轻微棉絮" },
  { id: "g7", code: "ST-2135", type: "钻石", shape: "心形", carat: 0.50, sizeL: 5.0, sizeW: 5.0, setting: "副石位", clarity: "VS1", color: "F", cut: "理想切工", status: "已确认", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g8", code: "ST-2142", type: "蓝宝石", shape: "马眼形", carat: 0.75, sizeL: 8.0, sizeW: 4.0, setting: "围石C组", clarity: "VS2", color: "矢车菊蓝", cut: "明亮式", status: "待镶嵌", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g9", code: "ST-2150", type: "钻石", shape: "圆形", carat: 0.12, sizeL: 3.0, sizeW: 3.0, setting: "围石A组", clarity: "VVS1", color: "G", cut: "优良", status: "已确认", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g10", code: "ST-2167", type: "坦桑石", shape: "梨形", carat: 3.10, sizeL: 12.0, sizeW: 8.0, setting: "主石位", clarity: "SI2", color: "蓝紫", cut: "混合式", status: "需客户确认", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "尺寸偏大，需确认镶嵌方案" },
  { id: "g11", code: "ST-2173", type: "钻石", shape: "椭圆", carat: 0.30, sizeL: 5.0, sizeW: 3.5, setting: "围石B组", clarity: "VS2", color: "H", cut: "极优良", status: "待镶嵌", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g12", code: "ST-2189", type: "红宝石", shape: "圆形", carat: 0.20, sizeL: 3.5, sizeW: 3.5, setting: "围石C组", clarity: "SI1", color: "玫红", cut: "明亮式", status: "已确认", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g13", code: "ST-2195", type: "祖母绿", shape: "祖母绿切", carat: 0.65, sizeL: 6.0, sizeW: 4.5, setting: "副石位", clarity: "VS1", color: "绿", cut: "阶梯式", status: "待镶嵌", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g14", code: "ST-2201", type: "钻石", shape: "马眼形", carat: 0.40, sizeL: 6.0, sizeW: 3.0, setting: "围石A组", clarity: "VVS1", color: "E", cut: "理想切工", status: "待镶嵌", batchId: "batch-4", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g15", code: "ST-2218", type: "尖晶石", shape: "心形", carat: 1.80, sizeL: 7.5, sizeW: 7.5, setting: "吊坠位", clarity: "VS2", color: "绝地武士", cut: "明亮式", status: "已确认", batchId: "batch-4", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g16", code: "ST-2225", type: "钻石", shape: "圆形", carat: 0.03, sizeL: 1.5, sizeW: 1.5, setting: "围石B组", clarity: "VVS1", color: "D", cut: "理想切工", status: "待镶嵌", batchId: "batch-4", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g17", code: "ST-2231", type: "蓝宝石", shape: "梨形", carat: 1.50, sizeL: 9.0, sizeW: 6.0, setting: "主石位", clarity: "IF", color: "帕帕拉恰", cut: "明亮式", status: "需客户确认", batchId: "batch-5", orderNo: "ORD-77305", defectRemark: "颜色稀有，需客户确认最终款式" },
  { id: "g18", code: "ST-2248", type: "钻石", shape: "椭圆", carat: 0.15, sizeL: 4.0, sizeW: 3.0, setting: "围石C组", clarity: "VS1", color: "F", cut: "优良", status: "已确认", batchId: "batch-5", orderNo: "ORD-77305", defectRemark: "" },
];

const initialBatches: Batch[] = [
  { id: "batch-1", batchNo: "BATCH-202606001", orderNo: "ORD-88201", customerName: "周大福珠宝", expectedDate: "2026-07-15", remark: "高端定制婚戒系列", pendingCount: 3, confirmedCount: 1, defectCount: 0, createdAt: "2026-06-18 10:30:00" },
  { id: "batch-2", batchNo: "BATCH-202606002", orderNo: "ORD-88201", customerName: "周大福珠宝", expectedDate: "2026-07-15", remark: "配套吊坠与副石", pendingCount: 2, confirmedCount: 2, defectCount: 0, createdAt: "2026-06-18 11:15:00" },
  { id: "batch-3", batchNo: "BATCH-202606003", orderNo: "ORD-99102", customerName: "卡地亚精品", expectedDate: "2026-07-20", remark: "高端彩色宝石系列", pendingCount: 2, confirmedCount: 2, defectCount: 1, createdAt: "2026-06-19 09:00:00" },
  { id: "batch-4", batchNo: "BATCH-202606004", orderNo: "ORD-99102", customerName: "卡地亚精品", expectedDate: "2026-07-20", remark: "配钻补充批次", pendingCount: 2, confirmedCount: 1, defectCount: 0, createdAt: "2026-06-19 14:20:00" },
  { id: "batch-5", batchNo: "BATCH-202606005", orderNo: "ORD-77305", customerName: "蒂芙尼工坊", expectedDate: "2026-07-10", remark: "蓝宝石珍藏系列", pendingCount: 0, confirmedCount: 1, defectCount: 1, createdAt: "2026-06-20 08:45:00" },
];

const initialFormData: BatchFormData = {
  batchNo: "",
  orderNo: "",
  customerName: "",
  expectedDate: "",
  remark: "",
};

function App() {
  const [currentView, setCurrentView] = useState<ViewType>("workbench");
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [gemDetailGemId, setGemDetailGemId] = useState<string | null>(null);
  const [showGemDetailDrawer, setShowGemDetailDrawer] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [gemEditForm, setGemEditForm] = useState<GemstoneEditForm | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [batches] = useState<Batch[]>(initialBatches);
  const [gemstones, setGemstones] = useState<Gemstone[]>(initialGemstones);
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  const [showBatchForm, setShowBatchForm] = useState(false);

  const [gemAssignments, setGemAssignments] = useState<Record<SettingPositionType, string[]>>({
    "主石位": ["g4"],
    "围石A组": ["g2", "g9", "g14"],
    "围石B组": ["g5", "g11", "g16"],
    "备用石位": [],
  });
  const [selectedPosition, setSelectedPosition] = useState<SettingPositionType | null>(null);
  const [draggedGemId, setDraggedGemId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<SettingPositionType | null>(null);
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const [defectRemarks, setDefectRemarks] = useState<DefectRemark[]>([]);
  const [selectedGemId, setSelectedGemId] = useState<string>("");
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>([]);
  const [defectRemarkText, setDefectRemarkText] = useState("");
  const [needConfirm, setNeedConfirm] = useState(false);
  const [showDefectPanel, setShowDefectPanel] = useState(false);

  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [caratMin, setCaratMin] = useState("");
  const [caratMax, setCaratMax] = useState("");

  const updateGemstone = (gemId: string, updated: Partial<Gemstone>) => {
    setGemstones((prev) => prev.map((g) => (g.id === gemId ? { ...g, ...updated } : g)));
  };

  const validateGemForm = (form: GemstoneEditForm): FormErrors => {
    const errors: FormErrors = {};

    if (!form.code.trim()) {
      errors.code = "宝石编号不能为空";
    }

    const caratNum = parseFloat(form.carat);
    if (isNaN(caratNum) || caratNum <= 0) {
      errors.carat = "请输入有效的克拉重量（大于0的数字）";
    } else if (caratNum > 50) {
      errors.carat = "克拉重量异常（不能超过50ct）";
    }

    const sizeLNum = parseFloat(form.sizeL);
    const sizeWNum = parseFloat(form.sizeW);

    if (isNaN(sizeLNum) || sizeLNum <= 0) {
      errors.sizeL = "请输入有效的尺寸长度（大于0的数字）";
    } else if (sizeLNum > 30) {
      errors.sizeL = "尺寸长度异常（不能超过30mm）";
    }

    if (isNaN(sizeWNum) || sizeWNum <= 0) {
      errors.sizeW = "请输入有效的尺寸宽度（大于0的数字）";
    } else if (sizeWNum > 30) {
      errors.sizeW = "尺寸宽度异常（不能超过30mm）";
    }

    if (!errors.sizeL && !errors.sizeW) {
      const ratio = Math.max(sizeLNum, sizeWNum) / Math.min(sizeLNum, sizeWNum);
      if (ratio > 5) {
        errors.sizeL = "尺寸比例异常（长宽比不能超过5:1）";
      }
    }

    return errors;
  };

  const openGemDetailDrawer = (gemId: string) => {
    const gem = gemstones.find((g) => g.id === gemId);
    if (!gem) return;

    setGemDetailGemId(gemId);
    setGemEditForm({
      code: gem.code,
      type: gem.type,
      shape: gem.shape,
      carat: gem.carat.toString(),
      sizeL: gem.sizeL.toString(),
      sizeW: gem.sizeW.toString(),
      setting: gem.setting,
      clarity: gem.clarity,
      color: gem.color,
      cut: gem.cut,
      status: gem.status,
      defectRemark: gem.defectRemark || "",
    });
    setFormErrors({});
    setIsEditingMode(false);
    setShowGemDetailDrawer(true);
  };

  const handleEditFormChange = (field: keyof GemstoneEditForm, value: string) => {
    if (!gemEditForm) return;
    setGemEditForm((prev) => (prev ? { ...prev, [field]: value } : null));

    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  };

  const handleSaveGem = () => {
    if (!gemEditForm || !gemDetailGemId) return;

    const errors = validateGemForm(gemEditForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      if (firstError) {
        alert(firstError);
      }
      return;
    }

    const caratNum = parseFloat(gemEditForm.carat);
    const sizeLNum = parseFloat(gemEditForm.sizeL);
    const sizeWNum = parseFloat(gemEditForm.sizeW);

    updateGemstone(gemDetailGemId, {
      code: gemEditForm.code.trim(),
      type: gemEditForm.type,
      shape: gemEditForm.shape,
      carat: caratNum,
      sizeL: sizeLNum,
      sizeW: sizeWNum,
      setting: gemEditForm.setting,
      clarity: gemEditForm.clarity,
      color: gemEditForm.color,
      cut: gemEditForm.cut,
      status: gemEditForm.status,
      defectRemark: gemEditForm.defectRemark,
    });

    setIsEditingMode(false);
    setFormErrors({});
    alert("宝石信息已保存");
  };

  const closeGemDetailDrawer = () => {
    setShowGemDetailDrawer(false);
    setGemDetailGemId(null);
    setGemEditForm(null);
    setIsEditingMode(false);
    setFormErrors({});
  };

  const toggleDefectType = (type: string) => {
    setSelectedDefectTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleSubmitDefect = () => {
    if (!selectedGemId) {
      alert("请先选择一颗宝石");
      return;
    }
    if (selectedDefectTypes.length === 0) {
      alert("请至少选择一种缺陷类型");
      return;
    }
    const gem = gemstones.find((g) => g.id === selectedGemId);
    if (!gem) return;
    const newRemark: DefectRemark = {
      id: `defect-${Date.now()}`,
      gemId: selectedGemId,
      gemCode: gem.code,
      defectTypes: [...selectedDefectTypes],
      remark: defectRemarkText,
      needConfirm,
      createdAt: new Date().toLocaleString("zh-CN"),
    };
    setDefectRemarks((prev) => [newRemark, ...prev]);
    setSelectedGemId("");
    setSelectedDefectTypes([]);
    setDefectRemarkText("");
    setNeedConfirm(false);
    setShowDefectPanel(false);
  };

  const resetDefectForm = () => {
    setSelectedGemId("");
    setSelectedDefectTypes([]);
    setDefectRemarkText("");
    setNeedConfirm(false);
  };

  const assignedGemIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(gemAssignments).forEach((gemIds) => {
      gemIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [gemAssignments]);

  const unassignedGemstones = useMemo(() => gemstones.filter((g) => !assignedGemIds.has(g.id)), [gemstones, assignedGemIds]);

  const getGemsForPosition = (position: SettingPositionType): Gemstone[] => {
    const ids = gemAssignments[position] || [];
    return ids.map((id) => gemstones.find((g) => g.id === id)!).filter(Boolean);
  };

  const assignGemToPosition = (gemId: string, position: SettingPositionType) => {
    const posConfig = SETTING_POSITIONS.find((p) => p.key === position);
    if (!posConfig) return;
    const currentGems = gemAssignments[position] || [];
    if (currentGems.length >= posConfig.maxSlots) {
      alert(`该位置最多可放置 ${posConfig.maxSlots} 颗宝石`);
      return;
    }
    if (currentGems.includes(gemId)) return;
    setGemAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as SettingPositionType[]) {
        next[key] = next[key].filter((id) => id !== gemId);
      }
      next[position] = [...next[position], gemId];
      return next;
    });
  };

  const removeGemFromPosition = (gemId: string, position: SettingPositionType) => {
    setGemAssignments((prev) => ({ ...prev, [position]: prev[position].filter((id) => id !== gemId) }));
  };

  const handleDragStart = (e: React.DragEvent, gemId: string) => {
    setDraggedGemId(gemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", gemId);
  };

  const handleDragEnd = () => {
    setDraggedGemId(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, position: SettingPositionType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPosition(position);
  };

  const handleDragLeave = () => setDragOverPosition(null);

  const handleDrop = (e: React.DragEvent, position: SettingPositionType) => {
    e.preventDefault();
    const gemId = e.dataTransfer.getData("text/plain") || draggedGemId;
    if (gemId) assignGemToPosition(gemId, position);
    setDraggedGemId(null);
    setDragOverPosition(null);
  };

  const handlePositionClick = (position: SettingPositionType) => {
    setSelectedPosition(position);
    setShowAssignPanel(true);
  };

  const closeAssignPanel = () => {
    setSelectedPosition(null);
    setShowAssignPanel(false);
  };

  const toggleShape = (shape: string) => {
    setSelectedShapes((prev) => (prev.includes(shape) ? prev.filter((s) => s !== shape) : [...prev, shape]));
  };

  const resetFilters = () => {
    setSelectedShapes([]);
    setSizeMin("");
    setSizeMax("");
    setCaratMin("");
    setCaratMax("");
  };

  const hasActiveFilters = selectedShapes.length > 0 || sizeMin !== "" || sizeMax !== "" || caratMin !== "" || caratMax !== "";

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
  }, [gemstones, selectedShapes, sizeMin, sizeMax, caratMin, caratMax]);

  const displayedGemstones = hasActiveFilters ? filteredGemstones : gemstones;

  const handleFormChange = (field: keyof BatchFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateBatch = () => {
    if (!formData.batchNo || !formData.orderNo || !formData.customerName) {
      alert("请填写批次编号、订单号和客户名称");
      return;
    }
    alert("批次创建成功（示例）");
    setFormData(initialFormData);
    setShowBatchForm(false);
  };

  const totalPending = batches.reduce((sum, b) => sum + b.pendingCount, 0);
  const totalConfirmed = batches.reduce((sum, b) => sum + b.confirmedCount, 0);
  const totalDefect = batches.reduce((sum, b) => sum + b.defectCount, 0);
  const totalCarat = gemstones.reduce((sum, g) => sum + g.carat, 0);

  const orderList = useMemo(() => {
    const orderMap = new Map<
      string,
      {
        orderNo: string;
        customerName: string;
        expectedDate: string;
        batches: Batch[];
        gems: Gemstone[];
        totalCount: number;
        totalCarat: number;
        pendingCount: number;
        confirmedCount: number;
        needConfirmCount: number;
      }
    >();

    batches.forEach((batch) => {
      if (!orderMap.has(batch.orderNo)) {
        orderMap.set(batch.orderNo, {
          orderNo: batch.orderNo,
          customerName: batch.customerName,
          expectedDate: batch.expectedDate,
          batches: [],
          gems: [],
          totalCount: 0,
          totalCarat: 0,
          pendingCount: 0,
          confirmedCount: 0,
          needConfirmCount: 0,
        });
      }
      orderMap.get(batch.orderNo)!.batches.push(batch);
    });

    gemstones.forEach((gem) => {
      if (orderMap.has(gem.orderNo)) {
        const order = orderMap.get(gem.orderNo)!;
        order.gems.push(gem);
        order.totalCount++;
        order.totalCarat += gem.carat;
        if (gem.status === "待镶嵌") order.pendingCount++;
        else if (gem.status === "已确认") order.confirmedCount++;
        else if (gem.status === "需客户确认") order.needConfirmCount++;
      }
    });

    return Array.from(orderMap.values());
  }, [batches, gemstones]);

  const currentOrder = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderList.find((o) => o.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderList]);

  const getStatusClass = (status: SortingStatus) => (status === "已确认" ? "confirmed" : status === "需客户确认" ? "pending" : "waiting");

  const renderStatusTag = (status: SortingStatus) => (
    <span className={`gem-status gem-status-${getStatusClass(status)}`}>{status}</span>
  );

  const renderGemCard = (g: Gemstone, index: number) => (
    <article key={g.id} className="gem-card clickable" onClick={() => openGemDetailDrawer(g.id)}>
      <div className="gem-index">
        <b>{String(index + 1).padStart(2, "0")}</b>
      </div>
      <div className="gem-info">
        <div className="gem-title-row">
          <h3>{g.code}</h3>
          <span className="gem-type-tag">{g.type}</span>
          {renderStatusTag(g.status)}
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
  );

  const gemDetail = gemDetailGemId ? gemstones.find((g) => g.id === gemDetailGemId) : null;

  const renderWorkbench = () => (
    <>
      <section className="metrics">
        {project.metrics.map((metric: string, index: number) => (
          <article key={metric}>
            <small>{metric}</small>
            <strong>{[batches.length, totalPending || 14, totalDefect || 7, totalCarat.toFixed(2)][index]}</strong>
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
            <button className="primary" onClick={() => setShowBatchForm(!showBatchForm)}>
              {showBatchForm ? "取消创建" : "+ 创建批次"}
            </button>
          </div>

          {showBatchForm && (
            <div className="batch-form">
              <h3>新建宝石批次</h3>
              <div className="field-grid batch-form-grid">
                <label>
                  <span>批次编号 *</span>
                  <input placeholder="如：BATCH-202606001" value={formData.batchNo} onChange={(e) => handleFormChange("batchNo", e.target.value)} />
                </label>
                <label>
                  <span>订单号 *</span>
                  <input placeholder="如：ORD-88201" value={formData.orderNo} onChange={(e) => handleFormChange("orderNo", e.target.value)} />
                </label>
                <label>
                  <span>客户名称 *</span>
                  <input placeholder="如：周大福珠宝" value={formData.customerName} onChange={(e) => handleFormChange("customerName", e.target.value)} />
                </label>
                <label>
                  <span>预计交付日期</span>
                  <input type="date" value={formData.expectedDate} onChange={(e) => handleFormChange("expectedDate", e.target.value)} />
                </label>
                <label className="full-width">
                  <span>批次备注</span>
                  <input placeholder="填写批次相关备注信息" value={formData.remark} onChange={(e) => handleFormChange("remark", e.target.value)} />
                </label>
              </div>
              <div className="batch-form-actions">
                <button onClick={() => setShowBatchForm(false)}>取消</button>
                <button className="primary" onClick={handleCreateBatch}>确认创建</button>
              </div>
            </div>
          )}

          <div className="batch-list">
            {batches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💎</div>
                <p>暂无批次数据</p>
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
                        {batch.expectedDate && <span className="batch-date">📅 预计交付：{batch.expectedDate}</span>}
                      </p>
                      {batch.remark && <p className="batch-remark">📝 {batch.remark}</p>}
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
            {hasActiveFilters && <button className="reset-btn" onClick={resetFilters}>重置</button>}
          </div>
          <div className="filter-group">
            <h3>形状</h3>
            <div className="chips">
              {SHAPE_OPTIONS.map((shape) => (
                <button key={shape} className={selectedShapes.includes(shape) ? "active" : ""} onClick={() => toggleShape(shape)}>
                  {shape}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>尺寸区间 (mm)</h3>
            <div className="range-inputs">
              <input type="number" placeholder="最小" value={sizeMin} min="0" step="0.5" onChange={(e) => setSizeMin(e.target.value)} />
              <span className="range-sep">—</span>
              <input type="number" placeholder="最大" value={sizeMax} min="0" step="0.5" onChange={(e) => setSizeMax(e.target.value)} />
            </div>
          </div>
          <div className="filter-group">
            <h3>克拉重量区间 (ct)</h3>
            <div className="range-inputs">
              <input type="number" placeholder="最小" value={caratMin} min="0" step="0.01" onChange={(e) => setCaratMin(e.target.value)} />
              <span className="range-sep">—</span>
              <input type="number" placeholder="最大" value={caratMax} min="0" step="0.01" onChange={(e) => setCaratMax(e.target.value)} />
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
            <span className="result-count">共 {displayedGemstones.length} 条记录</span>
          </div>
          {displayedGemstones.length === 0 ? (
            <div className="empty-state filter-empty">
              <div className="empty-icon">🔍</div>
              <p>没有找到符合条件的宝石记录</p>
              <button className="reset-btn" onClick={resetFilters}>清除筛选条件</button>
            </div>
          ) : (
            <div className="gem-list">
              {displayedGemstones.map((g, index) => renderGemCard(g, index))}
            </div>
          )}
        </section>
      </section>

      <section className="setting-diagram-section">
        <section className="panel setting-panel">
          <div className="heading">
            <div>
              <p>位置示意</p>
              <h2>戒指镶嵌位置示意图</h2>
            </div>
            <span className="result-count">已分配 {assignedGemIds.size} / {gemstones.length} 颗宝石</span>
          </div>
          <div className="setting-diagram-wrapper">
            <div className="ring-diagram">
              <div className="ring-outer-ring">
                <div
                  className={`position-area position-outer ${dragOverPosition === "围石B组" ? "drag-over" : ""} ${selectedPosition === "围石B组" ? "selected" : ""}`}
                  onClick={() => handlePositionClick("围石B组")}
                  onDragOver={(e) => handleDragOver(e, "围石B组")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "围石B组")}
                >
                  <span className="position-label">围石B组</span>
                  <span className="position-count">{getGemsForPosition("围石B组").length} / 12</span>
                </div>
              </div>
              <div className="ring-middle-ring">
                <div
                  className={`position-area position-middle ${dragOverPosition === "围石A组" ? "drag-over" : ""} ${selectedPosition === "围石A组" ? "selected" : ""}`}
                  onClick={() => handlePositionClick("围石A组")}
                  onDragOver={(e) => handleDragOver(e, "围石A组")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "围石A组")}
                >
                  <span className="position-label">围石A组</span>
                  <span className="position-count">{getGemsForPosition("围石A组").length} / 8</span>
                </div>
              </div>
              <div className="ring-center">
                <div
                  className={`position-area position-center ${dragOverPosition === "主石位" ? "drag-over" : ""} ${selectedPosition === "主石位" ? "selected" : ""}`}
                  onClick={() => handlePositionClick("主石位")}
                  onDragOver={(e) => handleDragOver(e, "主石位")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "主石位")}
                >
                  <span className="position-label">主石位</span>
                  <span className="position-count">{getGemsForPosition("主石位").length} / 1</span>
                </div>
              </div>
              <div className="ring-backup">
                <div
                  className={`position-area position-backup ${dragOverPosition === "备用石位" ? "drag-over" : ""} ${selectedPosition === "备用石位" ? "selected" : ""}`}
                  onClick={() => handlePositionClick("备用石位")}
                  onDragOver={(e) => handleDragOver(e, "备用石位")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "备用石位")}
                >
                  <span className="position-label">备用石位</span>
                  <span className="position-count">{getGemsForPosition("备用石位").length} / 4</span>
                </div>
              </div>
            </div>
            <div className="setting-legend">
              <h3>位置说明</h3>
              {SETTING_POSITIONS.map((pos) => (
                <div key={pos.key} className="legend-item">
                  <span className="legend-dot" style={{ background: pos.color }}></span>
                  <div className="legend-info">
                    <strong>{pos.label}</strong>
                    <small>{pos.description}</small>
                  </div>
                  <span className="legend-count">
                    {getGemsForPosition(pos.key).length}/{pos.maxSlots}
                  </span>
                </div>
              ))}
              <p className="setting-tip">💡 点击位置查看宝石清单，或从右侧拖拽未分配宝石到对应位置</p>
            </div>
          </div>
        </section>

        <aside className="panel unassigned-panel">
          <div className="heading">
            <div>
              <p>待分配</p>
              <h2>未分配宝石</h2>
            </div>
            <span className="result-count">{unassignedGemstones.length} 颗</span>
          </div>
          {unassignedGemstones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <p>所有宝石已分配完毕</p>
            </div>
          ) : (
            <div className="unassigned-list">
              {unassignedGemstones.map((g) => (
                <div
                  key={g.id}
                  className={`unassigned-gem ${draggedGemId === g.id ? "dragging" : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, g.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="unassigned-gem-icon">💎</div>
                  <div className="unassigned-gem-info">
                    <h4>{g.code}</h4>
                    <p>{g.type} · {g.shape} · {g.carat}ct</p>
                  </div>
                  <button
                    className="assign-quick-btn"
                    onClick={() => {
                      if (selectedPosition) assignGemToPosition(g.id, selectedPosition);
                      else alert("请先在左侧点击选择一个目标位置");
                    }}
                  >
                    分配
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      {showAssignPanel && selectedPosition && (
        <div className="modal-overlay" onClick={closeAssignPanel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>位置详情</p>
                <h2>{selectedPosition} - 宝石清单</h2>
              </div>
              <button className="modal-close" onClick={closeAssignPanel}>✕</button>
            </div>
            <div className="modal-body">
              <div className="assigned-gems-section">
                <h3>
                  已分配宝石 ({getGemsForPosition(selectedPosition).length}/
                  {SETTING_POSITIONS.find((p) => p.key === selectedPosition)?.maxSlots})
                </h3>
                {getGemsForPosition(selectedPosition).length === 0 ? (
                  <div className="empty-state small">
                    <p>暂无分配的宝石</p>
                  </div>
                ) : (
                  <div className="assigned-gems-list">
                    {getGemsForPosition(selectedPosition).map((g) => (
                      <div key={g.id} className="assigned-gem-item">
                        <div className="assigned-gem-icon">💎</div>
                        <div className="assigned-gem-info">
                          <h4>{g.code}</h4>
                          <p>{g.type} · {g.shape} · {g.carat}ct · {g.sizeL}×{g.sizeW}mm</p>
                        </div>
                        <button className="remove-btn" onClick={() => removeGemFromPosition(g.id, selectedPosition)}>移除</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="unassigned-gems-section">
                <h3>可分配宝石 ({unassignedGemstones.length})</h3>
                <p className="section-tip">点击"分配"按钮将宝石添加到该位置</p>
                {unassignedGemstones.length === 0 ? (
                  <div className="empty-state small">
                    <p>没有可分配的宝石</p>
                  </div>
                ) : (
                  <div className="unassigned-gems-select-list">
                    {unassignedGemstones.map((g) => (
                      <div key={g.id} className="unassigned-gem-select-item">
                        <div className="unassigned-gem-icon small">💎</div>
                        <div className="unassigned-gem-info">
                          <h4>{g.code}</h4>
                          <p>{g.type} · {g.shape} · {g.carat}ct</p>
                        </div>
                        <button className="primary assign-btn" onClick={() => assignGemToPosition(g.id, selectedPosition)}>+ 分配</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="defect-section">
        <section className="panel defect-panel">
          <div className="heading">
            <div>
              <p>缺陷管理</p>
              <h2>宝石缺陷备注</h2>
            </div>
            <div className="heading-actions">
              <button
                className="primary"
                onClick={() => {
                  setShowDefectPanel(!showDefectPanel);
                  if (showDefectPanel) resetDefectForm();
                }}
              >
                {showDefectPanel ? "取消" : "+ 新增缺陷备注"}
              </button>
            </div>
          </div>
          {showDefectPanel && (
            <div className="defect-form">
              <h3>登记缺陷信息</h3>
              <div className="defect-form-body">
                <div className="defect-form-left">
                  <label className="defect-field">
                    <span>选择宝石 *</span>
                    <select value={selectedGemId} onChange={(e) => setSelectedGemId(e.target.value)}>
                      <option value="">-- 请选择宝石 --</option>
                      {gemstones.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.code} - {g.type} {g.shape} {g.carat}ct
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="defect-field">
                    <span>缺陷类型 *</span>
                    <div className="defect-type-chips">
                      {DEFECT_TYPE_OPTIONS.map((dt) => (
                        <button
                          key={dt.label}
                          className={`defect-type-chip ${selectedDefectTypes.includes(dt.label) ? "active" : ""}`}
                          onClick={() => toggleDefectType(dt.label)}
                          type="button"
                        >
                          <span className="dt-icon">{dt.icon}</span>
                          {dt.label}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="defect-field">
                    <span>备注说明</span>
                    <textarea
                      placeholder="填写缺陷详细描述"
                      value={defectRemarkText}
                      onChange={(e) => setDefectRemarkText(e.target.value)}
                      rows={3}
                    />
                  </label>
                  <div className="defect-confirm-row">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={needConfirm} onChange={(e) => setNeedConfirm(e.target.checked)} />
                      <span>需要客户确认</span>
                    </label>
                  </div>
                </div>
                <div className="defect-form-right">
                  {selectedGemId && (() => {
                    const gem = gemstones.find((g) => g.id === selectedGemId);
                    if (!gem) return null;
                    return (
                      <div className="defect-gem-preview">
                        <h4>宝石信息预览</h4>
                        <div className="preview-row"><span>编号</span><strong>{gem.code}</strong></div>
                        <div className="preview-row"><span>种类</span><strong>{gem.type}</strong></div>
                        <div className="preview-row"><span>形状</span><strong>{gem.shape}</strong></div>
                        <div className="preview-row"><span>克拉</span><strong>{gem.carat}ct</strong></div>
                        <div className="preview-row"><span>尺寸</span><strong>{gem.sizeL}×{gem.sizeW}mm</strong></div>
                        <div className="preview-row"><span>净度</span><strong>{gem.clarity}</strong></div>
                        <div className="preview-row"><span>颜色</span><strong>{gem.color}</strong></div>
                        <div className="preview-row"><span>镶嵌位</span><strong>{gem.setting}</strong></div>
                        <div className="preview-row"><span>状态</span><strong>{gem.status}</strong></div>
                      </div>
                    );
                  })()}
                  {!selectedGemId && (
                    <div className="defect-gem-preview-empty">
                      <div className="empty-icon">💎</div>
                      <p>选择宝石后查看详情</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="defect-form-actions">
                <button onClick={() => { resetDefectForm(); setShowDefectPanel(false); }}>取消</button>
                <button className="primary" onClick={handleSubmitDefect}>提交缺陷备注</button>
              </div>
            </div>
          )}
          <div className="defect-records">
            {defectRemarks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>暂无缺陷备注记录</p>
              </div>
            ) : (
              defectRemarks.map((dr, index) => (
                <article key={dr.id} className="defect-card">
                  <div className="defect-card-index">
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </div>
                  <div className="defect-card-body">
                    <div className="defect-card-header">
                      <h3>{dr.gemCode}</h3>
                      <div className="defect-type-tags">
                        {dr.defectTypes.map((dt) => {
                          const opt = DEFECT_TYPE_OPTIONS.find((o) => o.label === dt);
                          return (
                            <span key={dt} className="defect-tag">
                              {opt?.icon} {dt}
                            </span>
                          );
                        })}
                      </div>
                      {dr.needConfirm && <span className="confirm-badge">需客户确认</span>}
                    </div>
                    {dr.remark && <p className="defect-remark-text">{dr.remark}</p>}
                    <span className="defect-time">{dr.createdAt}</span>
                  </div>
                </article>
              ))
            )}
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
          {defectRemarks.length > 0 && (
            <>
              <div className="records-section-label">缺陷备注摘要</div>
              {defectRemarks.map((dr, index) => (
                <article key={dr.id} className="workbench-card defect-workbench">
                  <b className="workbench-index defect-index">{String(index + 1).padStart(2, "0")}</b>
                  <div>
                    <h3>{dr.gemCode}</h3>
                    <p>
                      {dr.defectTypes.join(" · ")}
                      {dr.needConfirm && <span className="wb-confirm-tag">需客户确认</span>}
                      {dr.remark && ` — ${dr.remark}`}
                    </p>
                  </div>
                </article>
              ))}
            </>
          )}
          <div className="records-section-label">系统记录</div>
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
    </>
  );

  const renderOrderList = () => (
    <section className="panel order-list-panel">
      <div className="heading">
        <div>
          <p>订单管理</p>
          <h2>订单宝石清单</h2>
        </div>
        <span className="result-count">共 {orderList.length} 个订单</span>
      </div>
      {orderList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>暂无订单数据</p>
        </div>
      ) : (
        <div className="order-list">
          {orderList.map((order) => (
            <article
              key={order.orderNo}
              className="order-card clickable"
              onClick={() => {
                setSelectedOrderNo(order.orderNo);
                setCurrentView("orderDetail");
              }}
            >
              <div className="order-header">
                <div className="order-index">
                  <b>📋</b>
                </div>
                <div className="order-info">
                  <div className="order-title-row">
                    <h3>{order.orderNo}</h3>
                    <span className="batch-tag">{order.customerName}</span>
                    {order.expectedDate && <span className="order-date">📅 预计交付：{order.expectedDate}</span>}
                  </div>
                  <p className="order-sub">
                    包含 {order.batches.length} 个批次 · {order.totalCount} 颗宝石 · ⚖️ {order.totalCarat.toFixed(2)} ct
                  </p>
                </div>
                <div className="order-arrow">→</div>
              </div>
              <div className="order-stats">
                <div className="stat-item stat-pending">
                  <span className="stat-label">待镶嵌</span>
                  <span className="stat-value">{order.pendingCount}</span>
                </div>
                <div className="stat-item stat-confirmed">
                  <span className="stat-label">已确认</span>
                  <span className="stat-value">{order.confirmedCount}</span>
                </div>
                <div className="stat-item stat-needconfirm">
                  <span className="stat-label">需确认</span>
                  <span className="stat-value">{order.needConfirmCount}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderOrderDetail = () => {
    if (!currentOrder) return null;
    return (
      <section className="panel order-detail-panel">
        <div className="heading">
          <div className="order-detail-heading-left">
            <button
              className="back-btn"
              onClick={() => {
                setCurrentView("orderList");
                setSelectedOrderNo(null);
              }}
            >
              ← 返回订单列表
            </button>
            <div className="order-detail-title-wrap">
              <p style={{ marginTop: 8 }}>订单详情</p>
              <h2>{currentOrder.orderNo} · 宝石清单</h2>
            </div>
          </div>
          <div className="order-detail-summary">
            <div>
              <small>客户</small>
              <strong>{currentOrder.customerName}</strong>
            </div>
            <div>
              <small>批次</small>
              <strong>{currentOrder.batches.length}</strong>
            </div>
            <div>
              <small>宝石数量</small>
              <strong>{currentOrder.totalCount}</strong>
            </div>
            <div>
              <small>总克拉</small>
              <strong>{currentOrder.totalCarat.toFixed(2)} ct</strong>
            </div>
          </div>
        </div>

        <div className="order-detail-stats-row">
          <div className="stat-item stat-pending">
            <span className="stat-label">待镶嵌</span>
            <span className="stat-value">{currentOrder.pendingCount}</span>
          </div>
          <div className="stat-item stat-confirmed">
            <span className="stat-label">已确认</span>
            <span className="stat-value">{currentOrder.confirmedCount}</span>
          </div>
          <div className="stat-item stat-needconfirm">
            <span className="stat-label">需客户确认</span>
            <span className="stat-value">{currentOrder.needConfirmCount}</span>
          </div>
        </div>

        <div className="order-batches">
          {currentOrder.batches.map((batch) => {
            const batchGems = currentOrder.gems.filter((g) => g.batchId === batch.id);
            const groupedBySetting = new Map<string, Gemstone[]>();
            batchGems.forEach((g) => {
              if (!groupedBySetting.has(g.setting)) groupedBySetting.set(g.setting, []);
              groupedBySetting.get(g.setting)!.push(g);
            });
            const batchTotalCarat = batchGems.reduce((sum, g) => sum + g.carat, 0);

            return (
              <div key={batch.id} className="order-batch">
                <div className="order-batch-header">
                  <div>
                    <h3>📦 {batch.batchNo}</h3>
                    {batch.remark && <p className="batch-remark-inline">📝 {batch.remark}</p>}
                  </div>
                  <div className="order-batch-meta">
                    <span>{batchGems.length} 颗</span>
                    <span>⚖️ {batchTotalCarat.toFixed(2)} ct</span>
                  </div>
                </div>

                {batchGems.length === 0 ? (
                  <div className="empty-state small">
                    <p>该批次暂无宝石数据</p>
                  </div>
                ) : (
                  <div className="order-settings">
                    {Array.from(groupedBySetting.entries()).map(([setting, settingGems]) => {
                      const groupedByStatus = new Map<SortingStatus, Gemstone[]>();
                      settingGems.forEach((g) => {
                        if (!groupedByStatus.has(g.status)) groupedByStatus.set(g.status, []);
                        groupedByStatus.get(g.status)!.push(g);
                      });
                      const settingCarat = settingGems.reduce((sum, g) => sum + g.carat, 0);

                      return (
                        <div key={setting} className="order-setting-group">
                          <div className="order-setting-header">
                            <h4>📍 {setting}</h4>
                            <span className="setting-count-badge">
                              {settingGems.length} 颗 · ⚖️ {settingCarat.toFixed(2)} ct
                            </span>
                          </div>
                          <div className="order-status-groups">
                            {Array.from(groupedByStatus.entries()).map(([status, statusGems]) => {
                              const statusCarat = statusGems.reduce((sum, g) => sum + g.carat, 0);
                              return (
                                <div key={status} className="order-status-group">
                                  <div className="order-status-header">
                                    {renderStatusTag(status)}
                                    <span className="order-status-count">
                                      {statusGems.length} 颗 · ⚖️ {statusCarat.toFixed(2)} ct
                                    </span>
                                  </div>
                                  <div className="gem-list compact">
                                    {statusGems.map((g, idx) => renderGemCard(g, idx))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderGemDetailDrawer = () => {
    if (!showGemDetailDrawer || !gemEditForm || !gemDetail) return null;

    const handleCancelEdit = () => {
      setIsEditingMode(false);
      setFormErrors({});
      const gem = gemstones.find((g) => g.id === gemDetailGemId);
      if (gem) {
        setGemEditForm({
          code: gem.code,
          type: gem.type,
          shape: gem.shape,
          carat: gem.carat.toString(),
          sizeL: gem.sizeL.toString(),
          sizeW: gem.sizeW.toString(),
          setting: gem.setting,
          clarity: gem.clarity,
          color: gem.color,
          cut: gem.cut,
          status: gem.status,
          defectRemark: gem.defectRemark || "",
        });
      }
    };

    const renderField = (
      label: string,
      field: keyof GemstoneEditForm,
      value: string,
      editable: boolean = true,
      type: string = "text",
      options?: string[]
    ) => {
      const error = formErrors[field as keyof FormErrors];

      if (!isEditingMode || !editable) {
        return (
          <div className="drawer-field">
            <label className="drawer-field-label">{label}</label>
            <div className="drawer-field-value">{value || "-"}</div>
          </div>
        );
      }

      if (options) {
        return (
          <div className="drawer-field">
            <label className="drawer-field-label">{label}</label>
            <select
              className={`drawer-field-input ${error ? "error" : ""}`}
              value={value}
              onChange={(e) => handleEditFormChange(field, e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {error && <div className="field-error">{error}</div>}
          </div>
        );
      }

      if (field === "defectRemark") {
        return (
          <div className="drawer-field full-width">
            <label className="drawer-field-label">{label}</label>
            <textarea
              className={`drawer-field-input ${error ? "error" : ""}`}
              value={value}
              onChange={(e) => handleEditFormChange(field, e.target.value)}
              placeholder="填写缺陷备注信息"
              rows={3}
            />
            {error && <div className="field-error">{error}</div>}
          </div>
        );
      }

      return (
        <div className="drawer-field">
          <label className="drawer-field-label">{label}</label>
          <input
            type={type}
            className={`drawer-field-input ${error ? "error" : ""}`}
            value={value}
            onChange={(e) => handleEditFormChange(field, e.target.value)}
            placeholder={`请输入${label}`}
            step={type === "number" ? "0.01" : undefined}
          />
          {error && <div className="field-error">{error}</div>}
        </div>
      );
    };

    const settingOptions = ["主石位", "围石A组", "围石B组", "围石C组", "副石位", "吊坠位", "备用石位"];
    const clarityOptions = ["IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "SI3", "I1", "I2", "I3"];
    const typeOptions = ["钻石", "红宝石", "蓝宝石", "祖母绿", "碧玺", "坦桑石", "尖晶石", "翡翠", "其他"];
    const colorOptions = ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "皇家蓝", "矢车菊蓝", "鸽血红", "玫红", "翠绿", "绿", "帕拉伊巴", "蓝紫", "绝地武士", "帕帕拉恰", "其他"];
    const cutOptions = ["理想切工", "极优良", "优良", "良好", "一般", "明亮式", "阶梯式", "混合式", "其他"];

    return (
      <>
        <div className="drawer-overlay" onClick={closeGemDetailDrawer} />
        <div className="gem-detail-drawer">
          <div className="drawer-header">
            <div>
              <p>宝石详情</p>
              <h2>
                {gemEditForm.code} · {gemEditForm.type}
                {renderStatusTag(gemEditForm.status)}
              </h2>
            </div>
            <div className="drawer-header-actions">
              {!isEditingMode && (
                <button className="primary edit-btn" onClick={() => setIsEditingMode(true)}>
                  ✎ 编辑
                </button>
              )}
              <button className="drawer-close" onClick={closeGemDetailDrawer}>✕</button>
            </div>
          </div>

          <div className="drawer-body">
            <div className="drawer-icon-section">
              <div className="drawer-gem-icon">💎</div>
              <div className="drawer-quick-stats">
                <div className="quick-stat">
                  <small>克拉重量</small>
                  <strong>{gemEditForm.carat} ct</strong>
                </div>
                <div className="quick-stat">
                  <small>尺寸</small>
                  <strong>{gemEditForm.sizeL} × {gemEditForm.sizeW} mm</strong>
                </div>
                <div className="quick-stat">
                  <small>形状</small>
                  <strong>{gemEditForm.shape}</strong>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">核心信息</h3>
              <div className="drawer-field-grid">
                {renderField("宝石编号 *", "code", gemEditForm.code, true, "text")}
                {renderField("宝石种类", "type", gemEditForm.type, true, "text", typeOptions)}
                {renderField("形状", "shape", gemEditForm.shape, true, "text", SHAPE_OPTIONS)}
                {renderField("克拉重量 *", "carat", gemEditForm.carat, true, "number")}
                {renderField("尺寸长度 (mm) *", "sizeL", gemEditForm.sizeL, true, "number")}
                {renderField("尺寸宽度 (mm) *", "sizeW", gemEditForm.sizeW, true, "number")}
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">品质参数</h3>
              <div className="drawer-field-grid">
                {renderField("净度", "clarity", gemEditForm.clarity, true, "text", clarityOptions)}
                {renderField("颜色", "color", gemEditForm.color, true, "text", colorOptions)}
                {renderField("切工", "cut", gemEditForm.cut, true, "text", cutOptions)}
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">镶嵌信息</h3>
              <div className="drawer-field-grid">
                {renderField("镶嵌位置", "setting", gemEditForm.setting, true, "text", settingOptions)}
                {renderField("分拣状态", "status", gemEditForm.status, true, "text", STATUS_OPTIONS)}
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">系统信息</h3>
              <div className="drawer-field-grid">
                <div className="drawer-field">
                  <label className="drawer-field-label">所属订单</label>
                  <div className="drawer-field-value">{gemDetail.orderNo}</div>
                </div>
                <div className="drawer-field">
                  <label className="drawer-field-label">批次ID</label>
                  <div className="drawer-field-value">{gemDetail.batchId}</div>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">缺陷备注</h3>
              <div className="drawer-field-grid">
                {renderField("备注说明", "defectRemark", gemEditForm.defectRemark, true, "textarea")}
              </div>
            </div>
          </div>

          {isEditingMode && (
            <div className="drawer-footer">
              <button onClick={handleCancelEdit}>取消</button>
              <button className="primary" onClick={handleSaveGem}>保存修改</button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <main className="app">
      <section className="hero">
        <p>{project.id} · 源提示词{project.sourceNo} · Port {project.port}</p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="view-tabs">
        <button
          className={currentView === "workbench" ? "tab-btn active" : "tab-btn"}
          onClick={() => setCurrentView("workbench")}
        >
          🛠️ 分拣工作台
        </button>
        <button
          className={currentView === "orderList" || currentView === "orderDetail" ? "tab-btn active" : "tab-btn"}
          onClick={() => {
            setCurrentView("orderList");
            setSelectedOrderNo(null);
          }}
        >
          📋 按订单查看
        </button>
      </section>

      {currentView === "workbench" && renderWorkbench()}
      {currentView === "orderList" && renderOrderList()}
      {currentView === "orderDetail" && renderOrderDetail()}
      {renderGemDetailDrawer()}
    </main>
  );
}

export default App;
