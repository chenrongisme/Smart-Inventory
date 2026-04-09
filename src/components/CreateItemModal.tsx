import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, Plus, Minus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';

interface CreateItemModalProps {
  cabinetId?: number;
  subCabinetId?: number;
  item?: Item;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({ cabinetId, subCabinetId, item, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(item?.name || '');
  const [details, setDetails] = useState(item?.details || '');
  const [quantity, setQuantity] = useState(item?.quantity || 0);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(item?.image_url || null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('details', details);
    formData.append('quantity', quantity.toString());
    if (cabinetId) formData.append('cabinet_id', cabinetId.toString());
    if (subCabinetId) formData.append('sub_cabinet_id', subCabinetId.toString());
    if (image) formData.append('image', image);

    try {
      const url = item ? `/api/items/${item.id}` : '/api/items';
      const method = item ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        body: formData,
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] pointer-events-auto"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white rounded-t-[32px] rounded-b-none p-6 pb-12 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] pointer-events-auto relative border border-gray-100"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-gray-900">{item ? t('Edit Item') : t('New Item')}</h2>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="relative w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden flex-shrink-0">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={24} className="text-gray-300" />
              )}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handleImageChange}
              />
            </label>
            
            <div className="flex-grow space-y-3">
              <input
                autoFocus
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                placeholder={t('Item Name')}
              />
              
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-grow text-center font-black text-lg">{quantity}</span>
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 active:scale-90 transition-transform"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <Info className="absolute left-3 top-3 text-gray-300" size={16} />
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full p-3 pl-10 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-sm min-h-[80px] resize-none"
              placeholder={t('Details')}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-[0.98] transition-transform"
          >
            {loading ? '...' : (item ? t('Save') : t('Create'))}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
