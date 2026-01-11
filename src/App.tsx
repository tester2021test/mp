import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  List, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  ExternalLink, 
  Home, 
  Filter,
  Save,
  ShoppingBag,
  AlertCircle,
  X,
  IndianRupee,
  Wallet,
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Search,
  Columns,
  GripHorizontal,
  LogOut,
  Lock
} from 'lucide-react';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyA3rq4VoIBabzv7rugZUfMzTDaRLbkqU0c",
  authDomain: "move-master-app.firebaseapp.com",
  projectId: "move-master-app",
  storageBucket: "move-master-app.firebasestorage.app",
  messagingSenderId: "317364689906",
  appId: "1:317364689906:web:812ea49079d3441325696b",
  measurementId: "G-01DHYGFZVY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// This appId refers to the internal application container ID for data separation, not the Firebase App ID.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'home-planner-v1';

// --- Constants & Options ---
const ROOMS = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office', 'Garage', 'Other'];
const CATEGORIES = ['Furniture', 'Electronics', 'Appliances', 'Decor', 'Utilities', 'Supplies'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Planned', 'Shortlisted', 'Bought', 'Dropped'];

// --- Helper Functions ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// --- Chart Components ---
const SimpleBarChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <BarChart3 size={32} className="mb-2 opacity-50"/>
        <span className="text-xs font-medium">No cost data yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="group">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(item.value)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}
            >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Helper Components ---

