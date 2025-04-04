// components/ToneSelector.tsx
import { FC } from 'react';
import { Mail, Smile, Coffee, BookOpen, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface ToneSelectorProps {
  selectedTone: string;
  onSelectTone: (tone: string) => void;
}

const toneOptions = [
  { icon: <Mail className="w-6 h-6" />, label: 'Professional', value: 'professional' },
  { icon: <Smile className="w-6 h-6" />, label: 'Funny', value: 'funny' },
  { icon: <Coffee className="w-6 h-6" />, label: 'Casual', value: 'casual' },
  { icon: <BookOpen className="w-6 h-6" />, label: 'Storytelling', value: 'storytelling' },
  { icon: <Megaphone className="w-6 h-6" />, label: 'Promotional', value: 'promotional' },
];

export const ToneSelector: FC<ToneSelectorProps> = ({ selectedTone, onSelectTone }) => {
  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-sm sm:text-md font-medium mb-2 text-white">Select Tone</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2 w-full">
        {toneOptions.map(({ icon, label, value }) => (
          <motion.button
            key={value}
            onClick={() => onSelectTone(value)}
            className={`cursor-pointer flex flex-col items-center justify-center p-1 sm:p-2 md:p-3 rounded-lg h-[60px] sm:h-[80px] md:h-[100px] ${
              selectedTone === value
                ? 'bg-[rgba(255,255,255,0.08)] text-[#d9d8dc]'
                : 'bg-[rgba(255,255,255,0.04)] text-[#8c8a94]'
            }`}
            whileHover={{ 
              scale: 1.05, 
              y: -3,
              backgroundColor: selectedTone === value 
                ? 'rgba(255,255,255,0.12)' 
                : 'rgba(255,255,255,0.07)',
              transition: { 
                duration: 0.2,
                type: "spring",
                stiffness: 300,
                damping: 15
              }
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0.8, y: 5 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: selectedTone === value ? 1.02 : 1,
              transition: {
                duration: 0.2
              }
            }}
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
            >
              {icon}
            </motion.div>
            <motion.span 
              className="text-[8px] sm:text-[10px] md:text-[12px] font-semibold mt-1 sm:mt-2 text-center"
              animate={{ 
                color: selectedTone === value ? '#d9d8dc' : '#8c8a94' 
              }}
              transition={{ duration: 0.3 }}
            >
              {label}
            </motion.span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};