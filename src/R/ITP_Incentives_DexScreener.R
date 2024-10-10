#####################################################
## DexScreener Price Change and Liquidity Fetcher
## Author: etherpilled
## Project: Infinite Trading Protocol
## Description: This code fetches all the main 
## DexScreener LPs and returns the total amount 
## of ITP incentives for each pool in the current epoch.
#####################################################

# Load required packages
library(httr)
library(jsonlite)

# Function to fetch price, price change, and liquidity data from DexScreener
ds_price <- function(pair, network, exchange, native = FALSE, pricechange = FALSE, liquidity = FALSE) {
  
  # Define base URL for DexScreener API
  base_url <- "https://api.dexscreener.com/latest/dex/pairs/"
  
  # Set endpoint based on network and pair
  endpoint <- switch(
    network,
    "optimism" = "optimism/",
    "polygon" = "polygon/",
    stop("Unsupported network")
  )
  
  # Define contract address based on pair and exchange
  pair_contract <- switch(
    pair,
    "ITP-USDC" = "0xb84c932059a49e82c2c1bb96e29d59ec921998be",
    "ITP-wstETH" = "0xdad7b4c48b5b0be1159c674226be19038814ebf6",
    "ITP-WBTC" = "0x93e40c357c4dc57b5d2b9198a94da2bd1c2e89ca",
    "ITP-DHT" = "0x3d5cbc66c366a51975918a132b1809c34d5c6fa2",
    "ITP-xOpenX" = "0x44fb5dc428c65576d5fce5298cf1c77ea28cf2dc",
    "ITP-VELO" = "0xc04754f8027abbfe9eea492c9cc78b66946a07d1",
    "ITP-OP" = "0x79f1af622fe2c636a2d946f03a62d1dfc8ca6de4",
    stop("Unsupported pair")
  )
  
  # Construct the full URL for the API request
  url <- paste0(base_url, endpoint, pair_contract)
  response <- GET(url)
  print(paste0("Querying: ", url))
  
  # Check if the response is successful
  if (response$status_code == 200) {
    
    # Parse the JSON response
    data <- fromJSON(content(response, "text"))
    
    # Handle price change data
    if (pricechange) {
      price_change <- as.numeric(unlist(data$pair$priceChange))
      if (!native) {
        price_change <- c(price_change, as.numeric(data$pair$priceUsd))
      } else {
        price_change <- c(price_change, data$pair$priceNative)
      }
      return(price_change)
    }
    
    # Handle liquidity data
    if (liquidity) {
      data$pair$liquidity$price <- as.numeric(data$pair$priceUsd)
      return(data$pair$liquidity)
    }
    
    # Return price in USD or native token
    if (!native) {
      return(as.numeric(data$pair$priceUsd))
    } else {
      return(data$pair$priceNative)
    }
    
  } else {
    cat("Error:", http_status(response)$reason, "\n")
    return(NULL)
  }
}

#####################################################
# Main script to calculate liquidity and ITP incentives
#####################################################

# List of Liquidity Pairs (LPs)
lps <- c("ITP-USDC", "ITP-wstETH", "ITP-WBTC", "ITP-DHT", "ITP-xOpenX", "ITP-VELO", "ITP-OP")
usd_liquidity <- c()
prices <- c()

# Fetch data for each LP
for (lp in lps) {
  liquidity_data <- ds_price(pair = lp, network = "optimism", exchange = "velodromeV2", liquidity = TRUE)
  usd_liquidity <- c(usd_liquidity, liquidity_data$usd / 2)
  prices <- c(prices, liquidity_data$price)
  print(paste("LP:", lp, "Liquidity:", usd_liquidity[length(usd_liquidity)]))
}

# Calculate total USD liquidity
total_usd_liquidity <- sum(usd_liquidity)
print(paste("Total USD Liquidity (excluding ITP value):", total_usd_liquidity))

# Calculate weighted average price for ITP
weighted_price <- sum(prices * (usd_liquidity / total_usd_liquidity))
print(paste("Weighted ITP Price:", weighted_price))

# Set percentage of liquidity for incentives
percentage <- 0.02

# Calculate total ITP incentives
total_incentives <- (total_usd_liquidity * percentage) / weighted_price
print(paste("Total Weekly ITP Incentives:", total_incentives, "ITP"))

# Calculate and display incentives for each pool
print("Incentives for each pool this epoch:")
for (i in seq_along(lps)) {
  pool_incentives <- total_incentives * (usd_liquidity[i] / total_usd_liquidity)
  print(paste(lps[i], ":", pool_incentives, "ITP"))
}
