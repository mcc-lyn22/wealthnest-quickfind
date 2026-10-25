import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, Bell, Check,
  ChevronDown, CircleHelp, Command, CreditCard, Eye, EyeOff, FileText, Filter,
  HeartPulse, House, Landmark, LockKeyhole, Menu, MoreHorizontal, Plus, Search,
  ShieldCheck, Sparkles, Wallet, X, RotateCcw, Keyboard, Clock3
} from 'lucide-react';

const STORAGE_KEY = 'wealthnest-quickfind-v1';
const initialAssets = [
  { id: 'mf', name: 'Mutual Funds', category: 'Investments', icon: '◈', status: 'Added', amount: 105000, description: 'Your mutual fund portfolio', priority: 'high' },
  { id: 'equities', name: 'Equities', category: 'Investments', icon: '↗', status: 'Not added', description: 'Stocks listed on exchanges', priority: 'high' },
  { id: 'etfs', name: 'ETFs', category: 'Investments', icon: '▥', status: 'Not added', description: 'Exchange-traded funds', priority: 'medium' },
  { id: 'epf', name: 'EPF & Provident Fund', category: 'Retirement', icon: '◉', status: 'Not added', description: 'Retirement savings and provident funds', priority: 'high' },
  { id: 'nps', name: 'NPS', category: 'Retirement', icon: '◎', status: 'Not added', description: 'National Pension System', priority: 'medium' },
  { id: 'bank', name: 'Bank Accounts', category: 'Cash & Deposits', icon: '▤', status: 'Not added', description: 'Savings and current accounts', priority: 'high' },
  { id: 'fd', name: 'Fixed Deposits', category: 'Cash & Deposits', icon: '▣', status: 'Not added', description: 'Fixed and recurring deposits', priority: 'medium' },
  { id: 'gold', name: 'Gold & Silver', category: 'Physical Assets', icon: '✧', status: 'Not added', description: 'Precious metals and jewellery', priority: 'medium' },
  { id: 'property', name: 'Properties', category: 'Physical Assets', icon: '⌂', status: 'Not added', description: 'Residential and commercial property', priority: 'medium' },
  { id: 'vehicles', name: 'Vehicles', category: 'Physical Assets', icon: '◇', status: 'Not added', description: 'Cars, bikes and other vehicles', priority: 'low' },
  { id: 'bonds', name: 'Bonds', category: 'Investments', icon: '≋', status: 'Not added', description: 'Government and corporate bonds', priority: 'medium' },
  { id: 'loans', name: 'Loans', category: 'Liabilities', icon: '↘', status: 'Not added', description: 'Track outstanding borrowing', priority: 'high' },
  { id: 'cards', name: 'Credit Cards', category: 'Liabilities', icon: '▭', status: 'Not added', description: 'Monitor credit card balances', priority: 'medium' },
  { id: 'reit', name: 'REITs & InvITs', category: 'Investments', icon: '▦', status: 'Not added', description: 'Real estate and infrastructure trusts', priority: 'low' },
  { id: 'aif', name: 'AIFs & PMS', category: 'Alternative Assets', icon: '✳', status: 'Coming soon', description: 'Alternative investment holdings', priority: 'low' },
];
const categories = ['All assets', 'Investments', 'Retirement', 'Cash & Deposits', 'Physical Assets', 'Liabilities', 'Alternative Assets'];
const filters = ['All', 'Not added', 'Added', 'Coming soon'];
const categoryIcons = { Investments: Activity, Retirement: ShieldCheck, 'Cash & Deposits': Wallet, 'Physical Assets': House, Liabilities: CreditCard, 'Alternative Assets': Sparkles };
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.assets)) return null;
    return parsed;
  } catch { return null; }
}

