import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, MapPin, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { WheelPicker } from './WheelPicker';

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
  image: File | null;
  setImage: (file: File | null) => void;
  options: string[];
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
  image,
  setImage,
  options
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (name === '自定义') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [name]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleFinalSubmit = () => {
    if (isCustom) {
      if (!customName.trim()) return;
      setName(customName);
    }
    onSubmit();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none p-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[4px] pointer-events-auto"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-t-[3rem] p-8 pb-12 w-full max-w-lg shadow-[0_-20px_50px_rgba(0,0,0,0.1)] pointer-events-auto relative border border-gray-100"
          >
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
            
            <div className="flex flex-col items-center mb-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-blue-500 hover:bg-blue-50"
              >
                {image ? (
                  <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="text-gray-300 group-hover:text-blue-500 transition-colors" size={32} />
                    <span className="text-[10px] font-black text-gray-300 uppercase mt-2 tracking-widest group-hover:text-blue-400">选择封面</span>
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

            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-blue-600" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">选择位置名称</h3>
                </div>
                
                <WheelPicker 
                  options={options}
                  value={isCustom ? '自定义' : name}
                  onChange={setName}
                  height={160}
                />

                <AnimatePresence>
                  {isCustom && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-4"
                    >
                      <div className="relative">
                        <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          autoFocus
                          type="text"
                          placeholder="请输入自定义位置名称..."
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">位置备注 (可选)</h3>
                <textarea
                  placeholder="添加更多细节..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm resize-none h-24"
                />
              </div>

              <button 
                onClick={handleFinalSubmit} 
                className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 active:scale-[0.98] transition-all text-lg"
              >
                确认创建位置
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
