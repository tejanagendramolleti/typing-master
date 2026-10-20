#!/usr/bin/env bash
#
# The whole check.
#
# Runs the lint, the backend tests, the interface tests, the build and the
# end-to-end tests, and exits non-zero if any of them fail.
#
# Usage:
#   ./scripts/verify.sh              # everything
#   ./scripts/verify.sh --no-e2e     # everything but the end-to-end tests
#   ./scripts/verify.sh --fast       # no build and no end-to-end tests
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# The toolchain, if it is not already on the path.
if [ -f "$SCRIPT_DIR/env.sh" ]; then
    # shellcheck source=scripts/env.sh
    source "$SCRIPT_DIR/env.sh"
fi

RUN_E2E=1
RUN_BUILD=1

for argument in "$@"; do
    case "$argument" in
        --no-e2e) RUN_E2E=0 ;;
        --fast) RUN_E2E=0; RUN_BUILD=0 ;;
        --help|-h)
            sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "Unknown option: $argument" >&2
            exit 2
            ;;
    esac
done

# ---- The reporting ---------------------------------------------------------

BOLD=""
RESET=""
if [ -t 1 ]; then
    BOLD="$(printf '\033[1m')"
    RESET="$(printf '\033[0m')"
fi

STEP=0
FAILURES=0

step() {
    STEP=$((STEP + 1))
    printf '\n%s[%d/%d] %s%s\n' "$BOLD" "$STEP" "$TOTAL_STEPS" "$1" "$RESET"
}

ok() {
    printf '  %s✓%s %s\n' "$BOLD" "$RESET" "$1"
}

fail() {
    printf '  %s✗%s %s\n' "$BOLD" "$RESET" "$1"
    FAILURES=$((FAILURES + 1))
}

skip() {
    printf '  - %s (skipped)\n' "$1"
}

# ---- The steps -------------------------------------------------------------

if [ "$RUN_BUILD" = "1" ]; then
    TOTAL_STEPS=6
else
    TOTAL_STEPS=4
fi

printf '%sExamTyper — the whole check%s\n' "$BOLD" "$RESET"
printf 'The repository: %s\n' "$REPO_ROOT"

# ---- 1. The backend compiles ----------------------------------------------

step "The backend compiles"
if (cd backend && mvn -B -q compile); then
    ok "the backend compiles"
else
    fail "the backend does not compile"
fi

# ---- 2. The backend tests --------------------------------------------------

step "The backend tests"
if (cd backend && MAVEN_OPTS="-Xmx512m" mvn -B test); then
    ok "the backend tests pass"
else
    fail "the backend tests fail"
fi

# ---- 3. The interface's types and lint -------------------------------------

step "The interface type-checks and lints"
if (cd frontend && npx tsc -b --force); then
    ok "the interface type-checks"
else
    fail "the interface does not type-check"
fi

if (cd frontend && npm run lint); then
    ok "the interface lints"
else
    fail "the interface does not lint"
fi

# ---- 4. The interface's tests ----------------------------------------------

step "The interface tests"
if (cd frontend && npx vitest run); then
    ok "the interface tests pass"
else
    fail "the interface tests fail"
fi

# ---- 5. The build ----------------------------------------------------------

if [ "$RUN_BUILD" = "1" ]; then
    step "The interface builds"
    if (cd frontend && npm run build); then
        ok "the interface builds"
    else
        fail "the interface does not build"
    fi
else
    step "The interface builds"
    skip "the build"
fi

# ---- 6. The end-to-end tests -----------------------------------------------

if [ "$RUN_E2E" = "1" ]; then
    step "The end-to-end tests"
    if (cd frontend && npx playwright test); then
        ok "the end-to-end tests pass"
    else
        fail "the end-to-end tests fail"
    fi
else
    step "The end-to-end tests"
    skip "the end-to-end tests"
fi

# ---- The result ------------------------------------------------------------

printf '\n'

if [ "$FAILURES" = "0" ]; then
    printf '%sEverything passed.%s\n' "$BOLD" "$RESET"
    exit 0
fi

printf '%s%s of the checks failed.%s\n' "$BOLD" "$FAILURES" "$RESET"
exit 1
