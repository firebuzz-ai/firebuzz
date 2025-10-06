#!/bin/bash

# Script to generate tarball files for templates
# Excludes node_modules, build artifacts, and local files

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TEMPLATES_DIR="$(cd "$(dirname "$0")/.." && pwd)/templates"
OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/dist/templates"

# Function to create tarball for a template
create_tarball() {
  local template_name=$1
  local template_path="$TEMPLATES_DIR/$template_name"

  if [ ! -d "$template_path" ]; then
    echo -e "${YELLOW}Warning: Template directory '$template_name' not found, skipping...${NC}"
    return 1
  fi

  echo -e "${BLUE}Packing template: ${GREEN}$template_name${NC}"

  # Create output directory if it doesn't exist
  mkdir -p "$OUTPUT_DIR"

  # Create tarball excluding only build artifacts and local files
  # Using -C with the template directory and . to extract at root level
  tar -czf "$OUTPUT_DIR/$template_name.tar.gz" \
    -C "$template_path" \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude="build" \
    --exclude=".turbo" \
    --exclude=".next" \
    --exclude=".vite" \
    --exclude="*.log" \
    --exclude=".DS_Store" \
    --exclude="coverage" \
    --exclude=".cache" \
    .

  echo -e "${GREEN}✓ Created: $OUTPUT_DIR/$template_name.tar.gz${NC}"
  return 0
}

# Get available templates
get_templates() {
  local templates=()
  for template_dir in "$TEMPLATES_DIR"/*; do
    if [ -d "$template_dir" ]; then
      templates+=("$(basename "$template_dir")")
    fi
  done
  echo "${templates[@]}"
}

# Interactive template selection
select_templates() {
  local templates=($(get_templates))

  if [ ${#templates[@]} -eq 0 ]; then
    echo -e "${YELLOW}No templates found in $TEMPLATES_DIR${NC}"
    exit 1
  fi

  echo -e "${BLUE}Available templates:${NC}"
  for i in "${!templates[@]}"; do
    echo -e "  ${GREEN}$((i+1)))${NC} ${templates[$i]}"
  done
  echo ""
  echo -e "${YELLOW}Enter template numbers (space-separated) or 'all' for all templates:${NC}"
  read -r selection

  local selected_templates=()

  if [ "$selection" == "all" ]; then
    selected_templates=("${templates[@]}")
  else
    for num in $selection; do
      if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le "${#templates[@]}" ]; then
        selected_templates+=("${templates[$((num-1))]}")
      else
        echo -e "${YELLOW}Skipping invalid selection: $num${NC}"
      fi
    done
  fi

  if [ ${#selected_templates[@]} -eq 0 ]; then
    echo -e "${YELLOW}No valid templates selected${NC}"
    exit 1
  fi

  echo ""
  echo -e "${BLUE}Creating template tarballs...${NC}"
  echo ""

  for template in "${selected_templates[@]}"; do
    create_tarball "$template"
  done

  echo ""
  echo -e "${GREEN}Done! Tarballs created in: $OUTPUT_DIR${NC}"
}

# Run interactive selection
select_templates