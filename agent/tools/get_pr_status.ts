import { defineTool } from "eve/tools";
import { z } from "zod";

// Public repos work without a token (60 requests an hour).
// Set GITHUB_TOKEN for private repos or a higher limit.
async function github(path: string): Promise<any> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`GitHub: ${res.status} ${body.message}`);
  return body;
}

// A commit can have more than 100 check runs, so read every page.
async function checkRuns(commit: string): Promise<any[]> {
  const runs: any[] = [];
  for (let page = 1; ; page++) {
    const res = await github(`${commit}/check-runs?per_page=100&page=${page}`);
    runs.push(...res.check_runs);
    if (runs.length >= res.total_count || res.check_runs.length === 0) return runs;
  }
}

export default defineTool({
  description:
    "Get the current state of a GitHub pull request: checks, reviews, labels, and recent comments.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner, e.g. milvus-io"),
    repo: z.string().describe("Repository name, e.g. milvus"),
    number: z.number().int().describe("Pull request number"),
  }),
  async execute({ owner, repo, number }) {
    const base = `/repos/${owner}/${repo}`;
    const pr = await github(`${base}/pulls/${number}`);
    const commit = `${base}/commits/${pr.head.sha}`;
    const [runs, status, reviews, comments] = await Promise.all([
      checkRuns(commit),
      github(`${commit}/status?per_page=100`),
      github(`${base}/pulls/${number}/reviews?per_page=100`),
      github(`${base}/issues/${number}/comments?per_page=100`),
    ]);

    // GitHub reports checks in two places. Put both into one list.
    const checks = [
      ...runs.map((c) => ({
        name: c.name,
        result: c.conclusion ?? "pending",
        detail: c.output?.title ?? "",
      })),
      ...status.statuses.map((s: any) => ({
        name: s.context,
        result: s.state,
        detail: s.description ?? "",
      })),
    ];
    const passed = ["success", "neutral", "skipped"];

    return {
      title: pr.title,
      author: pr.user.login,
      state: pr.merged ? "merged" : pr.state,
      draft: pr.draft,
      hasConflicts: pr.mergeable === false,
      labels: pr.labels.map((l: any) => l.name),
      checksPassed: checks.filter((c) => passed.includes(c.result)).length,
      checksNotPassed: checks.filter((c) => !passed.includes(c.result)),
      // A reviewer's later review replaces their earlier one.
      reviews: Object.fromEntries(reviews.map((r: any) => [r.user.login, r.state])),
      reviewersRequested: pr.requested_reviewers.map((u: any) => u.login),
      recentComments: comments.slice(-5).map((c: any) => ({
        author: c.user.login,
        date: c.created_at,
        text: c.body.slice(0, 400),
      })),
    };
  },
});
