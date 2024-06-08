###################################
## Staking Yield Per Epoch Chart ##
## Author: etherpilled           ##
###################################

library(tidyr)
library(ggplot2)
library(dplyr)

# Your initial data setup
factor <- 0.05
initial_values <- c(r1 = 0.20, r2 = 0.25, r3 = 0.3333, r4 = 0.50)
names <- c("r1", "r2", "r3", "r4")

# Creating a list to store vectors
vectors <- list()

# Loop to decrement values and store in list
for (name in names) {
  value <- initial_values[[name]]  # Corrected from 'wname' to 'name'
  vector <- value
  for (i in 2:10) {
    value <- value - (value * factor)
    vector <- c(vector, value)
  }
  vectors[[name]] <- vector
}

# Creating a data frame
df <- data.frame(epoch = 1:10,
                 r1 = vectors$r1,
                 r2 = vectors$r2,
                 r3 = vectors$r3,
                 r4 = vectors$r4)

# Melting data frame for use with ggplot, replacing old variable names
df_long <- pivot_longer(df, cols = -epoch, names_to = "variable", values_to = "value")
df_long$variable <- factor(df_long$variable, levels = c("r1", "r2", "r3", "r4"), labels = c("1y", "2y", "3y", "4y"))

# Plotting with custom colors and no grid lines
ggplot(df_long, aes(x = epoch, y = value, color = variable, group = variable)) +
  geom_line(size = 2) +
  scale_color_manual(values = c("#D7BCE8", "#A785D1", "#67417A", "#563063")) +
  theme_minimal(base_size = 14) +
  theme(
    plot.background = element_rect(fill = "#1E1E2D", color = NA),
    panel.background = element_rect(fill = "#1E1E2D"),
    panel.grid.major = element_blank(),
    panel.grid.minor = element_blank(),
    legend.background = element_rect(fill = "#1E1E2D"),
    text = element_text(color = "white"),
    axis.title = element_text(color = "white"),
    axis.text = element_text(color = "white")
  ) +
  labs(x = "Round", y = "Staking Compound Yield", color = "APY")
