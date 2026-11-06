#' Send a message to a Discord channel through a webhook.
#'
#' Webhook paths ("<webhook_id>/<webhook_token>") are read from environment
#' variables so they never live in source control, e.g.
#'   Sys.setenv(DISCORD_WEBHOOK_EXAMPLE = "<webhook_id>/<webhook_token>")
#'
#' @param msg Message text.
#' @param channel Channel label, e.g. "#price-alerts"; maps to DISCORD_WEBHOOK_PRICE_ALERTS.
discord <- function(msg, channel = "EXAMPLE") {
  require(httr)
  var <- paste0("DISCORD_WEBHOOK_", toupper(gsub("[^A-Za-z0-9]+", "_", sub("^#", "", channel))))
  ep <- Sys.getenv(var)
  if (ep == "") stop("Set ", var, " to '<webhook_id>/<webhook_token>'")
  full_url <- paste0("https://discord.com/api/webhooks/", ep)
  response <- POST(full_url, body = list(content = msg), encode = "json")
  if (http_status(response)$category == "Success") {
    print("Message sent successfully!")
  } else {
    print(paste("Failed to send message:", http_status(response)$reason))
  }
}

# Usage:
# discord(msg = "Hi world", channel = "EXAMPLE")
