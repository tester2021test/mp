import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Check, 
  ShoppingCart, 
  Home, 
  Monitor, 
  Utensils, 
  Bed, 
  Bath, 
  Box, 
  ChevronDown, 
  ExternalLink,
  IndianRupee,
  Wallet,
  X,
  LayoutGrid,
  CreditCard,
  ArrowRight,
  Sparkles,
  Download,
  FileText,
  Printer,
  Pencil,
  Save,
  Link as LinkIcon,
  LogOut,
  Mail,
  Lock,
  Loader2,
  PieChart,
  User as UserIcon,
  TrendingUp,
  Search
} from 'lucide-react';

// --- Firebase Configuration ---
// 1. PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyA3rq4VoIBabzv7rugZUfMzTDaRLbkqU0c",
  authDomain: "move-master-app.firebaseapp.com",
  projectId: "move-master-app",
  storageBucket: "move-master-app.firebasestorage.app",
  messagingSenderId: "317364689906",
  appId: "1:317364689906:web:812ea49079d3441325696b",
  measurementId: "G-01DHYGFZVY"
};

// 2. Initialize Firebase
const app = initializeApp(
  typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig
);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'move-master-v1';

// --- Types & Constants ---
type Candidate = { id: string; name: string; price: number; link?: string; selected: boolean; };
type Item = { id: string; name: string; category: string; status: 'researching' | 'decided' | 'purchased'; priority: 'must_have' | 'nice_to_have' | 'later'; candidates: Candidate[]; selectedPrice: number; purchasedPrice?: number; createdAt: any; };

const CATEGORIES = [
  { id: 'living', label: 'Living', icon: Monitor, color: 'text-indigo-600 bg-indigo-50 ring-indigo-500/10', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'kitchen', label: 'Kitchen', icon: Utensils, color: 'text-orange-600 bg-orange-50 ring-orange-500/10', gradient: 'from-orange-400 to-red-500' },
  { id: 'bedroom', label: 'Bedroom', icon: Bed, color: 'text-rose-600 bg-rose-50 ring-rose-500/10', gradient: 'from-rose-400 to-pink-500' },
  { id: 'bathroom', label: 'Bath', icon: Bath, color: 'text-cyan-600 bg-cyan-50 ring-cyan-500/10', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'utility', label: 'Utility', icon: Box, color: 'text-slate-600 bg-slate-50 ring-slate-500/10', gradient: 'from-slate-400 to-gray-500' },
  { id: 'other', label: 'Other', icon: Home, color: 'text-emerald-600 bg-emerald-50 ring-emerald-500/10', gradient: 'from-emerald-400 to-teal-500' },
];

