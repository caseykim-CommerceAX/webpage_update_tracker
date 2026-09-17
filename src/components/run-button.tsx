export function RunButton() {
  const repositoryUrl = process.env.NEXT_PUBLIC_GITHUB_REPOSITORY_URL?.replace(/\/$/, "");
  const workflowUrl = repositoryUrl ? `${repositoryUrl}/actions/workflows/pages.yml` : null;

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
      {workflowUrl ? (
        <a href={workflowUrl} target="_blank" rel="noreferrer" className="button-primary w-full text-center sm:w-auto">
          GitHub에서 전체 진단
        </a>
      ) : (
        <span className="button-primary w-full cursor-not-allowed text-center opacity-60 sm:w-auto" aria-disabled="true">
          GitHub에서 전체 진단
        </span>
      )}
      <p className="max-w-72 text-xs font-medium text-neutral-400">Actions에서 Run workflow를 선택하면 즉시 진단합니다.</p>
    </div>
  );
}
