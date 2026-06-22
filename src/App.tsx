import { useState, useMemo } from "react";
import "./styles.css";

type SettingPositionType = "主石位" | "围石A组" | "围石B组" | "备用石位";
type ViewType = "workbench" | "orderList" | "orderDetail" | "kanban" | "review";
type SortingStatus = "待分拣" | "待镶嵌" | "需客户确认" | "已完成";
type ReviewStatus = "未复核" | "复核中" | "复核通过" | "复核不通过";
type IssueSeverity = "error" | "warning" | "info";
type IssueType = "main_stone_duplicate" | "main_stone_missing" | "surround_stone_insufficient" | "customer_confirm_pending" | "stone_not_completed" | "position_mismatch";

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
  createdAt: string;
  reviewStatus?: ReviewStatus;
  reviewRemark?: string;
  reviewedAt?: string;
  isDeliverable?: boolean;
}

interface ReviewIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  gemIds: string[];
  position?: string;
  action?: string;
  resolved: boolean;
  manuallyResolved: boolean;
}

interface PositionReviewItem {
  position: string;
  requiredCount: number;
  actualCount: number;
  gems: Gemstone[];
  status: "ok" | "warning" | "error";
}

interface BatchReviewResult {
  batchId: string;
  batchNo: string;
  orderNo: string;
  customerName: string;
  reviewedAt: string;
  totalGems: number;
  completedGems: number;
  pendingGems: number;
  needConfirmGems: number;
  positions: PositionReviewItem[];
  issues: ReviewIssue[];
  canDeliver: boolean;
  pass: boolean;
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
const STATUS_OPTIONS: SortingStatus[] = ["待分拣", "待镶嵌", "需客户确认", "已完成"];

const GEM_TYPE_OPTIONS = ["钻石", "红宝石", "蓝宝石", "祖母绿", "碧玺", "坦桑石", "尖晶石", "翡翠", "海蓝宝", "摩根石", "沙弗莱", "帕拉伊巴", "紫水晶", "黄水晶", "石榴石", "托帕石", "橄榄石"];
const SETTING_OPTIONS = ["主石位", "围石A组", "围石B组", "围石C组", "副石位", "吊坠位", "备用石位", "耳钉位", "戒臂位"];

interface ParsedGemstone {
  lineIndex: number;
  rawText: string;
  code?: string;
  type?: string;
  shape?: string;
  carat?: number;
  sizeL?: number;
  sizeW?: number;
  setting?: string;
  missingFields: string[];
  hasSizeFormatError: boolean;
  isDuplicate: boolean;
}

interface ParseResult {
  totalLines: number;
  successCount: number;
  duplicateCodes: string[];
  missingFieldItems: ParsedGemstone[];
  sizeErrorItems: ParsedGemstone[];
  parsedItems: ParsedGemstone[];
  validItems: ParsedGemstone[];
}

type BatchStatusCounts = {
  sortingCount: number;
  pendingCount: number;
  completedCount: number;
  defectCount: number;
};

const KANBAN_STATUSES: { key: SortingStatus; label: string; color: string; icon: string }[] = [
  { key: "待分拣", label: "待分拣", color: "#64748b", icon: "📥" },
  { key: "待镶嵌", label: "待镶嵌", color: "#f59e0b", icon: "⏳" },
  { key: "需客户确认", label: "需客户确认", color: "#be123c", icon: "⚠️" },
  { key: "已完成", label: "已完成", color: "#0f766e", icon: "✅" },
];

const initialGemstones: Gemstone[] = [
  { id: "g1", code: "ST-2048", type: "蓝宝石", shape: "椭圆", carat: 0.85, sizeL: 6.0, sizeW: 4.0, setting: "主石位", clarity: "VS1", color: "皇家蓝", cut: "明亮式", status: "待镶嵌", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g2", code: "ST-2061", type: "钻石", shape: "圆形", carat: 0.08, sizeL: 2.5, sizeW: 2.5, setting: "围石A组", clarity: "VVS1", color: "D", cut: "理想切工", status: "待镶嵌", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g3", code: "ST-2099", type: "祖母绿", shape: "祖母绿切", carat: 1.20, sizeL: 7.0, sizeW: 5.0, setting: "主石位", clarity: "VS2", color: "翠绿", cut: "阶梯式", status: "需客户确认", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "内含物明显，需客户确认是否接受" },
  { id: "g4", code: "ST-2105", type: "红宝石", shape: "椭圆", carat: 1.05, sizeL: 7.0, sizeW: 5.0, setting: "主石位", clarity: "VS1", color: "鸽血红", cut: "明亮式", status: "已完成", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g5", code: "ST-2112", type: "钻石", shape: "圆形", carat: 0.05, sizeL: 2.0, sizeW: 2.0, setting: "围石B组", clarity: "VVS2", color: "E", cut: "极优良", status: "待分拣", batchId: "batch-1", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g6", code: "ST-2128", type: "碧玺", shape: "梨形", carat: 2.30, sizeL: 10.0, sizeW: 7.0, setting: "吊坠位", clarity: "SI1", color: "帕拉伊巴", cut: "明亮式", status: "待分拣", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "颜色饱和度高，内部有轻微棉絮" },
  { id: "g7", code: "ST-2135", type: "钻石", shape: "心形", carat: 0.50, sizeL: 5.0, sizeW: 5.0, setting: "副石位", clarity: "VS1", color: "F", cut: "理想切工", status: "已完成", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g8", code: "ST-2142", type: "蓝宝石", shape: "马眼形", carat: 0.75, sizeL: 8.0, sizeW: 4.0, setting: "围石C组", clarity: "VS2", color: "矢车菊蓝", cut: "明亮式", status: "待镶嵌", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g9", code: "ST-2150", type: "钻石", shape: "圆形", carat: 0.12, sizeL: 3.0, sizeW: 3.0, setting: "围石A组", clarity: "VVS1", color: "G", cut: "优良", status: "已完成", batchId: "batch-2", orderNo: "ORD-88201", defectRemark: "" },
  { id: "g10", code: "ST-2167", type: "坦桑石", shape: "梨形", carat: 3.10, sizeL: 12.0, sizeW: 8.0, setting: "主石位", clarity: "SI2", color: "蓝紫", cut: "混合式", status: "需客户确认", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "尺寸偏大，需确认镶嵌方案" },
  { id: "g11", code: "ST-2173", type: "钻石", shape: "椭圆", carat: 0.30, sizeL: 5.0, sizeW: 3.5, setting: "围石B组", clarity: "VS2", color: "H", cut: "极优良", status: "待镶嵌", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g12", code: "ST-2189", type: "红宝石", shape: "圆形", carat: 0.20, sizeL: 3.5, sizeW: 3.5, setting: "围石C组", clarity: "SI1", color: "玫红", cut: "明亮式", status: "已完成", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g13", code: "ST-2195", type: "祖母绿", shape: "祖母绿切", carat: 0.65, sizeL: 6.0, sizeW: 4.5, setting: "副石位", clarity: "VS1", color: "绿", cut: "阶梯式", status: "待分拣", batchId: "batch-3", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g14", code: "ST-2201", type: "钻石", shape: "马眼形", carat: 0.40, sizeL: 6.0, sizeW: 3.0, setting: "围石A组", clarity: "VVS1", color: "E", cut: "理想切工", status: "待镶嵌", batchId: "batch-4", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g15", code: "ST-2218", type: "尖晶石", shape: "心形", carat: 1.80, sizeL: 7.5, sizeW: 7.5, setting: "吊坠位", clarity: "VS2", color: "绝地武士", cut: "明亮式", status: "已完成", batchId: "batch-4", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g16", code: "ST-2225", type: "钻石", shape: "圆形", carat: 0.03, sizeL: 1.5, sizeW: 1.5, setting: "围石B组", clarity: "VVS1", color: "D", cut: "理想切工", status: "待分拣", batchId: "batch-4", orderNo: "ORD-99102", defectRemark: "" },
  { id: "g17", code: "ST-2231", type: "蓝宝石", shape: "梨形", carat: 1.50, sizeL: 9.0, sizeW: 6.0, setting: "主石位", clarity: "IF", color: "帕帕拉恰", cut: "明亮式", status: "需客户确认", batchId: "batch-5", orderNo: "ORD-77305", defectRemark: "颜色稀有，需客户确认最终款式" },
  { id: "g18", code: "ST-2248", type: "钻石", shape: "椭圆", carat: 0.15, sizeL: 4.0, sizeW: 3.0, setting: "围石C组", clarity: "VS1", color: "F", cut: "优良", status: "已完成", batchId: "batch-5", orderNo: "ORD-77305", defectRemark: "" },
];

interface OrderRequirement {
  orderNo: string;
  positionRequirements: Record<string, number>;
}

const ORDER_REQUIREMENTS: OrderRequirement[] = [
  {
    orderNo: "ORD-88201",
    positionRequirements: {
      "主石位": 1,
      "围石A组": 8,
      "围石B组": 12,
      "副石位": 2,
      "吊坠位": 1,
    },
  },
  {
    orderNo: "ORD-99102",
    positionRequirements: {
      "主石位": 1,
      "围石A组": 6,
      "围石B组": 10,
      "围石C组": 4,
      "副石位": 1,
    },
  },
  {
    orderNo: "ORD-77305",
    positionRequirements: {
      "主石位": 1,
      "围石A组": 4,
      "围石B组": 8,
      "围石C组": 6,
      "吊坠位": 1,
    },
  },
];

const initialBatches: Batch[] = [
  { id: "batch-1", batchNo: "BATCH-202606001", orderNo: "ORD-88201", customerName: "周大福珠宝", expectedDate: "2026-07-15", remark: "高端定制婚戒系列", createdAt: "2026-06-18 10:30:00", reviewStatus: "未复核", isDeliverable: false },
  { id: "batch-2", batchNo: "BATCH-202606002", orderNo: "ORD-88201", customerName: "周大福珠宝", expectedDate: "2026-07-15", remark: "配套吊坠与副石", createdAt: "2026-06-18 11:15:00", reviewStatus: "未复核", isDeliverable: false },
  { id: "batch-3", batchNo: "BATCH-202606003", orderNo: "ORD-99102", customerName: "卡地亚精品", expectedDate: "2026-07-20", remark: "高端彩色宝石系列", createdAt: "2026-06-19 09:00:00", reviewStatus: "未复核", isDeliverable: false },
  { id: "batch-4", batchNo: "BATCH-202606004", orderNo: "ORD-99102", customerName: "卡地亚精品", expectedDate: "2026-07-20", remark: "配钻补充批次", createdAt: "2026-06-19 14:20:00", reviewStatus: "未复核", isDeliverable: false },
  { id: "batch-5", batchNo: "BATCH-202606005", orderNo: "ORD-77305", customerName: "蒂芙尼工坊", expectedDate: "2026-07-10", remark: "蓝宝石珍藏系列", createdAt: "2026-06-20 08:45:00", reviewStatus: "未复核", isDeliverable: false },
];

const initialFormData: BatchFormData = {
  batchNo: "",
  orderNo: "",
  customerName: "",
  expectedDate: "",
  remark: "",
};

const parseGemstoneText = (text: string, existingCodes: Set<string>): ParseResult => {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const parsedItems: ParsedGemstone[] = [];
  const codeCount = new Map<string, number>();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const parsed: ParsedGemstone = {
      lineIndex: index,
      rawText: trimmed,
      missingFields: [],
      hasSizeFormatError: false,
      isDuplicate: false,
    };

    const codeMatch = trimmed.match(/\b([A-Z]{1,3}[-_\s]?\d{3,6})\b/i);
    if (codeMatch) {
      parsed.code = codeMatch[1].toUpperCase().replace(/[_\s]/g, "-");
      if (codeCount.has(parsed.code)) {
        codeCount.set(parsed.code, codeCount.get(parsed.code)! + 1);
      } else {
        codeCount.set(parsed.code, 1);
      }
    }

    for (const type of GEM_TYPE_OPTIONS) {
      if (trimmed.includes(type)) {
        parsed.type = type;
        break;
      }
    }

    for (const shape of SHAPE_OPTIONS) {
      if (trimmed.includes(shape)) {
        parsed.shape = shape;
        break;
      }
    }

    const caratMatch = trimmed.match(/(\d+\.?\d*)\s*(?:ct|克拉|卡|CT|Ct)/i);
    if (caratMatch) {
      const caratVal = parseFloat(caratMatch[1]);
      if (!isNaN(caratVal) && caratVal > 0) {
        parsed.carat = caratVal;
      }
    }

    const sizeMatch = trimmed.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)\s*(?:mm|毫米)?/i);
    if (sizeMatch) {
      const sizeL = parseFloat(sizeMatch[1]);
      const sizeW = parseFloat(sizeMatch[2]);
      if (!isNaN(sizeL) && !isNaN(sizeW) && sizeL > 0 && sizeW > 0) {
        parsed.sizeL = Math.max(sizeL, sizeW);
        parsed.sizeW = Math.min(sizeL, sizeW);
      } else {
        parsed.hasSizeFormatError = true;
      }
    } else {
      const sizePatternMatch = trimmed.match(/(\d+\.?\d*)\s*[xX×*]/i);
      if (sizePatternMatch) {
        parsed.hasSizeFormatError = true;
      } else {
        const singleSizeMatch = trimmed.match(/(\d+\.?\d*)\s*(?:mm|毫米)/i);
        if (singleSizeMatch) {
          const size = parseFloat(singleSizeMatch[1]);
          if (!isNaN(size) && size > 0) {
            parsed.sizeL = size;
            parsed.sizeW = size;
          }
        }
      }
    }

