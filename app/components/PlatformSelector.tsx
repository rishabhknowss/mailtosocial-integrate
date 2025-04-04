import { FC } from "react";
import { FaLinkedin, FaTwitter } from "react-icons/fa";
import { MdOutlineVideoLibrary } from "react-icons/md";
import { motion } from "framer-motion";

interface PlatformSelectorProps {
  selectedPlatform: "linkedin" | "twitter";
  onSelectPlatform: (platform: "linkedin" | "twitter") => void;
}

export const PlatformSelector: FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onSelectPlatform,
}) => {
  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-sm sm:text-md font-medium mb-2 text-white">Generate for</h3>
      <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 w-full">
        <motion.button
          className={`cursor-pointer flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg ${
            selectedPlatform === "twitter"
              ? "bg-[rgba(255,255,255,0.08)] text-[#d9d8dc]"
              : "bg-[rgba(255,255,255,0.04)] text-[#8c8a94]"
          }`}
          onClick={() => onSelectPlatform("twitter")}
          whileHover={{ 
            scale: 1.05, 
            x: 3,
            backgroundColor: selectedPlatform === "twitter" 
              ? "rgba(255,255,255,0.12)" 
              : "rgba(255,255,255,0.08)"
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17 
          }}
        >
          <motion.div
            whileHover={{ rotate: 5, scale: 1.15 }}
            transition={{ duration: 0.2 }}
            className="w-3 h-3 sm:w-4 sm:h-4"
          >
            <FaTwitter className="w-full h-full" />
          </motion.div>
          <motion.span 
            className="text-[9px] sm:text-[11px] md:text-[12px] font-semibold"
            animate={{ 
              color: selectedPlatform === "twitter" ? "#d9d8dc" : "#8c8a94" 
            }}
          >
            X/Twitter
          </motion.span>
        </motion.button>
        
        <motion.button
          className={`cursor-pointer flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg ${
            selectedPlatform === "linkedin"
              ? "bg-[rgba(255,255,255,0.08)] text-[#d9d8dc]"
              : "bg-[rgba(255,255,255,0.04)] text-[#8c8a94]"
          }`}
          onClick={() => onSelectPlatform("linkedin")}
          whileHover={{ 
            scale: 1.05, 
            x: 3,
            backgroundColor: selectedPlatform === "linkedin" 
              ? "rgba(255,255,255,0.12)" 
              : "rgba(255,255,255,0.08)"
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17 
          }}
        >
          <motion.div
            whileHover={{ rotate: 5, scale: 1.15 }}
            transition={{ duration: 0.2 }}
            className="w-3 h-3 sm:w-4 sm:h-4"
          >
            <FaLinkedin className="w-full h-full" />
          </motion.div>
          <motion.span 
            className="text-[9px] sm:text-[11px] md:text-[12px] font-semibold"
            animate={{ 
              color: selectedPlatform === "linkedin" ? "#d9d8dc" : "#8c8a94" 
            }}
          >
            LinkedIn
          </motion.span>
        </motion.button>
        
        <motion.a
          href="https://videogen.mailtosocial.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-[#8c8a94] text-[#d9d8dc]"
          whileHover={{ 
            scale: 1.05, 
            x: 3,
            backgroundColor: "rgba(255,255,255,0.12)"
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17 
          }}
        >
          <motion.div
            whileHover={{ rotate: 5, scale: 1.15 }}
            transition={{ duration: 0.2 }}
            className="w-3 h-3 sm:w-4 sm:h-4"
          >
            <MdOutlineVideoLibrary className="w-full h-full" />
          </motion.div>
          <motion.span className="text-[9px] sm:text-[11px] md:text-[12px] font-semibold">
            Video
          </motion.span>
        </motion.a>
      </div>
    </div>
  );
};