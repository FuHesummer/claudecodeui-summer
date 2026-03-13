import { useTranslation } from 'react-i18next';
import SessionProviderLogo from '../../../llm-logo-provider/SessionProviderLogo';
import type { Project, ProjectSession } from '../../../../types/app';

type MainContentTitleProps = {
  selectedProject: Project;
  selectedSession: ProjectSession | null;
};

function getSessionTitle(session: ProjectSession): string {
  if (session.__provider === 'cursor') {
    return (session.name as string) || 'Untitled Session';
  }

  return (session.summary as string) || 'New Session';
}

export default function MainContentTitle({
  selectedProject,
  selectedSession,
}: MainContentTitleProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {selectedSession && (
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <SessionProviderLogo provider={selectedSession.__provider} className="h-4 w-4" />
        </div>
      )}

      <h1 className="truncate text-sm font-semibold text-foreground">
        {selectedSession ? getSessionTitle(selectedSession) : t('mainContent.newSession')}
      </h1>

      {selectedProject?.displayName && (
        <>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-xs text-muted-foreground">{selectedProject.displayName}</span>
        </>
      )}
    </div>
  );
}
