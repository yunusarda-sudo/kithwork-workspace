type KnowledgeVersion = {
  version: string;
  status: "Approved" | "Proposed" | "Superseded";
  note: string;
};

const SAMPLE_ITEM = {
  id: "knw_0042",
  title: "API rate-limit policy for shared rooms",
  content:
    "Requests that change shared knowledge must include an expected version. " +
    "Stale writes return a conflict instead of overwriting the current version. " +
    "This text is sample content for display only.",
  status: "Proposed" as const,
  proposedVersion: "v3",
  source: "Room notes: 2026-10-18 sync (sample)",
  author: "Jonas Reed (member, sample)",
  proposedBy: "Cursor agent, authorized by Jonas (sample)",
  createdAt: "2026-10-20T09:30:00Z",
};

const VERSION_HISTORY: readonly KnowledgeVersion[] = [
  { version: "v1", status: "Approved", note: "Initial policy; approved by owner." },
  { version: "v2", status: "Approved", note: "Clarified conflict handling; approved by owner." },
  { version: "v3", status: "Proposed", note: "Current proposal awaiting human review." },
];

export function KnowledgeReviewPanel() {
  return (
    <section
      aria-labelledby="knowledge-review-heading"
      className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Knowledge review
          </p>
          <h2
            id="knowledge-review-heading"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl"
          >
            Proposed knowledge item
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Review a proposed change before it can affect the room. Display only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            Sample data
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Prototype only
          </span>
        </div>
      </header>

      <article className="mt-5 space-y-5">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {SAMPLE_ITEM.title}
            </h3>
            <span className="inline-flex w-fit items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
              {SAMPLE_ITEM.status}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {SAMPLE_ITEM.content}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Item id
            </dt>
            <dd className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-50">
              {SAMPLE_ITEM.id}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Proposed version
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {SAMPLE_ITEM.proposedVersion}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Source
            </dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              {SAMPLE_ITEM.source}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Author
            </dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              {SAMPLE_ITEM.author}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Proposed by
            </dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              {SAMPLE_ITEM.proposedBy}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Proposed at
            </dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              <time dateTime={SAMPLE_ITEM.createdAt}>{SAMPLE_ITEM.createdAt}</time>
            </dd>
          </div>
        </dl>

        <section
          aria-labelledby="knowledge-history-heading"
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h4
            id="knowledge-history-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Version and history context
          </h4>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            History is append-only. Earlier versions remain available for audit.
          </p>
          <ol className="mt-3 space-y-2">
            {VERSION_HISTORY.map((entry) => (
              <li
                key={entry.version}
                className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {entry.version}
                  </span>
                  <span
                    className={
                      entry.status === "Approved"
                        ? "inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                        : entry.status === "Proposed"
                          ? "inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200"
                          : "inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }
                  >
                    {entry.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-right">
                  {entry.note}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div
          role="note"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
        >
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Approval is a human decision
          </h4>
          <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
            This panel is display only. No approval, rejection, or edit actions are
            available here. An AI-generated proposal cannot approve knowledge or
            change an owner&apos;s decision. A human owner must explicitly approve
            a specific version before it becomes active.
          </p>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Sample UI only. No authentication, API, persistence, or live data is
          implemented. Content is untrusted sample data.
        </p>
      </article>
    </section>
  );
}
