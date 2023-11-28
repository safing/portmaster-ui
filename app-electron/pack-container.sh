docker run --rm -ti \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ${PWD}/build-cache/electron:/root/.cache/electron \
  -v ${PWD}/build-cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine "$@"

# 1. run inside container:
# npm run pack

# 2. fix permissions afterwards:
# sudo find dist -type f -exec chmod 0644 {} +
# sudo find dist -type d -exec chmod 0755 {} +
# sudo find dist -exec chown $(whoami) {} +
