import type { MainContentHeaderProps } from '../../types/types';
import MobileMenuButton from './MobileMenuButton';
import MainContentTitle from './MainContentTitle';

export default function MainContentHeader({
  selectedProject,
  selectedSession,
  isMobile,
  onMenuClick,
}: MainContentHeaderProps) {
  return (
    <div className="pwa-header-safe flex-shrink-0 border-b border-border/60 bg-background px-3 py-1.5 sm:px-4 sm:py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isMobile && <MobileMenuButton onMenuClick={onMenuClick} />}
          <MainContentTitle
            selectedProject={selectedProject}
            selectedSession={selectedSession}
          />
        </div>
      </div>
    </div>
  );
}
