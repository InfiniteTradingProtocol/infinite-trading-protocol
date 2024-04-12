library(httr)
chat = function(space,message = "Hello from R bot!") { 
  if (space == "Space1") { webhook_url <- "https://chat.googleapis.com/v1/spaces/APISPACE1" }
  else if (space == "Space2") { webhook_url <- "https://chat.googleapis.com/v1/spaces/APISPACE2" }
  message <- list(text = message)
  # Make an HTTP POST request to the webhook URL
  response <- POST(webhook_url, body = message, encode = "json")
  # Check the response status
  if (http_status(response)$message == "Success: (200) OK") {
    print("Message sent successfully!")
  } else {
    print("Error sending message.")
  }
}


chat(space="Space name",message="Testing")
