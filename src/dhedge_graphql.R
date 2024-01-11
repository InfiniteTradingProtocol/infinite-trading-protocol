# Install required packages if not already installed
# install.packages("httr")
# install.packages("jsonlite")

require(httr)
require(jsonlite)

dhedge_graphql=function(query="composition"){
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
  
  return(result)
  
}