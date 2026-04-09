import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Package, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';

interface ItemDetailsModalProps {
  item: Item;
  onClose: () => void;
  onEdit: (item: Item) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, onClose, onEdit }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
        dragElastic={0.2}
        className="bg-white rounded-t-[32px] rounded-b-none w-full max-w-lg shadow-2xl pointer-events-auto relative border-t border-gray-100 overflow-hidden flex flex-col max-h-[90vh] pb-12"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 mt-4 flex-shrink-0" />
        {/* Header Image */}
        <div className="relative h-64 bg-gray-100 flex-shrink-0">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package size={64} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-1">{item.name}</h2>
              <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-xs">
                <Package size={14} />
                {t('Quantity')}: {item.quantity}
              </div>
            </div>
            <button 
              onClick={() => { onClose(); onEdit(item); }}
              className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <Edit2 size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Info size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">{t('Details')}</span>
              </div>
              <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                {item.details || t('No details')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 pt-0 mt-auto">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black active:scale-[0.98] transition-transform"
          >
            {t('Close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
