# KongGuard Infrastructure

## Run the stack

```bash
docker compose up -d
```

- API is on port 8080
- MCP is on port 7070  
- Kong proxy is on 8000 and admin on 8001

Attach the plugin to your AI upstream in kong.yaml under service ai.

Log url for the plugin should point to `http://api:8080/logs`.