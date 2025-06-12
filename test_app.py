import unittest
from unittest.mock import patch, MagicMock
from app import app
from window_manager import SlidingWindowManager

class TestWindowManager(unittest.TestCase):
    def setUp(self):
        self.window_manager = SlidingWindowManager(window_size=5)
    
    def test_add_numbers(self):
        # Test adding unique numbers
        self.window_manager.add_numbers([1, 2, 3])
        self.assertEqual(self.window_manager.get_window_copy(), [1, 2, 3])
        
        # Test adding duplicate numbers
        self.window_manager.add_numbers([3, 4, 5])
        self.assertEqual(self.window_manager.get_window_copy(), [1, 2, 3, 4, 5])
        
        # Test window overflow
        self.window_manager.add_numbers([6, 7])
        self.assertEqual(self.window_manager.get_window_copy(), [3, 4, 5, 6, 7])
    
    def test_calculate_average(self):
        self.window_manager.add_numbers([1, 2, 3, 4, 5])
        self.assertEqual(self.window_manager.calculate_average(), 3.0)
        
        # Test with empty window
        empty_manager = SlidingWindowManager()
        self.assertEqual(empty_manager.calculate_average(), 0)

class TestApp(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
    
    @patch('app.requests.get')
    def test_get_numbers_valid(self, mock_get):
        # Mock the external API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"numbers": [1, 2, 3, 4, 5]}
        mock_get.return_value = mock_response
        
        # Test with valid numberid
        response = self.app.get('/numbers/p')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('windowPrevstate', data)
        self.assertIn('windowCurrstate', data)
        self.assertIn('numbers', data)
        self.assertIn('avg', data)
    
    def test_get_numbers_invalid(self):
        # Test with invalid numberid
        response = self.app.get('/numbers/x')
        self.assertEqual(response.status_code, 400)
    
    @patch('app.requests.get')
    def test_get_numbers_timeout(self, mock_get):
        # Mock a timeout exception
        mock_get.side_effect = TimeoutError("Request timed out")
        
        # Test timeout handling
        response = self.app.get('/numbers/p')
        self.assertEqual(response.status_code, 500)

if __name__ == '__main__':
    unittest.main()
