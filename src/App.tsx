import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, History, QrCode, Settings, Home, LogOut, Plus, ChevronRight, ArrowLeft, Menu, X, Edit2, Download, Upload, ShieldAlert, ShieldCheck, Trash2, Users, BarChart3, Package, Sparkles, Camera, ClipboardList, AlertCircle, Clock, Database } from 'lucide-react';
import iconUrl from './image/icon.png';
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
import { WheelPicker } from './components/WheelPicker';
import { YOLODetector } from './components/YOLODetector';
import './i18n';

const LOCATION_OPTIONS = ['客厅', '餐厅', '厨房', '主卧', '次卧', '书房', '储物间', '地下室', '自定义'];

// --- Components ---
const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <motion.div 
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group cursor-pointer"
  >
    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-2", color)}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="absolute -right-2 -top-2 opacity-5 group-hover:scale-110 transition-transform">
      <Icon size={80} />
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  </motion.div>
);

// --- Auth Page ---
const AuthPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then(res => res.json())
      .then(data => setTotalUsers(data.totalUsers));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { username, password } : { username, password, security_question: question, security_answer: answer };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        if (isLogin) {
          onLogin(data.user);
        } else {
          toast.success('注册成功，请登录');
          if (data.role === 'superadmin') {
            toast.success('您已成为超级管理员');
          }
          setIsLogin(true);
          setUsername('');
          setPassword('');
        }
      } else {
        toast.error(data.error || '操作失败');
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
        body: JSON.stringify({ username }),
        credentials: 'include',
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
        body: JSON.stringify({ username, answer, newPassword: password }),
        credentials: 'include',
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-3 mb-2">
          <img src={iconUrl} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm" />
          <h1 className="text-3xl font-black text-gray-900">存趣储物</h1>
        </div>
        <p className="text-gray-500 mb-8">{isRecovering ? t('Recover Password') : (isLogin ? t('Login') : t('Register'))}</p>

        {totalUsers === 0 && !isRecovering && (
          <div className="mb-6 p-5 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl text-white shadow-xl shadow-purple-100 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="font-black text-lg leading-tight">系统待初始化</p>
                <p className="text-white/80 text-[10px] font-bold mt-1">目前暂无用户。首个注册账号将自动设为【超级管理员】并拥有全站管理权限。</p>
              </div>
            </div>
            {isLogin && (
              <button 
                onClick={() => setIsLogin(false)}
                className="w-full mt-4 py-3 bg-white text-purple-600 rounded-xl font-black text-xs active:scale-95 transition-transform"
              >
                立即去创建管理员账号
              </button>
            )}
          </div>
        )}

        <form onSubmit={isRecovering ? handleRecover : handleAuth} className="space-y-4">
          <input
            required
            type="text"
            placeholder={t('Username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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

        {totalUsers === 0 && isLogin && !isRecovering && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button 
              onClick={() => setIsLogin(false)}
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-100 active:scale-95 transition-transform"
            >
              <ShieldCheck size={20} />
              初始化超级管理员
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-3">
              当前系统没有任何用户，请点击上方按钮创建管理员账号
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 text-center">
          {!isRecovering ? (
            <>
              {!(totalUsers === 0 && isLogin) && (
                <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 font-medium">
                  {isLogin ? t('Register') : t('Login')}
                </button>
              )}
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
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'ai' | 'location' | 'settings' | 'admin' | 'cabinet' | 'sub'>('home');
  const [loading, setLoading] = useState(true);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [cabinetImage, setCabinetImage] = useState<File | null>(null);
  const [subImage, setSubImage] = useState<File | null>(null);
  const [editCabinetImage, setEditCabinetImage] = useState<File | null>(null);
  const [editSubImage, setEditSubImage] = useState<File | null>(null);
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
  const [newCabinetName, setNewCabinetName] = useState(LOCATION_OPTIONS[0]);
  const [newCabinetDetails, setNewCabinetDetails] = useState('');
  const [newCabinetType, setNewCabinetType] = useState<'direct' | 'group'>('group');
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
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
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
    if (parts[0] === 'cabinet') {
      if (parts[1] === 'sub' && parts[2]) {
        fetchSubAndItems(parseInt(parts[2]));
      } else if (parts[1]) {
        fetchCabinetAndSubs(parseInt(parts[1]));
      }
    } else if (parts[0] === 'ai') setView('ai');
    else if (parts[0] === 'location') setView('location');
    else if (parts[0] === 'settings') setView('settings');
    else if (parts[0] === 'admin') setView('admin');
    else {
      setView('home');
      setSelectedCabinet(null);
      setSelectedSub(null);
    }
  };

  const fetchCabinetAndSubs = async (id: number) => {
    try {
      const res = await fetch(`/api/cabinets/${id}`, { credentials: 'include' });
      if (res.ok) {
        const cabinet = await res.json();
        setSelectedCabinet(cabinet);
        setView('cabinet');
      }
    } catch (e) {}
  };

  const fetchSubAndItems = async (id: number) => {
    try {
      const res = await fetch(`/api/subs/${id}`, { credentials: 'include' });
      if (res.ok) {
        const sub = await res.json();
        setSelectedSub(sub);
        const cabRes = await fetch(`/api/cabinets/${sub.cabinet_id}`, { credentials: 'include' });
        if (cabRes.ok) setSelectedCabinet(await cabRes.json());
        setView('sub');
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const allParam = showAllData ? '?all=true' : '';
      const allParamAnd = showAllData ? '&all=true' : '';

      if (view === 'home') {
        const [statsRes, histRes] = await Promise.all([
          fetch('/api/dashboard/stats', { credentials: 'include' }),
          fetch('/api/history', { credentials: 'include' })
        ]);
        if (statsRes.ok) setDashboardStats(await statsRes.json());
        if (histRes.ok) setHistory(await histRes.json());
      } else if (view === 'location') {
        const res = await fetch(`/api/cabinets${allParam}`, { credentials: 'include' });
        if (res.ok) setCabinets(await res.json());
      } else if (view === 'cabinet' && selectedCabinet) {
        const res = await fetch(`/api/cabinets/${selectedCabinet.id}/subs`, { credentials: 'include' });
        if (res.ok) setSubs(await res.json());
      } else if (view === 'sub' && selectedSub) {
        const res = await fetch(`/api/items?sub_cabinet_id=${selectedSub.id}${allParamAnd}`, { credentials: 'include' });
        if (res.ok) setItems(await res.json());
      }
    } catch (err) {
      console.error('Data fetch error:', err);
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
      const res = await fetch(`/api/items/${deleteItemId}`, { method: 'DELETE', credentials: 'include' });
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
      credentials: 'include',
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
      credentials: 'include',
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
      credentials: 'include',
    });
    if (res.ok) {
      toast.success(t('Success'));
      fetchData();
    }
  };

  const handleCreateCabinet = async () => {
    const formData = new FormData();
    formData.append('name', newCabinetName);
    formData.append('details', newCabinetDetails);
    formData.append('type', newCabinetType);
    if (cabinetImage) formData.append('image', cabinetImage);

    const res = await fetch('/api/cabinets', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowCreateCabinet(false);
      setNewCabinetName('');
      setNewCabinetDetails('');
      setCabinetImage(null);
      fetchData();
    }
  };

  const handleCreateSub = async () => {
    if (!selectedCabinet) return;
    const formData = new FormData();
    formData.append('name', newSubName);
    formData.append('details', newSubDetails);
    if (subImage) formData.append('image', subImage);

    const res = await fetch(`/api/cabinets/${selectedCabinet.id}/subs`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowCreateSub(false);
      setNewSubName('');
      setNewSubDetails('');
      setSubImage(null);
      fetchData();
    }
  };

  const handleUpdateCabinet = async () => {
    if (!editingCabinet) return;
    const formData = new FormData();
    formData.append('name', editName);
    formData.append('details', editDetails);
    if (editCabinetImage) formData.append('image', editCabinetImage);

    const res = await fetch(`/api/cabinets/${editingCabinet.id}`, {
      method: 'PUT',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowEditCabinet(false);
      setEditName('');
      setEditDetails('');
      setEditCabinetImage(null);
      setEditingCabinet(null);
      fetchData();
    }
  };

  const handleUpdateSub = async () => {
    if (!editingSub) return;
    const formData = new FormData();
    formData.append('name', editName);
    formData.append('details', editDetails);
    if (editSubImage) formData.append('image', editSubImage);

    const res = await fetch(`/api/subs/${editingSub.id}`, {
      method: 'PUT',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      toast.success(t('Success'));
      setShowEditSub(false);
      setEditName('');
      setEditDetails('');
      setEditSubImage(null);
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
      const res = await fetch(`/api/cabinets/${deleteCabinetId}`, { method: 'DELETE', credentials: 'include' });
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
      const res = await fetch(`/api/subs/${deleteSubId}`, { method: 'DELETE', credentials: 'include' });
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
      const res = await fetch('/api/user/factory-reset', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        toast.success(t('Success'));
        window.location.reload();
      }
    } else {
      toast.error(t('Error'));
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup', { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      toast.success(t('Success'));
    } catch (e) {
      toast.error(t('Error'));
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(t('Are you sure?') + '\n' + t('This will permanently delete all your cabinets, items, and history. This action cannot be undone.'))) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('backup', file);

    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(t('Success'));
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || t('Error'));
      }
    } catch (e) {
      toast.error(t('Error'));
    }
    
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setView('home');
    setSelectedCabinet(null);
    setSelectedSub(null);
    window.history.pushState({}, '', '/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <AuthPage onLogin={setUser} />;

  // Context-Aware FAB Logic
  const getFABAction = () => {
    if (view === 'home' || view === 'ai') return () => setView('ai');
    if (view === 'location') return () => { 
      setNewCabinetName(LOCATION_OPTIONS[0]); 
      setShowCreateCabinet(true); 
    };
    if (view === 'cabinet') return () => setShowCreateSub(true);
    if (view === 'sub') return () => setShowCreateItem(true);
    return null;
  };

  const getFABIcon = () => {
    if (view === 'home' || view === 'ai') return <Sparkles size={32} />;
    return <Plus size={32} />;
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
          {view === 'home' && (
            <img src={iconUrl} alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
          )}
          <h1 className="text-xl font-black text-gray-900 truncate">
            {view === 'home' ? '存趣储物' : (selectedSub?.name || selectedCabinet?.name || t(view.charAt(0).toUpperCase() + view.slice(1)))}
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
              <div className="space-y-6 pb-6">
                {/* 4x4 Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard title="总物品数量" value={dashboardStats?.totalItems || 0} icon={Database} color="bg-blue-600" />
                  <StatCard title="位置数量" value={dashboardStats?.totalLocations || 0} icon={Package} color="bg-purple-600" />
                  <StatCard title="余量不足" value={dashboardStats?.lowStockCount || 0} icon={AlertCircle} color="bg-orange-600" />
                  <StatCard title="即将到期" value={dashboardStats?.expiringSoonCount || 0} icon={Clock} color="bg-red-600" />
                </div>

                {/* Search Card */}
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSearch(true)}
                  className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-blue-100 flex items-center justify-between text-white cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                      <Search size={28} />
                    </div>
                    <div>
                      <p className="font-black text-xl">搜索物品</p>
                      <p className="text-white/70 text-[10px] mt-0.5 uppercase tracking-wider font-bold">快速查找您的储物位置</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-white/50" />
                </motion.div>

                {/* Recent History */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">最近活动记录</h2>
                  </div>
                  <div className="space-y-2">
                    {history && history.length > 0 ? history.slice(0, 8).map((h, idx) => (
                      <div key={`hist-${h.id}-${idx}`} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm", (h.quantity_change || 0) > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                            {(h.quantity_change || 0) > 0 ? <Download size={20} /> : <Upload size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{h.item_name || '未知物品'}</p>
                            <p className="text-[10px] text-gray-400 mt-1.5 uppercase font-black tracking-tighter">
                              {h.cabinet_name}{h.sub_name ? ` > ${h.sub_name}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className={cn("font-black text-lg", (h.quantity_change || 0) > 0 ? "text-green-500" : "text-red-500")}>
                          {(h.quantity_change || 0) > 0 ? '+' : ''}{h.quantity_change || 0}
                        </div>
                      </div>
                    )) : (
                      <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <History size={32} className="mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">暂无记录</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === 'ai' && <AIAssistant onSuccess={() => { setView('home'); fetchData(); }} cabinets={cabinets} />}

            {view === 'location' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">所有位置</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {cabinets.map((c, idx) => (
                    <CabinetCard
                      key={`home-cab-${c.id}-${idx}`}
                      name={c.name}
                      details={c.details}
                      image_url={c.image_url}
                      onClick={() => handleCabinetClick(c)}
                      onEdit={(e) => { e.stopPropagation(); setEditingCabinet(c); setShowEditCabinet(true); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === 'cabinet' && selectedCabinet && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">储物柜列表</h2>
                  </div>
                  {subs.map((s, idx) => (
                    <CabinetCard
                      key={`cab-${selectedCabinet.id}-sub-${s.id}-${idx}`}
                      name={s.name}
                      details={s.details}
                      image_url={s.image_url}
                      onClick={() => handleSubClick(s)}
                      onEdit={(e) => { e.stopPropagation(); setEditingSub(s); setShowEditSub(true); }}
                    />
                  ))}
                  {subs.length === 0 && <p className="text-center text-gray-400 py-12">此位置暂无储物柜</p>}
                </div>
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
                    <div key={`history-log-${h.id || idx}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{h.item_name || t('Unknown Item')}</p>
                          <p className="text-xs text-gray-400">{h.timestamp ? new Date(h.timestamp).toLocaleString() : '-'}</p>
                        </div>
                        <div className={cn("font-black text-lg", (h.quantity_change || 0) > 0 ? "text-green-500" : "text-red-500")}>
                          {(h.quantity_change || 0) > 0 ? '+' : ''}{h.quantity_change || 0}
                        </div>
                      </div>
                      {(h.cabinet_name || h.sub_name) && (
                        <div className="absolute top-4 right-4 flex flex-col items-end">
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {h.cabinet_name}{h.sub_name ? ` > ${h.sub_name}` : ''}
                          </span>
                        </div>
                      )}
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

                  <div className="pt-4 border-t border-gray-50 space-y-3">
                    <button 
                      onClick={() => {
                        const oldP = prompt('请输入旧密码');
                        const newP = prompt('请输入新密码');
                        if (oldP && newP) {
                          fetch('/api/auth/change-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ oldPassword: oldP, newPassword: newP })
                          }).then(res => {
                            if (res.ok) toast.success('密码修改成功');
                            else toast.error('修改失败，请检查旧密码');
                          });
                        }
                      }}
                      className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      修改密码
                    </button>

                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <button 
                        onClick={() => setView('admin')}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-transform"
                      >
                        <ShieldCheck size={20} />
                        {t('Admin Dashboard')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <h2 className="font-bold text-gray-900 mb-4">{t('Backup Data')}</h2>
                  <div className="space-y-3">
                    <button 
                      onClick={handleBackup}
                      className="w-full py-4 bg-green-50 text-green-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <Download size={20} />
                      {t('Export to ZIP')}
                    </button>
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".zip"
                        onChange={handleRestore}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <button 
                        className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold flex items-center justify-center gap-2 group-active:scale-95 transition-transform"
                      >
                        <Upload size={20} />
                        {t('Import from ZIP')}
                      </button>
                    </div>
                  </div>
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

                <button 
                  onClick={handleLogout}
                  className="w-full py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <LogOut size={20} />
                  退出登录
                </button>
              </div>
            )}

            {view === 'admin' && user && (
              <AdminDashboard 
                user={user}
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
          <Settings size={22} />
          <span className="text-[10px] font-black uppercase tracking-tighter">{t('Settings')}</span>
        </button>
        <button 
          onClick={() => { setView('ai'); window.history.pushState({}, '', '/ai'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'ai' ? "text-blue-600" : "text-gray-400")}
        >
          <Sparkles size={22} />
          <span className="text-[10px] font-black uppercase tracking-tighter">AI 助手</span>
        </button>
        <button 
          onClick={() => { setView('home'); window.history.pushState({}, '', '/'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'home' ? "text-blue-600" : "text-gray-400")}
        >
          <Home size={22} />
          <span className="text-[10px] font-black uppercase tracking-tighter">{t('Home')}</span>
        </button>
        <button 
          onClick={() => { setView('location'); window.history.pushState({}, '', '/location'); }} 
          className={cn("flex flex-col items-center gap-1", view === 'location' ? "text-blue-600" : "text-gray-400")}
        >
          <Package size={22} />
          <span className="text-[10px] font-black uppercase tracking-tighter">位置</span>
        </button>
        <button 
          onClick={handleBack} 
          className="flex flex-col items-center gap-1 text-gray-400 active:scale-90 transition-transform"
        >
          <ArrowLeft size={22} />
          <span className="text-[10px] font-black uppercase tracking-tighter">{t('Back')}</span>
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
            {getFABIcon()}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showSearch && (
          <SearchOverlay 
            onClose={() => setShowSearch(false)}
            onSelect={(item: Item) => {
              if (item.sub_cabinet_id) fetchSubAndItems(item.sub_cabinet_id);
              else if (item.cabinet_id) fetchCabinetAndSubs(item.cabinet_id);
              setShowSearch(false);
            }}
          />
        )}

        {showCreateItem && (
          <CreateItemModal 
            cabinetId={selectedCabinet?.id}
            subCabinetId={selectedSub?.id}
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
          image={cabinetImage}
          setImage={setCabinetImage}
          options={LOCATION_OPTIONS}
        />

        <CreateSubModal 
          isOpen={showCreateSub}
          onClose={() => setShowCreateSub(false)}
          name={newSubName}
          setName={setNewSubName}
          details={newSubDetails}
          setDetails={setNewSubDetails}
          onSubmit={handleCreateSub}
          image={subImage}
          setImage={setSubImage}
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
          title={t('Edit Location')}
          image={editCabinetImage}
          setImage={setEditCabinetImage}
          existingImageUrl={editingCabinet?.image_url}
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
          title={t('Edit Cabinet')}
          image={editSubImage}
          setImage={setEditSubImage}
          existingImageUrl={editingSub?.image_url}
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
          title={t('Delete Location')}
          message={t('Delete location and all contents?')}
        />

        <ConfirmationDialog
          isOpen={showDeleteSubConfirm}
          onClose={() => setShowDeleteSubConfirm(false)}
          onConfirm={confirmDeleteSub}
          title={t('Delete Cabinet')}
          message={t('Delete cabinet and all contents?')}
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

// --- New Components ---

const SearchOverlay = ({ onClose, onSelect }: any) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);

  useEffect(() => {
    if (query.trim()) {
      fetch(`/api/items?search=${query}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setResults(Array.isArray(data) ? data : []));
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-white flex flex-col"
    >
      <div className="p-6 border-b border-gray-100 flex items-center gap-4">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索物品名称或详情..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {results.map((item, idx) => (
          <ItemCard 
            key={`search-res-${item.id}-${idx}`}
            item={item}
            onShowDetails={() => onSelect(item)}
            readOnly={true}
          />
        ))}
        {query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search size={48} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">未找到相关物品</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AIAssistant = ({ onSuccess, cabinets }: { onSuccess: () => void, cabinets: Cabinet[] }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState<number | null>(null);
  const [relevantCabinets, setRelevantCabinets] = useState<SubCabinet[]>([]);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [showYOLO, setShowYOLO] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      setShowYOLO(true);
    }
  };

  const handleAI = async (input: Blob | string) => {
    setShowYOLO(false);
    setLoading(true);
    const formData = new FormData();
    if (typeof input === 'string') {
      formData.append('text', input.trim());
    } else {
      formData.append('image', input, 'cropped.jpg');
    }
    
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        const location = cabinets.find(c => c.name.includes(data.suggestLocation) || data.suggestLocation.includes(c.name));
        if (location) {
          const subsRes = await fetch(`/api/cabinets/${location.id}/subs`, { credentials: 'include' });
          const subs = await subsRes.json();
          setRelevantCabinets(subs);
          if (subs.length > 0) setSelectedCabinetId(subs[0].id);
        }
        setShowConfirm(true);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('AI 分析失败');
    } finally {
      setLoading(false);
      setTextInput('');
    }
  };

  const handleAction = async (finalAction: 'store' | 'take') => {
    if (!result) return;
    
    if (finalAction === 'take') {
      const searchRes = await fetch(`/api/items?search=${result.itemName}`, { credentials: 'include' });
      const items = await searchRes.json();
      const item = items[0];
      if (item) {
        await fetch(`/api/items/${item.id}/quantity`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ change: -1 }),
          credentials: 'include',
        });
        toast.success(`已取出 ${result.itemName}`);
        onSuccess();
      } else {
        toast.error('未找到该物品，无法取出');
      }
      return;
    }

    if (!selectedCabinetId) return;
    const formData = new FormData();
    formData.append('name', result.itemName);
    formData.append('sub_cabinet_id', selectedCabinetId.toString());
    formData.append('quantity', '1');

    const res = await fetch('/api/items', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    if (res.ok) {
      toast.success(`已存入 ${result.itemName}`);
      onSuccess();
    }
  };

  return (
    <div className="space-y-6">
      {showYOLO && capturedFile && (
        <YOLODetector 
          imageFile={capturedFile} 
          onConfirm={handleAI} 
          onCancel={() => setShowYOLO(false)} 
        />
      )}

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="font-black text-xl text-gray-900">AI 智能助手</h2>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none mt-1">语音或拍照识别意图</p>
          </div>
        </div>

        <div className="relative group">
          <input 
            autoFocus
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && textInput.trim() && handleAI(textInput)}
            placeholder="试试说：把苹果放进厨房柜子..."
            className="w-full pl-6 pr-16 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-all"
          />
          <button 
            onClick={() => textInput.trim() && handleAI(textInput)}
            disabled={!textInput.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-90 transition-transform disabled:opacity-50"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="h-px bg-gray-100 flex-1" />
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">或者</span>
          <div className="h-px bg-gray-100 flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-50 text-blue-600 rounded-3xl cursor-pointer active:scale-95 transition-transform border border-blue-100 group">
            <Camera size={32} className="group-hover:scale-110 transition-transform" />
            <span className="font-black text-xs">物品识别</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileSelect} />
          </label>
          <label className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-50 text-purple-600 rounded-3xl cursor-pointer active:scale-95 transition-transform border border-purple-100 group">
            <ClipboardList size={32} className="group-hover:scale-110 transition-transform" />
            <span className="font-black text-xs">订单识别</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
          </label>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">正在识别...</p>
          </motion.div>
        )}

        {showConfirm && result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">识别结果</p>
                <h3 className="text-2xl font-black text-gray-900">{result.itemName}</h3>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl font-black text-sm uppercase",
                result.action === 'take' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              )}>
                {result.action === 'take' ? '取出' : '放回'}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">建议位置</span>
                <span className="bg-white px-3 py-1 rounded-xl shadow-sm text-[10px] font-black text-blue-600 uppercase border border-blue-50">{result.suggestLocation}</span>
              </div>
              
              {result.action === 'store' && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">目标柜子</p>
                  {relevantCabinets.length > 0 ? (
                    <WheelPicker 
                      options={relevantCabinets.map(c => c.name)}
                      value={relevantCabinets.find(c => c.id === selectedCabinetId)?.name || ''}
                      onChange={(val) => setSelectedCabinetId(relevantCabinets.find(c => c.name === val)?.id || null)}
                      height={120}
                    />
                  ) : (
                    <p className="text-[10px] text-orange-500 font-bold p-4 bg-orange-50 rounded-2xl text-center leading-relaxed">
                      在该位置下未找到柜子，请先在“位置”页面创建。
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 bg-gray-100 text-gray-400 rounded-2xl font-black active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                disabled={result.action === 'store' && !selectedCabinetId}
                onClick={() => handleAction(result.action)}
                className="py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-transform disabled:opacity-50"
              >
                确认{result.action === 'take' ? '取出' : '放回'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = ({ user: currentUser, onClose, showAllData, onToggleAllData }: { user: User, onClose: () => void, showAllData: boolean, onToggleAllData: () => void }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'ai'>('stats');
  const [aiSettings, setAiSettings] = useState<any>({
    ai_model_type: '',
    ai_api_key: '',
    ai_endpoint: '',
    ai_model_name: ''
  });

  const fetchUsers = () => fetch('/api/admin/users').then(res => res.json()).then(setUsers);
  const fetchStats = () => fetch('/api/admin/stats').then(res => res.json()).then(setStats);
  const fetchAiSettings = () => fetch('/api/admin/settings').then(res => res.json()).then(setAiSettings);

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchAiSettings();
  }, []);

  const handleSaveAiSettings = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: aiSettings }),
    });
    if (res.ok) toast.success(t('Success'));
    else toast.error(t('Error'));
  };

  const handleResetPassword = async (userId: number) => {
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

  const handleToggleStatus = async (user: User) => {
    if (currentUser.role !== 'superadmin') return toast.error('仅超级管理员可操作');
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const res = await fetch(`/api/admin/users/${user.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(t('Success'));
      fetchUsers();
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (currentUser.role !== 'superadmin') return toast.error('仅超级管理员可操作');
    if (user.role === 'superadmin') return toast.error('不能删除超级管理员');
    
    if (confirm(t('Are you sure?') + `\n删除用户 "${user.username}" 将同时清空其所有数据且不可恢复。`)) {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('Success'));
        fetchUsers();
        fetchStats();
      }
    }
  };

  const handleSystemBackup = async () => {
    if (currentUser.role !== 'superadmin') return toast.error('仅超级管理员可操作');
    try {
      const res = await fetch('/api/admin/backup-all');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `full_system_backup_${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        toast.success(t('Success'));
      }
    } catch (e) {
      toast.error(t('Error'));
    }
  };

  const handleGlobalReset = async () => {
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-gray-900">系统管理中心</h2>
        </div>
        {currentUser.role === 'superadmin' && (
          <button 
            onClick={handleSystemBackup}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform"
          >
            <Download size={16} />
            系统全量备份
          </button>
        )}
      </div>

      <div className="flex p-1 bg-gray-100 rounded-2xl">
        <button 
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'stats' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
          )}
        >
          <BarChart3 size={18} />
          使用统计
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'ai' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
          )}
        >
          <Sparkles size={18} />
          AI 配置
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'users' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
          )}
        >
          <Users size={18} />
          用户管理
        </button>
      </div>

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              大模型全局配置
            </h3>
            <p className="text-xs text-gray-400">配置后将覆盖环境变量，立即生效。支持 Minimax、Gemini 等主流模型。</p>
            
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">模型类型 (Model Type)</label>
                <select 
                  value={aiSettings.ai_model_type} 
                  onChange={e => setAiSettings({...aiSettings, ai_model_type: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">跟随环境变量</option>
                  <option value="minimax">Minimax (推荐)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="doubao">字节跳动 豆包</option>
                  <option value="qwen">阿里 通义千问</option>
                  <option value="ernie">百度 文心一言</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">API Key</label>
                <input 
                  type="password"
                  placeholder="输入大模型 API Key"
                  value={aiSettings.ai_api_key}
                  onChange={e => setAiSettings({...aiSettings, ai_api_key: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">自定义 Endpoint (可选)</label>
                <input 
                  type="text"
                  placeholder="例如: https://api.minimax.chat/v1/..."
                  value={aiSettings.ai_endpoint}
                  onChange={e => setAiSettings({...aiSettings, ai_endpoint: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">模型名称 (Model Name)</label>
                <input 
                  type="text"
                  placeholder="例如: abab6.5s-chat 或 MiniMax-VL-01"
                  value={aiSettings.ai_model_name}
                  onChange={e => setAiSettings({...aiSettings, ai_model_name: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <button 
                onClick={handleSaveAiSettings}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">总用户</p>
              <p className="text-2xl font-black text-blue-600">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">总柜子</p>
              <p className="text-2xl font-black text-purple-600">{stats.totalCabinets}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">总物品</p>
              <p className="text-2xl font-black text-orange-600">{stats.totalItems}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-400 uppercase tracking-wider">
              各用户使用明细
            </div>
            <div className="divide-y divide-gray-50">
              {stats.userBreakdown.map((ub: any, idx: number) => (
                <div key={`stat-user-${idx}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{ub.username}</span>
                    <span className="text-[10px] text-gray-400">活跃用户</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400">柜子</p>
                      <p className="font-black text-sm">{ub.cabinets}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400">物品</p>
                      <p className="font-black text-sm">{ub.items}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-3xl border border-blue-100 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ShieldCheck size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-blue-900 text-sm">全局数据访问</span>
                <span className="text-[10px] text-blue-600">允许管理员查看所有用户的柜子和物品</span>
              </div>
            </div>
            <button 
              onClick={onToggleAllData}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-200",
                showAllData ? "bg-blue-600" : "bg-gray-300"
              )}
            >
              <motion.div 
                animate={{ x: showAllData ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          <button 
            onClick={handleGlobalReset}
            className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            全站数据重置 (危险操作)
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-400 uppercase tracking-wider flex justify-between">
            <span>用户列表</span>
            <span>操作</span>
          </div>
          <div className="divide-y divide-gray-50">
            {users.map((u, idx) => (
              <div key={`admin-user-${u.id}-${idx}`} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{u.username}</p>
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter",
                        u.role === 'superadmin' ? "bg-purple-600 text-white" : (u.role === 'admin' ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600")
                      )}>
                        {u.role === 'superadmin' ? '超级管理员' : (u.role === 'admin' ? '管理员' : '普通用户')}
                      </span>
                      {u.status === 'blocked' && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                          已封禁
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">用户 ID: {u.id}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleResetPassword(u.id)}
                      className="p-2.5 bg-gray-100 text-gray-600 rounded-xl active:scale-90 transition-transform"
                      title="重置密码"
                    >
                      <Edit2 size={14} />
                    </button>
                    {currentUser.role === 'superadmin' && u.role !== 'superadmin' && (
                      <>
                        <button 
                          onClick={() => handleToggleStatus(u)}
                          className={cn(
                            "p-2.5 rounded-xl active:scale-90 transition-transform",
                            u.status === 'blocked' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                          )}
                          title={u.status === 'blocked' ? '解封' : '封禁'}
                        >
                          {u.status === 'blocked' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u)}
                          className="p-2.5 bg-red-100 text-red-600 rounded-xl active:scale-90 transition-transform"
                          title="删除用户"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
