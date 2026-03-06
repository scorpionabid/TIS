#!/bin/bash

# Frontend kökündəki skript vasitəsilə sistemi işə salmaq üçün
# duplikat əmrlərə ehtiyac yoxdur. Bu wrapper repositoriyanın
# kök qovluğundakı `start.sh`-i çağıraraq bütün mühit parametrlərinin
# tək mənbədən idarə olunmasını təmin edir.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -x "${REPO_ROOT}/start.sh" ]; then
  echo "❌ 'start.sh' tapılmadı. Skriptin repositoriyanın kökündə mövcud olduğuna əmin olun."
  exit 1
fi

exec "${REPO_ROOT}/start.sh" "$@"
