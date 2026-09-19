import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingDown, DollarSign, Activity, AlertTriangle, ArrowRight, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { dashboardApi, analyticsApi } from "@/api";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [segmentation, setSegmentation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, alertsRes, segRes] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getAlerts(),
          analyticsApi.getSegmentation()
        ]);
        
        if (summaryRes.success) setSummary(summaryRes.data);
        if (alertsRes.success) setAlerts(alertsRes.data);
        if (segRes.success) setSegmentation(segRes.data);
      } catch (error) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-white">Loading dashboard data...</div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const getClassData = (cls: string) => {
    const item = segmentation.find((s: any) => s.abc_class === cls);
    return {
      count: item?.count || 0,
      percentage: Math.round(item?.percentage || 0)
    };
  };

  const classA = getClassData('A');
  const classB = getClassData('B');
  const classC = getClassData('C');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Control Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/85 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Command Center
            </h1>
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 font-mono text-[11px] px-2.5 py-0.5 font-bold shadow-sm">
              Global Overview
            </Badge>
          </div>
          <p className="text-slate-300 font-mono text-xs tracking-wider mt-1.5 font-medium drop-shadow-sm">
            REAL-TIME INVENTORY CONTROL • AUTONOMOUS ALERTS &amp; POLICY VERIFICATION
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Button 
            variant="outline" 
            className="border-amber-500/40 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold h-9 px-3.5 rounded-xl shadow-md"
            onClick={() => setLocation("/analytics?status=EXCESS")}
          >
            <TrendingDown className="w-4 h-4 mr-1.5" /> Excess Items ({summary?.excessItems || 0})
          </Button>
          <Button 
            variant="outline" 
            className="border-blue-500/40 text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 text-xs font-bold h-9 px-3.5 rounded-xl shadow-md"
            onClick={() => setLocation("/analytics?status=UNDERSTOCK")}
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Understocked ({summary?.understockedItems || 0})
          </Button>
        </div>
      </div>

      {/* 2026 Festival Intelligence Callout Banner */}
      <div 
        onClick={() => setLocation("/festivals")}
        className="cursor-pointer group relative overflow-hidden bg-gradient-to-r from-amber-950/40 via-slate-950/90 to-indigo-950/50 border border-amber-500/35 hover:border-amber-400/80 p-4 rounded-2xl shadow-xl transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Upcoming 2026 Festival Surge Alert
              </span>
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0">
                Navratri &bull; Dussehra &bull; Diwali Ahead
              </Badge>
            </div>
            <p className="text-xs text-slate-200 mt-0.5 font-medium">
              ML Model projects <strong>2.4x – 4.2x demand surges</strong> across retail verticals. Check pre-order recommendations before supplier lead times close.
            </p>
          </div>
        </div>

        <Button 
          size="sm" 
          className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-xs h-8 px-3.5 rounded-xl shadow-md shrink-0 group-hover:translate-x-0.5 transition-all"
        >
          Explore Festival Reorders <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-xl p-2 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{formatCurrency(summary?.totalInventoryValue)}</div>
            <p className="text-xs text-slate-300 mt-1 font-medium">Across {summary?.totalSkus?.toLocaleString() || 0} SKUs</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-slate-950/95 via-[#1c1407]/90 to-amber-950/30 backdrop-blur-2xl border border-amber-500/35 hover:border-amber-400/70 shadow-xl p-2 rounded-2xl transition-all cursor-pointer"
          onClick={() => setLocation("/analytics?status=EXCESS")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">Excess Capital</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-300">{formatCurrency(summary?.excessValue)}</div>
            <p className="text-xs text-slate-200 mt-1 font-medium">{summary?.excessItems?.toLocaleString() || 0} SKUs ({Math.round(summary?.excessPercentage || 0)}% of val)</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-slate-950/95 via-[#08152c]/90 to-blue-950/30 backdrop-blur-2xl border border-blue-500/35 hover:border-blue-400/70 shadow-xl p-2 rounded-2xl transition-all cursor-pointer"
          onClick={() => setLocation("/analytics?status=UNDERSTOCK")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">Stockout Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-300">{summary?.understockedItems?.toLocaleString() || 0} SKUs</div>
            <p className="text-xs text-slate-200 mt-1 font-medium">Below safe reorder level</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 hover:border-white/35 shadow-xl p-2 rounded-2xl transition-all cursor-pointer"
          onClick={() => setLocation("/approval")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Pending Approvals</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{summary?.itemsNeedingReview || 0}</div>
            <p className="text-xs text-slate-300 mt-1 font-medium">Awaiting manager review</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-slate-950/90 backdrop-blur-2xl border border-primary/30 hover:border-primary/60 shadow-xl p-2 rounded-2xl transition-all cursor-pointer"
          onClick={() => setLocation("/blockchain")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Blockchain Audit</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">100%</div>
            <p className="text-xs text-slate-300 mt-1 font-medium">Cryptographically verified</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/15 bg-slate-900/95 p-4">
            <CardTitle className="flex items-center gap-2.5 text-white font-bold text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              Recent Inventory Alerts
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-primary hover:text-primary/80 font-bold"
              onClick={() => setLocation("/analytics")}
            >
              View All SKUs <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {alerts.length === 0 ? (
               <div className="text-sm text-slate-400 p-6 text-center">No recent alerts.</div>
            ) : alerts.map((alert: any) => {
              const isUnderstock = alert.status === "UNDERSTOCK";
              return (
                <div key={alert.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-900/90 hover:bg-slate-800/90 transition-all gap-3 shadow-md">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUnderstock 
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-inner" 
                        : "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-inner"
                    }`}>
                      {isUnderstock ? <AlertTriangle className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-extrabold text-white text-sm">{alert.sku}</h4>
                        <span className="text-xs text-slate-300 font-medium">• {alert.product_name}</span>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md border font-bold ${
                          isUnderstock 
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40" 
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}>
                          {isUnderstock ? "Stockout Risk" : "Excess Stock"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-1 font-medium">
                        {isUnderstock ? (
                          <span>Stock: <strong className="text-blue-300 font-bold">{alert.stock_quantity}</strong> / Reorder Point: <strong className="text-white">{alert.reorder_level}</strong> (Deficit: <strong className="text-blue-400 font-bold">{Math.max(1, alert.reorder_level - alert.stock_quantity)}</strong> units)</span>
                        ) : (
                          <span>Excess: <strong className="text-amber-300 font-bold">{alert.excess_quantity}</strong> units (<strong className="text-amber-400">{formatCurrency(alert.excess_value)}</strong> tied up)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`text-xs h-8 px-3 rounded-lg font-bold transition-all ${
                      isUnderstock
                        ? "border-blue-500/50 text-blue-300 hover:text-white hover:bg-blue-600 bg-blue-500/15"
                        : "border-amber-500/50 text-amber-300 hover:text-slate-950 hover:bg-amber-500 bg-amber-500/15"
                    }`}
                    onClick={() => setLocation(`/analytics?search=${alert.sku}`)}
                  >
                    {isUnderstock ? "Order Stock" : "Review"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        <Card className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/15 bg-slate-900/95 p-4">
            <CardTitle className="text-white font-bold text-base">Segmentation (ABC)</CardTitle>
            <CardDescription className="text-slate-300 text-xs">Value distribution across inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Class A (High Value)</div>
                  <div className="text-xs text-slate-300 font-medium">{classA.count} SKUs</div>
                </div>
                <div className="font-extrabold text-primary">{classA.percentage}%</div>
              </div>
              <Progress value={classA.percentage} className="h-2.5 bg-slate-800" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Class B (Medium)</div>
                  <div className="text-xs text-slate-300 font-medium">{classB.count} SKUs</div>
                </div>
                <div className="font-extrabold text-orange-400">{classB.percentage}%</div>
              </div>
              <Progress value={classB.percentage} className={cn("h-2.5 bg-slate-800", "[&>div]:bg-orange-400")} />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Class C (Low)</div>
                  <div className="text-xs text-slate-300 font-medium">{classC.count} SKUs</div>
                </div>
                <div className="font-extrabold text-slate-300">{classC.percentage}%</div>
              </div>
              <Progress value={classC.percentage} className={cn("h-2.5 bg-slate-800", "[&>div]:bg-slate-400")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
