import { useState, useEffect } from "react";
import { Check, X, ShieldAlert, TrendingDown, AlertTriangle, PackageCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approvalApi } from "@/api";
import { toast } from "sonner";

export default function ManagerApproval() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await approvalApi.getPending();
      if (res.success) {
        setApprovals(res.data);
      }
    } catch (error) {
      toast.error("Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approvalApi.approve(id);
      } else {
        await approvalApi.reject(id);
      }
      toast.success(`Request ${action}d & recorded to blockchain ledger`);
      fetchApprovals();
    } catch (error) {
      toast.error(`Failed to ${action} request`);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Control Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/85 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Manager Approval Hub
            </h1>
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 font-mono text-[11px] px-2.5 py-0.5 font-bold shadow-sm">
              Governance
            </Badge>
          </div>
          <p className="text-slate-300 font-mono text-xs tracking-wider mt-1.5 font-medium drop-shadow-sm">
            REVIEW &amp; VERIFY INVENTORY ACTIONS (FESTIVAL POs • UNDERSTOCK REORDERS • EXCESS LIQUIDATION)
          </p>
        </div>
        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/15 font-mono px-3.5 py-1.5 font-bold text-xs shadow-md">
          <PackageCheck className="w-4 h-4 mr-1.5" /> {approvals.length} Pending Review
        </Badge>
      </div>

      {loading ? (
        <div className="p-16 text-center text-white font-medium text-sm">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <div>Loading approval requests...</div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="p-16 text-center text-white border border-white/15 rounded-2xl bg-slate-950/90 backdrop-blur-2xl shadow-2xl">
          <PackageCheck className="w-10 h-10 text-primary mx-auto mb-3" />
          <div className="text-xl font-bold">All inventory requests resolved</div>
          <p className="text-sm text-slate-300 mt-1">No pending manager approvals at this moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvals.map((rec, i) => {
            const isFestival = (rec.reason || '').toLowerCase().includes('festival') || (rec.sku || '').startsWith('NAV-') || (rec.sku || '').startsWith('DUS-') || (rec.sku || '').startsWith('VAL-') || (rec.sku || '').startsWith('SHIV-') || (rec.sku || '').startsWith('HOLI-') || (rec.sku || '').startsWith('DIW-') || (rec.sku || '').startsWith('EID-') || (rec.sku || '').startsWith('XMAS-') || (rec.sku || '').startsWith('FEST_') || (rec.approved_by || '').includes('Festival');
            const isUnderstock = !isFestival && ((rec.reason || '').toLowerCase().includes('reorder') || (rec.reason || '').toLowerCase().includes('replenishment') || (rec.excess_quantity !== null && Number(rec.excess_quantity) <= 0));

            return (
              <Card key={i} className={`relative overflow-hidden group border rounded-2xl transition-all shadow-2xl backdrop-blur-2xl ${
                isFestival
                  ? "border-amber-400/40 hover:border-amber-300/80 bg-gradient-to-br from-slate-950/95 via-[#1e1302]/90 to-amber-950/40 shadow-[0_8px_32px_rgba(251,191,36,0.18)]"
                  : isUnderstock 
                  ? "border-blue-500/35 hover:border-blue-400/70 bg-gradient-to-br from-slate-950/95 via-[#08152c]/90 to-blue-950/30 shadow-[0_8px_32px_rgba(59,130,246,0.15)]" 
                  : "border-amber-500/35 hover:border-amber-400/70 bg-gradient-to-br from-slate-950/95 via-[#1c1407]/90 to-amber-950/30 shadow-[0_8px_32px_rgba(245,158,11,0.15)]"
              }`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-90 group-hover:opacity-100 transition-opacity ${
                  isFestival
                    ? "from-amber-400 via-yellow-300 to-amber-500"
                    : isUnderstock 
                    ? "from-blue-500 via-blue-400 to-blue-500" 
                    : "from-amber-500 via-amber-400 to-amber-500"
                }`}></div>
                
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge variant="outline" className={`uppercase tracking-wider text-[10px] px-2.5 py-0.5 font-mono font-bold rounded-md flex items-center gap-1 ${
                        isFestival
                          ? "text-amber-300 border-amber-400/60 bg-amber-500/20 shadow-sm"
                          : isUnderstock 
                          ? "text-blue-300 border-blue-500/50 bg-blue-500/20 shadow-sm" 
                          : "text-amber-300 border-amber-500/50 bg-amber-500/20 shadow-sm"
                      }`}>
                        {isFestival ? (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            Festival PO (2026)
                          </>
                        ) : isUnderstock ? (
                          "Understock Reorder"
                        ) : (
                          "Excess Reallocation"
                        )}
                      </Badge>
                      <div className="text-xs text-slate-300 font-mono mt-2 font-medium">Request #{rec.id}</div>
                    </div>
                    
                    {isFestival ? (
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-400/40 text-amber-300 shadow-sm">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    ) : isUnderstock ? (
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30 text-blue-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : parseFloat(rec.excess_value) > 500000 ? (
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/30 text-destructive">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-400">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-black mt-1 text-white tracking-tight leading-snug line-clamp-1">
                    {rec.name || rec.sku}
                  </h3>
                  <p className="text-xs text-slate-300 mb-4 truncate font-mono">
                    SKU: <strong className="text-white">{rec.sku}</strong> &bull; {isFestival ? "Festive Season Surge Merchandise" : isUnderstock ? "Stockout Prevention" : "Capital Efficiency"}
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        {isFestival ? "Estimated Procurement Value" : isUnderstock ? "Estimated Procurement Cost" : "Estimated Excess Capital"}
                      </div>
                      <div className={`text-lg font-bold ${isFestival ? "text-amber-300" : isUnderstock ? "text-blue-400" : "text-amber-400"}`}>
                        {formatCurrency(rec.excess_value)}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        Recommended Action
                      </div>
                      <div className="text-xs font-medium text-white leading-relaxed">
                        {rec.reason}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2.5">
                    <Button 
                      className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 font-bold" 
                      onClick={() => handleAction(rec.id, 'approve')}
                    >
                      <Check className="w-3.5 h-3.5" /> {isFestival ? "Approve PO" : "Approve Action"}
                    </Button>
                    <Button 
                      className="flex-1 gap-1.5 bg-black/50 text-white border-white/10 hover:bg-white/10 text-xs h-9" 
                      variant="outline"
                      onClick={() => handleAction(rec.id, 'reject')}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
