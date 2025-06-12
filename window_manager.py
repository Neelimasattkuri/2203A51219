from collections import deque

class SlidingWindowManager:
    def __init__(self, window_size=10):
        """
        Initialize a sliding window manager with a specified window size.
        
        Args:
            window_size (int): Maximum size of the sliding window
        """
        self.window_size = window_size
        self.window = deque(maxlen=window_size)
        self.unique_set = set()
    
    def add_numbers(self, numbers):
        """
        Add new numbers to the sliding window, maintaining uniqueness and window size.
        
        Args:
            numbers (list): List of numbers to add to the window
        """
        for num in numbers:
            # Only add unique numbers
            if num not in self.unique_set:
                # If window is full, remove the oldest element
                if len(self.window) == self.window_size:
                    oldest = self.window.popleft()
                    self.unique_set.remove(oldest)
                
                # Add the new number
                self.window.append(num)
                self.unique_set.add(num)
    
    def get_window_copy(self):
        """
        Get a copy of the current window state.
        
        Returns:
            list: Copy of the current window
        """
        return list(self.window)
    
    def calculate_average(self):
        """
        Calculate the average of numbers in the current window.
        
        Returns:
            float: Average of numbers in the window, or 0 if window is empty
        """
        if not self.window:
            return 0
        
        return sum(self.window) / len(self.window)
