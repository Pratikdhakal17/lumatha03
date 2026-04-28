import React from 'react';
import { Shield, Eye, Clock, Heart, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SecurityTipsProps {
  compact?: boolean;
}

export const SecurityTips: React.FC<SecurityTipsProps> = ({ compact = false }) => {
  const tips = [
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your real identity is never shared. A new random name is generated for each session.'
    },
    {
      icon: Eye,
      title: 'Screenshot Protection',
      description: 'Screenshots and screen recordings are detected. Violations lead to temporary or permanent bans from Random Connect.'
    },
    {
      icon: Clock,
      title: 'Session Limits',
      description: 'Video calls are limited to 15 minutes to encourage healthy usage. You can always start a new session.'
    },
    {
      icon: Heart,
      title: 'Respectful Space',
      description: 'This is a safe space for genuine conversation. Be kind, respectful, and enjoy the moment.'
    }
  ];

  const violationInfo = [
    { count: '1-2', action: 'Silent warning logged' },
    { count: '3', action: '24-hour temporary ban from Random Connect' },
    { count: '5+', action: 'Permanent ban from Random Connect' }
  ];

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-xs">Safety</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </DialogTitle>
            <DialogDescription className="sr-only">
              Read the safety and privacy guidance for Random Connect.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {tips.map((tip, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <tip.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-xs text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-medium">Violation Consequences</p>
                </div>
                <div className="space-y-2">
                  {violationInfo.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.count} violations:</span>
                      <span className="text-foreground">{item.action}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Note: Bans only affect Random Connect. You can still use other app features.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="glass-card p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-foreground">Privacy & Security</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {tips.map((tip, index) => (
          <div key={index} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30">
            <tip.icon className="w-5 h-5 text-primary" />
            <p className="text-xs font-medium">{tip.title}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{tip.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
