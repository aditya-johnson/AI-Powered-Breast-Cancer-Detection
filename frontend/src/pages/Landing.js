import { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Landing = ({ onLogin }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email: formData.get("email"),
        full_name: formData.get("full_name"),
        password: formData.get("password"),
      });
      toast.success("Account created successfully!");
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: formData.get("email"),
        password: formData.get("password"),
      });
      toast.success("Welcome back!");
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="auth-container">
        <Card className="w-full max-w-md" data-testid="auth-card">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      name="full_name"
                      type="text"
                      placeholder="John Doe"
                      required
                      data-testid="register-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      data-testid="register-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      required
                      data-testid="register-password-input"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="register-submit-btn">
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-pink-500" />
            <span className="text-2xl font-bold text-white">MediScan AI</span>
          </div>
          <Button
            onClick={() => setShowAuth(true)}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            data-testid="nav-get-started-btn"
          >
            Get Started
          </Button>
        </nav>

        <div className="container mx-auto px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              AI-Powered Breast Cancer Detection
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Advanced artificial intelligence technology for early detection and risk assessment.
              Empowering proactive healthcare decisions.
            </p>
            <Button
              onClick={() => setShowAuth(true)}
              size="lg"
              className="bg-white text-pink-600 hover:bg-pink-50 px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
              data-testid="hero-get-started-btn"
            >
              Start Your Assessment
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50" data-testid="features-section">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900">
            Comprehensive Detection Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-pink-300 transition-all" data-testid="feature-card-image">
              <CardHeader>
                <Sparkles className="w-12 h-12 text-pink-500 mb-4" />
                <CardTitle>Image Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Upload mammogram images for AI-powered analysis using advanced deep learning models
                  trained on extensive medical datasets.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-pink-300 transition-all" data-testid="feature-card-risk">
              <CardHeader>
                <Shield className="w-12 h-12 text-pink-500 mb-4" />
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive risk evaluation based on medical history, family history, and lifestyle
                  factors with personalized recommendations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-pink-300 transition-all" data-testid="feature-card-reports">
              <CardHeader>
                <Activity className="w-12 h-12 text-pink-500 mb-4" />
                <CardTitle>Detailed Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Access historical analysis results, track changes over time, and share comprehensive
                  reports with your healthcare provider.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-white" data-testid="benefits-section">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900">
              Why Choose MediScan AI?
            </h2>
            <div className="space-y-6">
              {[
                "Advanced AI models trained on millions of medical images",
                "Fast and accurate preliminary analysis within seconds",
                "Secure and confidential data handling with HIPAA compliance",
                "Accessible from anywhere, anytime for your convenience",
                "Expert-reviewed algorithms for reliable results",
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-4" data-testid={`benefit-item-${idx}`}>
                  <CheckCircle2 className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                  <p className="text-lg text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button
                onClick={() => setShowAuth(true)}
                size="lg"
                className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-full"
                data-testid="benefits-get-started-btn"
              >
                Begin Your Journey to Better Health
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8" data-testid="footer">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 MediScan AI. This tool provides preliminary screening only. Always consult with
            healthcare professionals for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;