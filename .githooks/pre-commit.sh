#!/bin/sh

# Run biome check on staged files
output=$(pnpm biome check --staged --error-on-warnings 2>&1)
exit_code=$?

# If biome succeeded, allow commit
if [ $exit_code -eq 0 ]; then
  exit 0
fi

# If biome failed but it's just because no files were processed, allow commit
if echo "$output" | grep -q "No files were processed"; then
  exit 0
fi

# Otherwise, block the commit and show the error
echo "$output"
exit 1
