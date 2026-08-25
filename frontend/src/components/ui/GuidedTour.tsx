import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const TOUR_STEPS = [
  {
    target: '/',
    title: 'Welcome to Command Center',
    content: 'This is your high-level dashboard. Track all university projects, analytics, and active metrics here.'
  },
  {
    target: '/projects',
    title: 'Kanban Board & Projects',
    content: 'Manage all projects across different domains. Switch between Grid, List, and Kanban views easily.'
  },
  {
    target: '/users',
    title: 'Role-Based Access Control',
    content: 'Provision new admins, students, and supervisors. Control granular permissions strictly.'
  }
];

export function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only show once per session for demo
    if (!sessionStorage.getItem('tour-completed')) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync with navigation when step changes
  const handleStepNavigation = (stepIdx: number) => {
    const target = TOUR_STEPS[stepIdx]?.target;
    if (target && location.pathname !== target) {
      navigate(target);
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      handleStepNavigation(nextStep);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    setIsOpen(false);
    sessionStorage.setItem('tour-completed', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm pointer-events-auto" onClick={completeTour} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative pointer-events-auto bg-surface/90 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        >
          <button 
            onClick={completeTour}
            className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6">
            <span className="text-xs font-bold tracking-wider text-accent uppercase mb-2 block">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <h3 className="text-xl font-bold text-text-main mb-2">
              {TOUR_STEPS[currentStep].title}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {TOUR_STEPS[currentStep].content}
            </p>
          </div>

          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-6 bg-accent' : 'w-2 bg-text-muted/30'
                  }`} 
                />
              ))}
            </div>

            <button 
              onClick={handleNext}
              className="btn-primary py-2 px-4 rounded-xl flex items-center gap-2"
            >
              {currentStep < TOUR_STEPS.length - 1 ? (
                <>Next <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Finish Tour <Check className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
