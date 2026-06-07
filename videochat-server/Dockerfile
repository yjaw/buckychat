FROM golang:1.26-bookworm AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /buckychat-api ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /buckychat-api /buckychat-api

EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["/buckychat-api"]
