# ARM64 build

## Prerequisites

### For docker on x86
install: `qemu-user-static`  
run: `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes`  
    [For more details](https://github.com/multiarch/qemu-user-static)

### For native arm64 build
Install development package of libayatana-appindicator3 or the legacy libappindicator3. (Depends on your distribution)  
By default the build script builds both version so you mey need to comment one of them.  

## Build

run: `./build_container.sh` (For docker build)  
run: `./build_arm` (For native build)