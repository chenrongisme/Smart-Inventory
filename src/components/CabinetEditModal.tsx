import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CabinetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (name: string) => void;
  details: string;
  setDetails: (details: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
  title: string;
}

export const CabinetEditModal: React.FC<CabinetEditModalProps> = ({
  isOpen,
  onClose,
  name,
  setName,
  details,
  setDetails,
  onSubmit,
  onDelete,
  title,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
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
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
              <button onClick={onClose} className="p-1 text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder={t('Cabinet Name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm"
              />
              <textarea
                placeholder={t('Cabinet Details')}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm resize-none h-24"
              />
              
              <div className="flex gap-2">
                <button 
                  onClick={onDelete}
                  className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center active:scale-[0.95] transition-transform border border-red-100"
                >
                  <Trash2 size={24} />
                </button>
                <button 
                  onClick={onSubmit} 
                  className="flex-grow py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-[0.98] transition-transform"
                >
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
