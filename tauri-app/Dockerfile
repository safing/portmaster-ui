FROM rust:latest
RUN apt update && apt upgrade -y
RUN apt install -y g++-mingw-w64-x86-64 libgtk-3-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev libwebkit2gtk-4.1-dev

RUN rustup target add x86_64-pc-windows-gnu 
RUN rustup toolchain install stable-x86_64-pc-windows-gnu 
RUN rustup target add x86_64-pc-windows-msvc
RUN rustup toolchain install stable-x86_64-pc-windows-msvc

WORKDIR /app/src-tauri

CMD ["cargo", "build"]
