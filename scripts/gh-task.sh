#!/usr/bin/env bash
set -euo pipefail

ISSUE_NUMBER="${1:?Usage: gh-task.sh <issue-number>}"

echo "Fetching issue #$ISSUE_NUMBER..."
ISSUE=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,labels)
TITLE=$(echo "$ISSUE" | jq -r '.title')
LABELS=$(echo "$ISSUE" | jq -r '[.labels[].name] | join(",")')

# Determine branch type from labels
BRANCH_TYPE="feat"
if echo "$LABELS" | grep -qi "bug";           then BRANCH_TYPE="fix"; fi
if echo "$LABELS" | grep -qi "documentation"; then BRANCH_TYPE="docs"; fi
if echo "$LABELS" | grep -qi "chore";         then BRANCH_TYPE="chore"; fi

# Normalize title → branch slug (use AI to shorten if needed)
RAW_SLUG=$(echo "$TITLE" \
  | iconv -f utf-8 -t ascii//TRANSLIT \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/[^a-z0-9]/-/g' \
  | sed 's/-\+/-/g' \
  | sed 's/^-//;s/-$//')

if [ ${#RAW_SLUG} -gt 40 ]; then
  SHORT=$(claude -p "Shorten this GitHub branch slug to at most 40 characters. Keep it meaningful, use only lowercase letters, digits, and hyphens, no trailing hyphens. Output only the slug, nothing else: $RAW_SLUG")
  NORMALIZED=$(echo "$SHORT" | tr -dc 'a-z0-9-' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//' | cut -c1-40 | sed 's/-$//')
else
  NORMALIZED="$RAW_SLUG"
fi

BRANCH_NAME="${BRANCH_TYPE}/${ISSUE_NUMBER}-${NORMALIZED}"
REPO_NAME=$(gh repo view --json name -q '.name')
WORKTREE_PATH="$HOME/incentive-me/worktrees/$REPO_NAME/$BRANCH_NAME"

echo "Branch: $BRANCH_NAME"

# Create branch linked to the issue (skip if already exists)
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
  echo "Branch already exists on remote, skipping creation."
  git fetch origin "$BRANCH_NAME" 2>/dev/null || true
else
  gh issue develop "$ISSUE_NUMBER" --name "$BRANCH_NAME" --base development
fi

# Ensure local branch tracks remote
git fetch origin "$BRANCH_NAME":"$BRANCH_NAME" 2>/dev/null || true

# Create worktree (skip if already exists)
if [ -d "$WORKTREE_PATH" ]; then
  echo "Worktree already exists at $WORKTREE_PATH"
else
  mkdir -p "$(dirname "$WORKTREE_PATH")"
  git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
  MAIN_WORKTREE=$(git worktree list --porcelain | awk 'NR==1{print $2}')
  [ -f "$MAIN_WORKTREE/.local.env" ] && cp "$MAIN_WORKTREE/.local.env" "$WORKTREE_PATH/.local.env"
  echo "Worktree created at $WORKTREE_PATH"
fi

echo ""
echo "Starting Claude in worktree..."
echo "---"

BODY=$(echo "$ISSUE" | jq -r '.body')
PROMPT="Implement GitHub issue #${ISSUE_NUMBER}: \"${TITLE}\"

Branch \`${BRANCH_NAME}\` and worktree are already set up at \`${WORKTREE_PATH}\`. You are already in the correct directory — skip branch/worktree setup and go straight to implementation.

## Issue body

${BODY}

## Execution rules

- Parse the issue body sections:
  - \`Arquivos Relevantes\`: entrypoints to start from
  - \`Contexto\`: background only, not implementation
  - \`Steps\`: implement these in order
- Before editing any symbol, run \`gitnexus_impact\`. Warn and pause if risk is HIGH or CRITICAL.
- After completing each step, check it off on the issue:
  \`gh issue edit ${ISSUE_NUMBER} --body \"<updated body with [x]>\"\`
- If you discover something not captured in the issue, add a comment:
  \`gh issue comment ${ISSUE_NUMBER} --body \"...\"\`
- Only implement what the issue describes — no extra refactors or gold-plating.

## When all steps are done

1. Run \`gitnexus_detect_changes()\` to verify scope.
2. Create a PR targeting \`development\`. The PR title MUST follow conventional commits:
   - Format: \`type(SCOPE): short imperative description in english\`
   - type: same as branch type (\`${BRANCH_TYPE}\`)
   - SCOPE: uppercase, pick from \`API-PLATFORM · API-CATALOG · API-NOTIFICATIONS · API-TRACKING · API-AWARDS-GATEWAY · JOB-RUNNER · KEYCLOAK · UI-HEADQUARTER · UI-CATALOG · UI-ADMIN · UI-STUDIO · UI-EMBED · UI-MANDALA · DEVOPS · DOC · GLOBAL\` — use the most specific scope based on files changed; use GLOBAL only if multiple unrelated scopes
   - description: imperative mood, lowercase, no period, in English (e.g. \`add retry logic to webhook sender\`)
   \`\`\`
   gh pr create --title \"<fill: type(SCOPE): description>\" --body \"\$(cat <<'EOF'
   ## Summary
   <bullet points>

   Closes #${ISSUE_NUMBER}

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )\"
   \`\`\`
3. Get the project item ID:
   \`\`\`
   gh api graphql -f query='query { repository(owner: \"incentive-me\", name: \"incentive-me\") { issue(number: ${ISSUE_NUMBER}) { projectItems(first: 5) { nodes { id } } } } }'
   \`\`\`
4. Move issue to Review/Tests:
   \`\`\`
   gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: \"PVT_kwDOA9blt84BDMn8\", itemId: \"<itemId>\", fieldId: \"PVTSSF_lADOA9blt84BDMn8zg1L5t4\", value: { singleSelectOptionId: \"5b90cd58\" } }) { projectV2Item { id } } }'
   \`\`\`"

cd "$WORKTREE_PATH"
claude "$PROMPT"