const StatusBadge = ({ status }) => {
  const colors = {
    Planned: 'bg-slate-100 text-slate-700 border-slate-200',
    Shortlisted: 'bg-purple-50 text-purple-700 border-purple-200',
    Bought: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Dropped: 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-70'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    High: 'text-rose-600 bg-rose-50 border-rose-100',
    Medium: 'text-amber-600 bg-amber-50 border-amber-100',
    Low: 'text-blue-600 bg-blue-50 border-blue-100'
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${colors[priority]}`}>
      {priority}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 transition-all duration-300">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white/95 backdrop-blur z-10">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 safe-pb">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Login Page Component ---
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200 mb-4">
            <Home className="text-white h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Sign in to your Home Moving Planner</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isLoggingIn ? 'Signing In...' : <><Lock size={18} /> Sign In</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); 
  
  // Settings / Budget State
  const [budget, setBudget] = useState(0);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(0);

  // Form / Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Drag and Drop State
  const [draggedItemId, setDraggedItemId] = useState(null);

  // Simplified Form Data
  const [formData, setFormData] = useState({
    name: '',
    price: '', 
    category: CATEGORIES[0],
    room: ROOMS[0],
    priority: 'Medium',
    status: 'Planned',
    notes: '',
    url: ''
  });

  // Filters & Search
  const [filterRoom, setFilterRoom] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- Authentication & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        // If a custom token is available from the environment, use it first
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (error) {
        console.error("Auth failed:", error);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Stop loading once auth state is determined
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to Items - UPDATED to match 'moving_items' in security rules
    const itemsCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'moving_items');
    const q = query(itemsCollection);
    
    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemsData);
    }, (error) => {
      console.error("Error fetching items:", error);
    });

    // Listen to Settings
    const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBudget(data.budget || 0);
        setTempBudget(data.budget || 0);
      } else {
        // Only set if not exists, but catch error if permission denied (e.g. read-only)
        setDoc(settingsDocRef, { budget: 0 }).catch(e => console.log("Init budget settings error (likely permissions, ignore if read-only):", e));
      }
    }, (error) => {
        console.error("Error fetching settings:", error);
    });

    return () => {
      unsubscribeItems();
      unsubscribeSettings();
    };
  }, [user]);

  // --- Auth Handlers ---
  const handleLogin = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // --- Actions ---

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingItem) {
        // UPDATED: 'moving_items'
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', editingItem.id), payload);
      } else {
        // UPDATED: 'moving_items'
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'moving_items'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    if (!user || !itemId || !newStatus) return;
    try {
        // UPDATED: 'moving_items'
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', itemId), {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating status:", error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!user || !window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
    try {
      // UPDATED: 'moving_items'
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moving_items', itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleUpdateBudget = async () => {
    if (!user) return;
    try {
      const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general');
      await setDoc(settingsDocRef, { budget: parseFloat(tempBudget) }, { merge: true });
      setIsEditingBudget(false);
    } catch (error) {
      console.error("Error updating budget:", error);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: '',
      category: CATEGORIES[0],
      room: ROOMS[0],
      priority: 'Medium',
      status: 'Planned',
      notes: '',
      url: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price || '',
      category: item.category,
      room: item.room,
      priority: item.priority,
      status: item.status,
      notes: item.notes || '',
      url: item.url || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // --- Drag and Drop Handlers ---
  const onDragStart = (e, itemId) => {
    setDraggedItemId(itemId);
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (e, newStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) {
        await handleUpdateStatus(itemId, newStatus);
        setDraggedItemId(null);
    }
  };

  // --- Export Functions ---
  const handleExportCSV = () => {
    const headers = ["Name", "Room", "Category", "Price", "Status", "Priority", "Notes", "Link"];
    const rows = filteredItems.map(item => [
      `"${item.name.replace(/"/g, '""')}"`, 
      item.room,
      item.category,
      item.price,
      item.status,
      item.priority,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.url
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "moving_planner_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Metrics ---
  const metrics = useMemo(() => {
    const activeItems = items.filter(i => i.status !== 'Dropped');
    const boughtItems = items.filter(i => i.status === 'Bought');
    
    const totalPlannedCost = activeItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalSpent = boughtItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const remainingBudget = budget - totalSpent;
    
    const itemsByRoom = activeItems.reduce((acc, item) => {
      acc[item.room] = (acc[item.room] || 0) + 1;
      return acc;
    }, {});

    const costByRoom = activeItems.reduce((acc, item) => {
        acc[item.room] = (acc[item.room] || 0) + (item.price || 0);
        return acc;
    }, {});

    const highPriorityCount = activeItems.filter(i => i.priority === 'High' && i.status !== 'Bought').length;

    const roomData = Object.entries(costByRoom)
        .map(([room, value]) => ({ 
            label: room, 
            value, 
            color: '#6366f1' 
        }))
        .sort((a, b) => b.value - a.value);

    return { totalPlannedCost, totalSpent, remainingBudget, itemsByRoom, costByRoom, highPriorityCount, roomData };
  }, [items, budget]);

  const filteredItems = items.filter(item => {
    if (filterRoom !== 'All' && item.room !== filterRoom) return false;
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false; 
    return true;
  }).sort((a, b) => {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return 0; 
  });

  const groupedItems = useMemo(() => {
    if (filterRoom !== 'All') {
        return { [filterRoom]: filteredItems };
    }
    return filteredItems.reduce((groups, item) => {
      const group = item.room || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  }, [filteredItems, filterRoom]);

  const sortedGroups = Object.keys(groupedItems).sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // --- Render Login Page if not authenticated ---
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 md:pb-8 print:bg-white print:pb-0">
      
      {/* --- Top Navigation --- */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                <Home className="text-white h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700 tracking-tight">
                MovePlanner
              </h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-2">
              <button 
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><LayoutDashboard size={18}/> Dashboard</div>
              </button>
              <button 
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${view === 'list' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                 <div className="flex items-center gap-2"><List size={18}/> Items</div>
              </button>
              <button 
                onClick={() => setView('kanban')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${view === 'kanban' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                 <div className="flex items-center gap-2"><Columns size={18}/> Board</div>
              </button>
              
              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              <button 
                onClick={handleLogout}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Print Header (Visible only when printing) --- */}
      <div className="hidden print:block p-8 border-b border-gray-200 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Moving Plan</h1>
          <p className="text-gray-500">Total Planned: {formatCurrency(metrics.totalPlannedCost)} | Spent: {formatCurrency(metrics.totalSpent)}</p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0">
        
        {/* --- Dashboard View --- */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500 print:hidden">
            
            {/* Budget Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 rounded-3xl shadow-xl shadow-indigo-200/50 p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                      <h2 className="text-indigo-100 font-medium text-sm uppercase tracking-wider mb-1">Total Budget</h2>
                      {!isEditingBudget ? (
                        <div onClick={() => setIsEditingBudget(true)} className="flex items-end gap-2 cursor-pointer group">
                            <span className="text-4xl sm:text-5xl font-bold tracking-tight">{formatCurrency(budget)}</span>
                            <Edit2 size={16} className="mb-2 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                autoFocus
                                value={tempBudget} 
                                onChange={(e) => setTempBudget(e.target.value)}
                                className="text-4xl font-bold w-48 bg-transparent border-b-2 border-indigo-400 focus:outline-none text-white placeholder-white/30"
                            />
                            <button onClick={handleUpdateBudget} className="bg-white text-indigo-900 p-2 rounded-full hover:bg-indigo-50"><CheckCircle2 size={20}/></button>
                        </div>
                      )}
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                      <Wallet className="text-indigo-200" size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <div className="flex justify-between text-indigo-200 text-sm mb-2">
                      <span>Spent</span>
                      <span className="text-white font-semibold">{formatCurrency(metrics.totalSpent)}</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden">
                      <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${metrics.totalSpent > budget ? 'bg-rose-400' : 'bg-emerald-400'}`} 
                          style={{ width: `${Math.min((metrics.totalSpent / (budget || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-indigo-200 text-sm mb-2">
                      <span>Planned Total</span>
                      <span className="text-white font-semibold">{formatCurrency(metrics.totalPlannedCost)}</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden">
                      <div 
                          className="bg-indigo-400 h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min((metrics.totalPlannedCost / (budget || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {metrics.totalPlannedCost > budget && (
                    <div className="mt-6 flex items-start gap-3 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 p-4 rounded-xl text-rose-100 text-sm">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <span>Warning: Planned items exceed budget by <strong>{formatCurrency(metrics.totalPlannedCost - budget)}</strong>.</span>
                    </div>
                )}
              </div>
            </div>

            {/* Charts - Cost by Room */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                   <div className="flex items-center gap-2 mb-4">
                       <BarChart3 className="text-indigo-500" size={20} />
                       <h3 className="text-lg font-bold text-slate-800">Cost by Room</h3>
                   </div>
                   <SimpleBarChart data={metrics.roomData} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-auto relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <ShoppingBag size={80} className="text-indigo-600" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600"><ShoppingBag size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">To Buy</h3>
                </div>
                <div>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{metrics.itemsByRoom ? Object.values(metrics.itemsByRoom).reduce((a,b)=>a+b,0) : 0}</p>
                    <p className="text-[10px] text-slate-400">Total active items</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-auto relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <AlertCircle size={80} className="text-rose-600" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-rose-50 p-2 rounded-xl text-rose-600"><AlertCircle size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Priority</h3>
                </div>
                 <div>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{metrics.highPriorityCount}</p>
                    <p className="text-[10px] text-slate-400">High priority pending</p>
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-auto relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <IndianRupee size={80} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600"><IndianRupee size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Remaining</h3>
                </div>
                 <div>
                    <p className={`text-2xl md:text-3xl font-bold ${metrics.remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(metrics.remainingBudget)}
                    </p>
                    <p className="text-[10px] text-slate-400">Available to spend</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- List View --- */}
        {view === 'list' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Search and Filters */}
            <div className="space-y-3 print:hidden">
               <div className="relative">
                   <input 
                      type="text" 
                      placeholder="Search items..." 
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                   <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                   {searchTerm && (
                       <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">
                           <X size={18} />
                       </button>
                   )}
               </div>

               <div className="flex flex-col sm:flex-row gap-3 justify-between">
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="relative min-w-[140px]">
                            <select 
                                className="w-full appearance-none pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                value={filterRoom}
                                onChange={(e) => setFilterRoom(e.target.value)}
                            >
                                <option value="All">All Rooms</option>
                                {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <Filter className="absolute left-3.5 top-3 text-indigo-500" size={14} />
                        </div>
                        
                        <div className="relative min-w-[140px]">
                            <select 
                                className="w-full appearance-none pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <CheckCircle2 className="absolute left-3.5 top-3 text-indigo-500" size={14} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={handleExportCSV}
                            className="bg-white border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                        >
                            <FileSpreadsheet size={16}/> Export Excel/CSV
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="bg-white border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                        >
                            <Printer size={16}/> Save as PDF
                        </button>
                    </div>
               </div>
            </div>

            {/* Desktop Add Button */}
            <div className="hidden md:flex justify-end print:hidden">
                 <button 
                    onClick={openAddModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:scale-105"
                  >
                    <Plus size={18} /> Add New Item
                  </button>
            </div>

            {/* Grouped Items List */}
            <div className="space-y-8 print:space-y-6">
              {sortedGroups.map(roomName => (
                  <div key={roomName} className="animate-in fade-in duration-300 break-inside-avoid">
                      <div className="flex items-center gap-2 mb-3 px-1">
                          <h2 className="text-lg font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg inline-block print:bg-transparent print:p-0">
                              {roomName}
                          </h2>
                          <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full print:hidden">
                              {groupedItems[roomName].length}
                          </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 print:block print:gap-0">
                        {groupedItems[roomName].map(item => (
                            <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300 group print:shadow-none print:rounded-none print:border-b print:border-slate-200 print:mb-2 print:p-2">
                                <div className="flex flex-col sm:flex-row justify-between gap-4 print:flex-row">
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between sm:justify-start gap-2 mb-1">
                                            <h3 className={`font-bold text-lg leading-tight ${item.status === 'Dropped' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                {item.name}
                                            </h3>
                                            <div className="flex sm:hidden items-center gap-2 print:hidden">
                                                <StatusBadge status={item.status} />
                                            </div>
                                        </div>
                                        
                                        <div className="hidden sm:flex items-center gap-2 mb-3 print:flex print:mb-1">
                                            <StatusBadge status={item.status} />
                                            <PriorityBadge priority={item.priority} />
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-3 print:mb-1">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium print:bg-transparent print:p-0">
                                                <List size={12} /> {item.category}
                                            </span>
                                        </div>

                                        {item.notes && (
                                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100 leading-relaxed print:bg-transparent print:p-0 print:border-0 print:italic">
                                                {item.notes}
                                            </p>
                                        )}

                                        {item.url && (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline print:hidden">
                                                <ExternalLink size={14} /> View Product Link
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end gap-3 sm:gap-1 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 print:border-0">
                                        <div className="text-left sm:text-right print:text-right">
                                            <span className="block text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">{formatCurrency(item.price)}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 print:hidden">
                                            <button 
                                                onClick={() => openEditModal(item)}
                                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>
              ))}

              {filteredItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                      <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <ShoppingBag size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No items found matching criteria.</p>
                      <button onClick={openAddModal} className="mt-3 text-indigo-600 font-semibold hover:underline">Add your first item</button>
                  </div>
              )}
            </div>
          </div>
        )}

        {/* --- Kanban Board View --- */}
        {view === 'kanban' && (
            <div className="animate-in fade-in duration-500 h-[calc(100vh-140px)] overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-full w-max px-2">
                    {STATUSES.map(status => {
                        // Filter items for this column
                        const columnItems = filteredItems.filter(i => i.status === status);
                        const isColumnOver = false; // Could add drag-over visual state here if needed

                        return (
                            <div 
                                key={status}
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, status)}
                                className="w-80 flex-shrink-0 flex flex-col bg-slate-100 rounded-2xl border border-slate-200 h-full max-h-full"
                            >
                                {/* Column Header */}
                                <div className={`p-4 border-b border-slate-200 rounded-t-2xl bg-white sticky top-0 z-10 flex justify-between items-center
                                    ${status === 'Planned' ? 'border-t-4 border-t-slate-400' : ''}
                                    ${status === 'Shortlisted' ? 'border-t-4 border-t-purple-400' : ''}
                                    ${status === 'Bought' ? 'border-t-4 border-t-emerald-400' : ''}
                                    ${status === 'Dropped' ? 'border-t-4 border-t-rose-400' : ''}
                                `}>
                                    <h3 className="font-bold text-slate-700">{status}</h3>
                                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                                        {columnItems.length}
                                    </span>
                                </div>

                                {/* Column Content (Scrollable) */}
                                <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                                    {columnItems.map(item => (
                                        <div 
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, item.id)}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={`font-bold text-sm text-slate-800 ${item.status === 'Dropped' ? 'line-through text-slate-400' : ''}`}>
                                                    {item.name}
                                                </h4>
                                                <PriorityBadge priority={item.priority} />
                                            </div>
                                            
                                            <div className="text-lg font-bold text-slate-900 mb-2">
                                                {formatCurrency(item.price)}
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                                                    {item.room}
                                                </span>
                                                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                                                    {item.category}
                                                </span>
                                            </div>

                                            {/* Mobile Quick Move Actions (Visible on small screens or hover) */}
                                            <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEditModal(item)} className="text-slate-400 hover:text-indigo-600">
                                                        <Edit2 size={14}/>
                                                    </button>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-rose-600">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                                
                                                {/* Mobile dropdown to move items without drag */}
                                                <div className="relative group/move">
                                                    <button className="text-slate-400 hover:text-slate-600">
                                                        <GripHorizontal size={16} />
                                                    </button>
                                                    <select 
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        value={item.status}
                                                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                                    >
                                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {columnItems.length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                                            Drop items here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </main>
      
      {/* --- Mobile Bottom Nav --- */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl shadow-indigo-900/10 rounded-full flex justify-between items-center px-8 z-40 print:hidden">
           <button 
                onClick={() => setView('dashboard')} 
                className={`flex flex-col items-center gap-1 transition-colors ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <LayoutDashboard size={22} strokeWidth={view === 'dashboard' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Dash</span>
           </button>
           <button 
              onClick={openAddModal} 
              className="absolute left-1/2 -top-6 -translate-x-1/2 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-4 rounded-full shadow-lg shadow-indigo-300 border-[6px] border-slate-50 active:scale-95 transition-transform"
           >
              <Plus size={28} />
           </button>
           <button 
                onClick={() => setView('list')} 
                className={`flex flex-col items-center gap-1 transition-colors ${view === 'list' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <List size={22} strokeWidth={view === 'list' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Items</span>
           </button>
           <button 
                onClick={() => setView('kanban')} 
                className={`flex flex-col items-center gap-1 transition-colors ${view === 'kanban' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Columns size={22} strokeWidth={view === 'kanban' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Board</span>
           </button>
      </div>

      {/* --- Add/Edit Modal --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingItem ? "Edit Item" : "New Item"}
      >
        <form onSubmit={handleSaveItem} className="space-y-5">
            <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Item Name</label>
                <input 
                required
                type="text" 
                className="w-full rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                placeholder="e.g., Living Room TV"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Price (₹)</label>
                    <input 
                    type="number" 
                    min="0"
                    className="w-full rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                    placeholder="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Status</label>
                    <select 
                        className="w-full appearance-none rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Category</label>
                    <select 
                    className="w-full appearance-none rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Room</label>
                    <select 
                    className="w-full appearance-none rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.room}
                    onChange={e => setFormData({...formData, room: e.target.value})}
                    >
                        {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Priority</label>
                <div className="flex gap-2">
                {PRIORITIES.map(p => (
                    <label key={p} className={`flex-1 text-center cursor-pointer py-2.5 rounded-xl border-2 transition-all font-bold text-sm ${formData.priority === p ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                        <input 
                            type="radio" 
                            name="priority" 
                            value={p} 
                            checked={formData.priority === p}
                            onChange={e => setFormData({...formData, priority: e.target.value})}
                            className="hidden"
                        />
                        {p}
                    </label>
                ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Product Link</label>
                <input 
                type="url" 
                className="w-full rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                placeholder="https://..."
                value={formData.url}
                onChange={e => setFormData({...formData, url: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Notes</label>
                <textarea 
                className="w-full rounded-xl border-slate-200 border bg-slate-50 p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all min-h-[80px]"
                placeholder="Dimensions, ideas, etc..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                ></textarea>
            </div>

            <div className="pt-2 flex gap-3">
                <button 
                type="submit" 
                className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"
                >
                <Save size={18} /> Save Item
                </button>
                <button 
                type="button" 
                onClick={closeModal}
                className="px-6 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                Cancel
                </button>
            </div>
        </form>
      </Modal>

    </div>
  );
}
