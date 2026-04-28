import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { WrenchScrewdriverIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import OpenConnectLogo from '../components/OpenConnectLogo.jsx';

export default function UnderConstruction() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center text-center px-6"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8 p-4 rounded-3xl glass border border-white/10 shadow-2xl"
        >
          <WrenchScrewdriverIcon className="h-16 w-16 text-primary" />
        </motion.div>

        <div className="flex items-center gap-3 mb-6">
          <OpenConnectLogo size={32} className="text-primary drop-shadow-[0_0_8px_rgba(255,100,0,0.5)]" />
          <span className="font-sora text-2xl font-bold tracking-tight">OpenConnect</span>
        </div>

        <h1 className="font-sora text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
          Under <span className="gradient-text">Construction</span>
        </h1>
        
        <p className="max-w-md text-lg text-muted-foreground mb-12 leading-relaxed">
          We're meticulously crafting this page to ensure you get the premium experience you deserve. 
          Stay tuned, we're launching soon!
        </p>

        <motion.div 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
        >
          <Link 
            to="/" 
            className="neu-button-primary inline-flex items-center gap-2 px-8 py-4 rounded-full shadow-[0_0_30px_rgba(255,100,0,0.2)] hover:shadow-[0_0_40px_rgba(255,100,0,0.4)] transition-all"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Home
          </Link>
        </motion.div>
      </motion.div>

      {/* Decorative Bottom Bar */}
      <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
    </div>
  );
}
