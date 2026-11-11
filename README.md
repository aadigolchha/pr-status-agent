# pr-status-agent

Paste a GitHub pull request link and it tells you what is holding up the merge: failing checks, missing approvals or labels, and what you can fix yourself.

I built it because I kept asking this about my own pull requests.

## Example

**What is blocking https://github.com/milvus-io/milvus/pull/55253 ?**

> **Blocked.** The PR is open, not a draft, and has no merge conflicts, but it can't merge yet.
>
> **What's blocking it:**
> - **`tide`** is pending. It says the PR is "Not mergeable" until it has the `approved` and `lgtm` labels, and neither is present. The labels present are `kind/bug`, `size/S`, `ci-passed`, and `dco-passed`.
> - **`continuous-integration/jenkins/pr-merge`** is pending, meaning the build of the merge commit is queued and hasn't run.
> - **No reviews yet.** Reviewers requested are bigsheeper and aoiasd, so an approval is probably still needed.
>
> Six other checks have passed.
>
> **Next steps:** The author can wait for the Jenkins build. A sre-ci-robot comment says the PR is not approved and asks for an approver to be assigned after review, using `/assign @somfornot`. Review and approval are waiting on bigsheeper and aoiasd.

## Run it

Needs Node 24.

```bash
npm install
npm run dev
```

The first run asks you to connect a model. Public repositories work as is. Set `GITHUB_TOKEN` for private ones.

Built with [eve](https://eve.dev). The prompt is in `agent/instructions.md` and the one tool is in `agent/tools/get_pr_status.ts`.
