import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface CabinetCardProps {
  name: string;
  details?: string;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  className?: string;
}

export const CabinetCard: React.FC<CabinetCardProps> = ({ name, details, onClick, onEdit, className }) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      layout
      className={cn("relative group", className)}
    >
      <button
        onClick={onClick}
        className="w-full bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform text-left"
      >
        <div className="flex flex-col gap-1 min-w-0 pr-4">
          <span className="font-black text-gray-900 text-lg truncate leading-tight">{name}</span>
          {details && (
            <span className="text-xs text-gray-400 font-medium truncate">{details}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
            <ChevronRight size={20} />
          </div>
        </div>
      </button>
    </motion.div>
  );
};
