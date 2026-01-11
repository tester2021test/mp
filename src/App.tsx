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
  ChevronUp, 
  ExternalLink,
  IndianRupee,
  Wallet,
  X,
  CreditCard,
  Download,
  Printer,
  Pencil,
  Link as LinkIcon,
  LogOut,
  Mail,
  Lock,
  Loader2,
  FileText,
  Search,
  MoreVertical
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
  { id: 'living', label: 'Living Room', icon: Monitor, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'kitchen', label: 'Kitchen', icon: Utensils, color: 'bg-orange-100 text-orange-700' },
  { id: 'bedroom', label: 'Bedroom', icon: Bed, color: 'bg-rose-100 text-rose-700' },
  { id: 'bathroom', label: 'Bathroom', icon: Bath, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'utility', label: 'Utility', icon: Box, color: 'bg-slate-100 text-slate-700' },
  { id: 'other', label: 'Other', icon: Home, color: 'bg-emerald-100 text-emerald-700' },
];

const PRIORITIES = {
  must_have: { label: 'Must Have', color: 'bg-red-50 text-red-700 border-red-200' },
  nice_to_have: { label: 'Nice to Have', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  later: { label: 'Can Wait', color: 'bg-slate-50 text-slate-600 border-slate-200' },
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
      // Sort by creation time desc
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

  // --- Stats & Grouping ---
  const stats = useMemo(() => items.reduce((acc, item) => {
    const realCost = item.status === 'purchased' ? (item.purchasedPrice || 0) : (item.selectedPrice || 0);
    acc.totalProjected += realCost;
    if (item.status === 'purchased') { acc.spent += item.purchasedPrice || 0; acc.purchasedCount += 1; }
    acc.totalItems += 1; return acc;
  }, { totalProjected: 0, spent: 0, totalItems: 0, purchasedCount: 0 }), [items]);

  const itemsByRoom = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    CATEGORIES.forEach(cat => groups[cat.id] = []);
    items.forEach(item => { if (groups[item.category]) groups[item.category].push(item); });
    return groups;
  }, [items]);

  const budgetUsagePercent = budgetLimit > 0 ? (stats.totalProjected / budgetLimit) * 100 : 0;
  const isOverBudget = stats.totalProjected > budgetLimit && budgetLimit > 0;

  // --- Export ---
  const exportCSV = () => {
    if (items.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Name,Category,Status,Price\n" + items.map(item => `"${item.name}","${item.category}","${item.status}","${item.selectedPrice}"`).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = "move_master.csv"; link.click();
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-slate-900 animate-spin"/></div>;

  if (!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl"><Check size={32} strokeWidth={3}/></div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">MoveMaster</h1>
          <p className="text-slate-500 font-medium text-lg mt-2">Smart Purchase Planner</p>
        </div>
        {authError && <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg font-bold border-l-4 border-red-500">{authError}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
             <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Email</label>
             <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-black focus:ring-0 font-medium outline-none transition-all" placeholder="name@example.com" /></div>
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Password</label>
             <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-black focus:ring-0 font-medium outline-none transition-all" placeholder="••••••••" /></div>
          </div>
          <button type="submit" disabled={authLoading} className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex justify-center gap-2">{authLoading && <Loader2 className="animate-spin" size={24} />} Enter</button>
        </form>
        <div className="my-8 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">Or Continue As</div>
        <button onClick={handleGuestLogin} disabled={authLoading} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-xl font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">Guest User</button>
        <div className="mt-12 text-center border-t border-slate-100 pt-6"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Built for Vivek Narkhede</p></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FAFAFA] font-sans text-slate-900 overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r border-slate-200 z-20">
        <div className="p-8">
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">MoveMaster</h1>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vivek Narkhede</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 space-y-8">
           {/* Budget Widget */}
           <div>
              <div className="flex justify-between items-end mb-2">
                 <span className="text-xs font-bold text-slate-400 uppercase">Budget</span>
                 <button onClick={() => setIsBudgetModalOpen(true)} className="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
              </div>
              <div className={`p-5 rounded-2xl border-2 ${isOverBudget ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                 <div className="text-3xl font-black text-slate-900">{formatINR(stats.totalProjected)}</div>
                 <div className="text-xs font-medium text-slate-500 mt-1">of {formatINR(budgetLimit)} limit</div>
                 <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-black'}`} style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}></div></div>
              </div>
           </div>
           {/* Stats */}
           <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                 <span className="text-sm font-bold text-slate-600">Spent</span>
                 <span className="text-sm font-bold text-emerald-600">{formatINR(stats.spent)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                 <span className="text-sm font-bold text-slate-600">Items</span>
                 <span className="text-sm font-bold text-slate-900">{items.length}</span>
              </div>
           </div>
           {/* Actions */}
           <div className="pt-4 border-t border-slate-100 space-y-3">
              <button onClick={exportCSV} className="w-full flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-slate-900"><Download size={18}/> Export CSV</button>
              <button onClick={() => window.print()} className="w-full flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-slate-900"><Printer size={18}/> Print Report</button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 text-sm font-bold text-red-500 hover:text-red-700"><LogOut size={18}/> Sign Out</button>
           </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Mobile Header (Sticky Budget) */}
        <header className="md:hidden flex-none bg-white border-b border-slate-200 z-20">
           <div className="px-5 py-4 flex justify-between items-center">
              <div>
                 <h1 className="text-lg font-black text-slate-900 leading-none">MoveMaster</h1>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vivek Narkhede</p>
              </div>
              <div onClick={() => setIsBudgetModalOpen(true)} className={`px-3 py-1.5 rounded-lg border-2 font-bold text-xs flex items-center gap-2 ${isOverBudget ? 'border-red-100 bg-red-50 text-red-700' : 'border-slate-100 bg-slate-50 text-slate-900'}`}>
                 <span>{formatINR(stats.totalProjected)}</span>
                 {isOverBudget && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
              </div>
           </div>
           {/* Mobile Progress Bar Line */}
           {budgetLimit > 0 && <div className="h-1 w-full bg-slate-100"><div className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-black'}`} style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}></div></div>}
        </header>

        {/* Scrollable List Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32 md:pb-10 p-0 md:p-8">
           <div className="max-w-3xl mx-auto space-y-8">
              {/* Desktop Header Title */}
              <div className="hidden md:block mb-8">
                 <h2 className="text-3xl font-black text-slate-900">Your List</h2>
                 <p className="text-slate-500 font-medium">Grouped by Room</p>
              </div>

              {/* EMPTY STATE */}
              {items.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300"><ShoppingCart size={32}/></div>
                    <h3 className="text-xl font-bold text-slate-900">List is empty</h3>
                    <p className="text-slate-500 mt-2 max-w-xs mx-auto">Tap the + button to start adding items for your new home.</p>
                 </div>
              )}

              {/* SMART LIST: Grouped by Category */}
              {CATEGORIES.map(cat => {
                 const roomItems = itemsByRoom[cat.id];
                 const roomTotal = roomItems.reduce((sum, i) => sum + (i.status === 'purchased' ? (i.purchasedPrice || 0) : (i.selectedPrice || 0)), 0);
                 
                 // If no items in this room, skip rendering it to keep list clean
                 if (roomItems.length === 0) return null;

                 return (
                    <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="sticky top-0 md:static z-10 bg-[#FAFAFA] px-5 py-3 md:px-0 flex justify-between items-end border-b border-slate-200 md:border-none mb-0 md:mb-3">
                          <div className="flex items-center gap-2">
                             <div className={`p-1.5 rounded-md ${cat.color} bg-opacity-20`}><cat.icon size={16}/></div>
                             <h3 className="text-lg font-bold text-slate-900">{cat.label}</h3>
                          </div>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{formatINR(roomTotal)}</span>
                       </div>
                       
                       <div className="bg-white md:rounded-2xl border-b md:border border-slate-200 shadow-sm divide-y divide-slate-100">
                          {roomItems.map(item => (
                             <SmartListItem key={item.id} item={item} user={user} appId={appId} onDelete={() => deleteItem(item.id)} />
                          ))}
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Floating Action Button (Mobile & Desktop) */}
        <div className="absolute bottom-6 right-6 z-30">
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="w-16 h-16 bg-black text-white rounded-full shadow-2xl shadow-slate-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
           >
              <Plus size={32} strokeWidth={2.5} />
           </button>
        </div>

        {/* Mobile Bottom Menu (Logout/Export) */}
        <div className="md:hidden fixed top-4 left-4 z-50">
           {/* Hidden menu trigger area or simple icon if needed, but sticky header covers basic budget. Export/Logout is secondary on mobile. 
               Let's put a small menu icon in top right of header if needed, but simplifying to focus on list.
           */}
        </div>

      </main>

      {/* --- ADD ITEM MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-slate-900">Add Item</h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-5">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Item Name</label>
                    <input type="text" autoFocus className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-black font-bold text-slate-900 outline-none" placeholder="e.g. Sofa" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Room</label>
                       <div className="relative">
                          <select className="w-full px-3 py-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-black font-bold text-slate-900 outline-none appearance-none text-sm" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
                             {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
                       </div>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Priority</label>
                       <div className="relative">
                          <select className="w-full px-3 py-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-black font-bold text-slate-900 outline-none appearance-none text-sm" value={newItemPriority} onChange={e => setNewItemPriority(e.target.value as any)}>
                             <option value="must_have">Must Have</option><option value="nice_to_have">Nice to Have</option><option value="later">Later</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
                       </div>
                    </div>
                 </div>
                 <button type="submit" className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex justify-center gap-2">Add to List</button>
              </form>
           </div>
        </div>
      )}

      {/* --- BUDGET MODAL --- */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl">
              <h2 className="text-xl font-black text-slate-900 mb-2">Total Budget</h2>
              <form onSubmit={saveBudget} className="mt-6">
                 <div className="relative mb-6">
                    <IndianRupee size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="number" autoFocus placeholder="0" className="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-black font-black text-2xl text-slate-900 outline-none text-center" value={tempBudgetInput} onChange={e => setTempBudgetInput(e.target.value)} />
                 </div>
                 <div className="flex gap-3">
                    <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="flex-1 py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-xl font-bold text-sm">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg">Save</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}

// --- SMART LIST ITEM COMPONENT ---
function SmartListItem({ item, user, appId, onDelete }: { item: Item, user: User | null, appId: string, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Inputs
  const [newCName, setNewCName] = useState('');
  const [newCPrice, setNewCPrice] = useState('');
  const [newCLink, setNewCLink] = useState('');
  const [purchasedAmt, setPurchasedAmt] = useState(item.purchasedPrice?.toString() || '');
  const [editName, setEditName] = useState(item.name);

  const priInfo = PRIORITIES[item.priority];
  const isPurchased = item.status === 'purchased';
  const hasCandidates = item.candidates.length > 0;
  const selectedCandidate = item.candidates.find(c => c.selected);

  // DB Ops (Condensed)
  const updateDB = async (data: any) => { if(user) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', item.id), data); };
  
  const addCand = async (e: React.FormEvent) => {
    e.preventDefault(); if(!newCName) return;
    const nc: Candidate = { id: crypto.randomUUID(), name: newCName, price: Number(newCPrice)||0, link: newCLink, selected: false };
    const uc = [...item.candidates, nc];
    let updates: any = { candidates: uc };
    if(uc.length===1) { uc[0].selected=true; updates.selectedPrice=nc.price; updates.status='decided'; }
    await updateDB(updates);
    setNewCName(''); setNewCPrice(''); setNewCLink('');
  };

  const toggleSelect = async (cid: string) => {
    const uc = item.candidates.map(c => ({...c, selected: c.id===cid ? !c.selected : false})); // Toggle logic
    const sc = uc.find(c=>c.selected);
    await updateDB({ candidates: uc, selectedPrice: sc?.price||0, status: sc ? 'decided' : 'researching' });
  };

  const markBuy = async () => { await updateDB({ status: 'purchased', purchasedPrice: Number(purchasedAmt)||item.selectedPrice }); };
  const deleteCand = async (cid: string) => {
     const uc = item.candidates.filter(c => c.id !== cid);
     const wasSel = item.candidates.find(c=>c.id===cid)?.selected;
     await updateDB({ candidates: uc, ...(wasSel ? {selectedPrice: 0, status: 'researching'} : {}) });
  };

  return (
    <div className={`transition-all duration-200 ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}>
       
       {/* 1. MAIN ROW (Always Visible) */}
       <div 
         className="p-4 flex items-center gap-4 cursor-pointer active:bg-slate-50 hover:bg-slate-50"
         onClick={() => setIsExpanded(!isExpanded)}
       >
          {/* Checkbox / Status Indicator */}
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isPurchased ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
             {isPurchased && <Check size={14} strokeWidth={3} />}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
                <h4 className={`font-bold text-base truncate ${isPurchased ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</h4>
                {item.priority === 'must_have' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
             </div>
             <div className="text-xs text-slate-500 font-medium truncate">
                {isPurchased 
                   ? `Purchased` 
                   : (selectedCandidate ? `Selected: ${selectedCandidate.name}` : `${item.candidates.length} options`)}
             </div>
          </div>

          {/* Price */}
          <div className="text-right">
             <div className={`font-bold text-sm ${isPurchased ? 'text-emerald-600' : 'text-slate-900'}`}>
                {item.selectedPrice > 0 ? formatINR(isPurchased ? item.purchasedPrice||0 : item.selectedPrice) : '-'}
             </div>
          </div>
       </div>

       {/* 2. EXPANDED DETAIL VIEW */}
       {isExpanded && (
          <div className="px-4 pb-4 pl-14">
             {/* Candidates List */}
             <div className="space-y-2 mb-4">
                {item.candidates.map(cand => (
                   <div key={cand.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden" onClick={() => !isPurchased && toggleSelect(cand.id)}>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${cand.selected ? 'bg-black border-black text-white' : 'border-slate-300'}`}>
                            {cand.selected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                         </div>
                         <div className="truncate">
                            <p className="text-sm font-bold text-slate-800">{cand.name}</p>
                            <p className="text-xs text-slate-500 font-bold">{formatINR(cand.price)}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         {cand.link && <a href={cand.link} target="_blank" className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg"><LinkIcon size={14}/></a>}
                         {!isPurchased && <button onClick={() => deleteCand(cand.id)} className="p-1.5 text-red-500 bg-red-50 rounded-lg"><Trash2 size={14}/></button>}
                      </div>
                   </div>
                ))}
             </div>

             {/* Add Candidate Input */}
             {!isPurchased && (
                <form onSubmit={addCand} className="flex gap-2 mb-4">
                   <input className="flex-1 px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-black" placeholder="Add Model..." value={newCName} onChange={e=>setNewCName(e.target.value)} />
                   <input className="w-20 px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-black" type="number" placeholder="₹" value={newCPrice} onChange={e=>setNewCPrice(e.target.value)} />
                   <button disabled={!newCName} className="p-2 bg-black text-white rounded-xl disabled:opacity-50"><Plus size={18}/></button>
                </form>
             )}

             {/* Action Buttons */}
             <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <button onClick={onDelete} className="text-xs font-bold text-red-500 hover:underline">Delete Item</button>
                {!isPurchased && item.status === 'decided' && (
                   <div className="flex gap-2 items-center">
                      <input type="number" className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg" placeholder="Final ₹" value={purchasedAmt} onChange={e=>setPurchasedAmt(e.target.value)} />
                      <button onClick={markBuy} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm">Mark Purchased</button>
                   </div>
                )}
             </div>
          </div>
       )}
    </div>
  );
}
