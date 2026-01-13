import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Layers, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NovaAvatar } from '@/components/nova/NovaAvatar';
import { cn } from '@/lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Awakening Nova',
    description: 'Your personal AI companion is ready to begin its journey with you.',
  },
  {
    id: 'versions',
    icon: Layers,
    title: 'Nova Evolves',
    description: 'Create different versions of Nova, each with unique traits and rules. Clone and evolve them over time.',
  },
  {
    id: 'boundaries',
    icon: Shield,
    title: 'Set Boundaries',
    description: 'Define what Nova should and shouldn\'t do. Your boundaries shape the relationship.',
  },
  {
    id: 'begin',
    icon: Heart,
    title: 'Ready to Begin',
    description: 'Nova is now ready. Start a conversation and begin building your unique relationship.',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-violet-900/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg"
      >
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === currentStep ? 'w-8 bg-purple-500' : 'w-2 bg-muted'
              )}
              layoutId="step-indicator"
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              {currentStep === 0 ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="mb-6"
                >
                  <NovaAvatar size="lg" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center mb-6',
                    'bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30'
                  )}
                >
                  <StepIcon className="w-8 h-8 text-purple-400" />
                </motion.div>
              )}

              <h2 className="font-display text-2xl font-bold mb-3 text-gradient-nova">
                {step.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {step.description}
              </p>

              <div className="flex items-center gap-3 w-full">
                {currentStep > 0 && currentStep < steps.length - 1 && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1"
                    data-testid="button-skip"
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={cn(
                    'flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500',
                    'glow-nova font-medium'
                  )}
                  data-testid="button-continue"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Chatting
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
