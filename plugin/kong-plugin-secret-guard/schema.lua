local typedefs = require "kong.db.schema.typedefs"
return {
  name = "secret-guard",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          { log_url = { type = "string", required = true } }
        }
    } }
  }
}