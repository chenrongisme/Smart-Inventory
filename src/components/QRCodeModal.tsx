import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRCodeModalProps {
  url: string;
  name: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, name, onClose }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      const tempCanvas = document.createElement('canvas');
      const size = 1024; // High resolution for download
      tempCanvas.width = size;
      tempCanvas.height = size;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // Draw QR Code
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);
        
        // Draw white box in center
        const boxWidth = size * 0.3;
        const boxHeight = size * 0.1;
        const x = (size - boxWidth) / 2;
        const y = (size - boxHeight) / 2;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, boxWidth, boxHeight);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        
        // Draw text
        ctx.fillStyle = 'black';
        ctx.font = `bold ${Math.floor(size * 0.04)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Truncate name if too long
        const displayName = name.length > 10 ? name.slice(0, 8) + '...' : name;
        ctx.fillText(displayName, size / 2, size / 2);
        
        const dataUrl = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `qrcode-${name}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
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
        className="bg-white rounded-t-[32px] rounded-b-none p-8 pb-12 w-full max-w-lg shadow-2xl pointer-events-auto relative flex flex-col items-center border-t border-gray-100"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        
        <h2 className="text-2xl font-black mb-8 text-gray-900 text-center px-8">{name}</h2>
        
        <div className="relative group">
          <div ref={canvasRef} className="bg-white p-6 rounded-[32px] shadow-inner border border-gray-100">
            <QRCodeCanvas
              value={url}
              size={240}
              level="H"
              includeMargin={false}
            />
          </div>
          {/* Visual Overlay for UI only */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-white px-3 py-1.5 text-xs font-black text-black border-2 border-black rounded-lg max-w-[100px] truncate shadow-sm">
                {name}
             </div>
          </div>
        </div>

        <p className="mt-6 text-center text-gray-400 text-sm font-medium px-4">
          {t('Scan to view cabinet contents')}
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={downloadQR}
          className="mt-8 w-full py-5 bg-blue-600 text-white rounded-[24px] font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:bg-blue-700 transition-colors"
        >
          <Download size={22} />
          {t('Download QR Code')}
        </motion.button>
      </motion.div>
    </div>
  );
};
