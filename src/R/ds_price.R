wd = "/home/ubuntu/GitHub/Tradery-Development/"
source(paste0(wd,slack.R))
ds_price = function(pair,network,exchange,native=FALSE) {
  url <- "https://api.dexscreener.com/latest/dex/pairs/"
  ep = NULL
  if (pair == "MTA-USDC" && network == "optimism" && exchange == "velodromeV2") {
    ep = "optimism/0x8453cc52f2108ff9d1636b6a108db06ac137b72f"
  }
  if (pair == "alETH-WETH" && network == "optimism" && exchange == "velodromeV2") {
    ep = "/optimism/0xa1055762336f92b4b8d2edc032a0ce45ead6280a"
  }
  url = paste0(url,ep)
  # Make GET request to the API
  response <- GET(url)
  
  # Check if the request was successful (status code 200)
  if (response$status_code == 200) {
    # Parse JSON response
    data <- fromJSON(content(response, "text"))
    # Extract priceUsd value
    if (!native) { return(as.numeric(data$pairs$priceUsd)) }
    else { return(data$pairs$priceNative) }
    # Print the result
  } else {
    cat("Error:", http_status(response)$reason, "\n")
    return(NULL)
  }
}
while(1) { 
  pair = "MTA-USDC"; network = "optimism"; exchange = "velodromeV2"
  
  price = ds_price(pair=pair,network=network,exchange=exchange)
  if (price <= 0.31) { 
    discord(msg=paste0(pair," Price is: ",price),channel="#price-alerts")   
  }
  pair = "alETH-WETH"; network = "optimism"; exchange = "velodromeV2"
  Sys.sleep(0.5)
  price = ds_price(pair=pair,network=network,exchange=exchange,native=TRUE)
  if (price <= 0.92) { 
    discord(msg=paste0(pair," Price is: ",price),channel="#price-alerts")   
  }
}
