import { useState, useEffect } from "react";
import { Link as LinkIcon, Database, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { blockchainApi } from "@/api";
import { toast } from "sonner";

export default function BlockchainLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await blockchainApi.getLogs();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (error) {
      toast.error("Failed to fetch blockchain logs");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffInMs = now.getTime() - past.getTime();
    
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    if (diffInMins < 60) return `${diffInMins} mins ago`;
    
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Control Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/85 backdrop-blur-2xl p-5 rounded-2xl border border-white/15 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] flex items-center gap-3">
              <LinkIcon className="w-7 h-7 text-amber-400" />
              Blockchain Ledger
            </h1>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 font-mono text-[11px] px-2.5 py-0.5 font-bold shadow-sm">
              Audited
            </Badge>
          </div>
          <p className="text-slate-300 font-mono text-xs tracking-wider mt-1.5 font-medium drop-shadow-sm">
            IMMUTABLE POLICY AUDIT TRAIL • CRYPTOGRAPHIC SHA-256 STATE VERIFICATION
          </p>
        </div>
        
        <div className="px-3.5 py-2 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-xl flex items-center gap-2.5 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-mono text-emerald-300 font-bold">Smart Contract Active</span>
        </div>
      </div>

      <Card className="overflow-hidden shadow-2xl backdrop-blur-2xl border border-white/15 bg-slate-950/85 rounded-2xl">
        <CardHeader className="p-4 border-b border-white/10 bg-slate-900/60 flex flex-row items-center gap-2 text-slate-300">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-medium text-slate-200">Local Ethereum Ledger Simulation (Ganache / In-Memory State)</span>
        </CardHeader>
        
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-white font-medium">Loading blockchain ledger...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No audit logs found.</div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/20 before:to-transparent">
              {logs.map((log, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-amber-500/40 bg-slate-950 text-amber-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 backdrop-blur-md shadow-lg shadow-amber-500/10">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-xl transition-all shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                          {log.action}
                        </Badge>
                        {((log.sku || '').startsWith('NAV-') || (log.sku || '').startsWith('DUS-') || (log.sku || '').startsWith('VAL-') || (log.sku || '').startsWith('SHIV-') || (log.sku || '').startsWith('HOLI-') || (log.sku || '').startsWith('DIW-') || (log.sku || '').startsWith('EID-') || (log.sku || '').startsWith('XMAS-') || (log.sku || '').startsWith('FEST_')) && (
                          <Badge className="font-mono text-[10px] bg-primary/20 text-primary border border-primary/40 font-bold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Festival PO
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{getTimeAgo(log.created_at)}</span>
                    </div>

                    {log.product_name && (
                      <div className="text-sm font-bold text-white tracking-wide truncate mt-1">
                        {log.product_name}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 text-white">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">SKU</div>
                        <div className="font-medium font-mono text-xs text-slate-200">{log.sku}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Rec ID</div>
                        <div className="font-medium font-mono text-xs text-slate-200">{log.record_id}</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Data Hash</div>
                      <div className="flex justify-between items-center">
                        <div className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded truncate max-w-[200px]">
                          {log.data_hash}
                        </div>
                        {log.verified && (
                          <div className="flex items-center gap-1 text-green-500 text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
