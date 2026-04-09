import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Camera } from 'lucide-react';
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
  image: File | null;
  setImage: (file: File | null) => void;
  existingImageUrl?: string | null;
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
  image,
  setImage,
  existingImageUrl,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

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
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            dragElastic={0.2}
            className="bg-white rounded-t-[32px] rounded-b-none p-6 pb-12 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] pointer-events-auto relative border border-gray-100"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            
            <div className="flex flex-col items-center mb-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {image ? (
                  <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-full object-cover" />
                ) : existingImageUrl ? (
                  <img src={existingImageUrl} alt="Existing" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="text-gray-300 group-hover:text-blue-500 transition-colors" size={32} />
                    <span className="text-[10px] font-black text-gray-300 uppercase mt-1">Logo</span>
                  </>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
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
