import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Database,
  FileCheck2,
  Fingerprint,
  Layers3,
  LineChart,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  UploadCloud,
  X,
} from "lucide-react";
import api from "../api/api";

const menuItems = ["Platform", "How it works", "Trust layer"];

function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="markGradient" x1="8" y1="5" x2="38" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9fbff" />
          <stop offset="0.4" stopColor="#58d3e7" />
          <stop offset="1" stopColor="#087b9a" />
        </linearGradient>
      </defs>
      <path d="M24 3 42 13.3v21.4L24 45 6 34.7V13.3L24 3Z" fill="none" stroke="url(#markGradient)" strokeWidth="2.2" />
      <path d="m24 11 11 6.3v13.4L24 37l-11-6.3V17.3L24 11Z" fill="rgba(29,189,214,.11)" stroke="rgba(178,245,255,.72)" strokeWidth="1.4" />
      <path d="m27.8 14.8-9 10.7h5.2L22.4 33l8.8-11h-5.1l1.7-7.2Z" fill="#f4fdff" opacity=".92" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="5 1 14 22" preserveAspectRatio="none" aria-hidden="true">
      <path d="M13.9 1.6 5.5 13.6a.7.7 0 0 0 .6 1.1h4.2l-1 7.7a.7.7 0 0 0 1.25.55l8.3-12.1a.7.7 0 0 0-.6-1.1h-4.2l1-7.7a.7.7 0 0 0-1.25-.55Z" fill="rgba(16,112,152,.72)" stroke="rgba(190,236,255,.6)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MiniChart() {
  return (
    <svg className="mini-chart" viewBox="0 0 410 120" preserveAspectRatio="none" aria-label="Working capital trend">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#29c5db" stopOpacity=".28" />
          <stop offset="1" stopColor="#29c5db" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 93 C22 90 33 72 53 76 S82 67 97 78 S126 61 143 64 S172 45 192 59 S221 53 242 48 S273 59 290 42 S318 47 336 28 S367 35 410 11 V120 H0Z" fill="url(#areaFill)" />
      <path d="M0 93 C22 90 33 72 53 76 S82 67 97 78 S126 61 143 64 S172 45 192 59 S221 53 242 48 S273 59 290 42 S318 47 336 28 S367 35 410 11" fill="none" stroke="#20bdd3" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="410" cy="11" r="4" fill="#dcfbff" stroke="#20bdd3" strokeWidth="3" />
    </svg>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [verified, setVerified] = useState(false);
  const [activeModule, setActiveModule] = useState("Overview");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, inventoryRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/inventory?limit=5')
      ]);
      setDashboardData(summaryRes.data);
      setInventoryItems(inventoryRes.data.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const layers = document.querySelectorAll<HTMLElement>(".stars");
    layers.forEach((layer, layerIndex) => {
      const count = layerIndex === 0 ? 150 : 24;
      const shadows = Array.from({ length: count }, () => {
        const x = Math.round(Math.random() * 100);
        const y = Math.round(Math.random() * 100);
        const alpha = layerIndex === 0 ? (Math.random() * 0.25 + 0.05).toFixed(2) : (Math.random() * 0.36 + 0.34).toFixed(2);
        const blur = layerIndex === 0 ? 0 : 1.2;
        return `${x}vw ${y}vh ${blur}px 0 rgba(255,255,255,${alpha})`;
      });
      layer.style.boxShadow = shadows.join(",");
    });

    const resize = () => {
      const el = canvasRef.current;
      if (!el || window.innerWidth <= 700) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tablet = vw <= 1080;
      const designWidth = tablet ? Math.min(920 + ((vw - 701) * 252) / 379, 1172) : 1172;
      const k = Math.min(vw / designWidth, vh / 560);
      el.style.setProperty("--k", String(k));
      el.style.setProperty("--design-width", `${designWidth}px`);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string) => {
    setToast(message);
    setMenuOpen(false);
  };

  const handleNav = (label: string) => {
    if (label === "Trust layer") {
      notify("ChainSlay records approvals with a tamper-evident hash.");
    } else if (label === "How it works") {
      notify("Upload, segment, optimize, approve, verify.");
    } else {
      notify("The analytics console is ready for your next dataset.");
    }
  };

  const selectModule = (module: string) => {
    setActiveModule(module);
    const messages: Record<string, string> = {
      Overview: "Overview loaded — your inventory pulse is up to date.",
      Inventory: "Inventory module loaded — SKU records ready.",
      Forecasts: "Forecasts module loaded — moving-average demand view ready.",
      Policies: "Policies module loaded — recommendations need review.",
      "Blockchain ledger": "Ledger module loaded — verified decisions indexed.",
      "Verify records": "Verification module loaded — choose a record to compare hashes.",
    };
    notify(messages[module] ?? `${module} module loaded.`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    notify(`${file.name} uploading...`);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      notify(`${file.name} uploaded and processed successfully!`);
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      notify(`Upload failed: ${err.message || 'Unknown error'}`);
    }
    
    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);

  return (
    <main className="page-shell">
      <div className="stage">
      <div className="bg" />
      <div className="stars stA" />
      <div className="stars stB" />

      <div className="canvas" ref={canvasRef}>
        <div className="stack">
          <nav className={`nav ${menuOpen ? "open" : ""}`} aria-label="Primary navigation">
            <a className="mark" href="#top" aria-label="ChainSlay home"><LogoMark /></a>
            <a className="wm" href="#top">
              <span className="kick">INVENTORY INTELLIGENCE</span>
              <span className="name" id="wmName">ChainSlay</span>
            </a>
            <div className="links" id="navmenu">
              {menuItems.map((item) => (
                <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} onClick={(event) => { event.preventDefault(); handleNav(item); }}>
                  {item}
                </a>
              ))}
            </div>
            <a className="btn nav-cta" href="#dashboard" onClick={(event) => { event.preventDefault(); notify("Demo workspace opened — your inventory stays off-chain."); }}><span>Open console</span><ArrowUpRight size={12} /></a>
            <button className="burger" type="button" aria-label="Opens menu" aria-expanded={menuOpen} aria-controls="navmenu" onClick={() => setMenuOpen((value) => !value)}>
              {menuOpen ? <X size={18} /> : <Menu size={19} />}
            </button>
          </nav>

          <div className="badge">
            <i><BoltIcon /></i>
            <b id="badgeTxt">Built for inventory decisions that move capital</b>
          </div>

          <div className="h1" id="top">
            <div id="h1a">Optimize inventory.</div>
            <div id="h1b">Unlock capital.</div>
          </div>
          <div className="sub">
            <div id="sub1">See what is trapped, what to change,</div>
            <div id="sub2">and every decision you can verify.</div>
          </div>
          <a className="btn cta2" href="#dashboard" onClick={(event) => { event.preventDefault(); notify("Connect a CSV to start your first inventory review."); }}><span>See your exposure</span><ChevronRight size={14} /></a>
        </div>

        <section className="showcase" id="dashboard" aria-label="ChainSlay product preview">
          <div className="ring" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-dot dot-one" />
            <div className="orbit-dot dot-two" />
            <div className="orbit-dot dot-three" />
            <div className="orbit-card card-a"><span>EXCESS VALUE</span><b>{formatCurrency(dashboardData?.excessValue || 100120)}</b></div>
            <div className="orbit-card card-b"><span>SKU HEALTH</span><b>{dashboardData?.totalSkus ? Math.round(((dashboardData.optimizedItems || 0) / dashboardData.totalSkus) * 100) : 0}%</b></div>
            <div className="orbit-card card-c"><span>LEDGER STATUS</span><b><ShieldCheck size={12} /> VERIFIED</b><small>Local chain · block 18,442</small></div>
          </div>

          <div className="console-frame">
          <div className="browser" role="application" aria-label="ChainSlay inventory analytics dashboard">
            <div className="browser-bar">
              <div className="browser-dots"><i /><i /><i /></div>
              <div className="omni"><LockKeyhole size={8} /> app.chainslay.io / workspace / overview</div>
              <div className="browser-tools"><RotateCcw size={10} /><MoreHorizontal size={12} /></div>
            </div>
            <div className="dashboard-page">
              <aside className="dash-sidebar">
                <div className="dash-brand"><span className="dash-brand-mark"><LogoMark /></span><b>ChainSlay</b></div>
                <div className="workspace-select"><span className="workspace-icon">N</span><span>Northstar Goods</span><ChevronRight size={10} /></div>
                <div className="side-label">WORKSPACE</div>
                <button className={`side-link ${activeModule === "Overview" ? "active" : ""}`} onClick={() => selectModule("Overview")}><BarChart3 size={12} />Overview</button>
                <button className={`side-link ${activeModule === "Inventory" ? "active" : ""}`} onClick={() => selectModule("Inventory")}><Boxes size={12} />Inventory</button>
                <button className={`side-link ${activeModule === "Forecasts" ? "active" : ""}`} onClick={() => selectModule("Forecasts")}><LineChart size={12} />Forecasts</button>
                <button className={`side-link ${activeModule === "Policies" ? "active" : ""}`} onClick={() => selectModule("Policies")}><PackageCheck size={12} />Policies <em>{dashboardData?.itemsNeedingReview || 0}</em></button>
                <div className="side-label ledger-label">TRUST LAYER</div>
                <button className={`side-link ${activeModule === "Blockchain ledger" ? "active" : ""}`} onClick={() => selectModule("Blockchain ledger")}><Fingerprint size={12} />Blockchain ledger</button>
                <button className={`side-link ${activeModule === "Verify records" ? "active" : ""}`} onClick={() => selectModule("Verify records")}><FileCheck2 size={12} />Verify records</button>
                <div className="side-bottom"><div className="avatar">AM</div><div><b>Alex Morgan</b><span>Inventory manager</span></div><MoreHorizontal size={12} /></div>
              </aside>
              <div className="dash-main">
                <header className="dash-topbar">
                  <div><span className="eyebrow">MONDAY, SEPTEMBER 15, 2026</span><h3>Good morning, Alex <span>✦</span></h3></div>
                  <div className="dash-actions"><div className="search-box"><Search size={10} />Search inventory</div><button><Bell size={12} /></button><div className="tiny-avatar">AM</div></div>
                </header>
                <div className="dash-content">
                  <div className="dash-heading"><div><span className="mini-kicker"><Activity size={9} /> {activeModule.toUpperCase()} MODULE</span><h4>{activeModule === "Overview" ? "Inventory pulse" : activeModule}</h4><p>{activeModule === "Overview" ? "One view of what is moving, stuck, and ready to change." : "Explore this ChainSlay module using the live workspace controls."}</p></div><button className="upload-btn" onClick={() => uploadRef.current?.click()}><UploadCloud size={12} /> Upload data</button><input ref={uploadRef} className="hidden-upload" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} /></div>
                  
                  {loading ? (
                    <div className="metric-row"><p>Loading dashboard...</p></div>
                  ) : error ? (
                    <div className="metric-row"><p className="text-red-500">Error: {error}</p></div>
                  ) : (
                    <>
                      <div className="metric-row">
                        <div className="metric-card"><div className="metric-icon teal"><CircleDollarSign size={13} /></div><span>Total inventory value</span><b>{formatCurrency(dashboardData?.totalInventoryValue)}</b><small><TrendingDown size={9} /> 8.6% vs last review</small></div>
                        <div className="metric-card"><div className="metric-icon amber"><Box size={13} /></div><span>Excess inventory</span><b>{formatCurrency(dashboardData?.excessValue)}</b><small className="warn"><Sparkles size={9} /> {Math.round(dashboardData?.excessPercentage || 0)}% of total</small></div>
                        <div className="metric-card"><div className="metric-icon violet"><Database size={13} /></div><span>Total SKUs</span><b>{dashboardData?.totalSkus || 0}</b><small><CheckCircle2 size={9} /> Analyzed successfully</small></div>
                        <div className="metric-card"><div className="metric-icon blue"><ShieldCheck size={13} /></div><span>Verified decisions</span><b>42</b><small><LockKeyhole size={9} /> Blockchain backed</small></div>
                      </div>
                      <div className="analytics-grid">
                        <div className="panel trend-panel"><div className="panel-head"><div><b>Working capital opportunity</b><span>Potential release · last 12 months</span></div><button>12 months <ChevronRight size={9} /></button></div><div className="chart-value">{formatCurrency(dashboardData?.excessValue)} <span>potential release</span></div><MiniChart /><div className="chart-axis"><span>OCT</span><span>JAN</span><span>APR</span><span>JUL</span><span>SEP</span></div></div>
                        <div className="panel split-panel"><div className="panel-head"><div><b>Inventory by movement</b><span>FSN segmentation</span></div><MoreHorizontal size={13} /></div><div className="donut-wrap"><div className="donut"><div><b>{dashboardData?.totalSkus || 0}</b><span>SKUs</span></div></div><div className="legend"><span><i className="legend-dot fast" />Optimized <b>{dashboardData?.optimizedItems || 0}</b></span><span><i className="legend-dot slow" />Understocked <b>{dashboardData?.understockedItems || 0}</b></span><span><i className="legend-dot non" />Non-moving <b>0</b></span></div></div></div>
                      </div>
                      <div className="lower-grid">
                        <div className="panel table-panel"><div className="panel-head"><div><b>Inventory items</b><span>Recent records from your workspace</span></div><button className="view-all" onClick={() => notify("Showing all items.")}>View all <ArrowUpRight size={9} /></button></div>
                          <div className="sku-table">
                            <div className="table-row table-head"><span>SKU / PRODUCT</span><span>SEGMENT</span><span>STOCK</span><span>EXCESS VALUE</span><span /></div>
                            {inventoryItems.length === 0 && <div className="table-row"><span>No items found. Upload some data!</span></div>}
                            {inventoryItems.map((row, i) => (
                              <div className="table-row" key={row.id}>
                                <span className="product-cell"><i className={`sku-dot ${i % 2 === 0 ? 'cyan' : 'amber'}`} /><b>{row.sku}</b><small>{row.product_name}</small></span>
                                <span><em className="segment-pill">{row.abc_class || 'C'} / {row.xyz_class || 'Y'} / {row.fsn_class || 'S'}</em></span>
                                <span>{row.stock_quantity}</span>
                                <strong>{formatCurrency(row.excess_value)}</strong>
                                <MoreHorizontal size={12} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="panel action-panel"><div className="panel-head"><div><b>Next best action</b><span>Recommendation engine</span></div><Sparkles size={13} className="spark-icon" /></div><div className="action-card"><div className="action-top"><span className="priority">HIGH PRIORITY</span><span>REC-1048</span></div><h5>Reduce target coverage</h5><p>Review your excess coverage based on recent uploads.</p><div className="impact"><div><span>EST. RELEASE</span><b>$18,420</b></div><div><span>CONFIDENCE</span><b>94%</b></div></div><button className="review-btn" onClick={() => notify("Recommendation opened for manager review.")}>Review recommendation <ArrowUpRight size={10} /></button></div><div className="ledger-status"><span><span className="status-dot" /> Last snapshot verified</span><button onClick={() => setVerified((value) => !value)} className={verified ? "verified" : ""}>{verified ? <Check size={10} /> : <Fingerprint size={10} />} {verified ? "Hash matches" : "Verify hash"}</button></div></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      </div>
      </div>

      <section className="below-fold" id="platform">
        <div className="below-inner">
          <div className="below-copy">
            <span className="section-kicker"><Sparkles size={12} /> THE CONTROL PLANE FOR INVENTORY</span>
            <h2>Make every SKU earn its place.</h2>
            <p>ChainSlay turns raw inventory data into clear actions — so teams can release trapped capital without losing sight of service levels.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card"><div className="feature-icon"><Layers3 size={18} /></div><span>01</span><h3>Segment with context</h3><p>ABC, XYZ, and FSN signals show which products deserve attention first.</p></article>
            <article className="feature-card"><div className="feature-icon"><TrendingDown size={18} /></div><span>02</span><h3>Expose the opportunity</h3><p>See excess quantity, value, and potential capital release in one view.</p></article>
            <article className="feature-card"><div className="feature-icon"><Fingerprint size={18} /></div><span>03</span><h3>Verify every decision</h3><p>Record approvals and snapshots with a tamper-evident audit trail.</p></article>
          </div>
        </div>
      </section>

      <a className="wa" href="mailto:hello@chainslay.io" aria-label="Contact ChainSlay"><Sparkles size={22} /></a>
      {toast && <div className="toast" role="status"><CheckCircle2 size={15} /><span>{toast}</span></div>}
    </main>
  );
}