    for (const setting of SETTING_OPTIONS) {
      if (trimmed.includes(setting)) {
        parsed.setting = setting;
        break;
      }
    }

    if (!parsed.code) parsed.missingFields.push("宝石编号");
    if (!parsed.type) parsed.missingFields.push("种类");
    if (!parsed.shape) parsed.missingFields.push("形状");
    if (parsed.carat === undefined) parsed.missingFields.push("克拉重量");
    if (parsed.sizeL === undefined || parsed.sizeW === undefined) {
      if (!parsed.hasSizeFormatError) {
        parsed.missingFields.push("尺寸");
      }
    }
    if (!parsed.setting) parsed.missingFields.push("镶嵌位置");

    parsedItems.push(parsed);
  });

  const duplicateCodes: string[] = [];
  codeCount.forEach((count, code) => {
    if (count > 1) {
      duplicateCodes.push(code);
    }
    if (existingCodes.has(code)) {
      if (!duplicateCodes.includes(code)) {
        duplicateCodes.push(code);
      }
    }
  });

  parsedItems.forEach((item) => {
    if (item.code && duplicateCodes.includes(item.code)) {
      item.isDuplicate = true;
    }
    if (item.code && existingCodes.has(item.code)) {
      item.isDuplicate = true;
    }
  });

  const validItems = parsedItems.filter(
    (item) => !item.isDuplicate && item.missingFields.length === 0 && !item.hasSizeFormatError
  );

  const missingFieldItems = parsedItems.filter((item) => item.missingFields.length > 0 && !item.isDuplicate);
  const sizeErrorItems = parsedItems.filter((item) => item.hasSizeFormatError && !item.isDuplicate);

  return {
    totalLines: lines.length,
    successCount: validItems.length,
    duplicateCodes,
    missingFieldItems,
    sizeErrorItems,
    parsedItems,
    validItems,
  };
};

