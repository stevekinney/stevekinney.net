#!/bin/bash

# Directory to search for markdown files
DIRECTORY=$1

# Check if a directory is provided
if [ -z "$DIRECTORY" ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

# Initialize total word count
total_count=0

# Loop through each markdown file in the directory
for file in "$DIRECTORY"/*.md; do
    if [ -f "$file" ]; then
        # Get the word count for the current file
        count=$(wc -w < "$file")
        echo "$file: $count words"
        # Add to total word count
        total_count=$((total_count + count))
    fi
done

# Print the total word count
echo "Total word count: $total_count"
