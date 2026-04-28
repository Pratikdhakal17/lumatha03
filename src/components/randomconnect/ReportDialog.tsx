import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
}

const reportReasons = [
  { id: 'nudity', label: 'Nudity or Sexual Content', emoji: '🔞' },
  { id: 'terrorism', label: 'Terrorism or Extremism', emoji: '⚠️' },
  { id: 'harassment', label: 'Harassment or Bullying', emoji: '😠' },
  { id: 'hate', label: 'Hate Speech or Discrimination', emoji: '🚫' },
  { id: 'unsafe', label: 'Unsafe or Dangerous Behavior', emoji: '⛔' },
  { id: 'spam', label: 'Spam or Scam', emoji: '📧' },
  { id: 'other', label: 'Other Violation', emoji: '📝' },
];

export const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onClose,
  onReport
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    onReport(selectedReason);
    setSelectedReason(null);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Report User
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a reason and submit a report for this Random Connect session.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            Select the reason for reporting this user. False reports may result in action against your account.
          </p>

          <div className="space-y-2">
            {reportReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  selectedReason === reason.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                }`}
              >
                <span className="text-lg">{reason.emoji}</span>
                <span className={`text-sm font-medium ${
                  selectedReason === reason.id ? 'text-primary' : 'text-foreground'
                }`}>
                  {reason.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          3 reports from different users = permanent ban from Random Connect
        </p>
      </DialogContent>
    </Dialog>
  );
};
