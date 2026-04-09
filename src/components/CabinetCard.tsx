import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface CabinetCardProps {
  name: string;
  details?: string;
  image_url?: string | null;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  className?: string;
}

export const CabinetCard: React.FC<CabinetCardProps> = ({ name, details, image_url, onClick, onEdit, className }) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      layout
      className={cn("relative group", className)}
    >
      <button
        onClick={onClick}
        className="w-full bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
      >
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 shadow-inner">
          {image_url ? (
            <img src={image_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-300">
              <ChevronRight size={24} />
            </div>
          )}
        </div>
        
        <div className="flex-grow min-w-0 flex flex-col gap-1">
          <span className="font-black text-gray-900 text-lg truncate leading-tight">{name}</span>
          {details && (
            <span className="text-xs text-gray-400 font-medium truncate">{details}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </button>
    </motion.div>
  );
};
