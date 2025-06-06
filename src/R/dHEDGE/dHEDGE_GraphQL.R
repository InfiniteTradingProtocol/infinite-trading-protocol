require(httr)
require(jsonlite)
fetchGraphQL <- function(operationsDoc, operationName, variables) {
  body <- list(query = operationsDoc,variables = variables,operationName = operationName)
  response <- POST(url = "https://api-v2.dhedge.org/graphql",body = body,encode = "json")
  content(response, as = "parsed", type = "application/json")
}

getPoolTrader <- function(protocol,pool) {
        if (protocol == "dhedge") {
                operationsDoc <- sprintf('query allFundsByAddresses { allFundsByAddresses(addresses: "%s") { traderAddress } }', pool)
                result <- fetchGraphQL(operationsDoc, "allFundsByAddresses", list())
                if ("errors" %in% names(result)) { cat("Error:", result$errors[[1]]$message, "\n"); return(NULL)  }
                else if ("data" %in% names(result) && length(result$data$allFundsByAddresses) > 0) { return(result$data$allFundsByAddresses[[1]]$traderAddress) }
                else { cat("No data found or invalid address provided.\n"); return(NULL) }
        }
}

getallFundsByTrader <- function(protocol,traderAddress) {
        if (protocol == "dhedge") {
                operationsDoc <- sprintf('query allFundsByTrader { allFundsByTrader(traderAddress: "%s") { address blockchainCode } }', traderAddress)
                result <- fetchGraphQL(operationsDoc, "allFundsByTrader", list())
                n_pools = length(result$data$allFundsByTrader)
                pools = c(); networks = c();
                if ("errors" %in% names(result)) { cat("Error:", result$errors[[1]]$message, "\n"); return(NULL)  }
                else if ("data" %in% names(result) && n_pools > 0) {
                        for (i in 1:n_pools) {
                                pools = c(pools,result$data$allFundsByTrader[[i]]$address)
                                networks = c(networks,result$data$allFundsByTrader[[i]]$blockchainCode)
                        }
                        return(cbind(pools,networks))
                }
                else { cat("No data found or invalid address provided.\n"); return(NULL) }
        }
}
getallFundsByTrader(protocol="dhedge",traderAddress="trader address here")

# Function to fetch the token price history for a pool
getPoolTokenPrice <- function(protocol, pool, period = "1y") {
  if (protocol == "dhedge") {
    operationsDoc <- sprintf('
      query tokenPriceHistory {
        tokenPriceHistory(address: "%s", period: "%s") {
          history {
            timestamp
            performance
            adjustedPerformance
            adjustedTokenPrice
            tokenPrice
          }
        }
      }
    ', pool, period)

    result <- fetchGraphQL(operationsDoc, "tokenPriceHistory", list())

    if ("errors" %in% names(result)) {
      cat("Error:", result$errors[[1]]$message, "\n")
      return(NULL)
    } else if ("data" %in% names(result) && length(result$data$tokenPriceHistory$history) > 0) {
         history = result$data$tokenPriceHistory$history
         n = length(history)
         timestamps = c(); adjustedTokenPrices = c()
         for (i in 1:n) {
                hist = history[[i]]
                timestamps = c(timestamps,as.numeric(hist$timestamp))
                adjustedTokenPrices = c(adjustedTokenPrices,hist$adjustedTokenPrice)
         }
             # If timestamps are in milliseconds, divide by 1000
        if (max(timestamps) > 1e10) {
                timestamps = timestamps / 1000
        }
         dates = as.POSIXct(timestamps, origin = "1970-01-01", tz = "UTC")
         return(cbind(dates,adjustedTokenPrices))
         #return(result$data$tokenPriceHistory$history)
    } else {
      cat("No data found or invalid parameters provided.\n")
      return(NULL)
    }
  }
}
dhedge_graphql=function(query="composition",name=NULL){
  # GraphQL endpoint URL
  graphql_url <- "https://api-v2.dhedge.org/graphql"
  
  # GraphQL query
  if (query=="composition") { 
  graphql_query <- '{
      allFundsByManager(managerAddress: "0xB77894742A426Fc1fcde52Fd13D1487210dcCabe") {
        fundComposition {
          amount
          tokenName
          id
          rate
          tokenAddress
        }
        id
        name
      }
    }'
  }  
  # Create a POST request with the GraphQL query
  response <- POST(
    url = graphql_url,
    add_headers("Content-Type" = "application/json"),
    body = list(query = graphql_query),
    encode = "json"
  )
  result <- content(response, "text") %>%
  fromJSON(flatten = TRUE)
  if (query == "composition") { 
    fund_names = res$data$allFundsByManager$name
    n = length(res$data$allFundsByManager$name)
    for (i in 1:n) { 
      if (is.null(name)) {
        print(paste0("Fund name: ",fund_names[i]))
        print(res$data$allFundsByManager$fundComposition[[i]])
      }
      else if (fund_names[i]==name) { 
        composition = res$data$allFundsByManager$fundComposition[[i]]
        return(composition)
      }
    }
  }
  return(result)
}
coin_amount = function(pool,coins) { 
  comp = dhedge_graphql(query="composition",name=pool)
  n = length(coins)
  tokens_amount = rep(0,n)
  for (i in 1:n) { 
    if (any(comp$tokenName == coins[i])) { 
      index = which(comp$tokenName == coins[i])
      tokens_amount[i] = as.numeric(comp$amount[index])
      if (name == "USDCe" || name == "USDT" || name == "USDC") { decimals = 6 }
      else if (name == "WBTC") { decimals = 8 }
      else { decimals = 18 }
      tokens_amount[i] = tokens_amount[i]/(10^decimals)
    }
  }
  return(tokens_amount)
}

while (1) {
  #Monitoring deposits
  name = "Inflation Hedge"
  deposits = coin_amount(pool=name,coins=c("USDCe","USDC"))
  if (deposits[1]  >= 10 || deposits[2] >= 10) {
    discord(msg=paste0("Vault: ",name," USD Balance: ",deposits[1]+deposits[2]),channel="#deposits-alerts")
  }
  name = "USD Savings Account"
  deposits = coin_amount(pool=name,coins=c("USDCe","USDC"))
  if (deposits[1]  >= 10 || deposits[2] >= 10) {
    discord(msg=paste0("Vault: ",name," USD Balance: ",deposits[1]+deposits[2]),channel="#deposits-alerts")
  }
  name = "Ethereum Savings Account"
  deposits = coin_amount(pool=name,coins=c("WETH"))
  if (deposits >= 0.01) {
    discord(msg=paste0("Vault: ",name," WETH Balance: ",deposits[1]),channel="#deposits-alerts")
  }
  Sys.sleep(1)
}
