interface SectionHeaderProps {
  sectionName: string;
  onRefresh?: () => void;
}

export function SectionHeader({ sectionName, onRefresh }: SectionHeaderProps) {
  const handleClick = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex-1" />
      <button
        onClick={handleClick}
        className="text-sm font-bold text-purple-500 tracking-tight hover:opacity-80 transition-opacity"
      >
        Lumatha
      </button>
      <div className="flex-1 flex justify-end">
        <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-widest">{sectionName}</span>
      </div>
    </div>
  );
}
