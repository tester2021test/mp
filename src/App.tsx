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
  Loader2
} from 'lucide-react';

// --- Firebase Configuration & Initialization ---

// 1. PASTE YOUR FIREBASE CONFIG HERE
// You can find these in the Firebase Console -> Project Settings -> General -> Your Apps
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
// (The ternary check ensures the code still runs in this preview environment)
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
  { id: 'living', label: 'Living', icon: Monitor, color: 'text-indigo-600 bg-indigo-50 ring-indigo-500/10' },
  { id: 'kitchen', label: 'Kitchen', icon: Utensils, color: 'text-orange-600 bg-orange-50 ring-orange-500/10' },
  { id: 'bedroom', label: 'Bedroom', icon: Bed, color: 'text-rose-600 bg-rose-50 ring-rose-500/10' },
  { id: 'bathroom', label: 'Bath', icon: Bath, color: 'text-cyan-600 bg-cyan-50 ring-cyan-500/10' },
  { id: 'utility', label: 'Utility', icon: Box, color: 'text-slate-600 bg-slate-50 ring-slate-500/10' },
  { id: 'other', label: 'Other', icon: Home, color: 'text-emerald-600 bg-emerald-50 ring-emerald-500/10' },
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
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('living');
  const [newItemPriority, setNewItemPriority] = useState('must_have');
  const [tempBudgetInput, setTempBudgetInput] = useState('');

  // --- Auth & Data Effects ---
  useEffect(() => {
    const initAuth = async () => {
      // Check for environment token first (Canvas environment)
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
      if (u) setLoading(false); // Only stop loading data if user exists
      else setLoading(false);   // Stop loading even if no user (to show login form)
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
    
    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Category,Status,Priority,Selected Model,Price,Purchased Price,Link\n";
    
    // Rows
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

  // --- Render: Login Screen (If no user) ---
  if (!user) {
      return (
          <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md p-8 rounded-[32px] shadow-xl border border-slate-100">
                  <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-200">
                          <Sparkles size={32} className="text-yellow-300" />
                      </div>
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">MoveMaster</h1>
                      <p className="text-slate-500 mt-2">Plan your move, track your budget.</p>
                  </div>

                  {authError && (
                      <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium flex items-center gap-2">
                          <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                          {authError}
                      </div>
                  )}

                  <form onSubmit={handleAuth} className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
                          <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                  type="email" 
                                  required
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium outline-none transition-all"
                                  placeholder="hello@example.com"
                              />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
                          <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input 
                                  type="password" 
                                  required
                                  value={password}
                                  onChange={e => setPassword(e.target.value)}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium outline-none transition-all"
                                  placeholder="••••••••"
                              />
                          </div>
                      </div>

                      <button 
                          type="submit" 
                          disabled={authLoading}
                          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                          {authLoading && <Loader2 className="animate-spin" size={18} />}
                          Sign In
                      </button>
                  </form>

                  <div className="my-6 flex items-center gap-4">
                      <div className="h-px bg-slate-100 flex-1"></div>
                      <span className="text-xs font-bold text-slate-300 uppercase">Or</span>
                      <div className="h-px bg-slate-100 flex-1"></div>
                  </div>

                  <button 
                      onClick={handleGuestLogin}
                      disabled={authLoading}
                      className="w-full py-3 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                      Continue as Guest <ArrowRight size={16} />
                  </button>

                  <div className="mt-8 text-center border-t border-slate-50 pt-6">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Vivek Master Purchase Planner</p>
                    <p className="text-xs text-slate-400">Built for personal usage by <span className="font-semibold text-slate-600">Vivek Narkhede</span></p>
                  </div>
              </div>
          </div>
      );
  }

  // --- Render: Main App (If user is logged in) ---
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900 print:bg-white print:block">
      
      {/* -------------------------------------------------------------------------- */
      /* PRINT ONLY VIEW (Hidden on screen)                                      */
      /* -------------------------------------------------------------------------- */}
      <div className="hidden print:block p-8 bg-white w-full max-w-[210mm] mx-auto">
         {/* Print Header */}
         <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
               <div className="flex items-center gap-2 mb-2">
                 <div className="bg-slate-900 text-white p-1 rounded">
                   <Sparkles size={16} />
                 </div>
                 <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">MoveMaster</h1>
               </div>
               <p className="text-sm text-slate-500 font-medium">Procurement & Budget Report</p>
            </div>
            <div className="text-right">
               <p className="text-xs font-bold text-slate-400 uppercase">Generated On</p>
               <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
         </div>

         {/* Print Stats */}
         <div className="grid grid-cols-4 gap-6 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Budget</p>
               <p className="text-lg font-bold text-slate-900">{formatINR(budgetLimit)}</p>
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Projected Cost</p>
               <p className="text-lg font-bold text-indigo-600">{formatINR(stats.totalProjected)}</p>
            </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actual Spent</p>
               <p className="text-lg font-bold text-emerald-600">{formatINR(stats.spent)}</p>
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Items</p>
               <p className="text-lg font-bold text-slate-900">{stats.purchasedCount} / {items.length}</p>
            </div>
         </div>

         {/* Print Table */}
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="border-b-2 border-slate-200">
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Item</th>
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Selected Model</th>
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Est. Cost</th>
                  <th className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Final Cost</th>
               </tr>
            </thead>
            <tbody>
               {items.map((item) => {
                  const selected = item.candidates.find(c => c.selected);
                  const isPurchased = item.status === 'purchased';
                  return (
                     <tr key={item.id} className="border-b border-slate-100 break-inside-avoid">
                        <td className="py-3 pr-2">
                           <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        </td>
                        <td className="py-3 pr-2">
                           <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {CATEGORIES.find(c => c.id === item.category)?.label}
                           </span>
                        </td>
                        <td className="py-3 pr-2">
                           <span className={`text-[10px] font-bold uppercase ${item.priority === 'must_have' ? 'text-red-600' : 'text-slate-400'}`}>
                             {PRIORITIES[item.priority].label}
                           </span>
                        </td>
                        <td className="py-3 pr-2 text-sm text-slate-600">
                           {selected ? selected.name : <span className="text-slate-300 italic">None selected</span>}
                        </td>
                         <td className="py-3 pl-2 text-right text-sm font-medium text-slate-600">
                           {item.selectedPrice > 0 ? formatINR(item.selectedPrice) : '-'}
                        </td>
                        <td className="py-3 pl-2 text-right text-sm font-bold">
                           {isPurchased ? (
                              <span className="text-emerald-700">{formatINR(item.purchasedPrice || 0)}</span>
                           ) : (
                              <span className="text-slate-300">-</span>
                           )}
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>

         <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            <div>Vivek Master Purchase Planner - Built for Vivek Narkhede</div>
            <div className="mt-1 opacity-50">Report generated by MoveMaster Application</div>
         </div>
      </div>

      {/* -------------------------------------------------------------------------- */
      /* SCREEN VIEW SIDEBAR (Hidden when printing)                              */
      /* -------------------------------------------------------------------------- */}
      <aside className="hidden md:flex w-80 flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-100 z-30 shadow-sm print:hidden">
        <div className="p-8 pb-4">
           <div className="flex items-center gap-3">
             <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg shadow-slate-200">
               <Sparkles size={20} strokeWidth={2} className="text-yellow-300" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">MoveMaster</h1>
                <p className="text-xs font-medium text-slate-400 mt-1">Smart Procurement</p>
             </div>
           </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
           
           {/* Budget Widget */}
           <div 
             onClick={() => { setTempBudgetInput(budgetLimit.toString()); setIsBudgetModalOpen(true); }}
             className={`relative overflow-hidden p-6 rounded-3xl cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl ${
               isOverBudget 
               ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200 text-white' 
               : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-200 text-white'
             }`}
           >
              <div className="flex justify-between items-start mb-6">
                 <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                   <CreditCard size={20} className="text-white/90" />
                 </div>
                 {isOverBudget && <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">OVER LIMIT</div>}
              </div>
              
              <div className="space-y-1 relative z-10">
                <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Total Projected</p>
                <p className="text-3xl font-bold tracking-tight">{formatINR(stats.totalProjected)}</p>
              </div>

              <div className="mt-4">
                 <div className="flex justify-between text-[10px] font-medium text-white/60 mb-1.5">
                    <span>Spent: {formatINR(stats.spent)}</span>
                    <span>Limit: {formatINR(budgetLimit)}</span>
                 </div>
                 <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                   <div 
                    className="h-full bg-white/90 rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                   ></div>
                 </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
           </div>

           {/* Export Tools */}
           <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Export Data</div>
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={exportCSV}
                   className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-100"
                 >
                    <FileText size={20} className="mb-2 text-indigo-500" />
                    <span className="text-xs font-bold">CSV</span>
                 </button>
                 <button 
                   onClick={printPDF}
                   className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-100"
                 >
                    <Printer size={20} className="mb-2 text-indigo-500" />
                    <span className="text-xs font-bold">PDF</span>
                 </button>
              </div>
           </div>

           {/* Filters */}
           <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Rooms</div>
              <div className="space-y-1">
                 <CategoryButton 
                    active={categoryFilter === 'all'} 
                    onClick={() => setCategoryFilter('all')} 
                    icon={LayoutGrid} 
                    label="All Items" 
                    count={items.length} 
                 />
                  {CATEGORIES.map(cat => (
                    <CategoryButton 
                      key={cat.id}
                      active={categoryFilter === cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      icon={cat.icon}
                      label={cat.label}
                      count={categoryStats.counts[cat.id]}
                    />
                  ))}
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-50 space-y-3">
           <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
           >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
              <span>Add New Item</span>
           </button>
           <button 
              onClick={handleLogout}
              className="w-full py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm"
           >
              <LogOut size={16} /> 
              <span>Sign Out</span>
           </button>
           
           <div className="pt-4 mt-2 border-t border-slate-50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Vivek Master Purchase Planner</p>
              <p className="text-[10px] text-slate-400">Built for personal usage by <span className="text-slate-600 font-semibold">Vivek Narkhede</span></p>
           </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------------- */
      /* MAIN AREA (Responsive & Hidden when printing)                           */
      /* -------------------------------------------------------------------------- */}
      <main className="flex-1 md:ml-80 flex flex-col min-h-screen relative bg-[#F8FAFC] print:hidden">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 print:hidden">
           <div className="px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                 <div className="bg-slate-900 text-white p-1.5 rounded-lg shadow-sm">
                   <Sparkles size={16} strokeWidth={2.5} className="text-yellow-300" />
                 </div>
                 <span className="font-bold text-slate-900 text-lg tracking-tight">MoveMaster</span>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                   <Download size={18} />
                </button>
                <button 
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm transition-all active:scale-95 ${
                    isOverBudget 
                    ? 'bg-red-50 text-red-700 border-red-100' 
                    : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  onClick={() => setIsBudgetModalOpen(true)}
                >
                   <Wallet size={14} className={isOverBudget ? 'text-red-500' : 'text-indigo-500'} />
                   {budgetLimit > 0 ? formatINR(stats.totalProjected) : 'Set Budget'}
                </button>
              </div>
           </div>
           
           {/* Mobile Filter Scroll */}
           <div className="overflow-x-auto no-scrollbar pb-3 px-4 flex gap-2.5">
             <MobileFilterChip 
               active={categoryFilter === 'all'} 
               onClick={() => setCategoryFilter('all')} 
               label="All" 
             />
             {CATEGORIES.map(cat => (
               <MobileFilterChip 
                 key={cat.id}
                 active={categoryFilter === cat.id}
                 onClick={() => setCategoryFilter(cat.id)}
                 label={cat.label}
                 icon={cat.icon}
               />
             ))}
           </div>
        </header>

        {/* DESKTOP HEADER */}
        <header className="hidden md:flex px-10 py-8 items-end justify-between print:hidden">
           <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                {categoryFilter === 'all' ? 'Master List' : CATEGORIES.find(c => c.id === categoryFilter)?.label}
              </h2>
              <p className="text-slate-500 mt-1">Manage procurement and compare candidates.</p>
           </div>
           
           <div className="flex gap-4">
              <div className="bg-white border border-slate-100 px-5 py-2.5 rounded-2xl shadow-sm flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Committed Spend</p>
                    <p className="font-bold text-slate-900 text-lg leading-none mt-0.5">{formatINR(stats.spent)}</p>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Check size={20} strokeWidth={2.5} />
                 </div>
              </div>
           </div>
        </header>

        {/* CONTENT GRID */}
        <div className="flex-1 p-4 md:px-10 md:pb-10 overflow-y-auto print:hidden">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 print:hidden">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-5">
                <ShoppingCart className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Your list is empty</h3>
              <p className="text-slate-500 max-w-[250px] mt-1">Start by adding items you need for your new place.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-24 md:pb-0">
              {filteredItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  user={user} 
                  appId={appId} 
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          )}

          {/* Mobile Footer Disclaimer */}
          <div className="md:hidden mt-8 mb-24 text-center opacity-70">
             <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vivek Master Purchase Planner</p>
             <p className="text-[10px] text-slate-400">Built for personal usage by Vivek Narkhede</p>
          </div>
        </div>

        {/* MOBILE FAB */}
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/20 flex items-center justify-center z-40 active:scale-90 transition-transform print:hidden"
        >
          <Plus size={28} />
        </button>
        
        {/* Mobile Logout (Top Right Absolute) */}
        <div className="md:hidden fixed bottom-6 left-6 z-40">
           <button 
             onClick={handleLogout}
             className="w-10 h-10 bg-white text-slate-500 rounded-full shadow-lg border border-slate-100 flex items-center justify-center"
           >
             <LogOut size={18} />
           </button>
        </div>

      </main>

      {/* -------------------------------------------------------------------------- */
      /* MODALS                                                                  */
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
                <p className="text-slate-500 text-sm">What do you need for the new place?</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-6 pb-6 md:pb-0">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. 65 inch OLED TV"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-lg font-medium placeholder:text-slate-300 transition-all outline-none border-2"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-semibold text-slate-700 outline-none border-2 appearance-none"
                      value={newItemCategory}
                      onChange={e => setNewItemCategory(e.target.value)}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                   <div className="relative">
                    <select
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-semibold text-slate-700 outline-none border-2 appearance-none"
                      value={newItemPriority}
                      onChange={e => setNewItemPriority(e.target.value as any)}
                    >
                      <option value="must_have">Essential</option>
                      <option value="nice_to_have">Nice to Have</option>
                      <option value="later">Can Wait</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                   </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
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
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Wallet size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Set Budget Limit</h2>
            <p className="text-slate-500 mb-8">What is your maximum spending limit for this entire project?</p>
            <form onSubmit={saveBudget} className="space-y-6">
              <div className="relative">
                <IndianRupee size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="0"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-2xl font-bold text-slate-900 outline-none transition-all"
                  value={tempBudgetInput}
                  onChange={e => setTempBudgetInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                 <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg shadow-slate-200"
                >
                  Save
                </button>
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
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
        active 
          ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
        <span>{label}</span>
      </div>
      {count ? (
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function MobileFilterChip({ active, onClick, label, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${
        active 
          ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20' 
          : 'bg-white text-slate-600 border-slate-200'
      }`}
    >
      {Icon && <Icon size={14} className={active ? 'text-white' : 'text-slate-400'} />}
      {label}
    </button>
  );
}

// --- Item Card Component (With Edit Mode) ---
function ItemCard({ item, user, appId, onDelete }: { item: Item, user: User | null, appId: string, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Add Candidate State
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidatePrice, setNewCandidatePrice] = useState('');
  const [newCandidateLink, setNewCandidateLink] = useState('');
  
  // Edit Item State
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState(item.category);
  const [editPriority, setEditPriority] = useState(item.priority);

  const [purchasedAmount, setPurchasedAmount] = useState(item.purchasedPrice?.toString() || '');

  const categoryInfo = CATEGORIES.find(c => c.id === item.category);
  const priorityInfo = PRIORITIES[item.priority];

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName || !user) return;
    const newCandidate: Candidate = { id: crypto.randomUUID(), name: newCandidateName, price: Number(newCandidatePrice) || 0, link: newCandidateLink, selected: false };
    const updatedCandidates = [...item.candidates, newCandidate];
    const isFirst = updatedCandidates.length === 1;
    if (isFirst) updatedCandidates[0].selected = true;
    const updates: any = { candidates: updatedCandidates };
    if (isFirst) { updates.selectedPrice = newCandidate.price; updates.status = 'decided'; }
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

  const updateItemDetails = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), {
       name: editName,
       category: editCategory,
       priority: editPriority
    });
    setIsEditing(false);
  };

  const isPurchased = item.status === 'purchased';
  const hasCandidates = item.candidates.length > 0;

  return (
    <div 
      className={`group bg-white rounded-3xl transition-all duration-300 overflow-hidden flex flex-col relative print:break-inside-avoid print:shadow-none print:border print:border-slate-300 ${
        isExpanded 
        ? 'ring-2 ring-indigo-500 shadow-2xl md:col-span-2 md:row-span-2 z-10' 
        : 'hover:shadow-xl hover:-translate-y-1 shadow-sm border border-slate-100'
      }`}
    >
      {/* Decorative category strip */}
      {!isExpanded && <div className={`h-1.5 w-full ${categoryInfo?.color.replace('text-', 'bg-').split(' ')[1]}`}></div>}
      
      {isEditing ? (
        <div className="p-5 flex-1 flex flex-col gap-4">
           <input 
             value={editName} 
             onChange={e => setEditName(e.target.value)} 
             className="w-full p-2 border border-slate-200 rounded-lg font-bold text-lg"
           />
           <div className="grid grid-cols-2 gap-2">
             <select 
                value={editCategory} 
                onChange={e => setEditCategory(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-sm"
             >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
             </select>
             <select 
                value={editPriority} 
                onChange={e => setEditPriority(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-lg text-sm"
             >
                <option value="must_have">Essential</option>
                <option value="nice_to_have">Nice to Have</option>
                <option value="later">Later</option>
             </select>
           </div>
           <div className="flex gap-2 mt-auto">
             <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-bold text-slate-600">Cancel</button>
             <button onClick={updateItemDetails} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save</button>
           </div>
        </div>
      ) : (
        <div className="p-5 cursor-pointer flex-1 flex flex-col" onClick={() => setIsExpanded(!isExpanded)}>
          {/* Header Tags */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${categoryInfo?.color} ring-1`}>
                  {categoryInfo?.icon && <categoryInfo.icon size={14} />}
                </span>
                {isPurchased && (
                  <span className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/10 flex items-center gap-1.5 text-xs font-bold">
                    <Check size={12} strokeWidth={3} /> Paid
                  </span>
                )}
            </div>
            
            {/* Priority Dot */}
            <div className={`w-2.5 h-2.5 rounded-full ${priorityInfo.color.replace('text-', 'bg-').split(' ')[0]} ring-2 ring-white shadow-sm`}></div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <h3 className={`font-bold text-lg leading-tight mb-1 ${isPurchased ? 'text-slate-400 line-through decoration-slate-200' : 'text-slate-900'}`}>
              {item.name}
            </h3>
            <div className="h-6 flex items-center">
              {!isExpanded && (
                <div className={`text-sm font-bold ${isPurchased ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {item.selectedPrice > 0 ? formatINR(item.status === 'purchased' ? (item.purchasedPrice || 0) : item.selectedPrice) : ''}
                </div>
              )}
            </div>
          </div>

          {/* Footer info (Collapsed) */}
          {!isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-medium text-slate-400">
                <span>{hasCandidates ? `${item.candidates.length} option${item.candidates.length > 1 ? 's' : ''}` : 'No options'}</span>
                <span className="group-hover:translate-x-1 transition-transform print:hidden"><ArrowRight size={14} /></span>
            </div>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && !isEditing && (
        <div className="bg-slate-50 p-5 animate-in slide-in-from-bottom-2 flex-1 flex flex-col print:bg-white print:p-0">
          <div className="flex justify-between items-center mb-5 print:hidden">
             <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
               <CreditCard size={14} /> Candidate List
             </div>
             <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Pencil size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
             </div>
          </div>

          <div className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-[200px] pr-1 custom-scrollbar print:max-h-none print:overflow-visible">
             {item.candidates.length === 0 && (
               <div className="text-center py-4 text-slate-400 text-sm italic">Add links to models you are considering.</div>
             )}
             {item.candidates.map(candidate => (
              <div 
                key={candidate.id} 
                onClick={(e) => { e.stopPropagation(); if (!isPurchased) selectCandidate(candidate.id); }}
                className={`group/item relative flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  candidate.selected 
                    ? 'bg-white border-indigo-500 shadow-md shadow-indigo-100 ring-1 ring-indigo-500 print:border-black' 
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                } ${isPurchased ? 'opacity-60 grayscale' : ''}`}
              >
                <div>
                  <div className="font-bold text-sm text-slate-800">{candidate.name}</div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">{formatINR(candidate.price)}</div>
                  {/* Link visible in print */}
                  {candidate.link && <div className="hidden print:block text-[10px] text-slate-400 mt-1 truncate max-w-[150px]">{candidate.link}</div>}
                </div>
                <div className="flex items-center gap-3 print:hidden">
                   {candidate.link && <a href={candidate.link} target="_blank" onClick={e => e.stopPropagation()} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><ExternalLink size={14} /></a>}
                   
                   <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      candidate.selected ? 'bg-indigo-600 text-white scale-100' : 'bg-slate-100 text-transparent scale-90 group-hover/item:bg-indigo-100'
                   }`}>
                     <Check size={12} strokeWidth={3} />
                   </div>
                   
                   {!isPurchased && (
                     <button 
                      onClick={(e) => { e.stopPropagation(); removeCandidate(candidate.id); }} 
                      className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all absolute -top-2 -right-2 bg-white rounded-full shadow-sm border border-slate-100"
                    >
                      <X size={12} />
                    </button>
                   )}
                </div>
              </div>
             ))}
          </div>

          {/* Input Area */}
          {!isPurchased && (
            <div className="mt-auto print:hidden">
               <form onSubmit={addCandidate} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Model Name" className="flex-1 px-2 py-1 text-sm bg-transparent outline-none font-medium" value={newCandidateName} onChange={e => setNewCandidateName(e.target.value)} />
                    <div className="w-px bg-slate-100"></div>
                    <input type="number" placeholder="₹ Price" className="w-20 px-2 py-1 text-sm bg-transparent outline-none font-medium" value={newCandidatePrice} onChange={e => setNewCandidatePrice(e.target.value)} />
                  </div>
                  <div className="flex gap-2 border-t border-slate-50 pt-2">
                    <div className="flex items-center flex-1 gap-2 text-slate-400">
                       <LinkIcon size={12} />
                       <input type="text" placeholder="Paste URL here..." className="flex-1 text-xs bg-transparent outline-none" value={newCandidateLink} onChange={e => setNewCandidateLink(e.target.value)} />
                    </div>
                    <button type="submit" disabled={!newCandidateName} className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center disabled:opacity-50 hover:bg-slate-800"><Plus size={14} /></button>
                  </div>
               </form>
            </div>
          )}

          {/* Buy Action */}
          {!isPurchased && item.status === 'decided' && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 shadow-sm mt-3 print:hidden" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Finalize Purchase</span>
                  <Wallet size={16} className="text-emerald-600" />
               </div>
               <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={purchasedAmount} 
                    onChange={e => setPurchasedAmount(e.target.value)} 
                    placeholder={item.selectedPrice.toString()} 
                    className="flex-1 px-4 py-2.5 rounded-xl border-none bg-white text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                  />
                  <button 
                    onClick={markPurchased} 
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors"
                  >
                    Pay
                  </button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
