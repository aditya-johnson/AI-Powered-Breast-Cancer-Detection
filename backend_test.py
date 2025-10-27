import requests
import sys
import json
import os
from datetime import datetime
from io import BytesIO
from PIL import Image
import base64

class BreastCancerAPITester:
    def __init__(self, base_url="https://breast-ai-scan.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name}: {'PASS' if success else 'FAIL'}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                    self.log_test(name, True, details)
                    return True, response_data
                except:
                    self.log_test(name, True, details)
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Error: {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@example.com",
            "full_name": "Test User",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # First register a user
        test_email = f"login_test_{datetime.now().strftime('%H%M%S')}@example.com"
        register_data = {
            "email": test_email,
            "full_name": "Login Test User",
            "password": "LoginTest123!"
        }
        
        # Register user
        success, _ = self.run_test(
            "Pre-Login Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not success:
            return False
        
        # Now test login
        login_data = {
            "email": test_email,
            "password": "LoginTest123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return success and 'token' in response

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
        
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_medical_history_crud(self):
        """Test medical history CRUD operations"""
        if not self.token:
            self.log_test("Medical History CRUD", False, "No token available")
            return False
        
        # Test creating medical history
        history_data = {
            "age": 35,
            "family_history": True,
            "previous_biopsies": False,
            "hormone_therapy": False,
            "first_pregnancy_age": 28,
            "menstruation_age": 13,
            "breast_density": "normal"
        }
        
        success, _ = self.run_test(
            "Create Medical History",
            "POST",
            "medical-history",
            200,
            data=history_data
        )
        
        if not success:
            return False
        
        # Test getting medical history
        return self.run_test("Get Medical History", "GET", "medical-history", 200)[0]

    def create_test_image(self):
        """Create a test image for upload"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='white')
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        return img_buffer

    def test_image_analysis(self):
        """Test image analysis endpoint"""
        if not self.token:
            self.log_test("Image Analysis", False, "No token available")
            return False
        
        # Create test image
        test_image = self.create_test_image()
        
        files = {
            'file': ('test_mammogram.png', test_image, 'image/png')
        }
        
        return self.run_test(
            "Image Analysis",
            "POST",
            "analyze-image",
            200,
            files=files
        )[0]

    def test_risk_assessment(self):
        """Test risk assessment endpoint"""
        if not self.token:
            self.log_test("Risk Assessment", False, "No token available")
            return False
        
        assessment_data = {
            "age": 45,
            "family_history": True,
            "previous_biopsies": False,
            "hormone_therapy": True,
            "first_pregnancy_age": 25,
            "menstruation_age": 12,
            "breast_density": "dense"
        }
        
        return self.run_test(
            "Risk Assessment",
            "POST",
            "risk-assessment",
            200,
            data=assessment_data
        )[0]

    def test_get_analyses(self):
        """Test getting user analyses"""
        if not self.token:
            self.log_test("Get Analyses", False, "No token available")
            return False
        
        return self.run_test("Get Analyses", "GET", "analyses", 200)[0]

    def test_invalid_token(self):
        """Test API with invalid token"""
        original_token = self.token
        self.token = "invalid_token_123"
        
        success, _ = self.run_test(
            "Invalid Token Test",
            "GET",
            "auth/me",
            401
        )
        
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Breast Cancer Detection API Tests")
        print("=" * 60)
        
        # Test basic connectivity
        self.test_root_endpoint()
        
        # Test authentication
        if self.test_user_registration():
            self.test_get_current_user()
        
        self.test_user_login()
        
        # Test medical history
        self.test_medical_history_crud()
        
        # Test AI features (these might take longer)
        print("\n🤖 Testing AI Features (may take 30-60 seconds)...")
        self.test_image_analysis()
        self.test_risk_assessment()
        
        # Test data retrieval
        self.test_get_analyses()
        
        # Test security
        self.test_invalid_token()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = BreastCancerAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())