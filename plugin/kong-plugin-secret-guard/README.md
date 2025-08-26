# Secret Guard Kong Plugin

Secret Guard is a Kong plugin that blocks requests containing likely secrets and posts a decision to the KongGuard API logs.

Config field `log_url` points to `http://api:8080/logs`.

Attach it to the service that proxies requests to your AI provider.