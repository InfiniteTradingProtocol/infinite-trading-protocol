discord = function(msg,channel="#EXAMPLE") {
        require(httr)
        url = "https://discord.com/api/webhooks/"
        #ADD YOUR WEBHOOKS HERE
        if (channel == "#EXAMPLE") { ep = "1067355508521336912/k1NiM7RIHvg1uFTDT8CNnhN6hu4TA3WtXa9guMoVlRoRNYUdpTPVViOOeQa36cLxW7e-" }
        else if (channel == "#EXAMPLE2") { ep = "1179898763557101590/OVIjOgz-PC1820wpV9BfIzhUplkF3UFqhkF9h6jIsm-nMd9ZqHvwVYMAM3wLxamP7DuO" }
        full_url <- paste0(url, ep)
        response <- POST(full_url, body = list(content = msg), encode = "json")
        if (http_status(response)$category == "success") { print("Message sent successfully!") }
        else { print(paste("Failed to send message:", http_status(response)$reason)) }
}

#USAGE:
discord(msg="Hi world",channel="#EXAMPLE")
