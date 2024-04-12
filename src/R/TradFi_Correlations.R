require(PerformanceAnalytics)
require(quantmod)
require(xts)

format_xts_ohlc = function(OHLC) {
  OHLC = data.frame(time = index(OHLC), Value = coredata(OHLC))
  time = OHLC[,1]
  open = OHLC[,2]
  low = OHLC[,4]
  close = OHLC[,5]
  high = OHLC[,3]
  vol = OHLC[,6]
  OHLC = c()
  OHLC = cbind(time,low,high,open,close,vol)
  colnames(OHLC) = c("time","low","high","open","close","volume")
  return(OHLC)         
}

symbol <- "^FTSE"

# Define the start and end dates
start_date <- "2008-01-01"
end_date <- "2023-11-1"

# Use getSymbols to retrieve FTSE data
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")

# Define the ticker symbol for SPY
symbol <- "ES=F"
# Define the start and end dates
# Use getSymbols to retrieve SPY data
getSymbols(symbol, from = start_datbtc_e, to = end_date, src = "yahoo")
ES <- `ES=F`
ES = to.monthly(ES, OHLC = TRUE, indexAt = "endof")

# Define the ticker symbol for CAC 40
symbol <- "^FCHI"

# Define the start and end dates

# Use getSymbols to retrieve CAC 40 data
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
FCHI = to.monthly(FCHI, OHLC = TRUE, indexAt = "endof")


# Define the ticker symbol for DAX
symbol <- "^GDAXI"

# Use getSymbols to retrieve DAX data
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
GDAXI = to.monthly(GDAXI, OHLC = TRUE, indexAt = "endof")

# Define the ticker symbol for DXY futures
symbol <- "DX=F"
# Use getSymbols to retrieve DXY data
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
DXY <- `DX=F`
DXY = to.monthly(DXY, OHLC = TRUE, indexAt = "endof")

# Define the ticker symbol for 10-Year U.S. Treasury Note futures
symbol <- "ZN=F"

# Use getSymbols to retrieve 10-Year Treasury Note data
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
TreasuryNote10 <- `ZN=F`
TreasuryNote10 = to.monthly(TreasuryNote10, OHLC = TRUE, indexAt = "endof")


symbol <- "CL=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
OilFutures <- `CL=F`
OilFutures = to.monthly(OilFutures, OHLC = TRUE, indexAt = "endof")

# Define the ticker symbol for COMEX Gold futures
symbol <- "GC=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
GoldFutures <- `GC=F`
GoldFutures = to.monthly(GoldFutures, OHLC = TRUE, indexAt = "endof")
symbol <- "NQ=F"
getSymbols(symbol, from = start_date, to = end_date, src = "yahoo")
NasdaqFutures <- `NQ=F`
NasdaqFutures = to.monthly(NasdaqFutures, OHLC = TRUE, indexAt = "endof")
returns = function(OHLC) { 
  returns = (Cl(OHLC) - Op(OHLC))/Op(OHLC)
  return(returns)
}
data = cbind(returns(ES),returns(NasdaqFutures),returns(FTSE),returns(FCHI),returns(GDAXI),returns(DXY),returns(TreasuryNote10),returns(OilFutures),returns(GoldFutures))

colnames(data) = c("ES","NQ","FTSE","CAC","DAX","DYX","10Y-Treasury","Oil","Gold")
chart.Correlation(data)
