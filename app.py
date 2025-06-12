from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from window_manager import SlidingWindowManager
import logging
from datetime import datetime, timedelta
import json
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS properly
CORS(app, origins=["http://localhost:3000", "https://*.vercel.app"], 
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# API Configuration
API_BASE_URL = "http://20.244.56.144"
AUTH_ENDPOINT = f"{API_BASE_URL}/evaluation-service/auth"
STOCKS_ENDPOINT = f"{API_BASE_URL}/evaluation-service/stocks"

# Authentication credentials
AUTH_CREDENTIALS = {
    "email": "2203a51219@sru.edu.in",
    "name": "sattkuri neelima",
    "rollNo": "2203a51219",
    "accessCode": "MVGwEF",
    "clientID": "b7100841-023b-4002-9f2d-1305821dd5f6",
    "clientSecret": "SYhKDzSvwcNRVHQg"
}

# Global variables for token management
access_token = None
token_expiry = None

# Initialize sliding window managers for different number types
window_managers = {
    'p': SlidingWindowManager(),  # Prime
    'f': SlidingWindowManager(),  # Fibonacci
    'e': SlidingWindowManager(),  # Even
    'r': SlidingWindowManager(),  # Random
}

def authenticate():
    """Authenticate with the evaluation service and get access token"""
    global access_token, token_expiry
    
    try:
        logger.info("Authenticating with evaluation service...")
        response = requests.post(
            AUTH_ENDPOINT,
            json=AUTH_CREDENTIALS,
            timeout=15,
            headers={'Content-Type': 'application/json'}
        )
        
        logger.info(f"Auth response status: {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            access_token = auth_data.get('access_token')
            expires_in = auth_data.get('expires_in', 3600)  # Default 1 hour
            token_expiry = datetime.now() + timedelta(seconds=expires_in)
            
            logger.info(f"Authentication successful. Token expires at: {token_expiry}")
            return True
        else:
            logger.error(f"Authentication failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Authentication request failed: {str(e)}")
        return False

def is_token_valid():
    """Check if the current token is valid and not expired"""
    if not access_token or not token_expiry:
        return False
    
    # Check if token expires in the next 5 minutes
    return datetime.now() < (token_expiry - timedelta(minutes=5))

def get_valid_token():
    """Get a valid access token, refreshing if necessary"""
    if not is_token_valid():
        logger.info("Token invalid or expired, re-authenticating...")
        if not authenticate():
            return None
    return access_token

def generate_mock_stock_data(symbol, minutes=30):
    """Generate mock stock data for testing when API is unavailable"""
    base_prices = {
        'AAPL': 175, 'GOOGL': 140, 'MSFT': 380, 'AMZN': 145,
        'TSLA': 250, 'META': 320, 'NVDA': 480, 'NFLX': 450
    }
    
    base_price = base_prices.get(symbol, 100)
    data = []
    now = datetime.now()
    
    for i in range(minutes):
        timestamp = now - timedelta(minutes=minutes-i-1)
        # Add some randomness to the price
        price_variation = (hash(f"{symbol}{i}") % 1000) / 100 - 5  # -5 to +5 variation
        price = base_price + price_variation
        
        data.append({
            'timestamp': timestamp.isoformat(),
            'price': round(price, 2),
            'time': timestamp.strftime('%H:%M')
        })
    
    return data

@app.route('/api/auth/status', methods=['GET', 'OPTIONS'])
def auth_status():
    """Check authentication status"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        token = get_valid_token()
        return jsonify({
            "authenticated": token is not None,
            "token_expires": token_expiry.isoformat() if token_expiry else None,
            "status": "connected" if token else "disconnected",
            "api_endpoint": STOCKS_ENDPOINT
        })
    except Exception as e:
        logger.error(f"Error in auth_status: {str(e)}")
        return jsonify({
            "authenticated": False,
            "token_expires": None,
            "status": "error",
            "error": str(e)
        })

@app.route('/api/stocks', methods=['GET', 'OPTIONS'])
def get_all_stocks():
    """Get list of available stocks from the evaluation service"""
    if request.method == 'OPTIONS':
        return '', 200
        
    token = get_valid_token()
    if not token:
        logger.warning("No valid token, returning default stocks")
        default_stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX']
        return jsonify({"stocks": default_stocks, "source": "default"})
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(STOCKS_ENDPOINT, headers=headers, timeout=10)
        
        logger.info(f"Stocks API response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # The API might return stocks in different formats, handle both
            if isinstance(data, list):
                stocks = data
            elif isinstance(data, dict) and 'stocks' in data:
                stocks = data['stocks']
            else:
                # If we can't parse the response, use defaults
                stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META']
            
            return jsonify({"stocks": stocks, "source": "api"})
        else:
            logger.warning(f"Stocks API returned {response.status_code}, using defaults")
            default_stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META']
            return jsonify({"stocks": default_stocks, "source": "default"})
            
    except requests.exceptions.RequestException as e:
        logger.warning(f"Error fetching stocks, using defaults: {str(e)}")
        default_stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META']
        return jsonify({"stocks": default_stocks, "source": "default"})

@app.route('/api/stocks/<symbol>', methods=['GET', 'OPTIONS'])
def get_stock_data(symbol):
    """Get stock data for a specific symbol with time range"""
    if request.method == 'OPTIONS':
        return '', 200
        
    # Get minutes parameter from query string
    minutes = request.args.get('minutes', 30, type=int)
    
    token = get_valid_token()
    
    if not token:
        logger.warning("No valid token, using mock data")
        mock_data = generate_mock_stock_data(symbol, minutes)
        prices = [item['price'] for item in mock_data]
        average = sum(prices) / len(prices) if prices else 0
        
        return jsonify({
            'symbol': symbol,
            'data': mock_data,
            'average': round(average, 2),
            'count': len(mock_data),
            'timeRange': minutes,
            'source': 'mock'
        })
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try the evaluation service API
        response = requests.get(
            f"{STOCKS_ENDPOINT}/{symbol}",
            headers=headers,
            timeout=10
        )
        
        logger.info(f"Stock API response for {symbol}: {response.status_code}")
        
        if response.status_code == 200:
            stock_data = response.json()
            logger.info(f"Raw stock data: {stock_data}")
            
            # Process the response based on the actual API format
            processed_data = []
            
            # Handle different possible response formats
            if isinstance(stock_data, dict):
                if 'data' in stock_data and isinstance(stock_data['data'], list):
                    # Format: {"data": [{"timestamp": "...", "price": ...}, ...]}
                    raw_data = stock_data['data']
                elif 'prices' in stock_data and isinstance(stock_data['prices'], list):
                    # Format: {"prices": [{"timestamp": "...", "price": ...}, ...]}
                    raw_data = stock_data['prices']
                elif isinstance(stock_data.get('stockData'), list):
                    # Format: {"stockData": [...]}
                    raw_data = stock_data['stockData']
                else:
                    # If it's a direct list or other format
                    raw_data = stock_data if isinstance(stock_data, list) else []
            else:
                raw_data = stock_data if isinstance(stock_data, list) else []
            
            # Process the raw data
            for item in raw_data[-minutes:]:  # Get last n minutes
                try:
                    if isinstance(item, dict):
                        timestamp_str = item.get('timestamp') or item.get('time') or datetime.now().isoformat()
                        price_val = item.get('price') or item.get('value') or 0
                        
                        # Parse timestamp
                        try:
                            if 'T' in timestamp_str:
                                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                            else:
                                timestamp = datetime.now()
                        except:
                            timestamp = datetime.now()
                        
                        processed_data.append({
                            'timestamp': timestamp_str,
                            'price': float(price_val),
                            'time': timestamp.strftime('%H:%M')
                        })
                except (ValueError, TypeError, KeyError) as e:
                    logger.warning(f"Error processing data item {item}: {e}")
                    continue
            
            if processed_data:
                # Calculate average
                prices = [item['price'] for item in processed_data]
                average = sum(prices) / len(prices) if prices else 0
                
                return jsonify({
                    'symbol': symbol,
                    'data': processed_data,
                    'average': round(average, 2),
                    'count': len(processed_data),
                    'timeRange': minutes,
                    'source': 'api'
                })
            else:
                logger.warning(f"No valid data processed for {symbol}, using mock data")
        else:
            logger.warning(f"Stock API returned {response.status_code} for {symbol}")
            
    except requests.exceptions.RequestException as e:
        logger.warning(f"Error fetching stock data for {symbol}: {str(e)}")
    
    # Fallback to mock data
    mock_data = generate_mock_stock_data(symbol, minutes)
    prices = [item['price'] for item in mock_data]
    average = sum(prices) / len(prices) if prices else 0
    
    return jsonify({
        'symbol': symbol,
        'data': mock_data,
        'average': round(average, 2),
        'count': len(mock_data),
        'timeRange': minutes,
        'source': 'mock'
    })

@app.route('/api/correlation', methods=['GET', 'OPTIONS'])
def get_correlation_data():
    """Get correlation data for multiple stocks"""
    if request.method == 'OPTIONS':
        return '', 200
        
    minutes = request.args.get('minutes', 30, type=int)
    symbols = request.args.getlist('symbols')
    
    if not symbols:
        # Default symbols if none provided
        symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META']
    
    token = get_valid_token()
    stock_data_map = {}
    use_mock_data = not token
    
    if token:
        try:
            headers = {"Authorization": f"Bearer {token}"}
            
            # Fetch data for all symbols
            for symbol in symbols:
                try:
                    response = requests.get(
                        f"{STOCKS_ENDPOINT}/{symbol}",
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Extract prices from the response
                        prices = []
                        raw_data = []
                        
                        if isinstance(data, dict):
                            if 'data' in data and isinstance(data['data'], list):
                                raw_data = data['data']
                            elif 'prices' in data and isinstance(data['prices'], list):
                                raw_data = data['prices']
                            elif isinstance(data.get('stockData'), list):
                                raw_data = data['stockData']
                        elif isinstance(data, list):
                            raw_data = data
                        
                        for item in raw_data[-minutes:]:
                            try:
                                if isinstance(item, dict):
                                    price_val = item.get('price') or item.get('value') or 0
                                    prices.append(float(price_val))
                                elif isinstance(item, (int, float)):
                                    prices.append(float(item))
                            except (ValueError, TypeError):
                                continue
                        
                        if prices:
                            stock_data_map[symbol] = prices
                            logger.info(f"Fetched {len(prices)} prices for {symbol}")
                    
                except requests.exceptions.RequestException as e:
                    logger.warning(f"Failed to fetch data for {symbol}: {str(e)}")
                    continue
            
            if not stock_data_map:
                logger.warning("No API data available, using mock data")
                use_mock_data = True
                
        except Exception as e:
            logger.warning(f"Error in correlation API calls: {str(e)}, using mock data")
            use_mock_data = True
    
    # Use mock data if API is not available
    if use_mock_data:
        for symbol in symbols:
            mock_data = generate_mock_stock_data(symbol, minutes)
            prices = [item['price'] for item in mock_data]
            stock_data_map[symbol] = prices
    
    if not stock_data_map:
        return jsonify({"error": "No stock data available"}), 404
    
    # Calculate correlations and statistics
    try:
        from math_utils import calculate_correlation, calculate_stats
        
        correlations = {}
        statistics = {}
        
        for symbol1 in stock_data_map:
            correlations[symbol1] = {}
            statistics[symbol1] = calculate_stats(stock_data_map[symbol1])
            
            for symbol2 in stock_data_map:
                if symbol1 == symbol2:
                    correlations[symbol1][symbol2] = 1.0
                else:
                    correlation = calculate_correlation(
                        stock_data_map[symbol1], 
                        stock_data_map[symbol2]
                    )
                    correlations[symbol1][symbol2] = correlation
        
        return jsonify({
            'correlations': correlations,
            'statistics': statistics,
            'symbols': list(stock_data_map.keys()),
            'timeRange': minutes,
            'source': 'mock' if use_mock_data else 'api'
        })
        
    except Exception as e:
        logger.error(f"Error calculating correlations: {str(e)}")
        return jsonify({"error": f"Error calculating correlations: {str(e)}"}), 500

@app.route('/numbers/<numberid>', methods=['GET', 'OPTIONS'])
def get_numbers(numberid):
    """Original numbers endpoint for backward compatibility"""
    if request.method == 'OPTIONS':
        return '', 200
        
    # Validate numberid
    if numberid not in ['p', 'f', 'e', 'r']:
        logger.error(f"Invalid numberid: {numberid}")
        return jsonify({"error": "Invalid numberid. Use 'p', 'f', 'e', or 'r'."}), 400
    
    try:
        # Fetch numbers from the external API with timeout
        logger.info(f"Fetching numbers for type: {numberid}")
        response = requests.get(
            f"http://20.244.56.144/test/numbers/{numberid}", 
            timeout=0.5  # 500ms timeout
        )
        
        # Check if response is successful
        if response.status_code != 200:
            logger.error(f"External API returned status code: {response.status_code}")
            return jsonify({"error": f"External API returned status code: {response.status_code}"}), 500
        
        # Parse the response
        numbers = response.json().get('numbers', [])
        logger.info(f"Received numbers: {numbers}")
        
        # Get the window manager for this number type
        window_manager = window_managers[numberid]
        
        # Store the previous state before updating
        window_prev_state = window_manager.get_window_copy()
        
        # Update the window with new numbers
        window_manager.add_numbers(numbers)
        
        # Get the current state after updating
        window_curr_state = window_manager.get_window_copy()
        
        # Calculate the average
        avg = window_manager.calculate_average()
        
        # Prepare and return the response
        result = {
            "windowPrevstate": window_prev_state,
            "windowCurrstate": window_curr_state,
            "numbers": numbers,
            "avg": round(avg, 2)
        }
        
        logger.info(f"Returning result: {result}")
        return jsonify(result)
        
    except requests.exceptions.Timeout:
        logger.error("Request to external API timed out")
        return jsonify({"error": "Request to external API timed out"}), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data from external API: {str(e)}")
        return jsonify({"error": f"Error fetching data from external API: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Health check endpoint"""
    if request.method == 'OPTIONS':
        return '', 200
        
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "authenticated": is_token_valid(),
        "backend_running": True,
        "api_endpoint": STOCKS_ENDPOINT
    })

@app.route('/api/test-auth', methods=['GET', 'OPTIONS'])
def test_auth():
    """Test authentication endpoint"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        success = authenticate()
        return jsonify({
            "auth_success": success,
            "token_valid": is_token_valid(),
            "token_expires": token_expiry.isoformat() if token_expiry else None,
            "api_endpoint": STOCKS_ENDPOINT
        })
    except Exception as e:
        return jsonify({
            "auth_success": False,
            "error": str(e)
        })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Authenticate on startup
    logger.info("Starting Flask application...")
    logger.info(f"API Endpoint: {STOCKS_ENDPOINT}")
    authenticate()
    app.run(debug=True, host='0.0.0.0', port=5000)
