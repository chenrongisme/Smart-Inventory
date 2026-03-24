import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import { cn } from '../lib/utils';
import AnimatedNumber from './AnimatedNumber'; // 引入组件

interface ItemCardProps {
  item: Item;
  onStore: (id: number) => void;
  onTake: (id: number) => void;
  onEdit?: (item: Item) => void;
  onDelete?: (id: number) => void;
  onShowDetails?: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onStore, onTake, onEdit, onDelete, onShowDetails }) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-3 active:scale-[0.99] transition-transform"
    >
      {/* Left: Circular Image */}
      <div 
        onClick={() => onShowDetails?.(item)}
        className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 shadow-inner cursor-pointer"
      >
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold uppercase">
            No Img
          </div>
        )}
      </div>

      {/* Middle: Info */}
      <div 
        onClick={() => onShowDetails?.(item)}
        className="flex-grow min-w-0 cursor-pointer"
      >
        <h3 className="font-black text-gray-900 truncate text-lg leading-tight">{item.name}</h3>
        <p className="text-xs text-gray-400 truncate font-medium mb-1">{item.details || t('No details')}</p>
      <div className="flex items-center gap-1.5 bg-blue-50 w-fit px-3 py-1 rounded-full">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
            {t('Quantity')}
          </span>
          
          {/* 这里是修改后的滚动数字容器 */}
          <div className="relative flex h-5 items-center justify-center overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={item.quantity}
                // 改成 y 轴上下移动，实现滚动效果
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                // 加入 tabular-nums 保证数字等宽，min-w-[2ch] 保证宽度不会因为个位数和十位数切换而塌陷
                className="text-sm font-black text-blue-600 min-w-[2ch] text-center tabular-nums inline-block"
              >
                {item.quantity}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2"> 
        <div className="flex flex-col gap-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onStore(item.id); }}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-100 active:bg-blue-700"
            aria-label={t('Store')}
          >
            <Plus size={20} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onTake(item.id); }}
            className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center active:bg-gray-200"
            aria-label={t('Take')}
          >
            <Minus size={20} />
          </motion.button>
        </div>
        
        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="p-2 text-gray-300 hover:text-red-600 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
