def calculate_correlation(x, y):
    """Calculate Pearson correlation coefficient between two arrays"""
    if len(x) != len(y) or len(x) == 0:
        return 0
    
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    sum_x_squared = sum((x[i] - mean_x) ** 2 for i in range(n))
    sum_y_squared = sum((y[i] - mean_y) ** 2 for i in range(n))
    
    denominator = (sum_x_squared * sum_y_squared) ** 0.5
    
    if denominator == 0:
        return 0
    
    return numerator / denominator

def calculate_stats(data):
    """Calculate mean and standard deviation"""
    if not data:
        return {"average": 0, "stdDev": 0}
    
    n = len(data)
    mean = sum(data) / n
    
    if n == 1:
        return {"average": mean, "stdDev": 0}
    
    variance = sum((x - mean) ** 2 for x in data) / (n - 1)
    std_dev = variance ** 0.5
    
    return {"average": mean, "stdDev": std_dev}

def calculate_covariance(x, y):
    """Calculate covariance between two arrays"""
    if len(x) != len(y) or len(x) == 0:
        return 0
    
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    covariance = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n)) / (n - 1)
    return covariance
