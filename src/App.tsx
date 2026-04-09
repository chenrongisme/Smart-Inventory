import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, History, QrCode, Settings, Home, LogOut, Plus, ChevronRight, ArrowLeft, Menu, X, Edit2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { User, Cabinet, SubCabinet, Item, HistoryLog } from './types';
import { cn } from './lib/utils';
import { ItemCard } from './components/ItemCard';
import { CreateItemModal } from './components/CreateItemModal';
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { QRCodeModal } from './components/QRCodeModal';
import { CreateCabinetModal } from './components/CreateCabinetModal';
import { CreateSubModal } from './components/CreateSubModal';
import { CabinetCard } from './components/CabinetCard';
import { CabinetEditModal } from './components/CabinetEditModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import './i18n';
const AuthPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: email, 2: answer

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, security_question: question, security_answer: answer };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        if (isLogin) {
          // Handle deep linking redirect
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get('redirect');
          
          if (redirect) {
            window.location.href = redirect;
          } else {
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/cabinet')) {
              // We are already on the deep link path, just notify the parent app
              onLogin(data.user);
            } else {
              onLogin(data.user);
            }
          }
        } else {
          toast.success(t('Success'));
          setIsLogin(true);
        }
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error(t('Error'));
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryStep === 1) {
      const res = await fetch('/api/auth/recover-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuestion(data.question);
        setRecoveryStep(2);
      } else toast.error(data.error);
    } else {
      const res = await fetch('/api/auth/recover-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answer, newPassword: password }),
      });
      if (res.ok) {
        toast.success(t('Success'));
        setIsRecovering(false);
        setRecoveryStep(1);
      } else toast.error(t('Error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
      >
        <h1 className="text-3xl font-black text-gray-900 mb-2">Smart Inventory</h1>
        <p className="text-gray-500 mb-8">{isRecovering ? t('Recover Password') : (isLogin ? t('Login') : t('Register'))}</p>

        <form onSubmit={isRecovering ? handleRecover : handleAuth} className="space-y-4">
          <input
            required
            type="email"
            placeholder={t('Email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
          />
          
          {(!isRecovering || recoveryStep === 2) && (
            <input
              required
              type="password"
              placeholder={isRecovering ? t('New Password') : t('Password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
            />
          )}

          {!isLogin && !isRecovering && (
            <>
              <input
                required
                type="text"
                placeholder={t('Security Question')}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
              />
              <input
                required
                type="text"
                placeholder={t('Security Answer')}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          {isRecovering && recoveryStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">{question}</p>
              <input
                required
                type="text"
                placeholder={t('Security Answer')}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-transform">
            {isRecovering ? (recoveryStep === 1 ? t('Next') : t('Submit')) : (isLogin ? t('Login') : t('Register'))}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center">
          {!isRecovering ? (
            <>
              <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 font-medium">
                {isLogin ? t('Register') : t('Login')}
              </button>
              <button onClick={() => setIsRecovering(true)} className="text-sm text-gray-400">
                {t('Recover Password')}
              </button>
            </>
          ) : (
            <button onClick={() => { setIsRecovering(false); setRecoveryStep(1); }} className="text-sm text-gray-400">
              {t('Cancel')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const { t, i18n } = useTranslation();
  // Set a dummy user to bypass auth
  const [user, setUser] = useState<User | null>({ id: 1, email: 'local@app', role: 'admin' });
  const [view, setView] = useState<'home' | 'history' | 'search' | 'settings' | 'admin' | 'cabinet' | 'sub'>('home');
  const [loading, setLoading] = useState(false); // No more initial loading for auth check
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubCabinet | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [subs, setSubs] = useState<SubCabinet[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showCreateCabinet, setShowCreateCabinet] = useState(false);
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [newCabinetName, setNewCabinetName] = useState('');
  const [newCabinetDetails, setNewCabinetDetails] = useState('');
  const [newCabinetType, setNewCabinetType] = useState<'direct' | 'group'>('direct');
  const [newSubName, setNewSubName] = useState('');
  const [newSubDetails, setNewSubDetails] = useState('');
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
  const [editingSub, setEditingSub] = useState<SubCabinet | null>(null);
  const [showEditCabinet, setShowEditCabinet] = useState(false);
  const [showEditSub, setShowEditSub] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteCabinetId, setDeleteCabinetId] = useState<number | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCabinetConfirm, setShowDeleteCabinetConfirm] = useState(false);
  const [showDeleteSubConfirm, setShowDeleteSubConfirm] = useState(false);

  const [showAllData, setShowAllData] = useState(false);

  useEffect(() => {
    // We can just rely on initial state now
    handleDeepLink();
    
    const handlePopState = () => {
      handleDeepLink();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (user) {
      handleDeepLink();
    }
  }, [user]);

  const handleDeepLink = () => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    // Support: /cabinet/:id or /cabinet/sub/:id
    if (parts[0] === 'cabinet') {
      if (parts[1] === 'sub' && parts[2]) {
        const id = parseInt(parts[2]);
        fetchSubAndItems(id);
      } else if (parts[1]) {
        const id = parseInt(parts[1]);
        fetchCabinetAndSubs(id);
      }
    } else if (parts[0] === 'history') {
      setView('history');
    } else if (parts[0] === 'search') {
      setView('search');
    } else if (parts[0] === 'settings') {
      setView('settings');
    } else if (parts[0] === 'admin') {
      setView('admin');
    } else {
      setView('home');
      setSelectedCabinet(null);
      setSelectedSub(null);
    }
  };

  const fetchCabinetAndSubs = async (id: number) => {
    try {
      const res = await fetch(`/api/cabinets/${id}`);
      if (res.ok) {
        const cabinet = await res.json();
        setSelectedCabinet(cabinet);
        setView('cabinet');
      }
    } catch (e) {}
  };

  const fetchSubAndItems = async (id: number) => {
    try {
      const res = await fetch(`/api/subs/${id}`);
      if (res.ok) {
        const sub = await res.json();
        setSelectedSub(sub);
        
        // Also fetch the parent cabinet to ensure correct navigation and context
        const cabRes = await fetch(`/api/cabinets/${sub.cabinet_id}`);
        if (cabRes.ok) {
          const cabinet = await cabRes.json();
          setSelectedCabinet(cabinet);
        }
        
        setView('sub');
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    if (!user) return;
    const allParam = showAllData ? '?all=true' : '';
    const allParamAnd = showAllData ? '&all=true' : '';

    if (view === 'home') {
      const res = await fetch(`/api/cabinets${allParam}`, { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setCabinets(data);
    } else if (view === 'cabinet' && selectedCabinet) {
      if (selectedCabinet.type === 'direct') {
        const res = await fetch(`/api/items?cabinet_id=${selectedCabinet.id}${allParamAnd}`, { credentials: 'include' });
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
      } else {
        const res = await fetch(`/api/cabinets/${selectedCabinet.id}/subs`, { credentials: 'include' });
        const data = await res.json();
        if (Array.isArray(data)) setSubs(data);
      }
    } else if (view === 'sub' && selectedSub) {
      const res = await fetch(`/api/items?sub_cabinet_id=${selectedSub.id}${allParamAnd}`, { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } else if (view === 'history') {
      const res = await fetch('/api/history', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } else if (view === 'search') {
      const res = await fetch(`/api/items?search=${searchQuery}${allParamAnd}`, { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    }
  };

  const handleCabinetClick = (cabinet: Cabinet) => {
    setSelectedCabinet(cabinet);
    setSelectedSub(null); // Clear sub when entering a cabinet
    setView('cabinet');
    window.history.pushState({}, '', `/cabinet/${cabinet.id}`);
  };

  const handleSubClick = (sub: SubCabinet) => {
    setSelectedSub(sub);
    setView('sub');
    window.history.pushState({}, '', `/cabinet/sub/${sub.id}`);
  };

  const handleBack = () => {
    if (view === 'sub') {
      setView('cabinet');
      setSelectedSub(null);
      window.history.pushState({}, '', `/cabinet/${selectedCabinet?.id}`);
    } else if (view === 'cabinet' || view === 'history' || view === 'search' || view === 'settings' || view === 'admin') {
      setView('home');
      setSelectedCabinet(null);
      setSelectedSub(null);
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    fetchData();
  }, [view, user, selectedCabinet, selectedSub, searchQuery, showAllData]);

  useEffect(() => {
    if (editingCabinet) {
      setEditName(editingCabinet.name);
      setEditDetails(editingCabinet.details || '');
    }
    if (editingSub) {
      setEditName(editingSub.name);
      setEditDetails(editingSub.details || '');
    }
  }, [editingCabinet, editingSub]);

  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const handleDeleteItem = async (id: number) => {
    setDeleteItemId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId) return;
    try {
      const res = await fetch(`/api/items/${deleteItemId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('Success'));
        setShowDeleteConfirm(false);
        setDeleteItemId(null);
        fetchData();
      } else {
        toast.error(t('Error'));
      }
    } catch (err) {
      toast.error(t('Error'));
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowCreateItem(true);
  };

  const handleStore = async (id: number) => {
    const res = await fetch(`/api/items/${id}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: 1 }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      fetchData();
    }
  };

  const handleTake = async (id: number) => {
    const res = await fetch(`/api/items/${id}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: -1 }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      fetchData();
    }
  };

  const handleSetQuantity = async (id: number, value: number) => {
    const res = await fetch(`/api/items/${id}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      fetchData();
    }
  };

  const handleCreateCabinet = async () => {
    const res = await fetch('/api/cabinets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCabinetName, details: newCabinetDetails, type: newCabinetType }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowCreateCabinet(false);
      setNewCabinetName('');
      setNewCabinetDetails('');
      fetchData();
    }
  };

  const handleCreateSub = async () => {
    if (!selectedCabinet) return;
    const res = await fetch(`/api/cabinets/${selectedCabinet.id}/subs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubName, details: newSubDetails }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowCreateSub(false);
      setNewSubName('');
      setNewSubDetails('');
      fetchData();
    }
  };

  const handleUpdateCabinet = async () => {
    if (!editingCabinet) return;
    const res = await fetch(`/api/cabinets/${editingCabinet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, details: editDetails }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowEditCabinet(false);
      setEditName('');
      setEditDetails('');
      setEditingCabinet(null);
      fetchData();
    }
  };

  const handleUpdateSub = async () => {
    if (!editingSub) return;
    const res = await fetch(`/api/subs/${editingSub.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, details: editDetails }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowEditSub(false);
      setEditName('');
      setEditDetails('');
      setEditingSub(null);
      fetchData();
    }
  };

  const handleDeleteCabinet = async () => {
    if (!editingCabinet) return;
    setDeleteCabinetId(editingCabinet.id);
    setShowDeleteCabinetConfirm(true);
  };

  const confirmDeleteCabinet = async () => {
    if (!deleteCabinetId) return;
    try {
      const res = await fetch(`/api/cabinets/${deleteCabinetId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('Success'));
        setShowDeleteCabinetConfirm(false);
        setShowEditCabinet(false);
        setDeleteCabinetId(null);
        setEditingCabinet(null);
        setView('home');
        window.history.pushState({}, '', '/');
        fetchData();
      } else {
        toast.error(t('Error'));
      }
    } catch (err) {
      toast.error(t('Error'));
    }
  };

  const handleDeleteSub = async () => {
    if (!editingSub) return;
    setDeleteSubId(editingSub.id);
    setShowDeleteSubConfirm(true);
  };

  const confirmDeleteSub = async () => {
    if (!deleteSubId) return;
    try {
      const res = await fetch(`/api/subs/${deleteSubId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('Success'));
        setShowDeleteSubConfirm(false);
        setShowEditSub(false);
        setDeleteSubId(null);
        setEditingSub(null);
        fetchData();
      } else {
        toast.error(t('Error'));
      }
    } catch (err) {
      toast.error(t('Error'));
    }
  };

  const handleFactoryReset = async () => {
    const n1 = Math.floor(Math.random() * 50);
    const n2 = Math.floor(Math.random() * 50);
    const ans = prompt(t('Math Challenge', { problem: `${n1} + ${n2}` }));
    if (parseInt(ans || '') === n1 + n2) {
      const res = await fetch('/api/user/factory-reset', { method: 'POST' });
      if (res.ok) {
        toast.success(t('Success'));
        window.location.reload();
      }
    } else {
      toast.error(t('Error'));
    }
  };

  const handleLogout = async () => {
    // Just reset everything local
    setUser({ id: 1, email: 'local@app', role: 'admin' });
    setView('home');
    setSelectedCabinet(null);
    setSelectedSub(null);
    window.history.pushState({}, '', '/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading User...</div>;

  // Context-Aware FAB Logic
  const getFABAction = () => {
    if (view === 'home') return () => setShowCreateCabinet(true);
    if (view === 'cabinet' && selectedCabinet?.type === 'group') return () => setShowCreateSub(true);
    if ((view === 'cabinet' && selectedCabinet?.type === 'direct') || view === 'sub') return () => setShowCreateItem(true);
    return null;
  };

  const fabAction = getFABAction();

  return (
    <div className="min-h-screen bg-gray-50 pb-24 overflow-x-hidden">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            borderRadius: '99px',
            padding: '8px 16px',
            fontSize: '14px',
            border: 'none',
            textAlign: 'center',
            width: 'fit-content',
            minWidth: 'auto',
            margin: '0 auto',
          },
        }}
      />
      
      {/* Top Nav - Simplified */}
      <header className="bg-white px-6 py-4 sticky top-0 z-40 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-gray-900 truncate">
            {view === 'home' ? 'Smart Inventory' : (selectedSub?.name || selectedCabinet?.name || t(view.charAt(0).toUpperCase() + view.slice(1)))}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          {(view === 'cabinet' || view === 'sub') && (
            <button onClick={() => setShowQR(true)} className="p-2 text-gray-600 active:scale-90 transition-transform">
              <QrCode size={24} />
            </button>
          )}
        </div>
      </header>

      <main className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (selectedCabinet?.id || '') + (selectedSub?.id || '')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {view === 'home' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('Cabinet')}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {cabinets.map((c, idx) => (
                    <CabinetCard
                      key={`home-cab-${c.id}-${idx}`}
                      name={c.name}
                      details={c.details}
                      onClick={() => handleCabinetClick(c)}
                      onEdit={(e) => { e.stopPropagation(); setEditingCabinet(c); setShowEditCabinet(true); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === 'cabinet' && selectedCabinet && (
              <div className="space-y-4">
                {selectedCabinet.type === 'direct' ? (
                  <div className="space-y-3">
                    {items.length === 0 && <p className="text-center text-gray-400 py-12">{t('No items found')}</p>}
                    {items.map((item, idx) => (
                      <ItemCard 
                        key={`cab-${selectedCabinet.id}-item-${item.id}-${idx}`} 
                        item={item} 
                        onStore={handleStore} 
                        onTake={handleTake} 
                        onSetQuantity={handleSetQuantity}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                        onShowDetails={(item) => { setSelectedItemForDetails(item); setShowItemDetails(true); }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('Small Cabinet')}</h2>
                    </div>
                    {subs.map((s, idx) => (
                      <CabinetCard
                        key={`cab-${selectedCabinet.id}-sub-${s.id}-${idx}`}
                        name={s.name}
                        details={s.details}
                        onClick={() => handleSubClick(s)}
                        onEdit={(e) => { e.stopPropagation(); setEditingSub(s); setShowEditSub(true); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'sub' && selectedSub && (
              <div className="space-y-3">
                {items.length === 0 && <p className="text-center text-gray-400 py-12">{t('No items found')}</p>}
                {items.map((item, idx) => (
                  <ItemCard 
                    key={`sub-${selectedSub.id}-item-${item.id}-${idx}`} 
                    item={item} 
                    onStore={handleStore} 
                    onTake={handleTake} 
                    onSetQuantity={handleSetQuantity}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onShowDetails={(item) => { setSelectedItemForDetails(item); setShowItemDetails(true); }}
                  />
                ))}
              </div>
            )}

            {view === 'history' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('Recent Actions')}</h2>
                <div className="space-y-3">
                  {history && history.length > 0 ? history.map((h, idx) => (
                    <div key={`history-log-${h.id || idx}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{h.item_name || t('Unknown Item')}</p>
                        <p className="text-xs text-gray-400">{h.timestamp ? new Date(h.timestamp).toLocaleString() : '-'}</p>
                      </div>
                      <div className={cn("font-black", (h.quantity_change || 0) > 0 ? "text-green-500" : "text-red-500")}>
                        {(h.quantity_change || 0) > 0 ? '+' : ''}{h.quantity_change || 0}
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-gray-400 py-12">{t('No history found')}</p>
                  )}
                </div>
              </div>
            )}

            {view === 'search' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500"
                    placeholder={t('Search')}
                  />
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <ItemCard 
                      key={`search-${searchQuery}-item-${item.id}-${idx}`} 
                      item={item} 
                      onStore={handleStore} 
                      onTake={handleTake} 
                      onSetQuantity={handleSetQuantity}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onShowDetails={(item) => { 
                        if (item.sub_cabinet_id) {
                          fetchSubAndItems(item.sub_cabinet_id);
                          window.history.pushState({}, '', `/cabinet/sub/${item.sub_cabinet_id}`);
                        } else if (item.cabinet_id) {
                          fetchCabinetAndSubs(item.cabinet_id);
                          window.history.pushState({}, '', `/cabinet/${item.cabinet_id}`);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <h2 className="font-bold text-gray-900 mb-4">{t('Settings')}</h2>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Language / 语言</span>
                    <select 
                      value={i18n.language} 
                      onChange={(e) => i18n.changeLanguage(e.target.value)}
                      className="bg-gray-50 border-none rounded-xl p-2 text-sm font-medium"
                    >
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-sm text-gray-400 mb-2">{t('Email')}</p>
                    <p className="font-bold text-gray-900">{user.email}</p>
                  </div>

                  {user.role === 'admin' && (
                    <button 
                      onClick={() => setView('admin')}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      <Settings size={20} />
                      {t('Admin Dashboard')}
                    </button>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 bg-gray-100 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut size={20} />
                    {t('Logout')}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
                  <h3 className="text-red-600 font-bold mb-4">{t('Erase My Data')}</h3>
                  <p className="text-sm text-gray-400 mb-6">This will permanently delete all your cabinets, items, and history. This action cannot be undone.</p>
                  <button 
                    onClick={handleFactoryReset}
                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    {t('Erase My Data')}
                  </button>
                </div>
              </div>
            )}

            {view === 'admin' && (
              <AdminDashboard 
                onClose={() => setView('settings')} 
                showAllData={showAllData}
                onToggleAllData={() => setShowAllData(!showAllData)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-6 py-3 flex justify-between items-center z-40">
        <button 
          onClick={() => { setView('settings'); window.history.pushState({}, '', '/settings'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'settings' ? "text-blue-600" : "text-gray-400")}
        >
          <Settings size={24} />
          <span className="text-[10px] font-bold">{t('Settings')}</span>
        </button>
        <button 
          onClick={() => { setView('history'); window.history.pushState({}, '', '/history'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'history' ? "text-blue-600" : "text-gray-400")}
        >
          <History size={24} />
          <span className="text-[10px] font-bold">{t('History')}</span>
        </button>
        <button 
          onClick={() => { setView('home'); window.history.pushState({}, '', '/'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'home' ? "text-blue-600" : "text-gray-400")}
        >
          <Home size={24} />
          <span className="text-[10px] font-bold">{t('Home')}</span>
        </button>
        <button 
          onClick={() => { setView('search'); window.history.pushState({}, '', '/search'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'search' ? "text-blue-600" : "text-gray-400")}
        >
          <Search size={24} />
          <span className="text-[10px] font-bold">{t('Search')}</span>
        </button>
        <button 
          onClick={handleBack} 
          className="flex flex-col items-center gap-1 text-gray-400 active:scale-90 transition-transform"
        >
          <ArrowLeft size={24} />
          <span className="text-[10px] font-bold">{t('Back')}</span>
        </button>
      </nav>

      {/* Context-Aware FAB */}
      <AnimatePresence>
        {fabAction && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={fabAction}
            className="fixed bottom-20 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-200 flex items-center justify-center z-50"
          >
            <Plus size={32} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateItem && (
          <CreateItemModal 
            cabinetId={selectedCabinet?.type === 'direct' ? selectedCabinet.id : undefined}
            subCabinetId={view === 'sub' ? selectedSub?.id : undefined}
            item={editingItem || undefined}
            onClose={() => { setShowCreateItem(false); setEditingItem(null); }}
            onSuccess={fetchData}
          />
        )}

        <CreateCabinetModal 
          isOpen={showCreateCabinet}
          onClose={() => setShowCreateCabinet(false)}
          name={newCabinetName}
          setName={setNewCabinetName}
          details={newCabinetDetails}
          setDetails={setNewCabinetDetails}
          type={newCabinetType}
          setType={setNewCabinetType}
          onSubmit={handleCreateCabinet}
        />

        <CreateSubModal 
          isOpen={showCreateSub}
          onClose={() => setShowCreateSub(false)}
          name={newSubName}
          setName={setNewSubName}
          details={newSubDetails}
          setDetails={setNewSubDetails}
          onSubmit={handleCreateSub}
        />

        <CabinetEditModal
          isOpen={showEditCabinet}
          onClose={() => setShowEditCabinet(false)}
          name={editName}
          setName={setEditName}
          details={editDetails}
          setDetails={setEditDetails}
          onSubmit={handleUpdateCabinet}
          onDelete={handleDeleteCabinet}
          title={t('Edit Cabinet')}
        />

        <CabinetEditModal
          isOpen={showEditSub}
          onClose={() => setShowEditSub(false)}
          name={editName}
          setName={setEditName}
          details={editDetails}
          setDetails={setEditDetails}
          onSubmit={handleUpdateSub}
          onDelete={handleDeleteSub}
          title={t('Edit Small Cabinet')}
        />

        {showQR && (
          <QRCodeModal 
            url={window.location.href}
            name={selectedSub?.name || selectedCabinet?.name || ''}
            onClose={() => setShowQR(false)}
          />
        )}

        <ConfirmationDialog 
          isOpen={showDeleteConfirm}
          title={t('Delete Item')}
          message={t('Are you sure you want to delete this item permanently?')}
          onConfirm={confirmDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeleteItemId(null); }}
          confirmText={t('Delete')}
          isDestructive={true}
        />

        <ConfirmationDialog
          isOpen={showDeleteCabinetConfirm}
          onClose={() => setShowDeleteCabinetConfirm(false)}
          onConfirm={confirmDeleteCabinet}
          title={t('Delete Cabinet')}
          message={t('Delete cabinet and all contents?')}
        />

        <ConfirmationDialog
          isOpen={showDeleteSubConfirm}
          onClose={() => setShowDeleteSubConfirm(false)}
          onConfirm={confirmDeleteSub}
          title={t('Delete Small Cabinet')}
          message={t('Delete small cabinet and all contents?')}
        />

        {showItemDetails && selectedItemForDetails && (
          <ItemDetailsModal 
            item={selectedItemForDetails}
            onClose={() => { setShowItemDetails(false); setSelectedItemForDetails(null); }}
            onEdit={handleEditItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const AdminDashboard = ({ onClose, showAllData, onToggleAllData }: { onClose: () => void, showAllData: boolean, onToggleAllData: () => void }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users').then(res => res.json()).then(setUsers);
  }, []);

  const handleReset = async (userId: number) => {
    const newPass = prompt(t('New Password'));
    if (newPass) {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: newPass }),
      });
      if (res.ok) toast.success(t('Success'));
    }
  };

  const handleFactoryReset = async () => {
    if (confirm(t('Are you sure you want to factory reset? This will delete ALL data except the admin user.'))) {
      const res = await fetch('/api/user/factory-reset', { method: 'POST' });
      if (res.ok) {
        toast.success(t('Success'));
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-gray-900">{t('Admin Dashboard')}</h2>
        </div>
        <button 
          onClick={handleFactoryReset}
          className="text-xs font-bold text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100"
        >
          {t('Factory Reset')}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{t('View All Data')}</span>
          <span className="text-xs text-gray-400">{t('Access all users cabinets and items')}</span>
        </div>
        <button 
          onClick={onToggleAllData}
          className={cn(
            "w-12 h-6 rounded-full relative transition-colors duration-200",
            showAllData ? "bg-blue-600" : "bg-gray-200"
          )}
        >
          <motion.div 
            animate={{ x: showAllData ? 24 : 4 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
          />
        </button>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-400 uppercase tracking-wider">
          {t('User List')}
        </div>
        <div className="divide-y divide-gray-50">
          {users.map((u, idx) => (
            <div key={`admin-user-${u.id}-${idx}`} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{u.email}</p>
                <p className="text-xs text-gray-400">{u.role}</p>
              </div>
              <button 
                onClick={() => handleReset(u.id)}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl"
              >
                {t('Reset Password')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
