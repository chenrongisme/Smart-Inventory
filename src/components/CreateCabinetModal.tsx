import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CreateCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (name: string) => void;
  details: string;
  setDetails: (details: string) => void;
  type: 'direct' | 'group';
  setType: (type: 'direct' | 'group') => void;
  onSubmit: () => void;
}

export const CreateCabinetModal: React.FC<CreateCabinetModalProps> = ({
  isOpen,
  onClose,
  name,
  setName,
  details,
  setDetails,
  type,
  setType,
  onSubmit,
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
              <h2 className="text-lg font-black text-gray-900">{t('Create Cabinet')}</h2>
              <button onClick={onClose} className="p-1 text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                autoFocus
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
                  onClick={() => setType('direct')}
                  className={cn("flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all", type === 'direct' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-100 text-gray-400")}
                >
                  {t('Direct Storage')}
                </button>
                <button 
                  onClick={() => setType('group')}
                  className={cn("flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all", type === 'group' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-100 text-gray-400")}
                >
                  {t('Nested Group')}
                </button>
              </div>
              <button 
                onClick={onSubmit} 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-[0.98] transition-transform"
              >
                {t('Create')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
