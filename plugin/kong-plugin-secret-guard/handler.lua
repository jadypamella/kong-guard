local cjson = require "cjson.safe"
local http = require "resty.http"

local SecretGuard = {
  PRIORITY = 1000,
  VERSION = "1.0.0"
}

local function flagged(body)
  if not body then return false, {} end
  local reasons = {}
  if body:match("[Pp]assword%s*[:=]") then table.insert(reasons, "Potential password") end
  if body:match("AKIA[%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a][%u%d%a]") then table.insert(reasons, "AWS key id") end
  if body:match("BEGIN%s+PRIVATE%s+KEY") then table.insert(reasons, "Private key block") end
  return #reasons > 0, reasons
end

function SecretGuard:access(conf)
  ngx.req.read_body()
  local data = ngx.req.get_body_data()

  local bad, reasons = flagged(data)

  local ok = not bad
  local httpc = http.new()
  httpc:set_timeout(200)
  local payload = cjson.encode({
    ts = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    ok = ok,
    reasons = reasons
  })
  pcall(function()
    httpc:request_uri(conf.log_url, {
      method = "POST",
      body = payload,
      headers = { ["Content-Type"] = "application/json" }
    })
  end)

  if bad then
    return kong.response.exit(400, { message = "Blocked by secret guard", reasons = reasons })
  end
end

return SecretGuard