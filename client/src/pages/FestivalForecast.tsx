import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Search, 
  CheckSquare, 
  PackageCheck,
  Zap,
  Info,
  Layers,
  Store,
  Building2,
  Building,
  ShieldCheck,
  TreePine,
  Gift,
  Palette,
  Cake,
  Sun,
  Coffee,
  Leaf,
  Smile,
  Heart
} from "lucide-react";
import { festivalApi } from "@/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StoreScale = "SMALL" | "MEDIUM" | "ENTERPRISE";

export default function FestivalForecast() {
  const [calendar, setCalendar] = useState<any[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>("FEST_2026_NAVRATRI");
  const [storeScale, setStoreScale] = useState<StoreScale>("MEDIUM");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [culturalBriefing, setCulturalBriefing] = useState<any>(null);
  const [aggregates, setAggregates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(false);
  
  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("ALL");
  const [dualFilterMode, setDualFilterMode] = useState<"ALL" | "VALENTINE" | "SHIVRATRI">("ALL");

  // Approval Modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedItemForApproval, setSelectedItemForApproval] = useState<any>(null);
  const [approvalQuantity, setApprovalQuantity] = useState<number>(0);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [queuedItems, setQueuedItems] = useState<Record<string, boolean>>({});

  // Format INR Currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  // 1. Fetch Calendar
  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        setLoading(true);
        const calRes = await festivalApi.getCalendar();
        if (calRes.success) {
          setCalendar(calRes.data.events || []);
          if (calRes.data.events.length > 0) {
            setSelectedFestivalId(calRes.data.events[0].id);
          }
        }
      } catch (err) {
        toast.error("Failed to load festival calendar");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  // 2. Fetch Independent Recommendations when festival, scale, or filters change
  useEffect(() => {
    if (!selectedFestivalId) return;

    const fetchRecs = async () => {
      try {
        setRecsLoading(true);
        const res = await festivalApi.getRecommendations({
          festivalId: selectedFestivalId,
          subCategory: selectedSubCategory,
          occasionTag:
            selectedFestivalId === "FEST_2027_VALENTINES_SHIVRATRI" && dualFilterMode !== "ALL"
              ? dualFilterMode
              : undefined,
          scale: storeScale,
          search: search || undefined,
        });

        if (res.success) {
          setRecommendations(res.data.items || []);
          setCulturalBriefing(res.data.culturalBriefing || null);
          setAggregates(res.data.aggregateMetrics || null);
        }
      } catch (err) {
        toast.error("Failed to load festival merchandise recommendations");
      } finally {
        setRecsLoading(false);
      }
    };

    const timer = setTimeout(fetchRecs, 150);
    return () => clearTimeout(timer);
  }, [selectedFestivalId, selectedSubCategory, storeScale, search, dualFilterMode]);

  const activeFestival = calendar.find((f) => f.id === selectedFestivalId) || calendar[0];

  const handleSelectFestival = (festival: any) => {
    setSelectedFestivalId(festival.id);
    setSelectedSubCategory("ALL");
    setDualFilterMode("ALL");
  };

  const handleOpenApproval = (item: any) => {
    setSelectedItemForApproval(item);
    setApprovalQuantity(item.recommendedUnits);
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedItemForApproval || approvalQuantity <= 0) return;

    try {
      setIsSubmittingApproval(true);
      const estCost = approvalQuantity * selectedItemForApproval.wholesaleCost;

      const res = await festivalApi.createReorderApproval({
        productId: selectedItemForApproval.id,
        productName: selectedItemForApproval.productName,
        festivalId: activeFestival?.id,
        festivalName: activeFestival?.name,
        recommendedQuantity: approvalQuantity,
        estimatedCost: estCost,
        significanceTag: selectedItemForApproval.significanceTag,
      });

      if (res.success) {
        setQueuedItems((prev) => ({ ...prev, [selectedItemForApproval.id]: true }));
        toast.success(`Purchase Order queued for Manager Review!`, {
          description: `${selectedItemForApproval.productName} (${approvalQuantity} units) queued for governance & blockchain ledger.`,
        });
        setApprovalModalOpen(false);
      }
    } catch (err) {
      toast.error("Failed to queue purchase approval request");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Extract distinct subcategories for filter
  const distinctSubCategories = Array.from(
    new Set(recommendations.map((r) => r.subCategory))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-slate-300 font-mono text-sm tracking-widest uppercase">
          Loading Festival Cultural Intelligence Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/95 border border-primary/25 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md flex flex-wrap items-center gap-2">
                2026 Festival Cultural Significance &amp; Product Recommender
                <Badge className="bg-gradient-to-r from-amber-500 to-primary text-slate-950 font-black text-[11px] px-2.5 py-0.5">
                  AUTONOMOUS MERCHANDISING AI
                </Badge>
                <Badge className="bg-blue-600/30 text-blue-300 border border-blue-400/40 font-mono text-[11px] px-2.5 py-0.5 flex items-center gap-1">
                  ⚡ QUICK-COMMERCE &amp; FMCG STANDARD
                </Badge>
              </h1>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 font-medium max-w-3xl">
              Autonomous Quick-Commerce &amp; Festive Merchandising AI. Recommends authentic, high-demand branded packaged food items, festive sweets &amp; dry fruit gift hampers, instant fasting mixes, boxed chocolates, and beverages calibrated with wholesale costs, margins, and store-scale order quantities.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">2026 Festival Calendar</div>
              <div className="text-sm font-bold text-white font-mono">18 September 2026 (Active Date)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2026/2027 Festival Horizon Carousel */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Select 2026 &amp; 2027 Festival Event
          </h3>
          <span className="text-xs text-slate-400">Click any festival to view culturally curated products</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {calendar.map((event) => {
            const isSelected = event.id === selectedFestivalId;
            const isUrgent = event.status === "URGENT_ORDER";
            const isPrepare = event.status === "PREPARE_NOW";

            return (
              <div
                key={event.id}
                onClick={() => handleSelectFestival(event)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl flex flex-col justify-between group",
                  isSelected
                    ? "bg-slate-900/95 border-primary shadow-[0_0_20px_rgba(234,179,8,0.2)] ring-1 ring-primary/60 scale-[1.02]"
                    : "bg-slate-950/70 border-white/10 hover:border-white/30 hover:bg-slate-900/60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.2 font-bold",
                        isUrgent
                          ? "border-rose-500/50 text-rose-400 bg-rose-500/15"
                          : isPrepare
                          ? "border-amber-500/50 text-amber-300 bg-amber-500/15"
                          : "border-blue-500/40 text-blue-300 bg-blue-500/10"
                      )}
                    >
                      {isUrgent ? "URGENT ORDER" : isPrepare ? "PREPARE NOW" : "UPCOMING"}
                    </Badge>
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {event.surgeMultiplier}x Surge
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {event.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {event.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span>{event.startDate.slice(5)}</span>
                  <span className={cn("font-bold", event.daysUntilStart <= 30 ? "text-amber-300" : "text-slate-400")}>
                    {event.daysUntilStart}d left
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cultural Briefing & Significance Dossier */}
      {culturalBriefing && (
        <div className="bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-amber-950/20 border border-amber-500/30 p-5 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">
                    {culturalBriefing.festivalName}
                  </h3>
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                    Cultural Significance Guide
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {culturalBriefing.dates} &bull; {culturalBriefing.significanceOverview}
                </p>
              </div>
            </div>

            {/* Store Scale Selector */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setStoreScale("SMALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  storeScale === "SMALL"
                    ? "bg-primary text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Store className="w-3.5 h-3.5" />
                Small Store
              </button>
              <button
                onClick={() => setStoreScale("MEDIUM")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  storeScale === "MEDIUM"
                    ? "bg-primary text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Building className="w-3.5 h-3.5" />
                Medium Store
              </button>
              <button
                onClick={() => setStoreScale("ENTERPRISE")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  storeScale === "ENTERPRISE"
                    ? "bg-primary text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                Supermarket Chain
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Cultural Rules & Negative Filters */}
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-xl space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Cultural Rules &amp; Strict Filters
              </div>
              <ul className="space-y-1.5 text-slate-300">
                {culturalBriefing.culturalRules.map((rule: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">&bull;</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Shopping Trends */}
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-xl space-y-2">
              <div className="font-bold text-blue-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                High-Velocity Shopping Trends
              </div>
              <ul className="space-y-1.5 text-slate-300">
                {culturalBriefing.keyShoppingTrends.map((trend: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">&bull;</span>
                    <span>{trend}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Merchandising Advice */}
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-xl space-y-2">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                Retail Merchandising Strategy
              </div>
              <p className="text-slate-300 leading-relaxed">
                {culturalBriefing.merchandisingAdvice}
              </p>
              <div className="pt-1 text-[11px] text-amber-300 font-mono">
                Order Deadline: <strong className="text-white">{activeFestival?.orderDeadlineDate}</strong> ({activeFestival?.daysUntilOrderDeadline} days left)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Valentine & Maha Shivratri Dual Festive Spotlight */}
      {selectedFestivalId === "FEST_2027_VALENTINES_SHIVRATRI" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Valentine Romance */}
          <div
            onClick={() => setDualFilterMode(dualFilterMode === "VALENTINE" ? "ALL" : "VALENTINE")}
            className={cn(
              "p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl group",
              dualFilterMode === "VALENTINE"
                ? "bg-rose-950/40 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] ring-2 ring-rose-400"
                : "bg-slate-950/80 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/20"
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xl shrink-0">
                  💖
                </div>
                <div>
                  <h4 className="font-black text-white text-base group-hover:text-rose-300 transition-colors flex items-center gap-2">
                    Valentine's Day &amp; Romance Week
                    <Badge className="bg-rose-500 text-white font-mono text-[10px] px-1.5 py-0">
                      10 PRODUCTS
                    </Badge>
                  </h4>
                  <p className="text-xs text-rose-300/80 font-mono">
                    Feb 7 – Feb 14 &bull; Youth Romance &amp; Gifting
                  </p>
                </div>
              </div>
              <Badge className={cn(
                "font-mono text-[10px] px-2 py-0.5",
                dualFilterMode === "VALENTINE" ? "bg-rose-500 text-white" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              )}>
                {dualFilterMode === "VALENTINE" ? "✓ FILTER ACTIVE" : "CLICK TO FILTER"}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Curated Packaged Selection: Luxury Ferrero Rocher Heart Box (16 Pcs), Cadbury Dairy Milk Silk Heart Pop, Hershey's Exotic Dark Chocolates, Lindt Swiss Luxury Selection, Nestlé KitKat Dessert Delight, Belgian Wafer Rolls, 4700BC Caramel Popcorn, Paper Boat Sparkling Drinks, and Bikaji Kaju Barfi with <strong>60%+ profit margins</strong>.
            </p>
            <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex items-center justify-between text-xs">
              <span className="text-rose-400 font-bold font-mono">
                {dualFilterMode === "VALENTINE" ? "Showing only Valentine's items" : "Click to show Valentine products →"}
              </span>
              <span className="text-rose-300 font-mono text-[11px] font-bold">5.0x Surge Demand</span>
            </div>
          </div>

          {/* Card 2: Maha Shivratri Fasting & Holy Foods */}
          <div
            onClick={() => setDualFilterMode(dualFilterMode === "SHIVRATRI" ? "ALL" : "SHIVRATRI")}
            className={cn(
              "p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl group",
              dualFilterMode === "SHIVRATRI"
                ? "bg-amber-950/40 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-2 ring-amber-400"
                : "bg-slate-950/80 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-950/20"
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                  🔱
                </div>
                <div>
                  <h4 className="font-black text-white text-base group-hover:text-amber-300 transition-colors flex items-center gap-2">
                    Maha Shivratri Fasting &amp; Holy Foods
                    <Badge className="bg-amber-500 text-slate-950 font-mono text-[10px] px-1.5 py-0 font-black">
                      7 PRODUCTS
                    </Badge>
                  </h4>
                  <p className="text-xs text-amber-300/80 font-mono">
                    March 6 &bull; Auspicious Fasting &amp; Satvik Vrat Staples
                  </p>
                </div>
              </div>
              <Badge className={cn(
                "font-mono text-[10px] px-2 py-0.5",
                dualFilterMode === "SHIVRATRI" ? "bg-amber-500 text-slate-950 font-bold" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              )}>
                {dualFilterMode === "SHIVRATRI" ? "✓ FILTER ACTIVE" : "CLICK TO FILTER"}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Curated Fasting &amp; Holy Foods: Paper Boat Kesaria Thandai Cans (Pack of 6), Farmley Roasted Himalayan Salt Makhana, Haldiram's Phalahari Fasting Namkeen, Amul Kool Kesar Badam Milk (Pack of 6), Fortune Kuttu Ka Atta, Classic Sabudana Pearls, and Amul Pure Cow Desi Ghee (1L Tin) for puja and fasting.
            </p>
            <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-amber-400 font-bold font-mono">
                {dualFilterMode === "SHIVRATRI" ? "Showing only Shivratri items" : "Click to show Shivratri products →"}
              </span>
              <span className="text-amber-300 font-mono text-[11px] font-bold">4.8x Surge Demand</span>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Financial Metrics */}
      {aggregates && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-950/90 border border-white/15 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Total Curated SKUs</span>
            <div className="text-2xl font-black text-white mt-1">
              {aggregates.totalProductsCount} Products
            </div>
            <span className="text-[10px] text-slate-400">
              {storeScale.toLowerCase()} scale: {aggregates.totalUnitsToOrder.toLocaleString()} total units
            </span>
          </Card>

          <Card className="bg-slate-950/90 border border-amber-500/25 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
            <span className="text-[11px] font-mono text-amber-400 uppercase">Wholesale Procurement Cost</span>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {formatCurrency(aggregates.totalCapitalInvestment)}
            </div>
            <span className="text-[10px] text-slate-300">Total capital needed to stock</span>
          </Card>

          <Card className="bg-slate-950/90 border border-emerald-500/25 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
            <span className="text-[11px] font-mono text-emerald-400 uppercase">Projected Retail Revenue</span>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {formatCurrency(aggregates.totalProjectedRevenue)}
            </div>
            <span className="text-[10px] text-slate-300">Expected sales at suggested MSRP</span>
          </Card>

          <Card className="bg-slate-950/90 border border-primary/30 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
            <span className="text-[11px] font-mono text-primary uppercase">Estimated Net Profit</span>
            <div className="text-2xl font-black text-primary mt-1">
              {formatCurrency(aggregates.totalProjectedProfit)}
            </div>
            <span className="text-[10px] text-slate-300">
              Average margin: <strong className="text-primary font-bold">{aggregates.avgProfitMargin}%</strong>
            </span>
          </Card>
        </div>
      )}

      {/* Recommended Products Catalog Table */}
      <Card className="bg-slate-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-900/90 border-b border-white/10 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <CardTitle className="text-white font-bold text-base flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-primary" />
                Authentic FMCG Packaged Products to Procure ({activeFestival?.name})
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs mt-0.5">
                100% Branded Packaged Food Items (FMCG), ready-to-eat festive sweets, boxed chocolates, dry fruits, fasting flours, snacks &amp; beverages curated for <strong>{activeFestival?.name}</strong>.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search packed item, sweets, dry fruits, snacks, beverages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-900/90 border-white/15 text-white"
                />
              </div>

              {distinctSubCategories.length > 1 && (
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="h-9 px-3 rounded-lg text-xs font-mono bg-slate-900 border border-white/15 text-slate-200"
                >
                  <option value="ALL">All Categories</option>
                  {distinctSubCategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Quick Filter Pills for Valentine's & Maha Shivratri */}
          {selectedFestivalId === "FEST_2027_VALENTINES_SHIVRATRI" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">
                  Festival Category Filter:
                </span>
                <span className="text-xs text-slate-400">
                  Switch between Valentine chocolates &amp; treats and Shivratri fasting foods
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDualFilterMode("ALL")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-sm",
                    dualFilterMode === "ALL"
                      ? "bg-primary text-slate-950 border-primary font-black shadow-md shadow-primary/20 scale-[1.02]"
                      : "border-white/15 text-slate-300 hover:bg-white/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  All Products (17 SKUs)
                </button>
                <button
                  type="button"
                  onClick={() => setDualFilterMode("VALENTINE")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-sm",
                    dualFilterMode === "VALENTINE"
                      ? "bg-rose-600 text-white border-rose-500 font-black shadow-lg shadow-rose-600/30 scale-[1.02]"
                      : "border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20"
                  )}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  💖 Valentine's Chocolates &amp; Confectionery (10)
                </button>
                <button
                  type="button"
                  onClick={() => setDualFilterMode("SHIVRATRI")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-sm",
                    dualFilterMode === "SHIVRATRI"
                      ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-lg shadow-amber-500/30 scale-[1.02]"
                      : "border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                  )}
                >
                  <span>🔱</span>
                  🔱 Maha Shivratri Fasting &amp; Holy Foods (7)
                </button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {recsLoading ? (
            <div className="p-12 text-center text-slate-400 font-mono text-sm">
              Loading curated festival merchandise...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-mono text-sm">
              No products found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/60 text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-3 px-4">Product Name &amp; Cultural Significance</th>
                    <th className="py-3 px-4">Sub-Category</th>
                    <th className="py-3 px-4 text-right">Wholesale Cost</th>
                    <th className="py-3 px-4 text-right">Suggested MSRP</th>
                    <th className="py-3 px-4 text-right">Profit Margin</th>
                    <th className="py-3 px-4 text-right">Recommended Order</th>
                    <th className="py-3 px-4 text-right">Total Investment</th>
                    <th className="py-3 px-4 text-center">Urgency</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {recommendations.map((rec) => {
                    const isCritical = rec.urgency === "CRITICAL_NOW";
                    const isOrderSoon = rec.urgency === "ORDER_SOON";
                    const isValentine = rec.occasionTag === "VALENTINE" || rec.id?.startsWith("VAL");
                    const isShivratri = rec.occasionTag === "SHIVRATRI" || rec.id?.startsWith("SHIV");

                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-900/70 transition-colors group"
                      >
                        <td className="py-4 px-4 max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm group-hover:text-primary transition-colors">
                              {rec.productName}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {isValentine && (
                              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono px-2 py-0 font-bold flex items-center gap-1">
                                <span>💖</span> VALENTINE TREAT
                              </Badge>
                            )}
                            {isShivratri && (
                              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono px-2 py-0 font-bold flex items-center gap-1">
                                <span>🔱</span> SHIVRATRI FASTING
                              </Badge>
                            )}
                            {rec.complianceTag && (
                              <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono px-1.5 py-0 font-bold">
                                📦 {rec.complianceTag}
                              </Badge>
                            )}
                            <Badge className="bg-slate-800/80 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0">
                              {rec.significanceTag}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Surge: {rec.demandMultiplier}x
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                            {rec.culturalSignificance}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant="outline" className="border-white/10 text-slate-300 font-mono text-[10px]">
                            {rec.subCategory}
                          </Badge>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            For: {rec.targetAudience}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-mono text-slate-200">
                          {formatCurrency(rec.wholesaleCost)}
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-bold text-white">
                          {formatCurrency(rec.suggestedMSRP)}
                        </td>

                        <td className="py-4 px-4 text-right font-mono">
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            +{rec.profitMarginPercent}%
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-mono">
                          <span className="text-amber-300 font-black text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {rec.recommendedUnits.toLocaleString()} units
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            ({storeScale.toLowerCase()} store batch)
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-bold text-white">
                          <div>{formatCurrency(rec.totalWholesaleInvestment)}</div>
                          <span className="text-[10px] text-emerald-400 block font-normal">
                            Profit: +{formatCurrency(rec.expectedProfit)}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <Badge
                            className={cn(
                              "text-[10px] font-mono px-2 py-0.5 font-bold uppercase",
                              isCritical
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : isOrderSoon
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            )}
                          >
                            {isCritical
                              ? "CRITICAL NOW"
                              : isOrderSoon
                              ? "ORDER SOON"
                              : "PREPARE"}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {rec.daysUntilDeadline}d left
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right">
                          {queuedItems[rec.id] ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] px-2.5 py-1.5 flex items-center justify-end gap-1 font-mono font-bold whitespace-nowrap ml-auto w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Sent to Manager
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/80 transition-all rounded-lg shadow-sm"
                              onClick={() => handleOpenApproval(rec)}
                            >
                              <CheckSquare className="w-3.5 h-3.5 mr-1" />
                              Procure
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="bg-slate-950 border border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Queue Festival Procurement Request
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Push purchase order recommendation to Manager Governance &amp; Blockchain audit trail for{" "}
              <strong className="text-white">{activeFestival?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedItemForApproval && (
            <div className="space-y-4 py-3">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product:</span>
                  <span className="font-bold text-white text-right max-w-xs">{selectedItemForApproval.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Significance:</span>
                  <span className="font-medium text-amber-300">{selectedItemForApproval.significanceTag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wholesale Unit Cost:</span>
                  <span className="font-mono text-slate-200">{formatCurrency(selectedItemForApproval.wholesaleCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Suggested Retail MSRP:</span>
                  <span className="font-mono text-white font-bold">{formatCurrency(selectedItemForApproval.suggestedMSRP)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1.5">
                  <span className="text-slate-300 font-bold">Est. Total Investment:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatCurrency(approvalQuantity * selectedItemForApproval.wholesaleCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Projected Net Profit:</span>
                  <span className="font-mono text-primary font-bold">
                    +{formatCurrency(approvalQuantity * (selectedItemForApproval.suggestedMSRP - selectedItemForApproval.wholesaleCost))} ({selectedItemForApproval.profitMarginPercent}%)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Approved Purchase Order Quantity (Units):
                </label>
                <Input
                  type="number"
                  min={1}
                  value={approvalQuantity}
                  onChange={(e) => setApprovalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-slate-900 border-white/20 text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Order deadline with supplier: {selectedItemForApproval.orderDeadline}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setApprovalModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={isSubmittingApproval || approvalQuantity <= 0}
              className="bg-primary text-slate-950 font-bold hover:bg-primary/90"
            >
              {isSubmittingApproval ? "Queuing..." : "Submit to Manager Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
