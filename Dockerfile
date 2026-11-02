# PocketBase backend for Render. Data lives on the disk mounted at /pb/pb_data (see render.yaml).
FROM alpine:3.20

ARG PB_VERSION=0.36.3
ARG PB_SHA256=4582b94d7751e8dfe1e140e318bdc845b53bb85468fcf335f4501033825bfb66

RUN apk add --no-cache ca-certificates unzip

WORKDIR /pb

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pocketbase.zip
RUN echo "${PB_SHA256}  /tmp/pocketbase.zip" | sha256sum -c - \
    && unzip /tmp/pocketbase.zip pocketbase -d /pb \
    && rm /tmp/pocketbase.zip

COPY pocketbase/pb_hooks /pb/pb_hooks

EXPOSE 8090

# Schema changes go through pb_schema.json, so the dashboard must not write migration files here.
CMD ["sh", "-c", "exec /pb/pocketbase serve --http=0.0.0.0:${PORT:-8090} --dir=/pb/pb_data --hooksDir=/pb/pb_hooks --automigrate=false"]
