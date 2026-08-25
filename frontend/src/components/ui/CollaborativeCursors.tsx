import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CURSORS = [
  { id: 1, name: 'Eng Khalid', color: '#10B981', initX: 100, initY: 100 },
  { id: 2, name: 'Dr. Sarah', color: '#F59E0B', initX: 400, initY: 300 },
  { id: 3, name: 'Student Admin', color: '#6366F1', initX: 700, initY: 200 }
];

export function CollaborativeCursors() {
  const [positions, setPositions] = useState(
    CURSORS.reduce((acc, cursor) => ({ ...acc, [cursor.id]: { x: cursor.initX, y: cursor.initY } }), {} as Record<number, {x: number, y: number}>)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const numKey = parseInt(key);
          // random movement
          const dx = (Math.random() - 0.5) * 150;
          const dy = (Math.random() - 0.5) * 150;
          next[numKey] = {
            x: Math.max(50, Math.min(window.innerWidth - 150, prev[numKey].x + dx)),
            y: Math.max(50, Math.min(window.innerHeight - 150, prev[numKey].y + dy))
          };
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {CURSORS.map(cursor => (
          <motion.div
            key={cursor.id}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1, 
              x: positions[cursor.id].x, 
              y: positions[cursor.id].y 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="absolute flex items-start flex-col drop-shadow-xl"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color} xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.5L20 10.5L13.5 13.5L16.5 20.5L12 21.5L9 14.5L3.5 17L5.5 3.5Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <div 
              className="px-2 py-1 ml-4 mt-1 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
