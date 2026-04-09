import React, { useRef, useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Check, X, RotateCcw, Move } from 'lucide-react';

// Set wasm path to a stable CDN
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';

interface YOLODetectorProps {
  imageFile: File;
  onConfirm: (croppedImage: Blob) => void;
  onCancel: () => void;
}

// Config for YOLOv8n
const MODEL_SIZE = 640;
const OUTPUT_SIZE = 480;
const MODEL_URL = 'https://huggingface.co/antvis/yolov8n/resolve/main/yolov8n.onnx';

export const YOLODetector: React.FC<YOLODetectorProps> = ({ imageFile, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('正在加载识别模型...');
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragState, setDragState] = useState<{ type: string; startX: number; startY: number; startBox: any } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      runDetection(img);
    };
    img.src = URL.createObjectURL(imageFile);
  }, [imageFile]);

  const runDetection = async (img: HTMLImageElement) => {
    try {
      setStatus('模型就绪，正在分析图像...');
      // 1. Create ONNX Session
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });

      // 2. Pre-process image to 640x640
      const canvas = document.createElement('canvas');
      canvas.width = MODEL_SIZE;
      canvas.height = MODEL_SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, MODEL_SIZE, MODEL_SIZE);
      const imageData = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
      
      // Normalize to [0, 1] and [R, G, B] order
      const float32Data = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE);
      for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
        float32Data[i] = imageData.data[i * 4] / 255.0; // R
        float32Data[i + MODEL_SIZE * MODEL_SIZE] = imageData.data[i * 4 + 1] / 255.0; // G
        float32Data[i + 2 * MODEL_SIZE * MODEL_SIZE] = imageData.data[i * 4 + 2] / 255.0; // B
      }

      // 3. Inference
      const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, MODEL_SIZE, MODEL_SIZE]);
      const results = await session.run({ images: inputTensor });
      const output = results.output0.data as Float32Array; // shape [1, 84, 8400] usually or similar

      // 4. Post-process (Simplified YOLOv8 parsing)
      // v8 output: [84, 8400] -> [x_center, y_center, w, h, class0_score, ...]
      let maxScore = 0;
      let bestBox = { x: 0, y: 0, w: 0, h: 0 };
      
      // We only care about the most prominent object for auto-selection
      for (let i = 0; i < 8400; i++) {
        // Coords are first 4 rows
        const cx = output[i];
        const cy = output[8400 + i];
        const w = output[2 * 8400 + i];
        const h = output[3 * 8400 + i];
        
        // Find max class score from index 4 to 83
        let score = 0;
        for (let j = 4; j < 84; j++) {
            if (output[j * 8400 + i] > score) score = output[j * 8400 + i];
        }

        if (score > maxScore && score > 0.25) {
          maxScore = score;
          bestBox = {
            x: (cx - w / 2) / MODEL_SIZE,
            y: (cy - h / 2) / MODEL_SIZE,
            w: w / MODEL_SIZE,
            h: h / MODEL_SIZE
          };
        }
      }

      // Default to center crop if nothing found
      if (maxScore === 0) {
        setBox({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
      } else {
        // Pad the box a bit for better recognition
        const pad = 0.05;
        setBox({
          x: Math.max(0, bestBox.x - pad),
          y: Math.max(0, bestBox.y - pad),
          w: Math.min(1 - bestBox.x, bestBox.w + pad * 2),
          h: Math.min(1 - bestBox.y, bestBox.h + pad * 2)
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('YOLO Error:', err);
      // Fallback
      setBox({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: string) => {
    e.preventDefault();
    const pos = 'touches' in e ? e.touches[0] : e;
    setDragState({ type, startX: pos.clientX, startY: pos.clientY, startBox: { ...box } });
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!dragState || !containerRef.current) return;
    const pos = 'touches' in e ? e.touches[0] : (e as MouseEvent);
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (pos.clientX - dragState.startX) / rect.width;
    const dy = (pos.clientY - dragState.startY) / rect.height;

    let newBox = { ...dragState.startBox };

    if (dragState.type === 'move') {
      newBox.x = Math.max(0, Math.min(1 - newBox.w, dragState.startBox.x + dx));
      newBox.y = Math.max(0, Math.min(1 - newBox.h, dragState.startBox.y + dy));
    } else if (dragState.type === 'br') {
      newBox.w = Math.max(0.1, Math.min(1 - newBox.x, dragState.startBox.w + dx));
      newBox.h = Math.max(0.1, Math.min(1 - newBox.y, dragState.startBox.h + dy));
    } else if (dragState.type === 'tl') {
      const nw = Math.max(0.1, dragState.startBox.w - dx);
      const nh = Math.max(0.1, dragState.startBox.h - dy);
      newBox.x = dragState.startBox.x + (dragState.startBox.w - nw);
      newBox.y = dragState.startBox.y + (dragState.startBox.h - nh);
      newBox.w = nw;
      newBox.h = nh;
    }

    setBox(newBox);
  };

  const handleMouseUp = () => setDragState(null);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragState]);

  const handleConfirm = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;
    
    // Draw only the selected box area
    ctx.drawImage(
      image,
      box.x * image.width,
      box.y * image.height,
      box.w * image.width,
      box.h * image.height,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
    >
      <div className="w-full flex justify-between items-center mb-6">
        <button onClick={onCancel} className="p-3 bg-white/10 text-white rounded-full">
          <X size={24} />
        </button>
        <p className="text-white font-black text-sm uppercase tracking-widest">
          {loading ? '模型识别中...' : '调整选中区域'}
        </p>
        <button onClick={handleConfirm} disabled={loading} className="p-3 bg-blue-600 text-white rounded-full disabled:opacity-50">
          <Check size={24} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
      >
        {image && (
          <img 
            src={image.src} 
            className="w-full h-full object-contain pointer-events-none" 
            alt="To detect"
          />
        )}
        
        {!loading && (
          <div 
            className="absolute border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] z-20 cursor-move"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
            onTouchStart={(e) => handleMouseDown(e, 'move')}
          >
            {/* Corners */}
            <div 
              className="absolute -left-2 -top-2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full z-30 cursor-nw-resize shadow-sm" 
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'tl'); }}
              onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'tl'); }}
            />
            <div 
              className="absolute -right-2 -bottom-2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full z-30 cursor-se-resize shadow-sm" 
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'br'); }}
              onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'br'); }}
            />
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <Move className="text-white" size={32} />
            </div>
          </div>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-12 text-center"
            >
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-white font-black text-xs uppercase tracking-[0.2em]">{status}</p>
              <p className="text-white/40 text-[10px] mt-4 uppercase font-bold tracking-widest leading-loose">
                YOLOv8 WASM 正在计算<br/>物体特征与边框
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!loading && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-white/40">
            <Move size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">拖动边角调整，拖动中心移动</span>
          </div>
          <p className="text-white/60 text-center text-xs px-12 leading-relaxed">
            AI 已自动为您框选了识别出的主体。<br/>
            如需精确识别，请手动调整方框覆盖物品。
          </p>
        </div>
      )}
    </motion.div>
  );
};
