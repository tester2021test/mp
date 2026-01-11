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
  List
} from 'lucide-react';

// --- Firebase Configuration & Initialization ---

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

// Application identifier for data storage
const appId = typeof __app_id !== 'undefined' ? __app_id : 'move-master-v1';

// --- Types ---
type Candidate = {
  id: string;
  name: string;
  price: number;
  link?: string;
  selected: boolean;
};

type Item = {
  id: string;
  name: string;
  category: string;
  status: 'researching' | 'decided' | 'purchased';
  priority: 'must_have' | 'nice_to_have' | 'later';
  candidates: Candidate[];
  selectedPrice: number;
  purchasedPrice?: number;
  createdAt: any;
};

// --- Constants ---
const CATEGORIES = [
  { id: 'living', label: 'Living', icon: Monitor, color: 'text-indigo-600 bg-indigo-50 ring-indigo-500/10', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'kitchen', label: 'Kitchen', icon: Utensils, color: 'text-orange-600 bg-orange-50 ring-orange-500/10', gradient: 'from-orange-400 to-red-500' },
  { id: 'bedroom', label: 'Bedroom', icon: Bed, color: 'text-rose-600 bg-rose-50 ring-rose-500/10', gradient: 'from-rose-400 to-pink-500' },
  { id: 'bathroom', label: 'Bath', icon: Bath, color: 'text-cyan-600 bg-cyan-50 ring-cyan-500/10', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'utility', label: 'Utility', icon: Box, color: 'text-slate-600 bg-slate-50 ring-slate-500/10', gradient: 'from-slate-400 to-gray-500' },
  { id: 'other', label: 'Other', icon: Home, color: 'text-emerald-600 bg-emerald-50 ring-emerald-500/10', gradient: 'from-emerald-400 to-teal-500' },
];

const PRIORITIES = {
  must_have: { label: 'Essential', color: 'bg-red-50 text-red-700 ring-red-500/10' },
  nice_to_have: { label: 'Desired', color: 'bg-blue-50 text-blue-700 ring-blue-500/10' },
  later: { label: 'Defer', color: 'bg-slate-50 text-slate-600 ring-slate-500/10' },
};

