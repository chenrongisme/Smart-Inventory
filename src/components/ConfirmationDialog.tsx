import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isDestructive = true,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative z-10 border border-gray-100"
          >
            <div className="flex flex-col items-center text-center">
              <div className={isDestructive ? "w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6" : "w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6"}>
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-8">
                {message}
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={onConfirm}
                  className={isDestructive 
                    ? "w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 active:scale-[0.98] transition-transform"
                    : "w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-[0.98] transition-transform"
                  }
                >
                  {confirmText || t('Confirm')}
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black active:scale-[0.98] transition-transform"
                >
                  {cancelText || t('Cancel')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
