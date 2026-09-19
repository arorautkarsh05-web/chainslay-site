import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
  FileWarning,
  TrendingDown,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { uploadApi } from "@/api";
import { toast } from "sonner";

export default function UploadData() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [latestUpload, setLatestUpload] = useState<any>(null);

  // Invalid File Capsule Pop-up State
  const [invalidModalData, setInvalidModalData] = useState<{
    isOpen: boolean;
    fileName: string;
    message: string;
    reason: string;
    detectedColumns: string[];
    requiredColumns: string[];
  }>({
    isOpen: false,
    fileName: "",
    message: "",
    reason: "",
    detectedColumns: [],
    requiredColumns: [],
  });

  useEffect(() => {
    fetchLatestUpload();
  }, []);

  const fetchLatestUpload = async () => {
    try {
      const res = await uploadApi.getHistory();
      if (res.success && res.data.length > 0) {
        setLatestUpload(res.data[0]);
      }
    } catch (error) {
      console.error("Failed to load upload history", error);
    }
  };

  const handleDownloadSampleCsv = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const csvContent = [
      "SKU,Product_Name,Category,Stock_Quantity,Demand_Quantity,Reorder_Level,Unit_Cost,Location",
      "SKU-ELEC-101,Sony Wireless Headphones WH-1000XM5,Electronics,45,28,15,24990,Warehouse A",
      "SKU-GROC-202,Organic Basmati Rice (5kg),Grocery,120,85,40,650,Warehouse B",
      "SKU-APPA-303,Men Classic Oxford Cotton Shirt,Apparel,60,35,20,1499,Warehouse A",
      "SKU-DAIR-404,Amul Pure Cow Ghee (1L),Dairy,85,60,30,590,Warehouse C",
      "SKU-HOME-505,Stainless Steel Thermal Flask 1000ml,Home & Kitchen,30,12,10,899,Warehouse B"
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "chainslay_inventory_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Sample inventory CSV downloaded!");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setInvalidModalData({
        isOpen: true,
        fileName: file.name,
        message: "Unsupported File Format",
        reason: `Files with extension '.${ext || "unknown"}' cannot be processed. Chainslay accepts only tabular CSV (.csv) or Excel (.xlsx, .xls) inventory files.`,
        detectedColumns: [`.${ext || "unknown"} file`],
        requiredColumns: [".csv", ".xlsx", ".xls"],
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Fast client-side sanity check for CSV files
    if (ext === "csv") {
      try {
        const textSample = await file.slice(0, 4096).text();
        const firstLine = textSample.split(/\r\n|\n|\r/)[0] || "";
        const rawHeaders = firstLine.split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
        const cleanHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

        // Check for non-inventory signatures (e.g. personal contact / student / salary sheets without SKU/Product/Stock)
        const PRODUCT_SIGNALS = [
          "sku", "skucode", "skuid", "itemcode", "itemid", "productid", 
          "productcode", "partnumber", "partno", "productname", "product", 
          "itemname", "itemdescription", "itemdesc", "productdesc", "producttitle", 
          "barcode", "upc", "ean", "asin", "model"
        ];
        const STOCK_SIGNALS = [
          "stockquantity", "stock", "quantity", "qty", "unitsinstock", 
          "inventoryquantity", "reorderlevel", "reorderpoint", "reorderquantity", 
          "minstock", "safetystock", "targetstock", "demandquantity", "demand", 
          "unitcost", "cost", "unitprice", "price", "mrp", "warehouselocation", 
          "warehouse", "suppliername", "supplier", "vendor", "inventoryturnoverrate"
        ];

        const hasProduct = cleanHeaders.some(h => PRODUCT_SIGNALS.some(sig => h === sig || h.startsWith(sig) || h.endsWith(sig)));
        const hasStock = cleanHeaders.some(h => STOCK_SIGNALS.some(sig => h === sig || h.startsWith(sig) || h.endsWith(sig)));
        const hasGenericItemOrName = cleanHeaders.some(h => h === "item" || h === "name" || h === "title");

        // If file has headers, but zero inventory or stock signals
        if (cleanHeaders.length >= 2 && !hasProduct && !hasStock && !(hasGenericItemOrName && hasStock)) {
          setInvalidModalData({
            isOpen: true,
            fileName: file.name,
            message: "Invalid File: Not an Inventory Dataset",
            reason: "The uploaded file does not contain necessary inventory attributes (such as SKU / Product Name and Stock / Quantity / Unit Cost).",
            detectedColumns: rawHeaders.filter(Boolean),
            requiredColumns: ["SKU / Product Code", "Product Name", "Stock Quantity", "Unit Cost / Price", "Category"],
          });
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch (e) {
        // Continue to server verification
      }
    }

    setIsUploading(true);
    try {
      const res = await uploadApi.uploadFile(file);
      if (res.success) {
        if (res.data?.validRows === 0) {
          setInvalidModalData({
            isOpen: true,
            fileName: file.name,
            message: "0 Valid Inventory Products Imported",
            reason: "All rows in the uploaded spreadsheet were missing required SKU or Product Name values.",
            detectedColumns: [],
            requiredColumns: ["SKU / Product Code", "Product Name", "Stock Quantity"],
          });
        } else {
          toast.success(
            `Success! ${res.data.validRows} products processed & imported.`
          );
          await fetchLatestUpload();
          if (res.data?.uploadBatchId && res.data.validRows > 0) {
            setLocation(`/analytics?batch=${res.data.uploadBatchId}`);
          }
        }
      }
    } catch (error: any) {
      if (error?.isInventoryError || error?.reason) {
        setInvalidModalData({
          isOpen: true,
          fileName: file.name,
          message: error.message || "Invalid File: Not an Inventory Dataset",
          reason: error.reason || "The uploaded file is not recognized as an inventory or supply chain dataset.",
          detectedColumns: error.detectedColumns || [],
          requiredColumns: error.requiredColumns || [
            "SKU / Product Code",
            "Product Name",
            "Stock Quantity",
            "Unit Cost / Price",
            "Category"
          ],
        });
      } else {
        toast.error(error.message || "Upload failed");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Control Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/85 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Data Ingestion
            </h1>
            <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 font-mono text-[11px] px-2.5 py-0.5 font-bold shadow-sm">
              Batch Pipeline
            </Badge>
          </div>
          <p className="text-slate-300 font-mono text-xs tracking-wider mt-1.5 font-medium drop-shadow-sm">
            AI-ENHANCED INVENTORY PIPELINE • AUTOMATIC ABC-XYZ-FSN CLASSIFICATION
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card
          className={`backdrop-blur-2xl border-2 border-dashed transition-all cursor-pointer group bg-slate-950/85 shadow-2xl ${isDragging ? "border-amber-400 bg-amber-500/10" : "border-white/20 hover:border-amber-400/60 hover:bg-slate-900/90"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center p-12 text-center h-full">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv, .xlsx"
              onChange={handleFileChange}
            />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-all shadow-inner">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-amber-400" />
              )}
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              {isUploading ? "Uploading & Analyzing..." : "Drag & Drop Files"}
            </h3>
            <p className="text-sm text-slate-300 mt-2 font-medium">
              or click to browse from your computer
            </p>
            <p className="text-xs text-amber-400/80 mt-4 font-mono font-semibold">
              Supported formats: .csv, .xlsx
            </p>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="mt-2 text-xs text-slate-400 hover:text-amber-300 underline font-mono flex items-center gap-1 transition-colors"
            >
              <Download className="w-3 h-3 text-amber-400" />
              Download sample inventory template (.csv)
            </button>

            <Button
              className="mt-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 text-xs h-10 px-6 transition-all"
              variant="default"
              disabled={isUploading}
            >
              Select Files
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="backdrop-blur-2xl bg-slate-950/85 border border-white/15 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-slate-900/60">
              <CardTitle className="flex items-center gap-2.5 text-white font-bold text-base">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                Latest Uploaded Batch
              </CardTitle>
              {latestUpload ? (
                <CardDescription className="text-slate-300 font-mono text-xs truncate">
                  {latestUpload.original_filename} (Batch #{latestUpload.id})
                </CardDescription>
              ) : (
                <CardDescription className="text-slate-400 text-xs">No uploads yet</CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {latestUpload ? (
                <>
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {latestUpload.total_rows} Rows •{" "}
                          {formatSize(latestUpload.file_size)}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-md flex items-center gap-1 border ${latestUpload.valid_rows > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}
                      >
                        {latestUpload.valid_rows > 0 ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />{" "}
                            {latestUpload.valid_rows} Valid Products
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-red-500" /> 0
                            Valid Products
                          </>
                        )}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />{" "}
                          Valid Products Imported
                        </span>
                        <span className="font-mono text-green-400 font-semibold">
                          {latestUpload.valid_rows || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
                          Duplicates Merged
                        </span>
                        <span className="font-mono text-white">
                          {latestUpload.duplicate_rows || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <AlertCircle
                            className={`w-4 h-4 ${latestUpload.missing_value_rows > 0 ? "text-amber-500" : "text-green-500"}`}
                          />
                          Missing / Invalid Rows
                        </span>
                        <span
                          className={`${latestUpload.missing_value_rows > 0 ? "text-amber-500" : "text-green-500"} font-mono`}
                        >
                          {latestUpload.missing_value_rows || 0} flagged
                        </span>
                      </div>
                    </div>

                    {/* Batch Inventory Intelligence Breakdown */}
                    {(latestUpload.valid_rows > 0 || (latestUpload.batch_inventory_value && latestUpload.batch_inventory_value > 0)) && (
                      <div className="pt-3 border-t border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> File Analysis Insights
                          </span>
                          {latestUpload.batch_inventory_value > 0 && (
                            <span className="text-xs font-mono font-bold text-white">
                              Val: <strong className="text-amber-300">{formatCurrency(latestUpload.batch_inventory_value)}</strong>
                            </span>
                          )}
                        </div>

                        {/* 3 Status Pills */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                          <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-xl">
                            <span className="text-[10px] text-amber-400 block font-bold">Excess</span>
                            <strong className="text-amber-300 text-sm font-black">
                              {Number(latestUpload.excess_count || 0).toLocaleString()}
                            </strong>
                            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
                              {latestUpload.batch_excess_value > 0 ? formatCurrency(latestUpload.batch_excess_value) : "Surplus"}
                            </span>
                          </div>

                          <div className="bg-blue-950/30 border border-blue-500/30 p-2 rounded-xl">
                            <span className="text-[10px] text-blue-400 block font-bold">Understock</span>
                            <strong className="text-blue-300 text-sm font-black">
                              {Number(latestUpload.understock_count || 0).toLocaleString()}
                            </strong>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              Reorder Risk
                            </span>
                          </div>

                          <div className="bg-emerald-950/30 border border-emerald-500/30 p-2 rounded-xl">
                            <span className="text-[10px] text-emerald-400 block font-bold">Optimized</span>
                            <strong className="text-emerald-300 text-sm font-black">
                              {Number(latestUpload.optimized_count || 0).toLocaleString()}
                            </strong>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              Balanced
                            </span>
                          </div>
                        </div>

                        {/* ABC Class breakdown if present */}
                        {(latestUpload.class_a_count > 0 || latestUpload.class_b_count > 0 || latestUpload.class_c_count > 0) && (
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/60 rounded-lg border border-white/5 text-[11px] font-mono">
                            <span className="text-slate-400">ABC Classes:</span>
                            <div className="flex gap-2">
                              <span className="text-amber-400 font-bold">A: {latestUpload.class_a_count || 0}</span>
                              <span className="text-blue-400 font-bold">B: {latestUpload.class_b_count || 0}</span>
                              <span className="text-slate-300 font-bold">C: {latestUpload.class_c_count || 0}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full mt-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 text-xs h-10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    variant="default"
                    onClick={() =>
                      setLocation(
                        latestUpload.id
                          ? `/analytics?batch=${latestUpload.id}`
                          : "/analytics"
                      )
                    }
                  >
                    <span>
                      Open SKU Analysis (
                      {latestUpload.valid_rows || latestUpload.total_rows}{" "}
                      Products)
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Upload a file to see statistics here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invalid File Capsule Pop-up Modal */}
      <Dialog open={invalidModalData.isOpen} onOpenChange={(open) => setInvalidModalData(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md w-[92vw] sm:max-w-md bg-slate-950/95 border border-rose-500/40 text-white backdrop-blur-2xl shadow-[0_0_40px_rgba(244,63,94,0.25)] rounded-2xl p-4 sm:p-5 max-h-[85vh] flex flex-col justify-between overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <DialogHeader className="space-y-1.5 pb-3 border-b border-white/10 text-left shrink-0">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono uppercase px-2 py-0.5 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                Invalid File Rejected
              </Badge>
              <span className="text-[11px] font-mono text-slate-400 font-bold truncate max-w-[160px]">
                {invalidModalData.fileName}
              </span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white line-clamp-1">
              {invalidModalData.message || "Not an Inventory Dataset"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Chainslay accepts only inventory and stock management records.
            </DialogDescription>
          </DialogHeader>

          {/* Body Content */}
          <div className="space-y-3 py-3 overflow-y-auto pr-1 text-xs">
            {/* Rejection Reason Card */}
            <div className="bg-slate-900/90 border border-rose-500/25 p-3 rounded-xl space-y-1.5">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider block">
                Rejection Reason
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {invalidModalData.reason}
              </p>
            </div>

            {/* Detected Columns */}
            {invalidModalData.detectedColumns && invalidModalData.detectedColumns.length > 0 && (
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  Detected Columns in Uploaded File ({invalidModalData.detectedColumns.length})
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {invalidModalData.detectedColumns.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-200 font-mono text-[10px]"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Inventory Columns */}
            <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Required / Expected Inventory Columns
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  "SKU / Item Code",
                  "Product Name",
                  "Stock Quantity",
                  "Unit Cost / Price",
                  "Reorder Level",
                  "Category"
                ].map((col, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-medium"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Download Template helper */}
            <div className="bg-slate-900/50 border border-white/5 p-2.5 rounded-xl flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-white block">Need a valid template?</span>
                Download our pre-formatted CSV template.
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownloadSampleCsv}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs h-7 px-2.5 rounded-lg shrink-0 gap-1 font-mono cursor-pointer"
              >
                <Download className="w-3 h-3" />
                Sample CSV
              </Button>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-2.5 border-t border-white/10 flex flex-row items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInvalidModalData(prev => ({ ...prev, isOpen: false }))}
              className="border-white/15 text-slate-300 hover:bg-white/10 text-xs h-8 px-3 rounded-lg"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setInvalidModalData(prev => ({ ...prev, isOpen: false }));
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-4 rounded-lg shadow-md shadow-amber-500/25 gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Choose Another File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
