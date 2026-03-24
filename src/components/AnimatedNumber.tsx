import { motion, AnimatePresence } from 'framer-motion';

export default function AnimatedNumber({ number }) {
  return (
    // 外层容器必须是 overflow-hidden，防止数字滚动时溢出边界
    <div className="relative flex h-8 w-10 items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          // key 绑定到具体的数字上，数字一变，Framer 就会触发动画
          key={number}
          // 初始状态：在下方隐藏且透明
          initial={{ y: "100%", opacity: 0 }}
          // 动画状态：回到原位并完全不透明
          animate={{ y: "0%", opacity: 1 }}
          // 退出状态：向上方滚出并变透明
          exit={{ y: "-100%", opacity: 0 }}
          // 使用弹簧动画，让滚动更自然顺滑
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute text-lg font-bold tabular-nums"
        >
          {number}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}