function App() {
  const [currentView, setCurrentView] = useState<ViewType>("workbench");
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [gemDetailGemId, setGemDetailGemId] = useState<string | null>(null);
  const [showGemDetailDrawer, setShowGemDetailDrawer] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [gemEditForm, setGemEditForm] = useState<GemstoneEditForm | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [gemstones, setGemstones] = useState<Gemstone[]>(initialGemstones);
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  const [showBatchForm, setShowBatchForm] = useState(false);

  const [selectedReviewBatchId, setSelectedReviewBatchId] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<BatchReviewResult | null>(null);
  const [showReviewResult, setShowReviewResult] = useState(false);
  const [reviewRemark, setReviewRemark] = useState("");

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
  const [selectedStatuses, setSelectedStatuses] = useState<SortingStatus[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<string[]>([]);

  const [kanbanDraggedGemId, setKanbanDraggedGemId] = useState<string | null>(null);
  const [kanbanDragOverStatus, setKanbanDragOverStatus] = useState<SortingStatus | null>(null);
  const [showKanbanDefectPanel, setShowKanbanDefectPanel] = useState(false);
  const [kanbanDefectGemId, setKanbanDefectGemId] = useState<string>("");
  const [showExportSummary, setShowExportSummary] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importBatchId, setImportBatchId] = useState("");
  const [importOrderNo, setImportOrderNo] = useState("");

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

  const getOrderRequirement = (orderNo: string): OrderRequirement | undefined => {
    return ORDER_REQUIREMENTS.find((r) => r.orderNo === orderNo);
  };

  const getBatchGems = (batchId: string): Gemstone[] => {
    return gemstones.filter((g) => g.batchId === batchId);
  };

  const groupGemsBySetting = (gems: Gemstone[]): Map<string, Gemstone[]> => {
    const grouped = new Map<string, Gemstone[]>();
    gems.forEach((g) => {
      if (!grouped.has(g.setting)) grouped.set(g.setting, []);
      grouped.get(g.setting)!.push(g);
    });
    return grouped;
  };

  const generateReviewChecklist = (batchId: string): BatchReviewResult => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) {
      throw new Error("批次不存在");
    }

    const batchGems = getBatchGems(batchId);
    const groupedBySetting = groupGemsBySetting(batchGems);
    const orderReq = getOrderRequirement(batch.orderNo);

    const issues: ReviewIssue[] = [];
    const positions: PositionReviewItem[] = [];

    const mainStoneGems = groupedBySetting.get("主石位") || [];
    if (mainStoneGems.length === 0) {
      issues.push({
        id: `issue-${Date.now()}-1`,
        type: "main_stone_missing",
        severity: "error",
        title: "主石位缺失",
        description: "该批次主石位未分配任何宝石",
        gemIds: [],
        position: "主石位",
        action: "请在主石位分配一颗主石",
        resolved: false,
        manuallyResolved: false,
      });
    } else if (mainStoneGems.length > 1) {
      issues.push({
        id: `issue-${Date.now()}-2`,
        type: "main_stone_duplicate",
        severity: "error",
        title: "主石位不唯一",
        description: `主石位分配了 ${mainStoneGems.length} 颗宝石，应当仅允许 1 颗`,
        gemIds: mainStoneGems.map((g) => g.id),
        position: "主石位",
        action: "请移除多余的主石，仅保留一颗",
        resolved: false,
        manuallyResolved: false,
      });
    }

    const surroundPositions = ["围石A组", "围石B组", "围石C组"];
    surroundPositions.forEach((pos) => {
      const posGems = groupedBySetting.get(pos) || [];
      const requiredCount = orderReq?.positionRequirements[pos] || 0;
      if (requiredCount > 0 && posGems.length < requiredCount) {
        issues.push({
          id: `issue-${Date.now()}-${pos}`,
          type: "surround_stone_insufficient",
          severity: "error",
          title: `${pos}数量不足`,
          description: `${pos}需要 ${requiredCount} 颗，当前仅有 ${posGems.length} 颗，缺少 ${requiredCount - posGems.length} 颗`,
          gemIds: posGems.map((g) => g.id),
          position: pos,
          action: `请补充 ${requiredCount - posGems.length} 颗宝石到${pos}`,
          resolved: false,
          manuallyResolved: false,
        });
      }
    });

    const needConfirmGems = batchGems.filter((g) => g.status === "需客户确认");
    if (needConfirmGems.length > 0) {
      issues.push({
        id: `issue-${Date.now()}-confirm`,
        type: "customer_confirm_pending",
        severity: "warning",
        title: "存在需客户确认的宝石",
        description: `有 ${needConfirmGems.length} 颗宝石仍需客户确认状态，无法进行下一步处理`,
        gemIds: needConfirmGems.map((g) => g.id),
        action: "请联系客户确认后更新状态为\"已完成\"或\"待镶嵌\"",
        resolved: false,
        manuallyResolved: false,
      });
    }

    const notCompletedGems = batchGems.filter((g) => g.status !== "已完成" && g.status !== "需客户确认");
    if (notCompletedGems.length > 0) {
      issues.push({
        id: `issue-${Date.now()}-incomplete`,
        type: "stone_not_completed",
        severity: "warning",
        title: "存在未完成的宝石",
        description: `有 ${notCompletedGems.length} 颗宝石尚未完成分拣`,
        gemIds: notCompletedGems.map((g) => g.id),
        action: "请完成所有宝石的分拣流程",
        resolved: false,
        manuallyResolved: false,
      });
    }

    const allPositions = new Set([
      ...Array.from(groupedBySetting.keys()),
      ...(orderReq ? Object.keys(orderReq.positionRequirements) : []),
    ]);

    allPositions.forEach((pos) => {
      const posGems = groupedBySetting.get(pos) || [];
      const requiredCount = orderReq?.positionRequirements[pos] || 0;
      let status: "ok" | "warning" | "error" = "ok";
      if (requiredCount > 0 && posGems.length < requiredCount) {
        status = "error";
      } else if (pos === "主石位" && posGems.length > 1) {
        status = "error";
      } else if (posGems.some((g) => g.status === "需客户确认")) {
        status = "warning";
      }
      positions.push({
        position: pos,
        requiredCount,
        actualCount: posGems.length,
        gems: posGems,
        status,
      });
    });

    const hasErrors = issues.some((i) => i.severity === "error");
    const hasWarnings = issues.some((i) => i.severity === "warning");
    const canDeliver = !hasErrors && !hasWarnings;
    const pass = !hasErrors;

    const totalGems = batchGems.length;
    const completedGems = batchGems.filter((g) => g.status === "已完成").length;
    const pendingGems = batchGems.filter((g) => g.status === "待分拣" || g.status === "待镶嵌").length;
    const needConfirmGemsCount = needConfirmGems.length;

    return {
      batchId: batch.id,
      batchNo: batch.batchNo,
      orderNo: batch.orderNo,
      customerName: batch.customerName,
      reviewedAt: new Date().toLocaleString("zh-CN"),
      totalGems,
      completedGems,
      pendingGems,
      needConfirmGems: needConfirmGemsCount,
      positions,
      issues,
      canDeliver,
      pass,
    };
  };

  const updateBatchReviewStatus = (batchId: string, status: ReviewStatus, isDeliverable: boolean, remark?: string) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              reviewStatus: status,
              isDeliverable,
              reviewRemark: remark,
              reviewedAt: new Date().toLocaleString("zh-CN"),
            }
          : b
      )
    );
  };

  const resolveIssue = (issueId: string) => {
    if (!reviewResult) return;
    const confirmed = window.confirm(
      "此操作仅记录您确认已处理该问题，不能替代真实修复。\n\n" +
        "复核通过前系统会重新校验数据，请确保问题已实际修复。\n\n" +
        "是否继续标记？"
    );
    if (!confirmed) return;
    setReviewResult({
      ...reviewResult,
      issues: reviewResult.issues.map((i) =>
        i.id === issueId ? { ...i, manuallyResolved: true } : i
      ),
    });
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

  const toggleStatus = (status: SortingStatus) => {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  };

  const toggleSetting = (setting: string) => {
    setSelectedSettings((prev) => (prev.includes(setting) ? prev.filter((s) => s !== setting) : [...prev, setting]));
  };

  const resetFilters = () => {
    setSelectedShapes([]);
    setSizeMin("");
    setSizeMax("");
    setCaratMin("");
    setCaratMax("");
    setSelectedStatuses([]);
    setSelectedSettings([]);
  };

  const hasActiveFilters = selectedShapes.length > 0 || sizeMin !== "" || sizeMax !== "" || caratMin !== "" || caratMax !== "" || selectedStatuses.length > 0 || selectedSettings.length > 0;

  const generateExportSummaryText = () => {
    const gems = hasActiveFilters ? filteredGemstones : gemstones;
    const sortingCount = gems.filter((g) => g.status === "待分拣").length;
    const pendingCount = gems.filter((g) => g.status === "待镶嵌").length;
    const confirmedCount = gems.filter((g) => g.status === "已完成").length;
    const defectCount = gems.filter((g) => g.status === "需客户确认").length;
    const totalCarat = gems.reduce((sum, g) => sum + g.carat, 0);
    const defectRemarkCount = gems.filter((g) => g.defectRemark && g.defectRemark.trim() !== "").length;

    const relatedBatchIds = new Set(gems.map((g) => g.batchId));
    const relatedBatches = batches.filter((b) => relatedBatchIds.has(b.id));
    const relatedOrderNos = [...new Set(relatedBatches.map((b) => b.orderNo))];

    const lines: string[] = [];
    lines.push("═══════════════════════════════════════");
    lines.push("  珠宝镶嵌宝石分拣摘要报告");
    lines.push(`  生成时间：${new Date().toLocaleString("zh-CN")}`);
    lines.push("═══════════════════════════════════════");
    lines.push("");

    if (hasActiveFilters) {
      lines.push("【筛选条件】");
      if (selectedShapes.length > 0) lines.push(`  形状：${selectedShapes.join("、")}`);
      if (sizeMin !== "" || sizeMax !== "") lines.push(`  尺寸：${sizeMin || "0"} ~ ${sizeMax || "∞"} mm`);
      if (caratMin !== "" || caratMax !== "") lines.push(`  克拉：${caratMin || "0"} ~ ${caratMax || "∞"} ct`);
      if (selectedStatuses.length > 0) lines.push(`  分拣状态：${selectedStatuses.join("、")}`);
      if (selectedSettings.length > 0) lines.push(`  镶嵌位置：${selectedSettings.join("、")}`);
      lines.push("");
    }

    lines.push("【批次信息】");
    if (relatedBatches.length === 0) {
      lines.push("  无相关批次");
    } else {
      relatedBatches.forEach((b) => {
        lines.push(`  ${b.batchNo}`);
        lines.push(`    订单号：${b.orderNo}`);
        lines.push(`    客户：${b.customerName}`);
        lines.push(`    预计交付：${b.expectedDate || "-"}`);
        if (b.remark) lines.push(`    备注：${b.remark}`);
      });
    }
    lines.push("");

    lines.push("【订单号】");
    if (relatedOrderNos.length === 0) {
      lines.push("  无");
    } else {
      lines.push(`  ${relatedOrderNos.join("、")}`);
    }
    lines.push("");

    lines.push("【状态统计】");
    lines.push(`  待分拣：${sortingCount} 颗`);
    lines.push(`  待镶嵌：${pendingCount} 颗`);
    lines.push(`  需客户确认：${defectCount} 颗`);
    lines.push(`  已完成：${confirmedCount} 颗`);
    lines.push(`  合计：${gems.length} 颗`);
    lines.push("");

    lines.push("【缺陷备注数量】");
    lines.push(`  ${defectRemarkCount} 颗宝石有缺陷备注`);
    lines.push("");

    lines.push("【总克拉】");
    lines.push(`  ${totalCarat.toFixed(2)} ct`);
    lines.push("");

    lines.push("【宝石明细】");
    if (gems.length === 0) {
      lines.push("  无匹配宝石");
    } else {
      gems.forEach((g, i) => {
        lines.push(`  ${String(i + 1).padStart(2, "0")}. ${g.code} | ${g.type} | ${g.shape} | ${g.carat}ct | ${g.sizeL}×${g.sizeW}mm | ${g.color} | ${g.clarity} | ${g.cut} | ${g.setting} | ${g.status}`);
        if (g.defectRemark && g.defectRemark.trim()) {
          lines.push(`      备注：${g.defectRemark}`);
        }
      });
    }

    lines.push("");
    lines.push("═══════════════════════════════════════");

    return lines.join("\n");
  };

  const handleCopySummary = () => {
    const text = generateExportSummaryText();
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const existingGemCodes = useMemo(() => {
    const codes = new Set<string>();
    gemstones.forEach((g) => codes.add(g.code));
    return codes;
  }, [gemstones]);

  const handleParseImportText = () => {
    if (!importText.trim()) {
      alert("请输入要解析的宝石清单文本");
      return;
    }
    const result = parseGemstoneText(importText, existingGemCodes);
    setParseResult(result);
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.validItems.length === 0) {
      alert("没有可导入的有效宝石记录");
      return;
    }

    const targetBatch = importBatchId
      ? batches.find((b) => b.id === importBatchId)
      : batches[0];
    const targetOrderNo = importOrderNo || targetBatch?.orderNo || "";

    const newGems: Gemstone[] = parseResult.validItems.map((item, index) => ({
      id: `g-import-${Date.now()}-${index}`,
      code: item.code!,
      type: item.type!,
      shape: item.shape!,
      carat: item.carat!,
      sizeL: item.sizeL!,
      sizeW: item.sizeW!,
      setting: item.setting!,
      clarity: "VS1",
      color: "未标注",
      cut: "未标注",
      status: "待分拣",
      batchId: targetBatch?.id || "batch-1",
      orderNo: targetOrderNo,
      defectRemark: "",
    }));

    setGemstones((prev) => [...prev, ...newGems]);

    setShowImportPanel(false);
    setImportText("");
    setParseResult(null);
    setImportBatchId("");
    setImportOrderNo("");

    alert(`成功导入 ${newGems.length} 颗宝石记录`);
  };

  const resetImportForm = () => {
    setImportText("");
    setParseResult(null);
    setImportBatchId("");
    setImportOrderNo("");
  };

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
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(g.status)) return false;
      if (selectedSettings.length > 0 && !selectedSettings.includes(g.setting)) return false;
      return true;
    });
  }, [gemstones, selectedShapes, sizeMin, sizeMax, caratMin, caratMax, selectedStatuses, selectedSettings]);

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

  const emptyBatchStatusCounts = (): BatchStatusCounts => ({
    sortingCount: 0,
    pendingCount: 0,
    completedCount: 0,
    defectCount: 0,
  });

  const batchStatusCounts = useMemo(() => {
    const counts: Record<string, BatchStatusCounts> = {};
    batches.forEach((batch) => {
      counts[batch.id] = emptyBatchStatusCounts();
    });
    gemstones.forEach((gem) => {
      if (!counts[gem.batchId]) counts[gem.batchId] = emptyBatchStatusCounts();
      if (gem.status === "待分拣") counts[gem.batchId].sortingCount++;
      else if (gem.status === "待镶嵌") counts[gem.batchId].pendingCount++;
      else if (gem.status === "已完成") counts[gem.batchId].completedCount++;
      else if (gem.status === "需客户确认") counts[gem.batchId].defectCount++;
    });
    return counts;
  }, [batches, gemstones]);

  const totalSorting = gemstones.filter((g) => g.status === "待分拣").length;
  const totalPending = gemstones.filter((g) => g.status === "待镶嵌").length;
  const totalCompleted = gemstones.filter((g) => g.status === "已完成").length;
  const totalDefect = gemstones.filter((g) => g.status === "需客户确认").length;
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
        sortingCount: number;
        pendingCount: number;
        completedCount: number;
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
          sortingCount: 0,
          pendingCount: 0,
          completedCount: 0,
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
        if (gem.status === "待分拣") order.sortingCount++;
        else if (gem.status === "待镶嵌") order.pendingCount++;
        else if (gem.status === "已完成") order.completedCount++;
        else if (gem.status === "需客户确认") order.needConfirmCount++;
      }
    });

    return Array.from(orderMap.values());
  }, [batches, gemstones]);

  const currentOrder = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderList.find((o) => o.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderList]);

  const getStatusClass = (status: SortingStatus) => {
    if (status === "已完成") return "confirmed";
    if (status === "需客户确认") return "pending";
    if (status === "待分拣") return "sorting";
    return "waiting";
  };

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

      <section className="panel import-section">
        <div className="heading">
          <div>
            <p>批量导入</p>
            <h2>分拣数据导入预检</h2>
          </div>
          <button className="primary" onClick={() => setShowImportPanel(!showImportPanel)}>
            {showImportPanel ? "收起" : "+ 导入宝石清单"}
          </button>
        </div>

        {showImportPanel && (
          <div className="import-panel">
            <div className="import-form">
              <div className="field-grid">
                <label>
                  <span>目标批次</span>
                  <select value={importBatchId} onChange={(e) => setImportBatchId(e.target.value)}>
                    <option value="">-- 选择批次（默认第一个）--</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNo} - {b.customerName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>订单号（可选）</span>
                  <input
                    placeholder="如不填写则使用批次的订单号"
                    value={importOrderNo}
                    onChange={(e) => setImportOrderNo(e.target.value)}
                  />
                </label>
              </div>
              <label className="full-width import-textarea-label">
                <span>粘贴宝石清单文本</span>
                <textarea
                  className="import-textarea"
                  placeholder="粘贴多行宝石清单，每行一颗宝石。支持格式示例：\nST-3001 钻石 圆形 0.5ct 5.0x5.0mm 主石位\nST-3002 蓝宝石 椭圆 1.2ct 7x5mm 围石A组"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={6}
                />
              </label>
              <div className="import-form-actions">
                <button onClick={resetImportForm}>清空</button>
                <button className="primary" onClick={handleParseImportText}>
                  🔍 解析预检
                </button>
              </div>
            </div>

            {parseResult && (
              <div className="import-preview">
                <div className="import-preview-header">
                  <h3>预检结果</h3>
                  <span className="result-count">共 {parseResult.totalLines} 行数据</span>
                </div>

                <div className="import-summary-cards">
                  <article className="summary-card import-success">
                    <div className="summary-icon">✅</div>
                    <div>
                      <small>识别成功</small>
                      <strong>{parseResult.successCount}</strong>
                    </div>
                  </article>
                  <article className="summary-card import-duplicate">
                    <div className="summary-icon">⚠️</div>
                    <div>
                      <small>疑似重复</small>
                      <strong>{parseResult.duplicateCodes.length}</strong>
                    </div>
                  </article>
                  <article className="summary-card import-missing">
                    <div className="summary-icon">📋</div>
                    <div>
                      <small>缺失字段</small>
                      <strong>{parseResult.missingFieldItems.length}</strong>
                    </div>
                  </article>
                  <article className="summary-card import-size-error">
                    <div className="summary-icon">📐</div>
                    <div>
                      <small>尺寸格式异常</small>
                      <strong>{parseResult.sizeErrorItems.length}</strong>
                    </div>
                  </article>
                </div>

                {parseResult.validItems.length > 0 && (
                  <div className="import-detail-section">
                    <h4 className="import-detail-title">✅ 可导入记录 ({parseResult.validItems.length})</h4>
                    <div className="import-detail-list">
                      {parseResult.validItems.map((item) => (
                        <div key={item.lineIndex} className="import-detail-item success">
                          <div className="import-item-main">
                            <span className="import-item-code">{item.code}</span>
                            <span className="import-item-type">{item.type}</span>
                            <span className="import-item-shape">{item.shape}</span>
                          </div>
                          <div className="import-item-sub">
                            <span>⚖️ {item.carat}ct</span>
                            <span>📐 {item.sizeL}×{item.sizeW}mm</span>
                            <span>📍 {item.setting}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parseResult.duplicateCodes.length > 0 && (
                  <div className="import-detail-section">
                    <h4 className="import-detail-title warning">⚠️ 疑似重复编号 ({parseResult.duplicateCodes.length})</h4>
                    <div className="import-detail-list">
                      {parseResult.parsedItems
                        .filter((item) => item.isDuplicate)
                        .map((item) => (
                          <div key={item.lineIndex} className="import-detail-item warning">
                            <div className="import-item-main">
                              <span className="import-item-code">{item.code || "未知编号"}</span>
                              <span className="import-item-tag">重复</span>
                            </div>
                            <div className="import-item-sub">
                              <span>原行内容：{item.rawText}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {parseResult.missingFieldItems.length > 0 && (
                  <div className="import-detail-section">
                    <h4 className="import-detail-title info">📋 缺失字段 ({parseResult.missingFieldItems.length})</h4>
                    <div className="import-detail-list">
                      {parseResult.missingFieldItems.map((item) => (
                        <div key={item.lineIndex} className="import-detail-item info">
                          <div className="import-item-main">
                            <span className="import-item-code">{item.code || "第" + (item.lineIndex + 1) + "行"}</span>
                            <span className="import-item-tag info">缺失: {item.missingFields.join("、")}</span>
                          </div>
                          <div className="import-item-sub">
                            <span>原行内容：{item.rawText}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parseResult.sizeErrorItems.length > 0 && (
                  <div className="import-detail-section">
                    <h4 className="import-detail-title error">📐 尺寸格式异常 ({parseResult.sizeErrorItems.length})</h4>
                    <div className="import-detail-list">
                      {parseResult.sizeErrorItems.map((item) => (
                        <div key={item.lineIndex} className="import-detail-item error">
                          <div className="import-item-main">
                            <span className="import-item-code">{item.code || "第" + (item.lineIndex + 1) + "行"}</span>
                            <span className="import-item-tag error">尺寸格式错误</span>
                          </div>
                          <div className="import-item-sub">
                            <span>原行内容：{item.rawText}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="import-confirm-actions">
                  <button onClick={resetImportForm}>重新输入</button>
                  <button
                    className="primary"
                    onClick={handleConfirmImport}
                    disabled={parseResult.validItems.length === 0}
                  >
                    ✅ 确认导入 {parseResult.validItems.length} 条记录
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="batch-section">
        <div className="batch-summary">
          <article className="summary-card sorting">
            <div className="summary-icon">📥</div>
            <div>
              <small>待分拣总数</small>
              <strong>{totalSorting}</strong>
            </div>
          </article>
          <article className="summary-card pending">
            <div className="summary-icon">⏳</div>
            <div>
              <small>待镶嵌总数</small>
              <strong>{totalPending}</strong>
            </div>
          </article>
          <article className="summary-card confirmed">
            <div className="summary-icon">✅</div>
            <div>
              <small>已完成总数</small>
              <strong>{totalCompleted}</strong>
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
              batches.map((batch, index) => {
                const counts = batchStatusCounts[batch.id] || emptyBatchStatusCounts();
                return (
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
                      <div className="stat-item stat-sorting">
                        <span className="stat-label">待分拣</span>
                        <span className="stat-value">{counts.sortingCount}</span>
                      </div>
                      <div className="stat-item stat-pending">
                        <span className="stat-label">待镶嵌</span>
                        <span className="stat-value">{counts.pendingCount}</span>
                      </div>
                      <div className="stat-item stat-confirmed">
                        <span className="stat-label">已完成</span>
                        <span className="stat-value">{counts.completedCount}</span>
                      </div>
                      <div className="stat-item stat-defect">
                        <span className="stat-label">缺陷</span>
                        <span className="stat-value">{counts.defectCount}</span>
                      </div>
                    </div>
                    <div className="batch-footer">
                      <span>创建时间：{batch.createdAt}</span>
                    </div>
                  </article>
                );
              })
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
          <div className="filter-group">
            <h3>分拣状态</h3>
            <div className="chips">
              {STATUS_OPTIONS.map((status) => (
                <button key={status} className={selectedStatuses.includes(status) ? "active" : ""} onClick={() => toggleStatus(status)}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>镶嵌位置</h3>
            <div className="chips">
              {SETTING_OPTIONS.map((setting) => (
                <button key={setting} className={selectedSettings.includes(setting) ? "active" : ""} onClick={() => toggleSetting(setting)}>
                  {setting}
                </button>
              ))}
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
          <button className="primary" onClick={() => setShowExportSummary(true)}>导出摘要</button>
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
                <div className="stat-item stat-sorting">
                  <span className="stat-label">待分拣</span>
                  <span className="stat-value">{order.sortingCount}</span>
                </div>
                <div className="stat-item stat-pending">
                  <span className="stat-label">待镶嵌</span>
                  <span className="stat-value">{order.pendingCount}</span>
                </div>
                <div className="stat-item stat-confirmed">
                  <span className="stat-label">已完成</span>
                  <span className="stat-value">{order.completedCount}</span>
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
          <div className="stat-item stat-sorting">
            <span className="stat-label">待分拣</span>
            <span className="stat-value">{currentOrder.sortingCount}</span>
          </div>
          <div className="stat-item stat-pending">
            <span className="stat-label">待镶嵌</span>
            <span className="stat-value">{currentOrder.pendingCount}</span>
          </div>
          <div className="stat-item stat-confirmed">
            <span className="stat-label">已完成</span>
            <span className="stat-value">{currentOrder.completedCount}</span>
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

  const kanbanStats = useMemo(() => {
    const stats: Record<string, { count: number; carat: number }> = {};
    KANBAN_STATUSES.forEach((s) => {
      stats[s.key] = { count: 0, carat: 0 };
    });
    gemstones.forEach((g) => {
      if (stats[g.status]) {
        stats[g.status].count++;
        stats[g.status].carat += g.carat;
      }
    });
    const totalCount = gemstones.length;
    const totalCarat = gemstones.reduce((sum, g) => sum + g.carat, 0);
    return { stats, totalCount, totalCarat };
  }, [gemstones]);

  const getGemsByStatus = (status: SortingStatus): Gemstone[] => {
    return gemstones.filter((g) => g.status === status);
  };

  const updateGemStatus = (gemId: string, newStatus: SortingStatus) => {
    updateGemstone(gemId, { status: newStatus });
  };

  const handleKanbanDragStart = (e: React.DragEvent, gemId: string) => {
    setKanbanDraggedGemId(gemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", gemId);
  };

  const handleKanbanDragEnd = () => {
    setKanbanDraggedGemId(null);
    setKanbanDragOverStatus(null);
  };

  const handleKanbanDragOver = (e: React.DragEvent, status: SortingStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setKanbanDragOverStatus(status);
  };

  const handleKanbanDragLeave = () => {
    setKanbanDragOverStatus(null);
  };

  const handleKanbanDrop = (e: React.DragEvent, status: SortingStatus) => {
    e.preventDefault();
    const gemId = e.dataTransfer.getData("text/plain") || kanbanDraggedGemId;
    if (gemId) {
      updateGemStatus(gemId, status);
    }
    setKanbanDraggedGemId(null);
    setKanbanDragOverStatus(null);
  };

  const openDefectRemarkFromKanban = (gemId: string) => {
    setKanbanDefectGemId(gemId);
    const gem = gemstones.find((g) => g.id === gemId);
    if (gem) {
      setSelectedGemId(gemId);
      setDefectRemarkText(gem.defectRemark || "");
      if (gem.defectRemark) {
        setSelectedDefectTypes(["内含物明显"]);
      }
      setNeedConfirm(true);
      setShowKanbanDefectPanel(true);
      setShowDefectPanel(true);
    }
  };

  const handleSubmitKanbanDefect = () => {
    if (!kanbanDefectGemId) {
      alert("请先选择一颗宝石");
      return;
    }
    if (selectedDefectTypes.length === 0) {
      alert("请至少选择一种缺陷类型");
      return;
    }
    const gem = gemstones.find((g) => g.id === kanbanDefectGemId);
    if (!gem) return;
    const newRemark: DefectRemark = {
      id: `defect-${Date.now()}`,
      gemId: kanbanDefectGemId,
      gemCode: gem.code,
      defectTypes: [...selectedDefectTypes],
      remark: defectRemarkText,
      needConfirm: true,
      createdAt: new Date().toLocaleString("zh-CN"),
    };
    setDefectRemarks((prev) => [newRemark, ...prev]);
    updateGemstone(kanbanDefectGemId, {
      defectRemark: defectRemarkText,
      status: "需客户确认",
    });
    setKanbanDefectGemId("");
    setSelectedDefectTypes([]);
    setDefectRemarkText("");
    setNeedConfirm(false);
    setShowKanbanDefectPanel(false);
    setShowDefectPanel(false);
  };

  const closeKanbanDefectPanel = () => {
    setShowKanbanDefectPanel(false);
    setShowDefectPanel(false);
    setKanbanDefectGemId("");
    setSelectedDefectTypes([]);
    setDefectRemarkText("");
    setNeedConfirm(false);
  };

  const renderKanbanGemCard = (g: Gemstone) => (
    <div
      key={g.id}
      className={`kanban-gem-card ${kanbanDraggedGemId === g.id ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => handleKanbanDragStart(e, g.id)}
      onDragEnd={handleKanbanDragEnd}
      onClick={() => openGemDetailDrawer(g.id)}
    >
      <div className="kanban-gem-header">
        <h4>{g.code}</h4>
        <span className="kanban-gem-type">{g.type}</span>
      </div>
      <div className="kanban-gem-details">
        <span>💎 {g.shape}</span>
        <span>⚖️ {g.carat}ct</span>
        <span>📐 {g.sizeL}×{g.sizeW}mm</span>
      </div>
      <div className="kanban-gem-meta">
        <span>📍 {g.setting}</span>
        <span className="kanban-gem-order">📋 {g.orderNo}</span>
      </div>
      {g.defectRemark && (
        <div className="kanban-gem-defect">
          <span>⚠️ {g.defectRemark}</span>
        </div>
      )}
      {g.status === "需客户确认" && (
        <button
          className="kanban-defect-btn"
          onClick={(e) => {
            e.stopPropagation();
            openDefectRemarkFromKanban(g.id);
          }}
        >
          ✏️ 编辑备注
        </button>
      )}
    </div>
  );

  const renderKanban = () => (
    <>
      <section className="kanban-metrics">
        <article className="kanban-metric-card total">
          <div className="kanban-metric-icon">📦</div>
          <div>
            <small>宝石总数</small>
            <strong>{kanbanStats.totalCount}</strong>
          </div>
          <div className="kanban-metric-sub">⚖️ {kanbanStats.totalCarat.toFixed(2)} ct</div>
        </article>
        {KANBAN_STATUSES.map((status) => {
          const data = kanbanStats.stats[status.key] || { count: 0, carat: 0 };
          return (
            <article key={status.key} className="kanban-metric-card" style={{ borderTopColor: status.color }}>
              <div className="kanban-metric-icon">{status.icon}</div>
              <div>
                <small>{status.label}</small>
                <strong style={{ color: status.color }}>{data.count}</strong>
              </div>
              <div className="kanban-metric-sub">⚖️ {data.carat.toFixed(2)} ct</div>
            </article>
          );
        })}
      </section>

      <section className="kanban-board">
        {KANBAN_STATUSES.map((status) => {
          const gems = getGemsByStatus(status.key);
          const data = kanbanStats.stats[status.key] || { count: 0, carat: 0 };
          return (
            <div
              key={status.key}
              className={`kanban-column ${kanbanDragOverStatus === status.key ? "drag-over" : ""}`}
              onDragOver={(e) => handleKanbanDragOver(e, status.key)}
              onDragLeave={handleKanbanDragLeave}
              onDrop={(e) => handleKanbanDrop(e, status.key)}
            >
              <div className="kanban-column-header" style={{ borderColor: status.color }}>
                <div className="kanban-column-title">
                  <span className="kanban-column-icon">{status.icon}</span>
                  <h3>{status.label}</h3>
                  <span className="kanban-column-count">{data.count}</span>
                </div>
                <span className="kanban-column-carat">⚖️ {data.carat.toFixed(2)} ct</span>
                {status.key === "需客户确认" && (
                  <button
                    className="kanban-add-defect-btn"
                    onClick={() => {
                      if (gems.length > 0) {
                        openDefectRemarkFromKanban(gems[0].id);
                      } else {
                        alert("该状态下暂无宝石");
                      }
                    }}
                  >
                    + 备注
                  </button>
                )}
              </div>
              <div className="kanban-column-content">
                {gems.length === 0 ? (
                  <div className="kanban-empty">
                    <span>拖拽宝石到此处</span>
                  </div>
                ) : (
                  <div className="kanban-gem-list">
                    {gems.map((g) => renderKanbanGemCard(g))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {showKanbanDefectPanel && (
        <div className="modal-overlay" onClick={closeKanbanDefectPanel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>缺陷管理</p>
                <h2>编辑缺陷备注</h2>
              </div>
              <button className="modal-close" onClick={closeKanbanDefectPanel}>✕</button>
            </div>
            <div className="modal-body">
              <div className="defect-form-body">
                <div className="defect-form-left">
                  <label className="defect-field">
                    <span>选择宝石 *</span>
                    <select value={kanbanDefectGemId} onChange={(e) => setKanbanDefectGemId(e.target.value)}>
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
                </div>
                <div className="defect-form-right">
                  {kanbanDefectGemId && (() => {
                    const gem = gemstones.find((g) => g.id === kanbanDefectGemId);
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
                </div>
              </div>
              <div className="defect-form-actions">
                <button onClick={closeKanbanDefectPanel}>取消</button>
                <button className="primary" onClick={handleSubmitKanbanDefect}>保存备注</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderReviewStatusTag = (status?: ReviewStatus, isDeliverable?: boolean) => {
    const statusMap: Record<ReviewStatus, { label: string; className: string; icon: string }> = {
      "未复核": { label: "未复核", className: "review-status-pending", icon: "⏳" },
      "复核中": { label: "复核中", className: "review-status-reviewing", icon: "🔍" },
      "复核通过": { label: "复核通过", className: "review-status-passed", icon: "✅" },
      "复核不通过": { label: "复核不通过", className: "review-status-failed", icon: "❌" },
    };
    const s = status || "未复核";
    const info = statusMap[s];
    return (
      <span className={`review-status-tag ${info.className}`}>
        {info.icon} {info.label}
        {isDeliverable && <span className="deliverable-badge">可交付</span>}
      </span>
    );
  };

  const renderSeverityTag = (severity: IssueSeverity) => {
    const map: Record<IssueSeverity, { label: string; className: string }> = {
      error: { label: "严重", className: "severity-error" },
      warning: { label: "警告", className: "severity-warning" },
      info: { label: "提示", className: "severity-info" },
    };
    const info = map[severity];
    return <span className={`severity-tag ${info.className}`}>{info.label}</span>;
  };

  const handleStartReview = (batchId: string) => {
    const result = generateReviewChecklist(batchId);
    setReviewResult(result);
    setSelectedReviewBatchId(batchId);
    setShowReviewResult(true);
    setReviewRemark("");
    updateBatchReviewStatus(batchId, "复核中", false);
  };

  const handleRecheckReview = () => {
    if (!selectedReviewBatchId || !reviewResult) return;
    const oldManuallyResolved = new Map(
      reviewResult.issues.filter((i) => i.manuallyResolved).map((i) => [`${i.type}-${i.position || ""}`, true])
    );
    const freshResult = generateReviewChecklist(selectedReviewBatchId);
    freshResult.issues = freshResult.issues.map((issue) => ({
      ...issue,
      manuallyResolved: oldManuallyResolved.has(`${issue.type}-${issue.position || ""}`),
    }));
    setReviewResult(freshResult);
    const resolvedCount = freshResult.issues.filter((i) => !i.resolved).length;
    const manuallyCount = freshResult.issues.filter((i) => i.manuallyResolved && !i.resolved).length;
    if (resolvedCount === 0) {
      alert("✅ 所有问题已真实消除！可以进行复核通过。");
    } else {
      alert(`重新校验完成。\n\n仍有 ${resolvedCount} 个问题未真实消除${manuallyCount > 0 ? `（其中 ${manuallyCount} 个已标记处理）` : ""}。`);
    }
  };

  const handlePassReview = () => {
    if (!reviewResult || !selectedReviewBatchId) return;
    const freshResult = generateReviewChecklist(selectedReviewBatchId);
    const hasRealErrors = freshResult.issues.some((i) => i.severity === "error");
    const hasRealWarnings = freshResult.issues.some((i) => i.severity === "warning");
    if (hasRealErrors) {
      const errorList = freshResult.issues
        .filter((i) => i.severity === "error")
        .map((i) => `  • ${i.title}`)
        .join("\n");
      alert(`以下问题未真实消除，无法通过复核：\n\n${errorList}\n\n请先实际修复问题后再重试。`);
      setReviewResult(freshResult);
      return;
    }
    const canDeliver = !hasRealErrors && !hasRealWarnings;
    if (!canDeliver) {
      const confirmResult = window.confirm(
        "存在警告级别的问题未完全消除。\n\n" +
          freshResult.issues.filter((i) => i.severity === "warning").map((i) => `  • ${i.title}`).join("\n") +
          "\n\n是否确认标记为复核通过？（注意：此批次将不会标记为可交付）"
      );
      if (!confirmResult) return;
    }
    updateBatchReviewStatus(freshResult.batchId, "复核通过", canDeliver, reviewRemark);
    setShowReviewResult(false);
    setReviewResult(null);
    setSelectedReviewBatchId(null);
    alert(canDeliver ? "复核已通过！批次已标记为可交付。" : "复核已通过，但批次因存在警告问题暂不可交付。");
  };

  const handleFailReview = () => {
    if (!reviewResult) return;
    if (!reviewRemark.trim()) {
      alert("请填写复核不通过的原因！");
      return;
    }
    updateBatchReviewStatus(reviewResult.batchId, "复核不通过", false, reviewRemark);
    setShowReviewResult(false);
    setReviewResult(null);
    setSelectedReviewBatchId(null);
    alert("复核不通过已记录！");
  };

  const reviewStats = useMemo(() => {
    const unreviewed = batches.filter((b) => !b.reviewStatus || b.reviewStatus === "未复核").length;
    const reviewing = batches.filter((b) => b.reviewStatus === "复核中").length;
    const passed = batches.filter((b) => b.reviewStatus === "复核通过").length;
    const failed = batches.filter((b) => b.reviewStatus === "复核不通过").length;
    const deliverable = batches.filter((b) => b.isDeliverable).length;
    return { unreviewed, reviewing, passed, failed, deliverable, total: batches.length };
  }, [batches]);

  const renderReview = () => {

    return (
      <>
        <section className="review-metrics">
          <article className="review-metric-card total">
            <div className="review-metric-icon">📦</div>
            <div>
              <small>批次总数</small>
              <strong>{reviewStats.total}</strong>
            </div>
          </article>
          <article className="review-metric-card pending">
            <div className="review-metric-icon">⏳</div>
            <div>
              <small>待复核</small>
              <strong>{reviewStats.unreviewed}</strong>
            </div>
          </article>
          <article className="review-metric-card reviewing">
            <div className="review-metric-icon">🔍</div>
            <div>
              <small>复核中</small>
              <strong>{reviewStats.reviewing}</strong>
            </div>
          </article>
          <article className="review-metric-card passed">
            <div className="review-metric-icon">✅</div>
            <div>
              <small>已通过</small>
              <strong>{reviewStats.passed}</strong>
            </div>
          </article>
          <article className="review-metric-card failed">
            <div className="review-metric-icon">❌</div>
            <div>
              <small>未通过</small>
              <strong>{reviewStats.failed}</strong>
            </div>
          </article>
          <article className="review-metric-card deliverable">
            <div className="review-metric-icon">📤</div>
            <div>
              <small>可交付</small>
              <strong>{reviewStats.deliverable}</strong>
            </div>
          </article>
        </section>

        <section className="panel review-panel">
          <div className="heading">
            <div>
              <p>批次复核</p>
              <h2>分拣批次复核清单</h2>
            </div>
            <span className="result-count">共 {batches.length} 个批次</span>
          </div>

          <div className="review-batch-list">
            {batches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>暂无批次数据</p>
              </div>
            ) : (
              batches.map((batch, index) => {
                const batchGems = getBatchGems(batch.id);
                const counts = batchStatusCounts[batch.id] || emptyBatchStatusCounts();
                return (
                  <article key={batch.id} className="review-batch-card">
                    <div className="review-batch-header">
                      <div className="review-batch-index">
                        <b>{String(index + 1).padStart(2, "0")}</b>
                      </div>
                      <div className="review-batch-info">
                        <div className="review-batch-title-row">
                          <h3>{batch.batchNo}</h3>
                          <span className="batch-tag">订单 {batch.orderNo}</span>
                          {renderReviewStatusTag(batch.reviewStatus, batch.isDeliverable)}
                        </div>
                        <p className="review-batch-customer">
                          👤 {batch.customerName}
                          {batch.expectedDate && <span className="batch-date">📅 预计交付：{batch.expectedDate}</span>}
                        </p>
                        {batch.remark && <p className="batch-remark">📝 {batch.remark}</p>}
                        {batch.reviewRemark && (
                          <p className="review-remark">💬 复核备注：{batch.reviewRemark}</p>
                        )}
                        {batch.reviewedAt && (
                          <p className="review-time">⏰ 复核时间：{batch.reviewedAt}</p>
                        )}
                      </div>
                    </div>

                    <div className="review-batch-stats">
                      <div className="stat-item stat-sorting">
                        <span className="stat-label">待分拣</span>
                        <span className="stat-value">{counts.sortingCount}</span>
                      </div>
                      <div className="stat-item stat-pending">
                        <span className="stat-label">待镶嵌</span>
                        <span className="stat-value">{counts.pendingCount}</span>
                      </div>
                      <div className="stat-item stat-confirmed">
                        <span className="stat-label">已完成</span>
                        <span className="stat-value">{counts.completedCount}</span>
                      </div>
                      <div className="stat-item stat-defect">
                        <span className="stat-label">需确认</span>
                        <span className="stat-value">{counts.defectCount}</span>
                      </div>
                      <div className="stat-item stat-total">
                        <span className="stat-label">总计</span>
                        <span className="stat-value">{batchGems.length}</span>
                      </div>
                    </div>

                    <div className="review-batch-footer">
                      <button
                        className="primary"
                        onClick={() => handleStartReview(batch.id)}
                      >
                        🔍 {batch.reviewStatus && batch.reviewStatus !== "未复核" ? "重新复核" : "开始复核"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {showReviewResult && reviewResult && (
          <div className="modal-overlay" onClick={() => setShowReviewResult(false)}>
            <div className="modal-content review-result-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p>复核结果</p>
                  <h2>{reviewResult.batchNo} · 复核清单</h2>
                </div>
                <button className="modal-close" onClick={() => setShowReviewResult(false)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="review-result-header">
                  <div className="review-result-meta">
                    <div className="review-meta-item">
                      <small>客户</small>
                      <strong>{reviewResult.customerName}</strong>
                    </div>
                    <div className="review-meta-item">
                      <small>订单号</small>
                      <strong>{reviewResult.orderNo}</strong>
                    </div>
                    <div className="review-meta-item">
                      <small>宝石总数</small>
                      <strong>{reviewResult.totalGems} 颗</strong>
                    </div>
                    <div className="review-meta-item">
                      <small>已完成</small>
                      <strong>{reviewResult.completedGems} 颗</strong>
                    </div>
                    <div className="review-meta-item">
                      <small>进行中</small>
                      <strong>{reviewResult.pendingGems} 颗</strong>
                    </div>
                    <div className="review-meta-item">
                      <small>需确认</small>
                      <strong>{reviewResult.needConfirmGems} 颗</strong>
                    </div>
                  </div>

                  <div className={`review-result-summary ${reviewResult.pass ? "pass" : "fail"}`}>
                    <div className="summary-icon">
                      {reviewResult.pass ? "✅" : "⚠️"}
                    </div>
                    <div>
                      <h3>{reviewResult.pass ? "复核通过" : "存在问题"}</h3>
                      <p>
                        {reviewResult.canDeliver
                          ? "所有检查项已通过，批次可交付"
                          : `存在 ${reviewResult.issues.filter((i) => !i.resolved).length} 个待解决问题`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="review-checklist-section">
                  <h3 className="section-title">📋 镶嵌位置复核清单</h3>
                  <div className="position-checklist">
                    {reviewResult.positions.map((pos) => (
                      <div key={pos.position} className={`position-check-item status-${pos.status}`}>
                        <div className="position-check-header">
                          <span className="position-icon">
                            {pos.status === "ok" ? "✅" : pos.status === "error" ? "❌" : "⚠️"}
                          </span>
                          <span className="position-name">{pos.position}</span>
                          <span className="position-count">
                            {pos.actualCount} / {pos.requiredCount || "-"}
                            {pos.requiredCount > 0 && pos.actualCount < pos.requiredCount && (
                              <span className="position-missing"> (缺少 {pos.requiredCount - pos.actualCount})</span>
                            )}
                          </span>
                        </div>
                        {pos.gems.length > 0 && (
                          <div className="position-gem-list">
                            {pos.gems.map((g) => (
                              <div
                                key={g.id}
                                className={`position-gem-item ${g.status === "需客户确认" ? "need-confirm" : ""}`}
                                onClick={() => openGemDetailDrawer(g.id)}
                              >
                                <span className="gem-code">{g.code}</span>
                                <span className="gem-type">{g.type}</span>
                                <span className="gem-carat">{g.carat}ct</span>
                                {renderStatusTag(g.status)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {reviewResult.issues.length > 0 && (
                  <div className="review-issues-section">
                    <h3 className="section-title">
                      ⚠️ 问题列表 ({reviewResult.issues.filter((i) => !i.resolved).length} 未真实消除, {reviewResult.issues.filter((i) => i.manuallyResolved && !i.resolved).length} 已标记处理)
                    </h3>
                    <div className="issues-list">
                      {reviewResult.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`issue-card severity-${issue.severity} ${issue.resolved ? "resolved" : ""} ${issue.manuallyResolved && !issue.resolved ? "manually-resolved" : ""}`}
                        >
                          <div className="issue-header">
                            <div className="issue-title-row">
                              {renderSeverityTag(issue.severity)}
                              <h4>{issue.title}</h4>
                              {issue.resolved && <span className="resolved-badge">已真实消除</span>}
                              {issue.manuallyResolved && !issue.resolved && <span className="manually-resolved-badge">已标记处理</span>}
                            </div>
                            <button
                              className={`resolve-btn ${issue.manuallyResolved ? "resolved" : ""}`}
                              onClick={() => resolveIssue(issue.id)}
                              disabled={issue.manuallyResolved}
                            >
                              {issue.manuallyResolved ? "✓ 已标记" : "标记已处理"}
                            </button>
                          </div>
                          <p className="issue-description">{issue.description}</p>
                          {issue.action && (
                            <p className="issue-action">
                              <strong>操作建议：</strong>{issue.action}
                            </p>
                          )}
                          {!issue.resolved && (
                            <p className="issue-gate-note">
                              <strong>🔒 门禁提示：</strong>此问题必须真实修复，仅标记处理无法通过复核。
                            </p>
                          )}
                          {issue.gemIds.length > 0 && (
                            <div className="issue-gems">
                              <span className="issue-gems-label">相关宝石：</span>
                              {issue.gemIds.map((gemId) => {
                                const gem = gemstones.find((g) => g.id === gemId);
                                return gem ? (
                                  <span
                                    key={gemId}
                                    className="issue-gem-tag"
                                    onClick={() => openGemDetailDrawer(gemId)}
                                  >
                                    {gem.code}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="review-remark-section">
                  <label className="remark-label">
                    <span>复核备注</span>
                    <textarea
                      placeholder="填写复核相关备注信息..."
                      value={reviewRemark}
                      onChange={(e) => setReviewRemark(e.target.value)}
                      rows={3}
                    />
                  </label>
                </div>
              </div>

              <div className="review-result-footer">
                <button onClick={() => setShowReviewResult(false)}>取消</button>
                <button className="recheck-btn" onClick={handleRecheckReview}>
                  🔄 重新校验
                </button>
                <button className="fail-btn" onClick={handleFailReview}>
                  ❌ 复核不通过
                </button>
                <button
                  className="primary pass-btn"
                  onClick={handlePassReview}
                >
                  ✅ 复核通过（系统自动校验）
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderExportSummaryModal = () => {
    if (!showExportSummary) return null;
    const summaryText = generateExportSummaryText();
    const gems = hasActiveFilters ? filteredGemstones : gemstones;

    return (
      <div className="modal-overlay" onClick={() => setShowExportSummary(false)}>
        <div className="modal-content export-summary-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <p>导出预览</p>
              <h2>分拣摘要报告</h2>
            </div>
            <button className="modal-close" onClick={() => setShowExportSummary(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="export-summary-meta">
              <div className="export-meta-item">
                <small>筛选条件</small>
                <strong>{hasActiveFilters ? "已启用" : "全部数据"}</strong>
              </div>
              <div className="export-meta-item">
                <small>宝石数量</small>
                <strong>{gems.length} 颗</strong>
              </div>
              <div className="export-meta-item">
                <small>总克拉</small>
                <strong>{gems.reduce((s, g) => s + g.carat, 0).toFixed(2)} ct</strong>
              </div>
              <div className="export-meta-item">
                <small>缺陷备注</small>
                <strong>{gems.filter((g) => g.defectRemark && g.defectRemark.trim()).length} 条</strong>
              </div>
            </div>
            <div className="export-summary-preview">
              <pre>{summaryText}</pre>
            </div>
          </div>
          <div className="export-summary-footer">
            <button onClick={() => setShowExportSummary(false)}>关闭</button>
            <button className="primary" onClick={handleCopySummary}>
              {copySuccess ? "✓ 已复制" : "📋 复制摘要"}
            </button>
          </div>
        </div>
      </div>
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
          className={currentView === "kanban" ? "tab-btn active" : "tab-btn"}
          onClick={() => setCurrentView("kanban")}
        >
          📊 分拣状态看板
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
        <button
          className={currentView === "review" ? "tab-btn active" : "tab-btn"}
          onClick={() => setCurrentView("review")}
        >
          ✅ 批次复核
        </button>
      </section>

      {currentView === "workbench" && renderWorkbench()}
      {currentView === "kanban" && renderKanban()}
      {currentView === "orderList" && renderOrderList()}
      {currentView === "orderDetail" && renderOrderDetail()}
      {currentView === "review" && renderReview()}
      {renderExportSummaryModal()}
      {renderGemDetailDrawer()}
    </main>
  );
}

export default App;
