#!/usr/bin/env bash
# Shared environment for all ExamTyper scripts.
# Source this file to get JDK 21 + Maven + Node on the PATH.
# Override TOOLS_DIR if your JDK/Maven live elsewhere.
#
# The variable tests below use the `${VAR:-}` form, so this file is safe to
# source from a script that runs with `set -u` and has no JAVA_HOME set.

TOOLS_DIR="${TOOLS_DIR:-/c/Users/tejan/tools}"

# Discover a JDK 21+ under $TOOLS_DIR
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  for candidate in "$TOOLS_DIR"/jdk-21* "$TOOLS_DIR"/jdk-17*; do
    if [ -x "$candidate/bin/java" ]; then
      JAVA_HOME="$candidate"
      break
    fi
  done
fi

# Discover Maven under $TOOLS_DIR
if [ -z "${M2_HOME:-}" ] || [ ! -x "$M2_HOME/bin/mvn" ]; then
  for candidate in "$TOOLS_DIR"/apache-maven-*; do
    if [ -x "$candidate/bin/mvn" ]; then
      M2_HOME="$candidate"
      break
    fi
  done
fi

if [ -n "$JAVA_HOME" ]; then
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [ -n "$M2_HOME" ]; then
  export M2_HOME
  export PATH="$M2_HOME/bin:$PATH"
fi

# Repo root (this file lives in <repo>/scripts/env.sh)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_ROOT