// --- Helper Functions ---
const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

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
  const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'analytics' | 'profile'>('home'); // NEW: Tab State
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('living');
  const [newItemPriority, setNewItemPriority] = useState('must_have');
  const [tempBudgetInput, setTempBudgetInput] = useState('');

  // --- Auth & Data Effects ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          console.error("Token auth failed", e);
        }
      } 
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
        setItems([]);
        return;
    }

    const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'moving_items');
    const unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      fetchedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(fetchedItems);
    }, (error) => console.error("Error fetching items:", error));

    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general');
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setBudgetLimit(doc.data().budgetLimit || 0);
      }
    });

    return () => {
      unsubscribeItems();
      unsubscribeSettings();
    };
  }, [user]);

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
        setAuthError(err.message.replace('Firebase: ', ''));
    } finally {
        setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
      setAuthLoading(true);
      try {
          await signInAnonymously(auth);
      } catch (err: any) {
          setAuthError(err.message);
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => {
      await signOut(auth);
  };

  // --- CRUD Operations ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !user) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'moving_items'), {
        name: newItemName,
        category: newItemCategory,
        priority: newItemPriority,
        status: 'researching',
        candidates: [],
        selectedPrice: 0,
        createdAt: serverTimestamp()
      });
      setNewItemName('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!user || !confirm('Delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const saveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const limit = Number(tempBudgetInput);
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), {
      budgetLimit: limit
    }, { merge: true });
    setIsBudgetModalOpen(false);
  };

  // --- Export Functions ---
  const exportCSV = () => {
    if (items.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Category,Status,Priority,Selected Model,Price,Purchased Price,Link\n";
    items.forEach(item => {
      const categoryLabel = CATEGORIES.find(c => c.id === item.category)?.label || item.category;
      const priorityLabel = PRIORITIES[item.priority]?.label || item.priority;
      const selectedCandidate = item.candidates.find(c => c.selected);
      const modelName = selectedCandidate ? selectedCandidate.name : (item.candidates.length > 0 ? `${item.candidates.length} options` : 'None');
      const price = item.selectedPrice || 0;
      const purchased = item.purchasedPrice || 0;
      const link = selectedCandidate?.link || '';
      const row = `"${item.name}","${categoryLabel}","${item.status}","${priorityLabel}","${modelName}","${price}","${purchased}","${link}"`;
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "move_master_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    window.print();
  };

  // --- Calculations ---
  const stats = useMemo(() => {
    return items.reduce((acc, item) => {
      const realCost = item.status === 'purchased' ? (item.purchasedPrice || 0) : (item.selectedPrice || 0);
      acc.totalProjected += realCost;
      if (item.status === 'purchased') {
        acc.spent += item.purchasedPrice || 0;
        acc.purchasedCount += 1;
      }
      acc.totalItems += 1;
      return acc;
    }, { totalProjected: 0, spent: 0, totalItems: 0, purchasedCount: 0 });
  }, [items]);

  const categoryStats = useMemo(() => {
    const catMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    items.forEach(item => {
      catMap[item.category] = (catMap[item.category] || 0) + (item.status === 'purchased' ? (item.purchasedPrice || 0) : (item.selectedPrice || 0));
      countMap[item.category] = (countMap[item.category] || 0) + 1;
    });
    return { costs: catMap, counts: countMap };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter(item => item.category === categoryFilter);
  }, [items, categoryFilter]);

  const budgetUsagePercent = budgetLimit > 0 ? (stats.totalProjected / budgetLimit) * 100 : 0;
  const isOverBudget = stats.totalProjected > budgetLimit && budgetLimit > 0;

  // --- Render: Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // --- Render: Login Screen ---
  if (!user) {
      return (
          <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-2xl shadow-indigo-100 border border-white">
                  <div className="text-center mb-10">
                      <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-3xl rotate-3 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
                          <Sparkles size={36} className="text-yellow-300" />
                      </div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">MoveMaster</h1>
                      <p className="text-slate-500 font-medium mt-2">Smart Procurement Planner</p>
                  </div>

                  {authError && (
                      <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl font-bold flex items-center gap-2 border border-red-100">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          {authError}
                      </div>
                  )}

                  <form onSubmit={handleAuth} className="space-y-5">
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-2 tracking-wider">Email</label>
                          <div className="relative group">
                              <div className="absolute inset-0 bg-indigo-50 rounded-2xl scale-95 group-hover:scale-100 transition-transform"></div>
                              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                              <input 
                                  type="email" 
                                  required
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-700 outline-none transition-all relative z-10 shadow-sm"
                                  placeholder="hello@example.com"
                              />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-2 tracking-wider">Password</label>
                          <div className="relative group">
                              <div className="absolute inset-0 bg-indigo-50 rounded-2xl scale-95 group-hover:scale-100 transition-transform"></div>
                              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                              <input 
                                  type="password" 
                                  required
                                  value={password}
                                  onChange={e => setPassword(e.target.value)}
                                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-700 outline-none transition-all relative z-10 shadow-sm"
                                  placeholder="••••••••"
                              />
                          </div>
                      </div>

                      <button 
                          type="submit" 
                          disabled={authLoading}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                      >
                          {authLoading && <Loader2 className="animate-spin" size={20} />}
                          Enter Planner
                      </button>
                  </form>

                  <div className="my-8 flex items-center gap-4">
                      <div className="h-0.5 bg-slate-100 flex-1"></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Or</span>
                      <div className="h-0.5 bg-slate-100 flex-1"></div>
                  </div>

                  <button 
                      onClick={handleGuestLogin}
                      disabled={authLoading}
                      className="w-full py-3.5 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                      Continue as Guest <ArrowRight size={18} className="text-indigo-500"/>
                  </button>

                  <div className="mt-12 text-center pt-6">
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-2 opacity-50">Vivek Master Purchase Planner</p>
                    <p className="text-xs font-medium text-slate-400">Built for personal usage by <span className="font-bold text-slate-800">Vivek Narkhede</span></p>
                  </div>
              </div>
          </div>
      );
  }

  // --- Render: Main App ---
  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden print:overflow-visible print:h-auto print:block">
      
      {/* -------------------------------------------------------------------------- */
      /* PRINT VIEW (Same as before)                                             */
      /* -------------------------------------------------------------------------- */}
      <div className="hidden print:block p-8 bg-white w-full max-w-[210mm] mx-auto">
         <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
               <h1 className="text-2xl font-bold text-slate-900 uppercase">MoveMaster</h1>
               <p className="text-sm text-slate-500">Procurement & Budget Report</p>
            </div>
            <div className="text-right">
               <p className="text-xs font-bold text-slate-400 uppercase">Generated</p>
               <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
         </div>
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="border-b-2 border-slate-200">
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase">Item</th>
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase text-right">Cost</th>
               </tr>
            </thead>
            <tbody>
               {items.map((item) => (
                 <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{item.name}</td>
                    <td className="py-3 text-right">{item.selectedPrice > 0 ? formatINR(item.status === 'purchased' ? item.purchasedPrice || 0 : item.selectedPrice) : '-'}</td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* -------------------------------------------------------------------------- */
      /* DESKTOP SIDEBAR (Unchanged from previous robust version)                */
      /* -------------------------------------------------------------------------- */}
      <aside className="hidden md:flex w-80 flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-30 shadow-sm print:hidden">
        <div className="p-8 pb-4">
           <div className="flex items-center gap-3">
             <div className="bg-slate-900 text-white p-2.5 rounded-xl">
               <Sparkles size={20} strokeWidth={2} className="text-yellow-300" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">MoveMaster</h1>
                <p className="text-xs font-medium text-slate-400 mt-1">Vivek Narkhede</p>
             </div>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
           <div onClick={() => setIsBudgetModalOpen(true)} className={`relative overflow-hidden p-6 rounded-3xl cursor-pointer transition-transform hover:scale-[1.02] shadow-xl ${isOverBudget ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600'} text-white`}>
              <div className="flex justify-between items-start mb-6">
                 <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm"><CreditCard size={20} /></div>
                 {isOverBudget && <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">OVER LIMIT</div>}
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-xs font-medium text-white/70 uppercase">Total Projected</p>
                <p className="text-3xl font-bold tracking-tight">{formatINR(stats.totalProjected)}</p>
              </div>
              <div className="mt-4"><div className="w-full bg-black/20 rounded-full h-1.5"><div className="h-full bg-white/90 rounded-full" style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}></div></div></div>
           </div>
           <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-4">Export</div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={exportCSV} className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200"><FileText size={20} className="mb-2 text-indigo-500" /><span className="text-xs font-bold">CSV</span></button>
                 <button onClick={printPDF} className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200"><Printer size={20} className="mb-2 text-indigo-500" /><span className="text-xs font-bold">PDF</span></button>
              </div>
           </div>
           <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-4">Filters</div>
              <div className="space-y-1">
                 <CategoryButton active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} icon={LayoutGrid} label="All Items" count={items.length} />
                  {CATEGORIES.map(cat => (
                    <CategoryButton key={cat.id} active={categoryFilter === cat.id} onClick={() => setCategoryFilter(cat.id)} icon={cat.icon} label={cat.label} count={categoryStats.counts[cat.id]} />
                  ))}
              </div>
           </div>
        </div>
        <div className="p-6 border-t border-slate-100 space-y-3">
           <button onClick={() => setIsAddModalOpen(true)} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"><Plus size={20} /> <span>Add New Item</span></button>
           <button onClick={handleLogout} className="w-full py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm"><LogOut size={16} /> <span>Sign Out</span></button>
        </div>
      </aside>

      {/* -------------------------------------------------------------------------- */
      /* NEW MOBILE LAYOUT (App Shell)                                           */
      /* -------------------------------------------------------------------------- */}
      <div className="md:hidden flex flex-col h-full w-full bg-[#F1F5F9] print:hidden">
        
        {/* MOBILE HEADER (Only for Profile/Analytics tabs, Home has custom Hero) */}
        {activeMobileTab !== 'home' && (
          <div className="px-6 py-4 bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
             <h1 className="text-xl font-black text-slate-900 tracking-tight">
               {activeMobileTab === 'analytics' ? 'Analytics' : 'Profile'}
             </h1>
             <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><UserIcon size={16}/></div>
          </div>
        )}

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          
          {/* --- TAB: HOME --- */}
          {activeMobileTab === 'home' && (
            <>
              {/* Graphical Hero Section */}
              <div className="bg-white px-6 pt-6 pb-6 rounded-b-[40px] shadow-sm mb-6">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center"><Sparkles size={16} className="text-yellow-300"/></div>
                       <span className="font-bold text-lg">MoveMaster</span>
                    </div>
                    <div onClick={() => setActiveMobileTab('profile')} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                       <UserIcon size={18} className="text-slate-500"/>
                    </div>
                 </div>

                 {/* The Credit Card Widget */}
                 <div 
                   onClick={() => setIsBudgetModalOpen(true)}
                   className={`relative overflow-hidden w-full h-48 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] ${isOverBudget ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600'}`}
                 >
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Total Budget</p>
                          <h2 className="text-3xl font-bold mt-1">{formatINR(budgetLimit)}</h2>
                       </div>
                       <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"><Wallet size={20}/></div>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                       <div className="flex justify-between text-xs font-medium mb-2 opacity-90">
                          <span>Spent: {formatINR(stats.spent)}</span>
                          <span>{Math.round(budgetUsagePercent)}%</span>
                       </div>
                       <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}></div>
                       </div>
                    </div>
                    {/* Decor */}
                    <div className="absolute -right-6 -bottom-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                 </div>
              </div>

              {/* Graphical Category Rail */}
              <div className="mb-6">
                 <div className="px-6 flex justify-between items-end mb-3">
                    <h3 className="font-bold text-slate-800">Categories</h3>
                    {categoryFilter !== 'all' && <button onClick={() => setCategoryFilter('all')} className="text-xs font-bold text-indigo-600">Reset</button>}
                 </div>
                 <div className="flex gap-4 overflow-x-auto px-6 pb-4 no-scrollbar snap-x">
                    <button 
                      onClick={() => setCategoryFilter('all')}
                      className={`flex-none w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all snap-start ${categoryFilter === 'all' ? 'bg-slate-800 text-white shadow-lg shadow-slate-300 scale-105' : 'bg-white text-slate-400'}`}
                    >
                       <LayoutGrid size={24} />
                       <span className="text-[10px] font-bold">All</span>
                    </button>
                    {CATEGORIES.map(cat => (
                       <button 
                         key={cat.id}
                         onClick={() => setCategoryFilter(cat.id)}
                         className={`flex-none w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all snap-start border ${categoryFilter === cat.id ? `bg-gradient-to-br ${cat.gradient} text-white shadow-lg scale-105 border-transparent` : 'bg-white text-slate-400 border-slate-100'}`}
                       >
                          <cat.icon size={24} />
                          <span className="text-[10px] font-bold">{cat.label}</span>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Main List */}
              <div className="px-6">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    Your Items <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{filteredItems.length}</span>
                 </h3>
                 <div className="space-y-4">
                    {filteredItems.length === 0 ? (
                       <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><ShoppingCart className="text-slate-300"/></div>
                          <p className="text-slate-400 font-medium text-sm">No items yet</p>
                       </div>
                    ) : (
                       filteredItems.map(item => (
                          <ItemCard key={item.id} item={item} user={user} appId={appId} onDelete={() => deleteItem(item.id)} />
                       ))
                    )}
                 </div>
              </div>
            </>
          )}

          {/* --- TAB: ANALYTICS --- */}
          {activeMobileTab === 'analytics' && (
             <div className="p-6 space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                   <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart size={18} className="text-indigo-500"/> Spending by Room</h3>
                   <div className="space-y-5">
                      {CATEGORIES.map(cat => {
                         const amount = categoryStats.costs[cat.id] || 0;
                         if (amount === 0) return null;
                         const percent = stats.totalProjected > 0 ? (amount / stats.totalProjected) * 100 : 0;
                         return (
                            <div key={cat.id}>
                               <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                  <span className="flex items-center gap-2"><cat.icon size={14}/> {cat.label}</span>
                                  <span>{formatINR(amount)}</span>
                               </div>
                               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r ${cat.gradient}`} style={{ width: `${percent}%` }}></div>
                               </div>
                            </div>
                         )
                      })}
                   </div>
                </div>
             </div>
          )}

          {/* --- TAB: PROFILE --- */}
          {activeMobileTab === 'profile' && (
             <div className="p-6 space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><UserIcon size={32}/></div>
                   <h2 className="font-bold text-xl text-slate-900">Vivek Narkhede</h2>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">MoveMaster Admin</p>
                </div>

                <div className="bg-white p-2 rounded-3xl shadow-sm">
                   <button onClick={exportCSV} className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Download size={20}/></div>
                      <div className="text-left"><p className="font-bold text-slate-800">Export CSV</p><p className="text-xs text-slate-400">Download for Excel</p></div>
                   </button>
                   <div className="h-px bg-slate-50 mx-4"></div>
                   <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><LogOut size={20}/></div>
                      <div className="text-left"><p className="font-bold text-slate-800">Sign Out</p><p className="text-xs text-slate-400">Exit application</p></div>
                   </button>
                </div>
                
                <div className="text-center mt-8 opacity-50">
                   <p className="text-[10px] font-bold uppercase tracking-widest">Vivek Master Purchase Planner</p>
                </div>
             </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR (The "Reshuffle") */}
        <div className="bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center sticky bottom-0 z-30 pb-6 safe-area-pb">
           <button 
             onClick={() => setActiveMobileTab('home')}
             className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'home' ? 'text-slate-900' : 'text-slate-300'}`}
           >
              <Home size={24} strokeWidth={activeMobileTab === 'home' ? 2.5 : 2} />
              {activeMobileTab === 'home' && <div className="w-1 h-1 bg-slate-900 rounded-full"></div>}
           </button>

           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-300 flex items-center justify-center -mt-8 border-4 border-[#F1F5F9] active:scale-90 transition-transform"
           >
              <Plus size={28} />
           </button>

           <button 
             onClick={() => setActiveMobileTab('analytics')}
             className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'analytics' ? 'text-slate-900' : 'text-slate-300'}`}
           >
              <TrendingUp size={24} strokeWidth={activeMobileTab === 'analytics' ? 2.5 : 2} />
              {activeMobileTab === 'analytics' && <div className="w-1 h-1 bg-slate-900 rounded-full"></div>}
           </button>
        </div>

      </div>

      {/* -------------------------------------------------------------------------- */
      /* MODALS (Shared)                                                         */
      /* -------------------------------------------------------------------------- */}
      
      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300 print:hidden">
          <div 
             className="bg-white w-full md:max-w-md md:rounded-[32px] rounded-t-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">New Requirement</h2>
                <p className="text-slate-500 text-sm">What do you need?</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6 pb-6 md:pb-0">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item Name</label>
                <input type="text" placeholder="e.g. 65 inch OLED TV" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-lg font-medium placeholder:text-slate-300 transition-all outline-none border-2" value={newItemName} onChange={e => setNewItemName(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room</label>
                  <div className="relative">
                    <select className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-semibold text-slate-700 outline-none border-2 appearance-none" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
                      {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                   <div className="relative">
                    <select className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-semibold text-slate-700 outline-none border-2 appearance-none" value={newItemPriority} onChange={e => setNewItemPriority(e.target.value as any)}>
                      <option value="must_have">Essential</option>
                      <option value="nice_to_have">Nice to Have</option>
                      <option value="later">Can Wait</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                   </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Plus size={20} strokeWidth={2.5} /> Add to List
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in print:hidden">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Wallet size={32} /></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Set Budget Limit</h2>
            <form onSubmit={saveBudget} className="space-y-6 mt-6">
              <div className="relative">
                <IndianRupee size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" placeholder="0" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-2xl font-bold text-slate-900 outline-none transition-all" value={tempBudgetInput} onChange={e => setTempBudgetInput(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg shadow-slate-200">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub Components ---

function CategoryButton({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group ${active ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
      <div className="flex items-center gap-3"><Icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} /><span>{label}</span></div>
      {count ? <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span> : null}
    </button>
  );
}

function MobileFilterChip({ active, onClick, label, icon: Icon }: any) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${active ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20' : 'bg-white text-slate-600 border-slate-200'}`}>
      {Icon && <Icon size={14} className={active ? 'text-white' : 'text-slate-400'} />}{label}
    </button>
  );
}

// --- Item Card Component ---
function ItemCard({ item, user, appId, onDelete }: { item: Item, user: User | null, appId: string, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidatePrice, setNewCandidatePrice] = useState('');
  const [newCandidateLink, setNewCandidateLink] = useState('');
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState(item.category);
  const [editPriority, setEditPriority] = useState(item.priority);
  const [purchasedAmount, setPurchasedAmount] = useState(item.purchasedPrice?.toString() || '');

  const categoryInfo = CATEGORIES.find(c => c.id === item.category);
  const priorityInfo = PRIORITIES[item.priority];

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newCandidateName || !user) return;
    const newCandidate: Candidate = { id: crypto.randomUUID(), name: newCandidateName, price: Number(newCandidatePrice) || 0, link: newCandidateLink, selected: false };
    const updatedCandidates = [...item.candidates, newCandidate];
    if (updatedCandidates.length === 1) { updatedCandidates[0].selected = true; }
    const updates: any = { candidates: updatedCandidates };
    if (updatedCandidates.length === 1) { updates.selectedPrice = newCandidate.price; updates.status = 'decided'; }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), updates);
    setNewCandidateName(''); setNewCandidatePrice(''); setNewCandidateLink('');
  };

  const selectCandidate = async (candidateId: string) => {
    if (!user) return;
    const updatedCandidates = item.candidates.map(c => ({ ...c, selected: c.id === candidateId }));
    const selectedCandidate = updatedCandidates.find(c => c.selected);
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), { candidates: updatedCandidates, selectedPrice: selectedCandidate?.price || 0, status: 'decided' });
  };

  const markPurchased = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), { status: 'purchased', purchasedPrice: Number(purchasedAmount) || item.selectedPrice });
  };

  const removeCandidate = async (candidateId: string) => {
    if(!user) return;
    const updatedCandidates = item.candidates.filter(c => c.id !== candidateId);
    const wasSelected = item.candidates.find(c => c.id === candidateId)?.selected;
    const updates: any = { candidates: updatedCandidates };
    if (wasSelected) { updates.selectedPrice = 0; updates.status = 'researching'; }
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), updates);
  };

  const updateItemDetails = async () => { if (!user) return; await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), { name: editName, category: editCategory, priority: editPriority }); setIsEditing(false); };

  const isPurchased = item.status === 'purchased';
  const hasCandidates = item.candidates.length > 0;

  return (
    <div className={`group bg-white rounded-[24px] transition-all duration-300 overflow-hidden flex flex-col relative print:break-inside-avoid print:shadow-none print:border print:border-slate-300 ${isExpanded ? 'ring-2 ring-indigo-500 shadow-2xl md:col-span-2 md:row-span-2 z-10' : 'hover:shadow-lg hover:-translate-y-1 shadow-sm border border-slate-100'}`}>
      {!isExpanded && <div className={`h-1.5 w-full ${categoryInfo?.color.replace('text-', 'bg-').split(' ')[1]}`}></div>}
      
      {isEditing ? (
        <div className="p-5 flex-1 flex flex-col gap-4">
           <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-bold text-lg" />
           <div className="grid grid-cols-2 gap-2">
             <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm">{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
             <select value={editPriority} onChange={e => setEditPriority(e.target.value as any)} className="p-2 border border-slate-200 rounded-lg text-sm"><option value="must_have">Essential</option><option value="nice_to_have">Nice to Have</option><option value="later">Later</option></select>
           </div>
           <div className="flex gap-2 mt-auto"><button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-bold text-slate-600">Cancel</button><button onClick={updateItemDetails} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save</button></div>
        </div>
      ) : (
        <div className="p-5 cursor-pointer flex-1 flex flex-col" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${categoryInfo?.color} ring-1`}>{categoryInfo?.icon && <categoryInfo.icon size={14} />}</span>
                {isPurchased && <span className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/10 flex items-center gap-1.5 text-xs font-bold"><Check size={12} strokeWidth={3} /> Paid</span>}
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${priorityInfo.color.replace('text-', 'bg-').split(' ')[0]} ring-2 ring-white shadow-sm`}></div>
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-lg leading-tight mb-1 ${isPurchased ? 'text-slate-400 line-through decoration-slate-200' : 'text-slate-900'}`}>{item.name}</h3>
            <div className="h-6 flex items-center">{!isExpanded && (<div className={`text-sm font-bold ${isPurchased ? 'text-emerald-600' : 'text-indigo-600'}`}>{item.selectedPrice > 0 ? formatINR(item.status === 'purchased' ? (item.purchasedPrice || 0) : item.selectedPrice) : ''}</div>)}</div>
          </div>
          {!isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-medium text-slate-400"><span>{hasCandidates ? `${item.candidates.length} option${item.candidates.length > 1 ? 's' : ''}` : 'No options'}</span><span className="group-hover:translate-x-1 transition-transform print:hidden"><ArrowRight size={14} /></span></div>
          )}
        </div>
      )}

      {isExpanded && !isEditing && (
        <div className="bg-slate-50 p-5 animate-in slide-in-from-bottom-2 flex-1 flex flex-col print:bg-white print:p-0">
          <div className="flex justify-between items-center mb-5 print:hidden">
             <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider"><CreditCard size={14} /> Candidate List</div>
             <div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Pencil size={16} /></button><button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button></div>
          </div>
          <div className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-[200px] pr-1 custom-scrollbar print:max-h-none print:overflow-visible">
             {item.candidates.length === 0 && <div className="text-center py-4 text-slate-400 text-sm italic">Add links to models you are considering.</div>}
             {item.candidates.map(candidate => (
              <div key={candidate.id} onClick={(e) => { e.stopPropagation(); if (!isPurchased) selectCandidate(candidate.id); }} className={`group/item relative flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${candidate.selected ? 'bg-white border-indigo-500 shadow-md shadow-indigo-100 ring-1 ring-indigo-500 print:border-black' : 'bg-white border-slate-200 hover:border-indigo-300'} ${isPurchased ? 'opacity-60 grayscale' : ''}`}>
                <div><div className="font-bold text-sm text-slate-800">{candidate.name}</div><div className="text-xs font-bold text-slate-500 mt-0.5">{formatINR(candidate.price)}</div>{candidate.link && <div className="hidden print:block text-[10px] text-slate-400 mt-1 truncate max-w-[150px]">{candidate.link}</div>}</div>
                <div className="flex items-center gap-3 print:hidden">
                   {candidate.link && <a href={candidate.link} target="_blank" onClick={e => e.stopPropagation()} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><ExternalLink size={14} /></a>}
                   <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${candidate.selected ? 'bg-indigo-600 text-white scale-100' : 'bg-slate-100 text-transparent scale-90 group-hover/item:bg-indigo-100'}`}><Check size={12} strokeWidth={3} /></div>
                   {!isPurchased && <button onClick={(e) => { e.stopPropagation(); removeCandidate(candidate.id); }} className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all absolute -top-2 -right-2 bg-white rounded-full shadow-sm border border-slate-100"><X size={12} /></button>}
                </div>
              </div>
             ))}
          </div>
          {!isPurchased && (
            <div className="mt-auto print:hidden">
               <form onSubmit={addCandidate} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2"><input type="text" placeholder="Model Name" className="flex-1 px-2 py-1 text-sm bg-transparent outline-none font-medium" value={newCandidateName} onChange={e => setNewCandidateName(e.target.value)} /><div className="w-px bg-slate-100"></div><input type="number" placeholder="₹ Price" className="w-20 px-2 py-1 text-sm bg-transparent outline-none font-medium" value={newCandidatePrice} onChange={e => setNewCandidatePrice(e.target.value)} /></div>
                  <div className="flex gap-2 border-t border-slate-50 pt-2"><div className="flex items-center flex-1 gap-2 text-slate-400"><LinkIcon size={12} /><input type="text" placeholder="Paste URL here..." className="flex-1 text-xs bg-transparent outline-none" value={newCandidateLink} onChange={e => setNewCandidateLink(e.target.value)} /></div><button type="submit" disabled={!newCandidateName} className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center disabled:opacity-50 hover:bg-slate-800"><Plus size={14} /></button></div>
               </form>
            </div>
          )}
          {!isPurchased && item.status === 'decided' && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 shadow-sm mt-3 print:hidden" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Finalize Purchase</span><Wallet size={16} className="text-emerald-600" /></div>
               <div className="flex gap-2"><input type="number" value={purchasedAmount} onChange={e => setPurchasedAmount(e.target.value)} placeholder={item.selectedPrice.toString()} className="flex-1 px-4 py-2.5 rounded-xl border-none bg-white text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 outline-none" /><button onClick={markPurchased} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors">Pay</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
