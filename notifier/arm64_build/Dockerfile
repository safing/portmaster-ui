FROM ubuntu:latest


COPY sources.list /etc/apt/sources.list
RUN dpkg --add-architecture arm64
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get install -y wget libayatana-appindicator3-dev:arm64  libappindicator3-dev:arm64 git gcc gcc-aarch64-linux-gnu
RUN wget https://go.dev/dl/go1.18.linux-arm64.tar.gz
RUN tar -C /usr/local -xzf go1.18.linux-arm64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

WORKDIR "/portmaster-ui/notifier"