const PRIORITIES = {
  must_have: { label: 'Essential', color: 'bg-red-50 text-red-700' },
  nice_to_have: { label: 'Desired', color: 'bg-blue-50 text-blue-700' },
  later: { label: 'Defer', color: 'bg-slate-50 text-slate-600' },
};

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// --- Main Component ---
export default function MoveMasterApp() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetLimit, setBudgetLimit] = useState<number>(0);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'analytics' | 'profile'>('home');
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('living');
  const [newItemPriority, setNewItemPriority] = useState('must_have');
  const [tempBudgetInput, setTempBudgetInput] = useState('');

  // --- Effects ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) { console.error(e); }
      } 
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    const unsubscribeItems = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'moving_items'), (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
      fetchedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(fetchedItems);
    });
    const unsubscribeSettings = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), (doc) => {
      if (doc.exists()) { setBudgetLimit(doc.data().budgetLimit || 0); }
    });
    return () => { unsubscribeItems(); unsubscribeSettings(); };
  }, [user]);

  // --- Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err: any) { setAuthError(err.message.replace('Firebase: ', '')); } 
    finally { setAuthLoading(false); }
  };

  const handleGuestLogin = async () => {
      setAuthLoading(true);
      try { await signInAnonymously(auth); } 
      catch (err: any) { setAuthError(err.message); } 
      finally { setAuthLoading(false); }
  };

  const handleLogout = async () => { await signOut(auth); };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newItemName.trim() || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'moving_items'), {
      name: newItemName, category: newItemCategory, priority: newItemPriority, status: 'researching',
      candidates: [], selectedPrice: 0, createdAt: serverTimestamp()
    });
    setNewItemName(''); setIsAddModalOpen(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!user || !confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', itemId));
  };

  const saveBudget = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), { budgetLimit: Number(tempBudgetInput) }, { merge: true });
    setIsBudgetModalOpen(false);
  };

  // --- Stats ---
  const stats = useMemo(() => items.reduce((acc, item) => {
    const realCost = item.status === 'purchased' ? (item.purchasedPrice || 0) : (item.selectedPrice || 0);
    acc.totalProjected += realCost;
    if (item.status === 'purchased') { acc.spent += item.purchasedPrice || 0; acc.purchasedCount += 1; }
    acc.totalItems += 1; return acc;
  }, { totalProjected: 0, spent: 0, totalItems: 0, purchasedCount: 0 }), [items]);

  const categoryStats = useMemo(() => {
    const costs: Record<string, number> = {}; const counts: Record<string, number> = {};
    items.forEach(item => {
      costs[item.category] = (costs[item.category] || 0) + (item.status === 'purchased' ? (item.purchasedPrice || 0) : (item.selectedPrice || 0));
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return { costs, counts };
  }, [items]);

  const filteredItems = useMemo(() => categoryFilter === 'all' ? items : items.filter(item => item.category === categoryFilter), [items, categoryFilter]);
  const budgetUsagePercent = budgetLimit > 0 ? (stats.totalProjected / budgetLimit) * 100 : 0;
  const isOverBudget = stats.totalProjected > budgetLimit && budgetLimit > 0;

  // --- Export ---
  const exportCSV = () => {
    if (items.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Name,Category,Status,Price\n" + items.map(item => `"${item.name}","${item.category}","${item.status}","${item.selectedPrice}"`).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = "move_master.csv"; link.click();
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin"/></div>;

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md p-8 rounded-[32px] shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Sparkles size={32} className="text-yellow-300"/></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">MoveMaster</h1>
          <p className="text-slate-500 font-medium">Vivek's Purchase Planner</p>
        </div>
        {authError && <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-bold">{authError}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 font-medium outline-none transition-all" placeholder="Email" /></div>
          <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 font-medium outline-none transition-all" placeholder="Password" /></div>
          <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all flex justify-center gap-2">{authLoading && <Loader2 className="animate-spin" size={20} />} Sign In</button>
        </form>
        <div className="my-6 flex items-center gap-4"><div className="h-px bg-slate-100 flex-1"></div><span className="text-xs font-bold text-slate-300 uppercase">Or</span><div className="h-px bg-slate-100 flex-1"></div></div>
        <button onClick={handleGuestLogin} disabled={authLoading} className="w-full py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2">Continue as Guest <ArrowRight size={16}/></button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r border-slate-100 z-20 shadow-sm">
        <div className="p-6">
           <div className="flex items-center gap-3">
             <div className="bg-slate-900 text-white p-2 rounded-lg"><Sparkles size={20} className="text-yellow-300"/></div>
             <div><h1 className="text-lg font-bold text-slate-900 leading-none">MoveMaster</h1><p className="text-xs font-medium text-slate-400 mt-0.5">Vivek Narkhede</p></div>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-6">
           {/* Desktop Budget Widget */}
           <div onClick={() => setIsBudgetModalOpen(true)} className={`relative overflow-hidden p-5 rounded-2xl cursor-pointer transition-transform hover:scale-[1.02] shadow-lg ${isOverBudget ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600'} text-white`}>
              <div className="flex justify-between items-start mb-4"><div className="p-1.5 bg-white/20 rounded-lg"><Wallet size={18}/></div><p className="text-xs font-bold opacity-80 uppercase">Budget</p></div>
              <p className="text-2xl font-bold tracking-tight">{formatINR(stats.totalProjected)}</p>
              <div className="mt-3 text-[10px] opacity-90 flex justify-between"><span>Limit: {formatINR(budgetLimit)}</span><span>{Math.round(budgetUsagePercent)}%</span></div>
              <div className="mt-1 w-full bg-black/20 rounded-full h-1"><div className="h-full bg-white rounded-full" style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}></div></div>
           </div>
           
           {/* Desktop Filters */}
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-3 px-2">Categories</p>
              <div className="space-y-1">
                 <button onClick={() => setCategoryFilter('all')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${categoryFilter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3"><LayoutGrid size={18}/><span>All Items</span></div><span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-md">{items.length}</span>
                 </button>
                 {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategoryFilter(cat.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${categoryFilter === cat.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                       <div className="flex items-center gap-3"><cat.icon size={18}/><span>{cat.label}</span></div>
                       {categoryStats.counts[cat.id] ? <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-md">{categoryStats.counts[cat.id]}</span> : null}
                    </button>
                 ))}
              </div>
           </div>
        </div>
        <div className="p-4 border-t border-slate-100 space-y-2">
           <button onClick={() => setIsAddModalOpen(true)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 flex items-center justify-center gap-2"><Plus size={18}/> New Item</button>
           <button onClick={handleLogout} className="w-full py-2.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"><LogOut size={16}/> Sign Out</button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA (Shared) --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Desktop Header */}
        <header className="hidden md:flex px-8 py-6 justify-between items-center border-b border-slate-200 bg-white">
           <h2 className="text-2xl font-bold text-slate-900">{categoryFilter === 'all' ? 'All Items' : CATEGORIES.find(c => c.id === categoryFilter)?.label}</h2>
           <div className="flex gap-3">
              <button onClick={exportCSV} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Download size={16}/> Export</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Printer size={16}/> Print</button>
           </div>
        </header>

        {/* --- MOBILE APP SHELL --- */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
           
           {/* Mobile Content Scroll Area */}
           <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32"> {/* pb-32 to clear nav */}
              
              {/* Mobile View: Home Tab */}
              <div className="md:hidden">
                 {activeMobileTab === 'home' && (
                    <>
                       {/* Graphical Header */}
                       <div className="bg-white px-5 pt-12 pb-6 rounded-b-[32px] shadow-sm mb-6">
                          <div className="flex justify-between items-center mb-6">
                             <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">MoveMaster</h1>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vivek Narkhede</p>
                             </div>
                             <div onClick={() => setActiveMobileTab('profile')} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-500"><UserIcon size={20}/></div>
                          </div>
                          
                          {/* Mobile Budget Card */}
                          <div onClick={() => setIsBudgetModalOpen(true)} className={`relative w-full h-44 rounded-[28px] p-6 text-white shadow-xl shadow-indigo-100 active:scale-95 transition-transform ${isOverBudget ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600'}`}>
                             <div className="flex justify-between items-start">
                                <div><p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Total Budget</p><h2 className="text-3xl font-bold mt-1">{formatINR(budgetLimit)}</h2></div>
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"><Wallet size={20}/></div>
                             </div>
                             <div className="absolute bottom-6 left-6 right-6">
                                <div className="flex justify-between text-[10px] font-bold mb-2 opacity-90"><span>Spent: {formatINR(stats.spent)}</span><span>{Math.round(budgetUsagePercent)}%</span></div>
                                <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}></div></div>
                             </div>
                          </div>
                       </div>

                       {/* Mobile Categories (Horizontal Scroll) */}
                       <div className="mb-6">
                          <div className="px-5 flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800">Categories</h3>{categoryFilter !== 'all' && <button onClick={() => setCategoryFilter('all')} className="text-xs font-bold text-indigo-600">View All</button>}</div>
                          <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar snap-x">
                             <button onClick={() => setCategoryFilter('all')} className={`flex-none w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 snap-start border-2 transition-all ${categoryFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-transparent'}`}><LayoutGrid size={24}/><span className="text-[10px] font-bold">All</span></button>
                             {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => setCategoryFilter(cat.id)} className={`flex-none w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 snap-start border-2 transition-all ${categoryFilter === cat.id ? `border-indigo-500 bg-indigo-50 text-indigo-700` : 'bg-white border-transparent text-slate-400'}`}><cat.icon size={24}/><span className="text-[10px] font-bold">{cat.label}</span></button>
                             ))}
                          </div>
                       </div>
                    </>
                 )}

                 {/* Mobile View: Analytics Tab */}
                 {activeMobileTab === 'analytics' && (
                    <div className="p-6 pt-12">
                       <h2 className="text-2xl font-black text-slate-900 mb-6">Analytics</h2>
                       <div className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                          {CATEGORIES.map(cat => {
                             const amount = categoryStats.costs[cat.id] || 0;
                             if (amount === 0) return null;
                             const percent = stats.totalProjected > 0 ? (amount / stats.totalProjected) * 100 : 0;
                             return (
                                <div key={cat.id}>
                                   <div className="flex justify-between text-xs font-bold text-slate-600 mb-2"><span className="flex items-center gap-2"><cat.icon size={14} className="text-indigo-500"/> {cat.label}</span><span>{formatINR(amount)}</span></div>
                                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${cat.gradient}`} style={{ width: `${percent}%` }}></div></div>
                                </div>
                             )
                          })}
                          {Object.keys(categoryStats.costs).length === 0 && <div className="text-center text-slate-400 py-8">No spending data yet.</div>}
                       </div>
                    </div>
                 )}

                 {/* Mobile View: Profile Tab */}
                 {activeMobileTab === 'profile' && (
                    <div className="p-6 pt-12">
                       <h2 className="text-2xl font-black text-slate-900 mb-6">Profile</h2>
                       <div className="bg-white p-6 rounded-3xl shadow-sm text-center mb-4">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><UserIcon size={32}/></div>
                          <h3 className="font-bold text-lg text-slate-900">Vivek Narkhede</h3>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Admin</p>
                       </div>
                       <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                          <button onClick={exportCSV} className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors border-b border-slate-50"><Download size={20} className="text-indigo-600"/><span className="font-bold text-slate-700">Export CSV</span></button>
                          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors"><LogOut size={20} className="text-red-500"/><span className="font-bold text-slate-700">Sign Out</span></button>
                       </div>
                    </div>
                 )}
              </div>

              {/* Shared List View (Desktop & Mobile Home Tab) */}
              <div className={`p-5 md:p-8 ${activeMobileTab !== 'home' ? 'hidden md:block' : ''}`}>
                 <div className="md:hidden font-bold text-slate-800 mb-4 px-1">Your Items</div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                       <ItemCard key={item.id} item={item} user={user} appId={appId} onDelete={() => deleteItem(item.id)} />
                    ))}
                    {filteredItems.length === 0 && (
                       <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3"><ShoppingCart className="text-slate-300" size={24}/></div>
                          <p className="text-slate-400 font-bold">No items found</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Mobile Bottom Navigation */}
           <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-30 pb-safe">
              <button onClick={() => setActiveMobileTab('home')} className={`flex flex-col items-center gap-1 ${activeMobileTab === 'home' ? 'text-slate-900' : 'text-slate-300'}`}><Home size={24} strokeWidth={activeMobileTab === 'home' ? 3 : 2}/></button>
              <button onClick={() => setIsAddModalOpen(true)} className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-300 flex items-center justify-center -mt-10 border-[6px] border-[#F8FAFC] active:scale-95 transition-transform"><Plus size={28}/></button>
              <button onClick={() => setActiveMobileTab('analytics')} className={`flex flex-col items-center gap-1 ${activeMobileTab === 'analytics' ? 'text-slate-900' : 'text-slate-300'}`}><TrendingUp size={24} strokeWidth={activeMobileTab === 'analytics' ? 3 : 2}/></button>
           </div>
        </div>
      </main>

      {/* --- ADD ITEM MODAL (Centered for Keyboard Safety) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
              <h2 className="text-xl font-black text-slate-900 mb-6">Add New Item</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">What do you need?</label>
                    <input type="text" autoFocus placeholder="e.g. 65 inch TV" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-indigo-500 font-bold text-slate-800 outline-none transition-all" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
                       <div className="relative">
                          <select className="w-full px-3 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-indigo-500 font-bold text-slate-800 outline-none appearance-none text-sm" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
                             {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Priority</label>
                       <div className="relative">
                          <select className="w-full px-3 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-indigo-500 font-bold text-slate-800 outline-none appearance-none text-sm" value={newItemPriority} onChange={e => setNewItemPriority(e.target.value as any)}>
                             <option value="must_have">Essential</option><option value="nice_to_have">Nice to Have</option><option value="later">Later</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
                       </div>
                    </div>
                 </div>
                 <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex justify-center gap-2 mt-2"><Plus size={20}/> Add to List</button>
              </form>
           </div>
        </div>
      )}

      {/* --- BUDGET MODAL --- */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xs rounded-[32px] p-6 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><Wallet size={28}/></div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Set Limit</h2>
              <p className="text-xs text-slate-400 font-bold mb-6">Total spending capacity</p>
              <form onSubmit={saveBudget}>
                 <div className="relative mb-4">
                    <IndianRupee size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="number" autoFocus placeholder="0" className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-indigo-500 font-black text-xl text-slate-900 outline-none text-center" value={tempBudgetInput} onChange={e => setTempBudgetInput(e.target.value)} />
                 </div>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg">Save</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}

// --- SUB-COMPONENTS ---

function ItemCard({ item, user, appId, onDelete }: { item: Item, user: User | null, appId: string, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Local inputs
  const [newCName, setNewCName] = useState('');
  const [newCPrice, setNewCPrice] = useState('');
  const [newCLink, setNewCLink] = useState('');
  const [purchasedAmt, setPurchasedAmt] = useState(item.purchasedPrice?.toString() || '');
  
  // Edit inputs
  const [editName, setEditName] = useState(item.name);
  const [editCat, setEditCat] = useState(item.category);
  const [editPri, setEditPri] = useState(item.priority);

  const catInfo = CATEGORIES.find(c => c.id === item.category);
  const priInfo = PRIORITIES[item.priority];
  const isPurchased = item.status === 'purchased';

  // DB Operations
  const addCand = async (e: React.FormEvent) => {
    e.preventDefault(); if(!newCName || !user) return;
    const nc: Candidate = { id: crypto.randomUUID(), name: newCName, price: Number(newCPrice)||0, link: newCLink, selected: false };
    const uc = [...item.candidates, nc];
    let updates: any = { candidates: uc };
    if(uc.length===1) { uc[0].selected=true; updates.selectedPrice=nc.price; updates.status='decided'; }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), updates);
    setNewCName(''); setNewCPrice(''); setNewCLink('');
  };
  const selCand = async (cid: string) => {
    if(!user) return;
    const uc = item.candidates.map(c => ({...c, selected: c.id===cid}));
    const sc = uc.find(c=>c.selected);
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), { candidates: uc, selectedPrice: sc?.price||0, status: 'decided' });
  };
  const markBuy = async () => { if(!user) return; await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), { status: 'purchased', purchasedPrice: Number(purchasedAmt)||item.selectedPrice }); };
  const delCand = async (cid: string) => {
    if(!user) return;
    const uc = item.candidates.filter(c => c.id !== cid);
    const wasSel = item.candidates.find(c=>c.id===cid)?.selected;
    let updates: any = { candidates: uc };
    if(wasSel) { updates.selectedPrice=0; updates.status='researching'; }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), updates);
  };
  const saveEdit = async () => { if(!user) return; await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), { name: editName, category: editCat, priority: editPri }); setIsEditing(false); };

  return (
    <div className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 relative ${isExpanded ? 'shadow-xl ring-2 ring-indigo-500 z-10 md:row-span-2' : 'shadow-sm border border-slate-100'}`}>
      {!isExpanded && <div className={`h-1.5 w-full bg-gradient-to-r ${catInfo?.gradient || 'from-slate-200 to-slate-300'}`}></div>}
      
      {isEditing ? (
        <div className="p-5 flex flex-col gap-3">
           <input className="w-full p-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" value={editName} onChange={e=>setEditName(e.target.value)} />
           <div className="flex gap-2">
              <select className="flex-1 p-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold" value={editCat} onChange={e=>setEditCat(e.target.value)}>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
              <select className="flex-1 p-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold" value={editPri} onChange={e=>setEditPri(e.target.value as any)}><option value="must_have">Essential</option><option value="nice_to_have">Nice</option><option value="later">Later</option></select>
           </div>
           <div className="flex gap-2 mt-2"><button onClick={()=>setIsEditing(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-xs font-bold">Cancel</button><button onClick={saveEdit} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Save</button></div>
        </div>
      ) : (
        <div className="p-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
           <div className="flex justify-between items-start mb-3">
              <div className="flex gap-2">
                 <span className={`w-8 h-8 rounded-full flex items-center justify-center ${catInfo?.color}`}>{catInfo?.icon && <catInfo.icon size={14}/>}</span>
                 {isPurchased && <span className="h-8 px-3 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 text-[10px] font-black uppercase"><Check size={12} strokeWidth={3}/> Paid</span>}
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${priInfo.color.replace('text-', 'bg-').split(' ')[0]}`}></div>
           </div>
           <div>
              <h3 className={`font-bold text-lg leading-tight mb-1 ${isPurchased ? 'line-through text-slate-300' : 'text-slate-900'}`}>{item.name}</h3>
              {!isExpanded && <div className={`text-sm font-black ${isPurchased?'text-emerald-500':'text-indigo-600'}`}>{item.selectedPrice > 0 ? formatINR(item.status==='purchased'?item.purchasedPrice||0:item.selectedPrice) : <span className="text-slate-300 font-medium text-xs">No price yet</span>}</div>}
           </div>
           {!isExpanded && (
              <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                 <span>{item.candidates.length} Options</span><ArrowRight size={14}/>
              </div>
           )}
        </div>
      )}

      {isExpanded && !isEditing && (
         <div className="bg-slate-50 p-5 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-4">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidates</div>
               <div className="flex gap-2">
                  <button onClick={(e)=>{e.stopPropagation();setIsEditing(true)}} className="p-1.5 bg-white text-indigo-500 rounded-lg shadow-sm"><Pencil size={14}/></button>
                  <button onClick={(e)=>{e.stopPropagation();onDelete()}} className="p-1.5 bg-white text-red-500 rounded-lg shadow-sm"><Trash2 size={14}/></button>
               </div>
            </div>
            
            <div className="space-y-3 mb-4">
               {item.candidates.map(cand => (
                  <div key={cand.id} onClick={(e)=>{e.stopPropagation();if(!isPurchased)selCand(cand.id)}} className={`group relative p-3 rounded-xl border-2 transition-all cursor-pointer bg-white ${cand.selected ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-transparent shadow-sm'} ${isPurchased ? 'opacity-50' : ''}`}>
                     <div className="flex justify-between">
                        <div><div className="font-bold text-sm text-slate-800">{cand.name}</div><div className="text-xs font-bold text-slate-500">{formatINR(cand.price)}</div></div>
                        <div className="flex gap-2 items-start">
                           {cand.link && <a href={cand.link} target="_blank" onClick={e=>e.stopPropagation()} className="text-slate-300 hover:text-indigo-500"><ExternalLink size={14}/></a>}
                           <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${cand.selected?'bg-indigo-600 text-white':'bg-slate-100 text-slate-300'}`}><Check size={10} strokeWidth={4}/></div>
                        </div>
                     </div>
                     {!isPurchased && <button onClick={(e)=>{e.stopPropagation();delCand(cand.id)}} className="absolute -top-2 -right-2 bg-white text-slate-300 hover:text-red-500 rounded-full shadow-sm p-1 border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>}
                  </div>
               ))}
            </div>

            {!isPurchased && (
               <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm" onClick={e=>e.stopPropagation()}>
                  <div className="flex gap-2 mb-2"><input placeholder="Model" className="flex-1 text-sm font-bold outline-none bg-transparent" value={newCName} onChange={e=>setNewCName(e.target.value)} /><div className="w-px bg-slate-100"></div><input type="number" placeholder="₹" className="w-16 text-sm font-bold outline-none bg-transparent" value={newCPrice} onChange={e=>setNewCPrice(e.target.value)} /></div>
                  <div className="flex gap-2 pt-2 border-t border-slate-50 items-center"><LinkIcon size={12} className="text-slate-300"/><input placeholder="https://..." className="flex-1 text-xs outline-none bg-transparent" value={newCLink} onChange={e=>setNewCLink(e.target.value)} /><button onClick={addCand} disabled={!newCName} className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center"><Plus size={14}/></button></div>
               </div>
            )}

            {!isPurchased && item.status==='decided' && (
               <div className="mt-4 pt-4 border-t border-slate-200" onClick={e=>e.stopPropagation()}>
                  <div className="flex gap-2"><input type="number" value={purchasedAmt} onChange={e=>setPurchasedAmt(e.target.value)} placeholder={item.selectedPrice.toString()} className="flex-1 px-3 py-2 bg-emerald-50 rounded-lg text-emerald-700 font-bold text-sm outline-none border border-emerald-100" /><button onClick={markPurchased} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-200">Confirm Buy</button></div>
               </div>
            )}
         </div>
      )}
    </div>
  );
}
