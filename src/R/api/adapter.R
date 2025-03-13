#' Executes a GET request to the Infinite Trading API with specified parameters.
#'
#' Author: etherpilled
#' Organization: Infinite Trading
#' Year: 2025
#'
#' Parameters:
#' @param api_key The API key required for authentication. Defaults to an initial key you must replace.
#' @param protocol Identifier for the trading protocol, e.g., 'dhedge'. Defaults to 'dhedge'.
#' @param pool The specific pool address to interact with. Must be specified by the user.
#' @param network The blockchain network to use, e.g., 'polygon', 'optimism', 'base', 'arbitrum'. Defaults to 'polygon'.
#' @param pair The trading pair to target, such as 'WBTC-USDC'. Must be specified by the user.
#' @param side Desired trading position ('long', 'cash', or 'short'). Must be specified by the user.
#' @param threshold Percentage threshold to trigger a trade to avoid excessive small trades. Defaults to 1.
#' @param max_usd Maximum USD amount for the trade. Defaults to 500.
#' @param slippage Maximum allowed slippage percentage. Defaults to 1.
#' @param share Percentage of the total trade amount. Defaults to 100.
#' @param platform The trading platform to use, e.g., 'uniswapV3'. Defaults to 'uniswapV3'.
#' @param retries Number of retry attempts in case of timeout or no response. Defaults to 3.
#' @param retry_delay Delay between retry attempts in seconds. Defaults to 30.
#' @param timeout Timeout for the API request in seconds. Defaults to 10.
#'
#' @return A list containing the API response in JSON format if successful.
#' @return A list with error status and message if failed.
#'
#' @examples
#' response <- trade(pair = "WBTC-USDC", side = "long")
#' print(response)
#'
#' @export
library(httr)

setSides <- function(
  api_key = "ADD YOUR API KEY HERE",
  protocol = "dhedge",
  pool = "ADD YOUR POOL ADDRESS HERE",
  network = "polygon",
  pair,
  side,
  threshold = 1,
  max_usd = 500,
  slippage = 1,
  share = 100,
  platform = "uniswapV3",
  retries = 3,
  retry_delay = 30,
  timeout = 10
) {
  side_mapping <- list(
    long = "long",
    cash = "neutral",
    short = "short"
  )
  
  if (!side %in% names(side_mapping)) {
    stop("Invalid side value. Must be 'long', 'cash', or 'short'.")
  }
  side_api <- side_mapping[[side]]
  
  params <- list(
    apiKey = api_key,
    protocol = protocol,
    pool = pool,
    network = network,
    pair = pair,
    side = side_api,
    threshold = threshold,
    max_usd = max_usd,
    slippage = slippage,
    share = share,
    platform = platform
  )
  
  endpoint <- "https://api.infinitetrading.io/setBot"
  
  for (attempt in seq_len(retries)) {
    tryCatch({
      response <- GET(endpoint, query = params, timeout(timeout))
      if (status_code(response) == 200) {
        print("Sides changed successfully")
        return(content(response, "parsed"))
      } else {
        print(paste("Failed with status code:", status_code(response)))
        return(list(error = status_code(response), message = content(response, "text")))
      }
    }, error = function(e) {
      if (grepl("Timeout", e$message)) {
        print("Request timed out. Retrying...")
      } else if (status_code(response) == 504) {
        print("Gateway Timeout. Retrying...")
      } else {
        print(paste("Request error occurred:", e$message))
        return(list(error = "request_failed", message = e$message))
      }
    })
    Sys.sleep(retry_delay)
  }
  
  print("Failed to execute trade after multiple attempts.")
  return(list(error = "timeout", message = "Failed to change sides after multiple attempts."))
} 

# Example usage to go long

response <- setSides(pair = "WBTC-USDC", side = "long")

# Example usage to go neutral (USDC)

response <- setSides(pair = "WBTC-USDC", side = "neutral")

# Example usage to go short (BTCBEAR1X)

response <- setSides(pair = "WBTC-USDC", side = "short")

print(response)
