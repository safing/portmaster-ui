FROM arm64v8/ubuntu

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get install -y wget libayatana-appindicator3-dev libappindicator3-dev git gcc
RUN wget https://go.dev/dl/go1.18.linux-arm64.tar.gz
RUN tar -C /usr/local -xzf go1.18.linux-arm64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

WORKDIR "/portmaster-ui/notifier/arm64_build"