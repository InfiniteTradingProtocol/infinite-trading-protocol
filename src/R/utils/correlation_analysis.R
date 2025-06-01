# ------------------------------------------------------------------------------
# File: correlation_analysis.R
# Author: etherpilled
# Project: Infinite Trading Protocol
#
# Description:
# This script downloads historical financial data for various global indices,
# commodities, and futures from Yahoo Finance. It computes monthly returns for 
# each asset and visualizes their pairwise correlation using a correlation matrix.
# The aim is to observe macro-level relationships between asset classes.
#
# Dependencies:
# - PerformanceAnalytics
# - quantmod
# - xts
# ------------------------------------------------------------------------------

# Load necessary packages
require(PerformanceAnalytics)
require(quantmod)
require(xts)

# ------------------------------------------------------------------------------
# Helper Function: Format OHLC xts object to a standardized dataframe
# ------------------------------------------------------------------------------
format_xts_ohlc = function(OHLC) {
  OHLC = data.frame(time = index(OHLC), Value = coredata(OHLC))
  time = OHLC[,1]
  open = OHLC[,2]
  low = OHLC[,4]
  close = OHLC[,5]
  high = OHLC[,3]
  vol = OHLC[,6]
  OHLC = cbind(time, low, high, open, close, vol)
  colnames(OHLC) = c("time", "low", "high", "open", "close", "volume")
  return(OHLC)
}

# ------------------------------------------------------------------------------
# Define date range for historical data
# ------------------------------------------------------------------------------
start_date <- "2008-01-01"
end_date <- "2023-11-01"

# ------------------------------------------------------------------------------
# Download and process financial time series data
# ------------------------------------------------------------------------------

# FTSE 100 Index
symbol <- "^FTSE"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")

# S&P 500 E-mini Futures
symbol <- "ES=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
ES <- `ES=F`
ES <- to.monthly(ES, OHLC = TRUE, indexAt = "endof")

# CAC 40 Index
symbol <- "^FCHI"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
FCHI <- to.monthly(FCHI, OHLC = TRUE, indexAt = "endof")

# DAX Index
symbol <- "^GDAXI"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
GDAXI <- to.monthly(GDAXI, OHLC = TRUE, indexAt = "endof")

# U.S. Dollar Index Futures (DXY)
symbol <- "DX=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
DXY <- `DX=F`
DXY <- to.monthly(DXY, OHLC = TRUE, indexAt = "endof")

# 10-Year U.S. Treasury Note Futures
symbol <- "ZN=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
TreasuryNote10 <- `ZN=F`
TreasuryNote10 <- to.monthly(TreasuryNote10, OHLC = TRUE, indexAt = "endof")

# Crude Oil Futures (WTI)
symbol <- "CL=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
OilFutures <- `CL=F`
OilFutures <- to.monthly(OilFutures, OHLC = TRUE, indexAt = "endof")

# COMEX Gold Futures
symbol <- "GC=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
GoldFutures <- `GC=F`
GoldFutures <- to.monthly(GoldFutures, OHLC = TRUE, indexAt = "endof")

# Nasdaq 100 E-mini Futures
symbol <- "NQ=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
NasdaqFutures <- `NQ=F`
NasdaqFutures <- to.monthly(NasdaqFutures, OHLC = TRUE, indexAt = "endof")

# ------------------------------------------------------------------------------
# Helper Function: Compute monthly returns from OHLC data
# ------------------------------------------------------------------------------
returns = function(OHLC) { 
  return((Cl(OHLC) - Op(OHLC)) / Op(OHLC))
}

# ------------------------------------------------------------------------------
# Compute returns and merge data
# ------------------------------------------------------------------------------
data = cbind(
  returns(ES),
  returns(NasdaqFutures),
  returns(FTSE),
  returns(FCHI),
  returns(GDAXI),
  returns(DXY),
  returns(TreasuryNote10),
  returns(OilFutures),
  returns(GoldFutures)
)

colnames(data) = c("ES", "NQ", "FTSE", "CAC", "DAX", "DXY", "10Y-Treasury", "Oil", "Gold")

# ------------------------------------------------------------------------------
# Visualize correlations between asset returns
# ------------------------------------------------------------------------------
chart.Correlation(data)
