# ------------------------------------------------------------------------------
# File: price_monitor.R
# Author: etherpilled
# Project: Infinite Trading Protocol
#
# Description:
# This script monitors specific token pairs on the Optimism network using the
# Dexscreener API. If the token price falls below a defined threshold, it sends
# a price alert message to a Discord channel via a webhook (through a `discord` 
# function sourced from another script).
#
# Dependencies:
# - Assumes `slack.R` includes the definition for the `discord` function.
# - Requires the `httr` and `jsonlite` packages.
# ------------------------------------------------------------------------------

# Import discord function
source("~/src/R/integrations/discord.R")

# Function to retrieve token price from Dexscreener API
ds_price = function(pair, network, exchange, native = FALSE) {
  url <- "https://api.dexscreener.com/latest/dex/pairs/"
  ep = NULL
  
  # Define endpoint for known token pairs on Optimism network
  # You can add more pairs, networks and exchanges here.
  if (pair == "MTA-USDC" && network == "optimism" && exchange == "velodromeV2") {
    ep = "optimism/0x8453cc52f2108ff9d1636b6a108db06ac137b72f"
  }
  if (pair == "alETH-WETH" && network == "optimism" && exchange == "velodromeV2") {
    ep = "/optimism/0xa1055762336f92b4b8d2edc032a0ce45ead6280a"
  }
  
  url = paste0(url, ep)
  
  # Make GET request to the API
  response <- GET(url)
  
  # Check if request was successful
  if (response$status_code == 200) {
    data <- fromJSON(content(response, "text"))
    # Return either USD or native price
    if (!native) {
      return(as.numeric(data$pairs$priceUsd))
    } else {
      return(data$pairs$priceNative)
    }
  } else {
    cat("Error:", http_status(response)$reason, "\n")
    return(NULL)
  }
}

# Infinite loop to check prices and send alerts if thresholds are met
while (1) {
  # Monitor MTA-USDC pair on Optimism
  pair = "MTA-USDC"
  network = "optimism"
  exchange = "velodromeV2"
  price = ds_price(pair = pair, network = network, exchange = exchange)
  
  # Send alert if price is below threshold
  if (price <= 0.31) {
    discord(msg = paste0(pair, " Price is: ", price), channel = "#price-alerts")
  }
  
  # Monitor alETH-WETH pair on Optimism
  pair = "alETH-WETH"
  network = "optimism"
  exchange = "velodromeV2"
  Sys.sleep(0.5)  # Avoid rate limiting
  price = ds_price(pair = pair, network = network, exchange = exchange, native = TRUE)
  
  # Send alert if price is below threshold
  if (price <= 0.92) {
    discord(msg = paste0(pair, " Price is: ", price), channel = "#price-alerts")
  }
}
