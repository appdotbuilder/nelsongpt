
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Pill, Activity, Baby, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface MedicalTemplatesProps {
  onUseTemplate: (template: string) => void;
}

export function MedicalTemplates({ onUseTemplate }: MedicalTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const templates = [
    {
      category: 'Drug Dosing',
      icon: <Pill className="h-4 w-4" />,
      templates: [
        'Calculate acetaminophen dosing for a 18-month-old child weighing 12 kg',
        'What is the appropriate amoxicillin dose for a 5-year-old with otitis media?',
        'Ibuprofen dosing guidelines for fever in a 8 kg infant',
        'Emergency epinephrine auto-injector dosing by weight'
      ]
    },
    {
      category: 'Emergency Protocols',
      icon: <Activity className="h-4 w-4" />,
      templates: [
        'Pediatric advanced life support algorithm for cardiac arrest',
        'Anaphylaxis management protocol in children',
        'Febrile seizure emergency management',
        'Acute asthma exacerbation treatment protocol'
      ]
    },
    {
      category: 'Neonatal Care',
      icon: <Baby className="h-4 w-4" />,
      templates: [
        'Neonatal resuscitation algorithm step-by-step',
        'Hypoglycemia management in newborns',
        'Jaundice evaluation and phototherapy indications',
        'Feeding guidelines for premature infants'
      ]
    },
    {
      category: 'Development',
      icon: <TrendingUp className="h-4 w-4" />,
      templates: [
        'Normal developmental milestones for 18-month-old',
        'Growth chart percentiles interpretation for 5-year-old',
        'Red flags for autism spectrum disorder in toddlers',
        'Motor development delays: when to refer'
      ]
    }
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-gray-300 hover:bg-[#2a2a2a]"
        >
          <span className="text-sm font-medium">Medical Templates</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-3 mt-3">
        {templates.map((category) => (
          <div key={category.category} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
              {category.icon}
              {category.category}
            </div>
            <div className="space-y-1">
              {category.templates.map((template, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => onUseTemplate(template)}
                  className="w-full justify-start text-left h-auto p-2 text-xs text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                >
                  <span className="text-left leading-relaxed">{template}</span>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
