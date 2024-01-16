# Install required packages if not already installed
# install.packages("httr")
# install.packages("jsonlite")

require(httr)
require(jsonlite)

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