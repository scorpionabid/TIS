#!/bin/bash

# Frontend qovluğundakı stop skripti artıq kök `stop.sh`-ə
# yönləndirilir ki, konteynerlərin dayandırılması üçün vahid
# mexanizm saxlanılsın.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -x "${REPO_ROOT}/stop.sh" ]; then
  echo "❌ 'stop.sh' tapılmadı. Skriptin repositoriyanın kökündə olduğuna əmin olun."
  exit 1
fi

exec "${REPO_ROOT}/stop.sh" "$@"
