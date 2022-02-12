#!/usr/bin/bash
# Fantoni[o|O] (9/2/2022)

set -eu

# Show usage
function usage {
  echo "Use: $(basename "$0") "
  echo "Launch "
  echo "Example: generateTLSparams.sh"
  echo "Example: generateTLSparams.sh ./demo"
}

# Process parameters
while getopts d:g:m:b:h: flag
do
  case "${flag}" in
    d) dealers=${OPTARG};;
    g) guards=${OPTARG};;
    m) mode=${OPTARG};;
    b) bytesize=${OPTARG};;
    h)
      usage
      ;;
    :)
      echo "$0: Must supply an argument to -$OPTARG." >&2
      exit 1
      ;;
    ?)
      echo "Invalid option: -${OPTARG}."
      exit 2
      ;;
  esac
done

# Launch node processes

