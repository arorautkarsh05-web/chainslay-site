import { useState, useEffect } from "react";
import {
  Settings,
  TrendingDown,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  Send,
  ShoppingCart,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inventoryApi, approvalApi, uploadApi } from "@/api";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [batchId, setBatchId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("batch");
    }
    return null;
  });
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

  const [stats, setStats] = useState<any>({
    total_count: 0,
    total_inventory_value: 0,
    total_excess_value: 0,
    excess_count: 0,
    understock_count: 0,
    optimized_count: 0,
  });

  const [actionPending, setActionPending] = useState<{ [sku: string]: boolean }>({});
  const [submittedActions, setSubmittedActions] = useState<{ [sku: string]: string }>({});

  // Reorder Capsule Modal State
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [selectedReorderItem, setSelectedReorderItem] = useState<any>(null);
  const [reorderQuantity, setReorderQuantity] = useState<number>(1);
  const [reorderCustomReason, setReorderCustomReason] = useState<string>("");
  const [isSubmittingReorder, setIsSubmittingReorder] = useState(false);

  // Load available upload batches for the batch selector
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await uploadApi.getHistory();
        if (res.success && res.data) {
          setAvailableBatches(res.data);
        }
      } catch (err) {
        console.warn("Failed to load upload history in Analytics", err);
      }
    };
    fetchBatches();
  }, []);

  // Sync state from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bId = params.get("batch");
    if (bId !== batchId) {
      setBatchId(bId);
    }
    const sParam = params.get("status");
    if (sParam && ["EXCESS", "UNDERSTOCK", "OPTIMIZED"].includes(sParam.toUpperCase())) {
      setStatusFilter(sParam.toUpperCase());
    }
    const qParam = params.get("search");
    if (qParam) {
      setSearchTerm(qParam);
      setActiveSearch(qParam);
    }
  }, [window.location.search]);

  useEffect(() => {
    fetchInventory();
  }, [page, activeSearch, batchId, statusFilter]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 50,
      };
      if (activeSearch) params.search = activeSearch;
      if (batchId) params.batch_id = batchId;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;

      const res = await inventoryApi.getAll(params);
      if (res.success) {
        setItems(res.data.items || []);
        if (res.data.summary) {
          setStats(res.data.summary);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.total || 0);
        }
      }
    } catch (error) {
      toast.error("Failed to load inventory analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchTerm);
  };

  const handleBatchSelect = (newBatchId: string | null) => {
    setBatchId(newBatchId);
    setPage(1);
    const url = new URL(window.location.href);
    if (newBatchId) {
      url.searchParams.set("batch", newBatchId);
    } else {
      url.searchParams.delete("batch");
    }
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  };

  const handleClearBatch = () => {
    handleBatchSelect(null);
  };

  const handleExcessReallocation = async (item: any) => {
    try {
      setActionPending(prev => ({ ...prev, [item.sku]: true }));
      const reason = `Reallocate excess capital: ${item.excess_quantity} units above target (${item.product_name})`;
      const res = await approvalApi.createRequest({
        inventory_item_id: item.id,
        sku: item.sku,
        reason,
        excess_quantity: item.excess_quantity,
        excess_value: item.excess_value,
      });
      if (res.success) {
        setSubmittedActions(prev => ({ ...prev, [item.sku]: "EXCESS_REVIEW" }));
        toast.success(`Excess reallocation submitted for ${item.sku} (Manager Review pending)`);
      }
    } catch (err) {
      toast.error(`Failed to submit excess request for ${item.sku}`);
    } finally {
      setActionPending(prev => ({ ...prev, [item.sku]: false }));
    }
  };

  const handleOpenReorderModal = (item: any) => {
    const defaultDeficit = Math.max(
      1,
      (item.target_stock || (item.reorder_level ? item.reorder_level * 2 : 50)) - (item.stock_quantity || 0)
    );
    setSelectedReorderItem(item);
    setReorderQuantity(defaultDeficit);
    setReorderCustomReason(
      `Urgent understock replenishment: ${defaultDeficit} units requested (Current: ${item.stock_quantity || 0}, Reorder Pt: ${item.reorder_level || 0})`
    );
    setReorderModalOpen(true);
  };

  const handleConfirmReorder = async () => {
    if (!selectedReorderItem || reorderQuantity <= 0) return;

    try {
      setIsSubmittingReorder(true);
      const estCost = Number((reorderQuantity * (selectedReorderItem.unit_cost || 0)).toFixed(2));
      const reason = reorderCustomReason.trim() || `Urgent stock reorder: ${reorderQuantity} units required (${selectedReorderItem.product_name})`;

      const res = await approvalApi.createRequest({
        inventory_item_id: selectedReorderItem.id,
        sku: selectedReorderItem.sku,
        reason,
        excess_quantity: -reorderQuantity,
        excess_value: estCost,
      });

      if (res.success) {
        setSubmittedActions(prev => ({ ...prev, [selectedReorderItem.sku]: "REORDER_REQUESTED" }));
        toast.success(`Purchase reorder request submitted for ${selectedReorderItem.product_name} (${reorderQuantity} units)`, {
          description: `SKU ${selectedReorderItem.sku} queued for Manager Review.`,
        });
        setReorderModalOpen(false);
      }
    } catch (err) {
      toast.error(`Failed to submit reorder request for ${selectedReorderItem?.sku}`);
    } finally {
      setIsSubmittingReorder(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const currentBatch = availableBatches.find(
    (b: any) => String(b.id) === String(batchId)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header Control Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/85 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              SKU Analytics &amp; Inventory Optimization
            </h1>
            <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 font-mono text-[11px] px-2.5 py-0.5 font-bold shadow-sm">
              Live Intel
            </Badge>
          </div>
          <p className="text-slate-300 font-mono text-xs tracking-wider mt-1.5 font-medium drop-shadow-sm">
            ABC-XYZ-FSN SEGMENTATION • EXCESS LIQUIDATION • UNDERSTOCK REORDERS
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/15 bg-slate-900/90 backdrop-blur-xl shadow-lg font-semibold text-xs h-9"
            onClick={() => {
              const headers =
                "SKU,Product Name,Category,Stock,Target,Reorder Level,Segment,Status,Unit Cost,Excess Qty,Excess Value\n";
              const rows = items
                .map(
                  i =>
                    `"${i.sku}","${i.product_name}","${i.category || ""}",${i.stock_quantity},${i.target_stock},${i.reorder_level || 0},"${i.segment || ""}","${i.status}",${i.unit_cost},${i.excess_quantity || 0},${i.excess_value || 0}`
                )
                .join("\n");
              const blob = new Blob([headers + rows], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `chainslay_inventory_${Date.now()}.csv`;
              a.click();
              toast.success("Inventory report exported as CSV");
            }}
          >
            Export Report
          </Button>
          <Button
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 text-xs h-9 transition-colors"
            onClick={() => {
              toast.success(
                "Inventory intelligence active: ABC-XYZ-FSN classifications synchronized."
              );
            }}
          >
            <Settings className="w-4 h-4" /> Run Optimizer
          </Button>
        </div>
      </div>

      {/* Batch Intel Banner when filtered */}
      {batchId && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-950/90 to-blue-950/40 border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Analyzing Uploaded File: {currentBatch?.original_filename || `Batch #${batchId}`}
                </span>
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px]">
                  Batch #{batchId}
                </Badge>
              </div>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                <span>Total: <strong className="text-white">{Number(stats.total_count || totalItems).toLocaleString()} SKUs</strong></span>
                <span>&bull;</span>
                <span>Excess: <strong className="text-amber-400">{Number(stats.excess_count || 0).toLocaleString()}</strong></span>
                <span>&bull;</span>
                <span>Understock: <strong className="text-blue-400">{Number(stats.understock_count || 0).toLocaleString()}</strong></span>
                <span>&bull;</span>
                <span>Healthy: <strong className="text-emerald-400">{Number(stats.optimized_count || 0).toLocaleString()}</strong></span>
                {stats.total_inventory_value > 0 && (
                  <>
                    <span>&bull;</span>
                    <span>Value: <strong className="text-white">{formatCurrency(stats.total_inventory_value)}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearBatch}
              className="border-white/20 text-slate-300 hover:text-white bg-slate-900/90 text-xs h-8 px-3 rounded-xl gap-1.5 shadow-md"
            >
              <X className="w-3.5 h-3.5" /> View All Inventory
            </Button>
          </div>
        </div>
      )}

      {/* 2. Three High-Contrast KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Excess Card */}
        <Card 
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xl backdrop-blur-2xl ${
            statusFilter === "EXCESS" 
              ? "border-amber-400 bg-gradient-to-br from-slate-950/95 via-[#1c1407]/90 to-amber-950/40 ring-2 ring-amber-500/60 shadow-[0_8px_32px_rgba(245,158,11,0.25)]" 
              : "border-amber-500/30 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-amber-950/25 hover:border-amber-400/60 hover:shadow-[0_8px_32px_rgba(245,158,11,0.15)]"
          }`}
          onClick={() => {
            setStatusFilter(statusFilter === "EXCESS" ? "ALL" : "EXCESS");
            setPage(1);
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Excess Capital Tied Up
              </div>
              <div className="text-3xl font-black text-amber-300 mt-2 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {formatCurrency(stats.total_excess_value)}
              </div>
              <p className="text-xs text-slate-200 font-medium mt-1">
                <strong className="text-white">{(stats.excess_count || 0).toLocaleString()}</strong> SKUs with surplus stock
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400 shadow-inner">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-mono">Stock &gt; Target</span>
            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs transition-colors ${
              statusFilter === "EXCESS" 
                ? "bg-amber-500 text-slate-950 shadow-sm" 
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}>
              {statusFilter === "EXCESS" ? "Active Filter ✕" : "Filter Excess →"}
            </span>
          </div>
        </Card>

        {/* Understock Card */}
        <Card 
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xl backdrop-blur-2xl ${
            statusFilter === "UNDERSTOCK" 
              ? "border-blue-400 bg-gradient-to-br from-slate-950/95 via-[#08152c]/90 to-blue-950/40 ring-2 ring-blue-500/60 shadow-[0_8px_32px_rgba(59,130,246,0.25)]" 
              : "border-blue-500/30 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-blue-950/25 hover:border-blue-400/60 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]"
          }`}
          onClick={() => {
            setStatusFilter(statusFilter === "UNDERSTOCK" ? "ALL" : "UNDERSTOCK");
            setPage(1);
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Stockout Risk (Understock)
              </div>
              <div className="text-3xl font-black text-blue-300 mt-2 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {(stats.understock_count || 0).toLocaleString()} SKUs
              </div>
              <p className="text-xs text-slate-200 font-medium mt-1">
                Stock below safe reorder point
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/40 text-blue-400 shadow-inner">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-mono">Stock &lt; Reorder Pt</span>
            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs transition-colors ${
              statusFilter === "UNDERSTOCK" 
                ? "bg-blue-500 text-white shadow-sm" 
                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
            }`}>
              {statusFilter === "UNDERSTOCK" ? "Active Filter ✕" : "Filter Understock →"}
            </span>
          </div>
        </Card>

        {/* Optimized Card */}
        <Card 
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xl backdrop-blur-2xl ${
            statusFilter === "OPTIMIZED" 
              ? "border-emerald-400 bg-gradient-to-br from-slate-950/95 via-[#081f18]/90 to-emerald-950/40 ring-2 ring-emerald-500/60 shadow-[0_8px_32px_rgba(16,185,129,0.25)]" 
              : "border-emerald-500/30 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-emerald-950/25 hover:border-emerald-400/60 hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)]"
          }`}
          onClick={() => {
            setStatusFilter(statusFilter === "OPTIMIZED" ? "ALL" : "OPTIMIZED");
            setPage(1);
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Healthy &amp; Optimized
              </div>
              <div className="text-3xl font-black text-emerald-300 mt-2 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {(stats.optimized_count || 0).toLocaleString()} SKUs
              </div>
              <p className="text-xs text-slate-200 font-medium mt-1">
                Balanced buffer within target levels
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-mono">Reorder ≤ Stock ≤ Target</span>
            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs transition-colors ${
              statusFilter === "OPTIMIZED" 
                ? "bg-emerald-500 text-slate-950 shadow-sm" 
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}>
              {statusFilter === "OPTIMIZED" ? "Active Filter ✕" : "Filter Healthy →"}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-950/90 p-4 rounded-2xl border border-white/15 shadow-2xl backdrop-blur-2xl">
        <form
          onSubmit={handleSearchSubmit}
          className="flex gap-2 w-full md:w-96"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <Input
              placeholder="Search SKU, Product, or Category..."
              className="pl-10 bg-slate-900/95 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500 font-medium h-10 rounded-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="bg-slate-800 hover:bg-slate-700 text-white border border-white/20 font-bold h-10 px-4 rounded-xl shadow-md"
          >
            Search
          </Button>
          {activeSearch && (
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400 hover:text-white h-10 px-2"
              onClick={() => {
                setSearchTerm("");
                setActiveSearch("");
                setPage(1);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Batch Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 font-bold hidden sm:inline uppercase">Dataset:</span>
            <select
              value={batchId || "ALL"}
              onChange={(e) => handleBatchSelect(e.target.value === "ALL" ? null : e.target.value)}
              className="bg-slate-900/95 border border-amber-500/40 text-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:border-amber-400 focus:outline-none cursor-pointer shadow-md max-w-[240px] truncate"
            >
              <option value="ALL" className="bg-slate-950 text-white font-sans font-medium">
                📂 All Inventory ({Number(stats.total_count || totalItems).toLocaleString()} SKUs)
              </option>
              {availableBatches.map((b: any) => (
                <option key={b.id} value={String(b.id)} className="bg-slate-950 text-amber-300 font-mono">
                  📁 Batch #{b.id}: {b.original_filename} ({Number(b.valid_rows || b.total_rows).toLocaleString()} SKUs)
                </option>
              ))}
            </select>
          </div>

          {batchId && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-mono font-bold shadow-md">
              <span>#{batchId}</span>
              <button
                onClick={handleClearBatch}
                className="hover:text-white ml-0.5"
                title="Clear batch filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex rounded-xl border border-white/15 p-1 bg-slate-900/95 text-xs shadow-inner">
            {[
              { key: "ALL", label: "All Items", count: stats.total_count || totalItems },
              { key: "EXCESS", label: "Excess", count: stats.excess_count },
              { key: "UNDERSTOCK", label: "Understock", count: stats.understock_count },
              { key: "OPTIMIZED", label: "Optimized", count: stats.optimized_count },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium ${
                  statusFilter === tab.key
                    ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    statusFilter === tab.key
                      ? "bg-slate-950 text-amber-400"
                      : "bg-white/15 text-slate-200"
                  }`}>
                    {Number(tab.count || 0).toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. The Inventory Table */}
      <Card className="overflow-hidden bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-2xl rounded-2xl">
        <div className="grid grid-cols-12 gap-3 p-4 border-b border-white/15 bg-slate-900/95 text-xs font-black text-slate-200 tracking-wider uppercase">
          <div className="col-span-4 text-white">SKU / PRODUCT</div>
          <div className="col-span-2 text-white">CURRENT STOCK</div>
          <div className="col-span-2 text-white">TARGET / REORDER</div>
          <div className="col-span-2 text-white">STATUS &amp; IMPACT</div>
          <div className="col-span-2 text-right text-white">ACTION</div>
        </div>

        <div className="divide-y divide-white/10 max-h-[620px] overflow-y-auto">
          {loading ? (
            <div className="p-16 text-center text-white font-medium text-sm">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <div>Loading inventory data...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-white space-y-4">
              <div className="text-slate-300 text-sm font-medium">
                No inventory records match the current criteria.
              </div>
              <div className="flex justify-center gap-3">
                {batchId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white bg-slate-800"
                    onClick={handleClearBatch}
                  >
                    Clear Batch Filter
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold flex items-center gap-2"
                  onClick={() => setLocation("/upload")}
                >
                  <UploadCloud className="w-4 h-4" /> Upload New Data
                </Button>
              </div>
            </div>
          ) : (
            items.map((item, i) => {
              const isExcess = item.status === "EXCESS";
              const isUnder = item.status === "UNDERSTOCK";
              const isActionDone = !!submittedActions[item.sku];
              const isSubmitting = !!actionPending[item.sku];

              return (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-3 p-4 items-center hover:bg-slate-900/80 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isExcess
                          ? "bg-amber-400 shadow-sm shadow-amber-400/80"
                          : isUnder
                            ? "bg-blue-400 shadow-sm shadow-blue-400/80 animate-pulse"
                            : "bg-emerald-400 shadow-sm shadow-emerald-400/80"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-extrabold text-white text-sm tracking-wide truncate drop-shadow-sm">
                        {item.sku}
                      </div>
                      <div className="text-xs text-slate-200 font-medium mt-0.5 truncate">
                        {item.product_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {item.category && (
                          <span className="text-[11px] text-amber-300/90 font-mono font-medium">
                            {item.category}
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-mono rounded bg-white/10 text-slate-200 border border-white/10"
                        >
                          {item.segment || "A-X-F"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 font-mono text-sm">
                    <div className="font-bold text-white">{item.stock_quantity.toLocaleString()} units</div>
                    <div className="text-xs text-slate-300 font-mono mt-0.5">
                      @ {formatCurrency(item.unit_cost)}
                    </div>
                  </div>

                  <div className="col-span-2 font-mono text-xs space-y-1">
                    <div className="text-slate-200">
                      Target: <span className="font-bold text-white">{item.target_stock.toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300">
                      Reorder Pt: <span className={isUnder ? "text-blue-400 font-bold" : "text-slate-200 font-semibold"}>{item.reorder_level || 0}</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    {isExcess ? (
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <TrendingDown className="w-4 h-4 shrink-0" />
                        <div className="text-xs">
                          <div className="font-bold">
                            +{item.excess_quantity} excess
                          </div>
                          <div className="font-mono text-xs font-bold text-amber-300">
                            {formatCurrency(item.excess_value)}
                          </div>
                        </div>
                      </div>
                    ) : isUnder ? (
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <div className="text-xs">
                          <div className="font-bold">Stockout Risk</div>
                          <div className="text-xs text-blue-300 font-mono font-bold">
                            Deficit: {Math.max(1, (item.reorder_level || item.target_stock) - item.stock_quantity)} units
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Optimized</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    {isActionDone ? (
                      <Badge className="bg-primary/25 text-primary border border-primary/50 text-xs px-2.5 py-1 flex items-center gap-1 font-mono font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </Badge>
                    ) : isExcess ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting}
                        className="border-amber-500/50 text-amber-300 hover:text-slate-950 hover:bg-amber-500 bg-amber-500/20 font-bold text-xs h-8 px-3 rounded-lg shadow-sm gap-1.5 transition-all"
                        onClick={() => handleExcessReallocation(item)}
                      >
                        <Send className="w-3 h-3" /> Reallocate
                      </Button>
                    ) : isUnder ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting}
                        className="border-blue-500/50 text-blue-300 hover:text-white hover:bg-blue-600 bg-blue-500/20 font-bold text-xs h-8 px-3 rounded-lg shadow-sm gap-1.5 transition-all cursor-pointer"
                        onClick={() => handleOpenReorderModal(item)}
                      >
                        <ShoppingCart className="w-3 h-3" /> Reorder
                      </Button>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/15 text-xs px-2.5 py-1 rounded-md font-mono font-bold">
                        Balanced
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/15 flex items-center justify-between text-xs text-slate-300 font-medium bg-slate-900/95">
          <div>
            Showing <span className="font-bold text-white">{items.length}</span> of <span className="font-bold text-white">{totalItems.toLocaleString()}</span> items
            {batchId && ` (Filtered by Batch #${batchId})`}
            {statusFilter !== "ALL" && (
              <span className="ml-1.5 text-amber-400 font-bold font-mono">[{statusFilter}]</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="border-white/20 text-white hover:bg-white/15 bg-slate-800 h-8 px-3 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="font-mono px-2 font-bold text-white">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="border-white/20 text-white hover:bg-white/15 bg-slate-800 h-8 px-3 rounded-lg"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Capsule Reorder Popup Modal */}
      {/* Compact Capsule Reorder Popup Modal */}
      <Dialog open={reorderModalOpen} onOpenChange={setReorderModalOpen}>
        <DialogContent className="max-w-md w-[92vw] sm:max-w-md bg-slate-950/95 border border-blue-500/30 text-white backdrop-blur-2xl shadow-[0_0_40px_rgba(59,130,246,0.25)] rounded-2xl p-4 sm:p-5 max-h-[85vh] flex flex-col justify-between overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <DialogHeader className="space-y-1 pb-2.5 border-b border-white/10 text-left shrink-0">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono uppercase px-2 py-0.5 font-bold flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                Reorder Capsule
              </Badge>
              {selectedReorderItem && (
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  SKU: <strong className="text-white">{selectedReorderItem.sku}</strong>
                </span>
              )}
            </div>
            <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white line-clamp-1">
              {selectedReorderItem?.product_name || "Product Reorder"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-[11px] flex items-center gap-2">
              <span>{selectedReorderItem?.category || "General"}</span>
              {selectedReorderItem?.location && (
                <>
                  <span>&bull;</span>
                  <span>Location: {selectedReorderItem.location}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable / Flexible Body */}
          {selectedReorderItem && (
            <div className="space-y-3 py-2 overflow-y-auto pr-1 text-xs">
              {/* Compact Barometer (Current vs Reorder vs Target) */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-slate-900/90 border border-white/10 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Current</span>
                  <strong className="text-blue-300 text-xs sm:text-sm font-black">
                    {selectedReorderItem.stock_quantity || 0} u
                  </strong>
                </div>
                <div className="bg-slate-900/90 border border-amber-500/25 p-2 rounded-xl">
                  <span className="text-[10px] text-amber-400 block">Reorder Pt</span>
                  <strong className="text-amber-300 text-xs sm:text-sm font-black">
                    {selectedReorderItem.reorder_level || 0} u
                  </strong>
                </div>
                <div className="bg-slate-900/90 border border-emerald-500/25 p-2 rounded-xl">
                  <span className="text-[10px] text-emerald-400 block">Target</span>
                  <strong className="text-emerald-300 text-xs sm:text-sm font-black">
                    {selectedReorderItem.target_stock || (selectedReorderItem.reorder_level * 2) || 0} u
                  </strong>
                </div>
              </div>

              {/* Quantity Stepper & Presets */}
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-200">Reorder Quantity</span>
                  <span className="font-mono text-blue-400 font-bold">
                    Deficit: {Math.max(1, (selectedReorderItem.reorder_level || 0) - (selectedReorderItem.stock_quantity || 0))} units
                  </span>
                </div>

                {/* Stepper Control */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setReorderQuantity((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 rounded-lg border-white/20 text-white hover:bg-blue-600 bg-slate-800 text-base font-bold shrink-0"
                  >
                    -
                  </Button>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={1}
                      value={reorderQuantity}
                      onChange={(e) => setReorderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9 text-center font-mono text-sm font-black bg-black/40 border-white/20 text-white rounded-lg focus:border-blue-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400 pointer-events-none">
                      units
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setReorderQuantity((q) => q + 1)}
                    className="h-9 w-9 rounded-lg border-white/20 text-white hover:bg-blue-600 bg-slate-800 text-base font-bold shrink-0"
                  >
                    +
                  </Button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(() => {
                    const toReorder = Math.max(1, (selectedReorderItem.reorder_level || 0) - (selectedReorderItem.stock_quantity || 0));
                    const toTarget = Math.max(1, (selectedReorderItem.target_stock || selectedReorderItem.reorder_level * 2) - (selectedReorderItem.stock_quantity || 0));
                    
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setReorderQuantity(toReorder)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-mono transition-all border",
                            reorderQuantity === toReorder
                              ? "bg-blue-600 text-white border-blue-500 font-bold"
                              : "border-white/10 text-slate-300 hover:bg-white/5"
                          )}
                        >
                          Deficit (+{toReorder})
                        </button>
                        <button
                          type="button"
                          onClick={() => setReorderQuantity(toTarget)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-mono transition-all border",
                            reorderQuantity === toTarget
                              ? "bg-blue-600 text-white border-blue-500 font-bold"
                              : "border-white/10 text-slate-300 hover:bg-white/5"
                          )}
                        >
                          Target (+{toTarget})
                        </button>
                        {[10, 25, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setReorderQuantity((q) => q + preset)}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                          >
                            +{preset}
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </div>

                {/* Total Value Banner */}
                <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">
                    Est. Value ({reorderQuantity} &times; {formatCurrency(selectedReorderItem.unit_cost || 0)}):
                  </span>
                  <strong className="text-emerald-400 text-xs font-black">
                    {formatCurrency(Number((reorderQuantity * (selectedReorderItem.unit_cost || 0)).toFixed(2)))}
                  </strong>
                </div>
              </div>

              {/* Note input */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
                  Manager Note
                </label>
                <Input
                  value={reorderCustomReason}
                  onChange={(e) => setReorderCustomReason(e.target.value)}
                  placeholder="Reason for purchase reorder..."
                  className="h-8 text-xs bg-slate-900 border-white/15 text-white rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Footer - Always Visible and Prominent */}
          <DialogFooter className="pt-2.5 border-t border-white/10 flex flex-row items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReorderModalOpen(false)}
              disabled={isSubmittingReorder}
              className="border-white/15 text-slate-300 hover:bg-white/10 text-xs h-8 px-3 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmReorder}
              disabled={isSubmittingReorder || reorderQuantity <= 0}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-4 rounded-lg shadow-md shadow-blue-600/30 gap-1.5 transition-all cursor-pointer"
            >
              {isSubmittingReorder ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Reorder Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
