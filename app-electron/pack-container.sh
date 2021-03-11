docker run --rm -ti \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ${PWD}/build-cache/electron:/root/.cache/electron \
  -v ${PWD}/build-cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine "$@"