export default function App() {
  const [saved] = useState(loadSaved);
  const [assets, setAssets] = useState(() => saved?.assets?.length ? saved.assets : initialAssets);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All assets');
  const [filter, setFilter] = useState('All');
  const [showBalance, setShowBalance] = useState(saved?.showBalance ?? true);
  const [showCommand, setShowCommand] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [toast, setToast] = useState('');
  const [toastAction, setToastAction] = useState(null);
  const [lastVisited, setLastVisited] = useState(saved?.lastVisited ?? 'mf');
  const [dismissedSuggestion, setDismissedSuggestion] = useState(saved?.dismissedSuggestion ?? false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Investments');
  const [showFamily, setShowFamily] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const commandRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ assets, showBalance, lastVisited, dismissedSuggestion })); setStorageError(false); }
    catch { setStorageError(true); }
  }, [assets, showBalance, lastVisited, dismissedSuggestion]);

  const notify = useCallback((message, action = null) => {
    setToast(message); setToastAction(() => action);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => { setToast(''); setToastAction(null); }, 5000);
  }, []);

  const openSearch = useCallback(() => {
    setShowCommand(true); setCommandQuery(''); setActiveIndex(0);
    window.setTimeout(() => commandRef.current?.focus(), 30);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') { setShowCommand(false); setSelectedAsset(null); setNavOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);

  const visibleAssets = useMemo(() => assets.filter((asset) => {
    const term = query.trim().toLowerCase();
    const matchesText = !term || `${asset.name} ${asset.category} ${asset.description}`.toLowerCase().includes(term);
    const matchesCategory = category === 'All assets' || asset.category === category;
    const matchesFilter = filter === 'All' || asset.status === filter;
    return matchesText && matchesCategory && matchesFilter;
  }), [assets, query, category, filter]);

  const commandResults = useMemo(() => {
    const term = commandQuery.trim().toLowerCase();
    return assets.filter(a => !term || `${a.name} ${a.category} ${a.description}`.toLowerCase().includes(term)).slice(0, 7);
  }, [assets, commandQuery]);

  useEffect(() => { setActiveIndex(0); }, [commandQuery]);

  const addedCount = assets.filter(a => a.status === 'Added').length;
  const totalCount = assets.filter(a => a.status !== 'Coming soon').length;
  const progress = Math.round((addedCount / Math.max(totalCount, 1)) * 100);
  const addedValue = assets.filter(a => a.status === 'Added').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const coverage = Object.keys(categoryIcons).map(name => ({ name, Icon: categoryIcons[name], all: assets.filter(a => a.category === name && a.status !== 'Coming soon').length, added: assets.filter(a => a.category === name && a.status === 'Added').length }));
  const suggested = assets.find(a => a.status === 'Not added' && a.priority === 'high');
  const lastAsset = assets.find(a => a.id === lastVisited) || assets[0];

  function selectAsset(asset) {
    setLastVisited(asset.id); setSelectedAsset(asset); setShowCommand(false);
  }
  function saveAsset(asset) {
    if (asset.status === 'Added') { setSelectedAsset(null); notify(`${asset.name} is already marked as added in this demo.`); return; }
    const before = assets.find(a => a.id === asset.id);
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: 'Added', amount: 0 } : a));
    setSelectedAsset(null);
    notify(`${asset.name} marked as added. Add a real value when connected to a data source.`, () => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: before.status, amount: before.amount } : a)));
  }
  function resetDemo() {
    setAssets(initialAssets); setShowBalance(true); setLastVisited('mf'); setDismissedSuggestion(false); setQuery(''); setCategory('All assets'); setFilter('All');
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    notify('Demo data reset to the original illustrative state.');
  }
  function resumeLast() { setCategory('All assets'); setFilter('All'); setQuery(''); selectAsset(lastAsset); }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <a className="brand" href="#top" aria-label="WealthNest QuickFind home">
        <img src="/wealthnest-logo.png" alt="WealthNest" className="brand-logo" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }} />
        <span className="brand-fallback"><span className="brand-symbol">W.</span><span>wealthnest<span className="brand-ai">.AI</span></span></span>
      </a>
      <div className="workspace-label">YOUR FINANCIAL SPACE</div>
      <nav className="nav-list">
        {['Investments','Insurance','Income Tax','Inheritance'].map((item) => { const Icon = item === 'Investments' ? Activity : item === 'Insurance' ? HeartPulse : item === 'Income Tax' ? FileText : Landmark; return <button key={item} className={`nav-link ${activeSection === item ? 'active' : ''}`} onClick={() => setActiveSection(item)}><Icon size={17}/><span>{item}</span>{activeSection === item && <span className="nav-dot"/>}</button>; })}
      </nav>
      <div className="sidebar-bottom">
        <div className="security-note"><div className="security-icon"><ShieldCheck size={17}/></div><div><strong>Designed around your privacy</strong><p>Demo preferences stay in this browser.</p></div></div>
        <div className="profile"><div className="avatar">M</div><div className="profile-info"><strong>Macklin Lobo</strong><span>Personal workspace</span></div><button className="icon-button profile-more" aria-label="Reset demo" onClick={resetDemo}><MoreHorizontal size={19}/></button></div>
      </div>
    </aside>

    <main className="main-area" id="main-content">
      <header className="topbar" id="top">
        <button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={navOpen} onClick={() => setNavOpen(v => !v)}><Menu size={19}/></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeSection}</strong></div>
        <div className="topbar-right"><span className="secure-pill"><span/> Secure workspace</span><button className="quick-open" onClick={openSearch}><Search size={14}/><span>QuickFind</span><kbd>⌘ K</kbd></button><button className="family-switch" onClick={() => setShowFamily(true)} aria-label="Open family members"><span className="avatar small-avatar">M</span><span>Macklin Lobo</span><ChevronDown size={14}/></button></div>
      </header>

      {activeSection === 'Investments' ? <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow">YOUR WEALTH OVERVIEW</div><h1>Good to see you, Macklin <span>✦</span></h1><p className="page-subtitle">Everything you own, organised in one place.</p></div><button className="outline-button" onClick={() => setShowBalance(v => !v)} aria-pressed={!showBalance}>{showBalance ? <Eye size={15}/> : <EyeOff size={15}/>} {showBalance ? 'Hide balances' : 'Show balances'}</button></section>

        <section className="wealth-card" aria-label="Illustrative net worth summary">
          <div className="wealth-card-glow"/><div className="wealth-card-top"><div><div className="muted-label">TOTAL TRACKED NET WORTH</div><div className="net-worth">{showBalance ? money(addedValue) : '₹ ••••••'}</div><div className="wealth-caption">Based on values entered in this prototype</div></div><div className="wealth-mark">W.</div></div>
          <div className="wealth-card-divider"/><div className="wealth-card-bottom"><div className="wealth-stat"><span className="legend-dot gold-dot"/><span>Categories added</span><strong>{addedCount} of {totalCount}</strong></div><div className="wealth-stat"><span className="legend-dot light-dot"/><span>Discovery progress</span><strong>{progress}%</strong></div><div className="portfolio-progress" role="progressbar" aria-label="Asset discovery progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{width: `${progress}%`}}/></div></div>
          <div className="demo-disclaimer"><LockKeyhole size={11}/> Illustrative demo data · Not connected to a live financial account</div>
        </section>

        <section className="progress-panel" aria-labelledby="progress-title"><div className="progress-copy"><div className="progress-icon"><Sparkles size={17}/></div><div><div className="eyebrow">YOUR NEXT STEP</div><h2 id="progress-title">Complete your financial picture</h2><p>{addedCount === totalCount ? 'You have reviewed every available category in this demo.' : `You've explored ${addedCount} of ${totalCount} available asset categories. Keep going at your own pace.`}</p></div></div><div className="progress-right"><div className="progress-ring" style={{'--progress': `${progress * 3.6}deg`}}><div><strong>{progress}%</strong><span>complete</span></div></div><button className="text-button" onClick={resumeLast}><Clock3 size={14}/> Resume last category <ArrowRight size={14}/></button></div></section>

        {!dismissedSuggestion && suggested && <section className="suggestion-banner"><div className="suggestion-icon"><Sparkles size={17}/></div><div className="suggestion-copy"><strong>A useful next step: {suggested.name}</strong><p>People often review this category when organising their financial picture. This is a generic suggestion, not personalised financial advice.</p></div><button className="suggestion-action" onClick={() => selectAsset(suggested)}>Explore <ArrowRight size={14}/></button><button className="dismiss-button icon-button" aria-label="Dismiss suggestion" onClick={() => setDismissedSuggestion(true)}><X size={15}/></button></section>}

        <section className="coverage-section" aria-labelledby="coverage-title"><div className="section-heading"><div><div className="eyebrow">AT A GLANCE</div><h2 id="coverage-title">Financial coverage map</h2><p>See which areas you've added data to and which remain unexplored.</p></div><span className="subtle-tag"><Activity size={13}/> {coverage.filter(c => c.added > 0).length} areas started</span></div><div className="coverage-grid">{coverage.map(({name, Icon, all, added}) => <button className="coverage-card" key={name} onClick={() => {setCategory(name); setFilter('All'); setQuery(''); document.getElementById('asset-explorer')?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});}}><div className="coverage-top"><span className="coverage-icon"><Icon size={17}/></span><span className={`coverage-indicator ${added ? 'has-data' : ''}`}>{added ? <Check size={12}/> : <span/>}</span></div><strong>{name}</strong><div className="coverage-bottom"><span>{added} of {all} added</span><div className="mini-progress"><span style={{width: `${all ? added / all * 100 : 0}%`}}/></div></div></button>)}</div><p className="coverage-note"><CircleHelp size={13}/> “Not added” means no data is entered in this demo; it does not mean you do not own that asset.</p></section>

        <section className="asset-section" id="asset-explorer"><div className="section-heading"><div><div className="eyebrow">YOUR PORTFOLIO</div><h2>Explore your assets</h2><p>Find a category without scrolling through the whole list.</p></div><span className="asset-count">{visibleAssets.length} categories</span></div>
          <div className="search-box"><Search size={18} className="search-icon"/><input ref={searchRef} aria-label="Search asset categories" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search mutual funds, gold, EPF…"/><button className="keyboard-hint" onClick={openSearch} aria-label="Open QuickFind command search"><kbd>⌘ K</kbd></button>{query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search"><X size={15}/></button>}</div>
          <div className="explorer-toolbar"><div className="category-tabs" aria-label="Filter by category">{categories.map(c => <button key={c} className={`category-tab ${category === c ? 'selected' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}</div><label className="status-filter"><Filter size={13}/><span className="sr-only">Filter by status</span><select value={filter} onChange={e => setFilter(e.target.value)}>{filters.map(f => <option key={f} value={f}>{f === 'All' ? 'All statuses' : f}</option>)}</select><ChevronDown size={13}/></label></div>
          <div className="results-summary" aria-live="polite">Showing <strong>{visibleAssets.length}</strong> {visibleAssets.length === 1 ? 'category' : 'categories'}{query && <> matching <strong>“{query}”</strong></>}</div>
          {isLoading ? <div className="skeleton-grid" aria-label="Loading asset categories">{Array.from({length: 6}).map((_,i)=><div className="skeleton-card" key={i}><div/><div/><div/></div>)}</div> : visibleAssets.length ? <div className="asset-grid">{visibleAssets.map(asset => <article className="asset-card" key={asset.id}><div className="asset-card-top"><div className={`asset-icon ${asset.status === 'Added' ? 'added-icon' : ''}`}>{asset.icon}</div><span className={`status ${asset.status === 'Added' ? 'status-added' : asset.status === 'Coming soon' ? 'status-soon' : 'status-empty'}`}>{asset.status === 'Added' && <Check size={11}/>} {asset.status}</span></div><h3>{asset.name}</h3><p>{asset.description}</p><div className="asset-card-footer">{asset.status === 'Added' ? <strong className="asset-value">{showBalance ? (asset.amount ? money(asset.amount) : 'Value not entered') : '₹ ••••••'}</strong> : <span className="asset-category">{asset.category}</span>}<button className="asset-action" disabled={asset.status === 'Coming soon'} onClick={() => selectAsset(asset)}>{asset.status === 'Added' ? 'View details' : <><Plus size={13}/> Add</>}</button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={22}/></div><h3>No matching assets</h3><p>Try another keyword or clear your filters to see all categories.</p><button className="primary-button" onClick={() => {setQuery('');setCategory('All assets');setFilter('All');}}>Clear search and filters</button></div>}
          <div className="bottom-tip"><div className="tip-icon"><Sparkles size={16}/></div><div><strong>A more complete picture starts here.</strong><p>Add the categories that matter to you. You can come back and continue whenever you're ready.</p></div><button className="dismiss-tip" onClick={resetDemo} title="Reset illustrative demo data"><RotateCcw size={15}/><span>Reset demo</span></button></div>
        </section>
        <footer className="page-footer"><span>WealthNest QuickFind · Frontend concept</span><span>Illustrative data only · Not financial advice</span></footer>
      </div> : <div className="page-content service-page">
        {activeSection === 'Insurance' && <><div className="service-hero"><div className="eyebrow">INSURANCE OVERVIEW</div><h1>Know what you're actually <span>covered for.</span></h1><p className="page-subtitle service-lede">Organise policies, review renewals, and prepare for a coverage conversation in one place.</p></div><section className="service-panel"><div className="section-heading"><div><div className="eyebrow">YOUR POLICIES</div><h2>Add your policies</h2><p>Choose a category to preview the policy workflow.</p></div><span className="subtle-tag">Demo data</span></div>{[['Health Insurance','Review hospitalisation cover and renewal details',HeartPulse],['Life Insurance','Keep life cover and nominee information organised',ShieldCheck],['Motor Insurance','Track vehicle policies and renewal dates',Activity],['Property Insurance','Organise home and property protection',House]].map(([name,desc,Icon])=><button className="service-row" key={name} onClick={() => notify(`${name}: frontend preview only; no policy was uploaded.`)}><span className="service-row-icon"><Icon size={20}/></span><span className="service-row-copy"><strong>{name}</strong><small>{desc}</small></span><span className="service-add"><Plus size={18}/></span></button>)}<div className="attention-card"><span className="attention-icon"><Bell size={17}/></span><div><strong>Review your life cover</strong><p>This demo cannot determine whether your cover is adequate. Add policy details in a real product to review them with a qualified adviser.</p><button className="text-button" onClick={() => notify('Consultation flow preview only. No appointment was booked.')}>Explore consultation flow <ArrowRight size={14}/></button></div></div></section><p className="service-note"><LockKeyhole size={13}/> No real policies or personal insurance data are stored.</p></>}
        {activeSection === 'Income Tax' && <><div className="service-hero tax-hero"><div className="eyebrow">INCOME TAX SERVICES</div><h1>Tax planning is a year.<br/><span>Not a March weekend.</span></h1><p className="service-lede">Organise documents, plan questions, and prepare for a conversation with a qualified tax professional.</p></div><div className="service-feature-grid">{[['Document checklist','Track documents you may need for filing.',FileText],['Year-round timeline','See a sample timeline for planning through the year.',Clock3],['Questions to ask','Prepare topics for your tax adviser.',Sparkles]].map(([name,desc,Icon])=><article className="service-feature" key={name}><span className="service-row-icon"><Icon size={20}/></span><h3>{name}</h3><p>{desc}</p><button className="text-button" onClick={() => notify(`${name}: sample demo only. Verify tax information with official sources.`)}>Explore <ArrowRight size={14}/></button></article>)}</div><div className="service-cta"><div><strong>Make your next tax conversation more productive.</strong><p>Prepare your information before speaking with a qualified professional.</p></div><button className="primary-button" onClick={() => notify('Expert-call CTA preview only. No appointment was booked.')}>Explore expert call <ArrowRight size={14}/></button></div><p className="service-note">This concept does not provide tax advice or verify filing deadlines.</p></>}
        {activeSection === 'Inheritance' && <><div className="service-hero inheritance-hero"><div className="eyebrow">INHERITANCE PLANNING</div><h1>Make your family's wishes <span>easier to organise.</span></h1><p className="service-lede">A private checklist concept to help families organise important documents and prepare for conversations with legal professionals.</p></div><div className="service-feature-grid">{[['Will & testament','Record whether a document exists and where it is stored.',FileText],['Important documents','Create a checklist of documents family members may need.',ShieldCheck],['Family conversation','Capture topics to discuss with trusted family members.',HeartPulse]].map(([name,desc,Icon])=><article className="service-feature" key={name}><span className="service-row-icon"><Icon size={20}/></span><h3>{name}</h3><p>{desc}</p><button className="text-button" onClick={() => notify(`${name}: checklist preview only. No legal document was created.`)}>Open checklist <ArrowRight size={14}/></button></article>)}</div><div className="privacy-callout"><LockKeyhole size={18}/><div><strong>Keep sensitive family information private</strong><p>This prototype stores demo preferences locally. Do not enter real legal or identity details.</p></div></div><p className="service-note">This is an organisational concept, not legal advice or a will-writing service.</p></>}
      </div>}
    </main>

    {showFamily && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowFamily(false);}}><section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="family-title"><button className="modal-close icon-button" onClick={() => setShowFamily(false)} aria-label="Close family members"><X size={18}/></button><div className="eyebrow">HOUSEHOLD WORKSPACE</div><h2 id="family-title">Family members</h2><p>Profile switching is represented as a frontend concept in this demo.</p><button className="family-member-selected" onClick={() => {setShowFamily(false);notify('Macklin Lobo is the active demo profile.')}}><span className="avatar">M</span><span><strong>Macklin Lobo</strong><small>Family head · Demo profile</small></span><Check size={17}/></button><button className="primary-button modal-primary" onClick={() => {setShowFamily(false);notify('Add family member is a visual prototype only. No personal data was collected.')}}><Plus size={15}/> Add family member</button><p className="modal-footnote">No real family profiles or personal identifiers are stored.</p></section></div>}

    {showCommand && <div className="command-backdrop" onMouseDown={e => {if(e.target === e.currentTarget) setShowCommand(false);}}><section className="command-modal" role="dialog" aria-modal="true" aria-labelledby="command-title"><div className="command-search-row"><Search size={19}/><label className="sr-only" id="command-title" htmlFor="command-input">QuickFind asset search</label><input id="command-input" ref={commandRef} value={commandQuery} onChange={e => setCommandQuery(e.target.value)} placeholder="Search categories or actions…" onKeyDown={e => {if(e.key === 'ArrowDown'){e.preventDefault();setActiveIndex(i => Math.min(i+1, commandResults.length-1));} if(e.key === 'ArrowUp'){e.preventDefault();setActiveIndex(i => Math.max(i-1,0));} if(e.key === 'Enter' && commandResults[activeIndex]) selectAsset(commandResults[activeIndex]);}}/><kbd>ESC</kbd><button className="icon-button" onClick={() => setShowCommand(false)} aria-label="Close QuickFind"><X size={17}/></button></div><div className="command-label">{commandQuery ? 'MATCHING ASSETS' : 'QUICK ACTIONS & SUGGESTIONS'}</div>{!commandQuery && <div className="command-actions"><button onClick={() => {setShowCommand(false);searchRef.current?.focus();document.getElementById('asset-explorer')?.scrollIntoView({behavior:'smooth'});}}><span className="command-action-icon"><Search size={15}/></span><span><strong>Search asset explorer</strong><small>Filter all asset categories</small></span><ArrowRight size={15}/></button><button onClick={() => {setShowCommand(false);resumeLast();}}><span className="command-action-icon"><Clock3 size={15}/></span><span><strong>Resume last category</strong><small>Continue where you left off</small></span><ArrowRight size={15}/></button></div>}{commandResults.length ? <div className="command-results" role="listbox" aria-label="Asset search results">{commandResults.map((asset,i)=><button role="option" aria-selected={i===activeIndex} className={`command-result ${i===activeIndex?'command-active':''}`} key={asset.id} onMouseEnter={() => setActiveIndex(i)} onClick={() => selectAsset(asset)}><span className="command-result-icon">{asset.icon}</span><span className="command-result-copy"><strong>{asset.name}</strong><small>{asset.category}</small></span><span className="command-result-status">{asset.status}</span><ArrowUpRight size={14}/></button>)}</div> : <div className="command-empty"><Search size={21}/><strong>No results found</strong><span>Try a category name such as “cash” or “retirement”.</span></div>}<div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>ESC</kbd> to close</span></div></section></div>}

    {selectedAsset && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setSelectedAsset(null);}}><section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" onClick={() => setSelectedAsset(null)} aria-label="Close dialog"><X size={18}/></button><div className="modal-symbol">{selectedAsset.icon}</div><div className="eyebrow">ASSET EXPLORER</div><h2 id="modal-title">{selectedAsset.status === 'Added' ? 'Your' : 'Add'} {selectedAsset.name}</h2><p>{selectedAsset.description}</p><div className="modal-detail"><span>Category</span><strong>{selectedAsset.category}</strong></div><div className="modal-detail"><span>Current status</span><strong>{selectedAsset.status}</strong></div>{selectedAsset.status === 'Added' && selectedAsset.amount > 0 && <div className="modal-detail"><span>Illustrative value</span><strong>{showBalance ? money(selectedAsset.amount) : '₹ ••••••'}</strong></div>}<button className="primary-button modal-primary" onClick={() => saveAsset(selectedAsset)}>{selectedAsset.status === 'Added' ? 'Done' : <><Plus size={15}/> Mark as added in demo</>}</button><p className="modal-footnote">Prototype only. No accounts are connected and no financial data is sent to a server.</p></section></div>}

    {storageError && <div className="storage-warning" role="status"><CircleHelp size={15}/> Browser storage is unavailable. Changes may not persist after refresh.<button onClick={() => setStorageError(false)} aria-label="Dismiss storage warning"><X size={14}/></button></div>}
    {toast && <div className="toast" role="status" aria-live="polite"><span className="toast-check"><Check size={14}/></span><span>{toast}</span>{toastAction && <button onClick={() => {toastAction();setToast('');setToastAction(null);}}>Undo</button>}<button className="toast-close" onClick={() => {setToast('');setToastAction(null);}} aria-label="Dismiss notification"><X size={14}/></button></div>}
  </div>;
}
