FROM node:24-trixie-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates chromium curl fonts-noto-color-emoji socat unzip xauth xvfb \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.23.0

WORKDIR /opt/verify
RUN npm init -y >/dev/null && npm install playwright-core@1.65.1
COPY entrypoint.sh setup-wallet.mjs /opt/verify/
ENTRYPOINT ["/opt/verify/entrypoint.sh"]
