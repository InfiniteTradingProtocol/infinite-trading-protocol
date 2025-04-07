# ==============================================================================
# Infinite Trading Protocol - Candle Data Fetcher
# Author: etherpilled
# 
# Description:
# This R script defines two functions (`get_candles` and `get_candles_with_retry`) 
# for fetching historical candlestick data from the Coinbase Exchange API.
# It supports multiple timeframes including 1m, 5m, 15m, 1h, 6h, 1d, and 1w.
#
# The core function `get_candles()` fetches OHLCV (Open, High, Low, Close, Volume) 
# data for a given trading pair and timeframe using Coinbase’s public REST API.
# The `get_candles_with_retry()` function adds retry logic to handle temporary 
# failures, rate limits, or IP bans gracefully.
#
# Usage:
# Call `get_candles_with_retry(pair, numcandles, timeframe)` where:
#   - `pair` is a trading pair like "BTC-USD" or "ETH-USD"
#   - `numcandles` is the number of candles to retrieve (up to Coinbase's limit)
#   - `timeframe` is one of: "1m", "5m", "15m", "1h", "6h", "1d", or "1w"
#
# Example:
# candles <- get_candles_with_retry(pair = "BTC-USD", numcandles = 300, timeframe = "1h")
# print(candles)
#
# Note:
# The Coinbase API returns data in descending order (latest first). You may want 
# to reverse it for chronological processing:
#   candles <- candles[nrow(candles):1, ]
#
# Dependencies: httr, jsonlite, lubridate
# ==============================================================================


require(httr)
require(jsonlite)
require(lubridate)

# Mapping timeframes to their equivalent durations in seconds
timeframe_to_seconds <- list(
  '1m' = 60,
  '5m' = 300,
  '15m' = 900,
  '1h' = 3600,
  '6h' = 21600,
  '1d' = 86400,
  '1w' = 604800
)

get_candles <- function(pair, numcandles, timeframe) {
  # Convert pair format, e.g., BTC_USD to BTC-USD
  product_id <- gsub("_", "-", pair)
  
  # Convert timeframe to seconds
  granularity <- timeframe_to_seconds[[timeframe]]
  
  if (is.null(granularity)) {
    cat(sprintf("Error: Granularity for timeframe '%s' is not defined.\n", timeframe))
    return(NULL)
  }
  
  url <- sprintf("https://api.exchange.coinbase.com/products/%s/candles", product_id)
  params <- list(granularity = granularity)
  
  tryCatch({
    response <- GET(url, query = params)
    
    if (status_code(response) >= 400) {
      stop(sprintf("HTTP error occurred: %d - %s", status_code(response), content(response, "text")))
    }
    
    candles <- fromJSON(content(response, "text"), flatten = TRUE)
    
    # Return only the last `numcandles` if available
    if (length(candles) > numcandles) {
      return(candles[1:numcandles, ])
    } else {
      return(candles)
    }
    
  }, error = function(e) {
    cat(sprintf("Error fetching candles: %s\n", e$message))
    return(NULL)
  })
}

get_candles_with_retry <- function(pair, numcandles, timeframe, retries = 3, delay = 1) {
  attempt <- 0
  while (attempt < retries) {
    tryCatch({
      candles <- get_candles(pair, numcandles, timeframe)
      if (!is.null(candles)) {
        return(candles)
      }
    }, error = function(e) {
      cat(sprintf("Error fetching candles: %s\n", e$message))
      if (grepl("ban", tolower(e$message)) || grepl("403", e$message) || grepl("rate limit", tolower(e$message))) {
        cat("It looks like your IP might be banned or rate-limited.\n")
        break
      }
    })
    attempt <- attempt + 1
    cat(sprintf("Retrying... (%d/%d)\n", attempt, retries))
    Sys.sleep(delay)
  }
  return(NULL)
}

## EXAMPLE
candles <- get_candles_with_retry(pair = "BTC-USD", numcandles = 300, timeframe = "1h")
#Print 300 1h candles for BTC-USD 
print(candles)
