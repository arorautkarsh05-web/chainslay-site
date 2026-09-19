import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  UploadCloud, 
  CheckSquare, 
  Link as LinkIcon, 
  LayoutDashboard,
  Box,
  TrendingDown,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "1. Data Upload", icon: UploadCloud },
  { href: "/analytics", label: "2. SKU Analytics", icon: BarChart3 },
  { href: "/festivals", label: "Festival ML (2026)", icon: Sparkles, badge: "AI" },
  { href: "/approval", label: "3. Manager Approval", icon: CheckSquare },
  { href: "/blockchain", label: "4. Verification", icon: LinkIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full relative overflow-hidden bg-slate-950">
      {/* Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="bg-video"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260624_210218_173f8eba-17ff-4e27-972b-d128af25bf49.mp4" type="video/mp4" />
      </video>

      {/* Overlay to ensure readability - tinted navy gradient for Miami aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/45 to-slate-950/75 z-0 pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col z-20 shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-border/20">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <Box className="w-5 h-5 text-primary" />
          </div>
          <b className="tracking-widest text-foreground font-semibold">CHAINSLAY</b>
        </div>
        
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center gap-2 bg-black/20 p-2 rounded-md cursor-pointer hover:bg-black/30 border border-white/5 transition-colors">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              CS
            </div>
            <span className="text-xs text-foreground font-medium flex-1">Command Center</span>
            <TrendingDown className="w-4 h-4 text-foreground/50" />
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-xs text-muted-foreground font-semibold mb-2">WORKFLOW</div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
                    isActive 
                      ? "bg-primary/20 text-primary border border-primary/20 font-medium" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-primary text-slate-950 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden z-10">
        <header className="h-14 border-b border-border/20 flex items-center px-6 bg-black/40 backdrop-blur-xl shrink-0">
          <div className="text-sm text-muted-foreground font-mono">
            app.chainslay.io{location}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
