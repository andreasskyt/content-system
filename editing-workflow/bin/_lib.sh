#!/bin/bash
# Shared helpers for BRAND editing CLI scripts.
# Source from bin/* with: source "$PROJECT_ROOT/bin/_lib.sh"

PICKED_STYLE=""

pick_style() {
  local project_root="$1"
  local styles_dir="$project_root/src/styles"

  local styles=()
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    local name
    name=$(basename "$f" .ts)
    [[ "$name" == "index" || "$name" == "types" ]] && continue
    styles+=("$name")
  done < <(find "$styles_dir" -maxdepth 1 -type f -name "*.ts" 2>/dev/null | sort)

  if [[ ${#styles[@]} -eq 0 ]]; then
    PICKED_STYLE="brand"
    return
  fi

  echo ""
  echo "  ─── Style ──────────────────────────────────"
  for i in "${!styles[@]}"; do
    local label="${styles[$i]}"
    if [[ "$label" == "brand" ]]; then
      echo "    [$((i+1))] $label  (default)"
    else
      echo "    [$((i+1))] $label"
    fi
  done
  echo ""
  read -p "  Pick style [1-${#styles[@]}, ENTER = brand]: " style_choice

  if [[ -z "$style_choice" ]]; then
    PICKED_STYLE="brand"
  elif [[ "$style_choice" =~ ^[0-9]+$ ]] && [[ "$style_choice" -ge 1 ]] && [[ "$style_choice" -le ${#styles[@]} ]]; then
    PICKED_STYLE="${styles[$((style_choice - 1))]}"
  else
    echo "  Invalid style choice."
    exit 1
  fi

  echo "  → Style: $PICKED_STYLE"
  echo ""
}

save_style_to_folder() {
  local folder="$1"
  if [[ -n "${PICKED_STYLE:-}" && -d "$folder" ]]; then
    echo "$PICKED_STYLE" > "$folder/style.txt"
  fi
}
