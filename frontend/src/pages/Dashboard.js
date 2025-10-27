import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Activity, Upload, FileText, LogOut, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Dashboard = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("image-analysis");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState(null);

  useEffect(() => {
    fetchAnalyses();
    fetchMedicalHistory();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get(`${API}/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalyses(response.data);
    } catch (error) {
      console.error("Failed to fetch analyses", error);
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      const response = await axios.get(`${API}/medical-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedicalHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch medical history", error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImageAnalysis = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an image");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(`${API}/analyze-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setAnalysisResult(response.data);
      toast.success("Analysis completed successfully!");
      fetchAnalyses();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRiskAssessment = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    const data = {
      age: parseInt(formData.get("age")),
      family_history: formData.get("family_history") === "true",
      previous_biopsies: formData.get("previous_biopsies") === "true",
      hormone_therapy: formData.get("hormone_therapy") === "true",
      first_pregnancy_age: formData.get("first_pregnancy_age") ? parseInt(formData.get("first_pregnancy_age")) : null,
      menstruation_age: formData.get("menstruation_age") ? parseInt(formData.get("menstruation_age")) : null,
      breast_density: formData.get("breast_density"),
    };

    try {
      const response = await axios.post(`${API}/risk-assessment`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalysisResult(response.data);
      toast.success("Risk assessment completed!");
      fetchAnalyses();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Assessment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMedicalHistory = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    const data = {
      age: parseInt(formData.get("age")),
      family_history: formData.get("family_history") === "true",
      previous_biopsies: formData.get("previous_biopsies") === "true",
      hormone_therapy: formData.get("hormone_therapy") === "true",
      first_pregnancy_age: formData.get("first_pregnancy_age") ? parseInt(formData.get("first_pregnancy_age")) : null,
      menstruation_age: formData.get("menstruation_age") ? parseInt(formData.get("menstruation_age")) : null,
      breast_density: formData.get("breast_density"),
    };

    try {
      await axios.post(`${API}/medical-history`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Medical history saved!");
      fetchMedicalHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "moderate":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getRiskIcon = (level) => {
    return level === "high" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="dashboard-page">
      {/* Header */}
      <header className="bg-white border-b" data-testid="dashboard-header">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-pink-500" />
            <span className="text-2xl font-bold text-gray-900">MediScan AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600" data-testid="user-name">Welcome, {user?.full_name}</span>
            <Button onClick={onLogout} variant="outline" data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="dashboard-tabs">
            <TabsTrigger value="image-analysis" data-testid="tab-image-analysis">
              <Upload className="w-4 h-4 mr-2" />
              Image Analysis
            </TabsTrigger>
            <TabsTrigger value="risk-assessment" data-testid="tab-risk-assessment">
              <Activity className="w-4 h-4 mr-2" />
              Risk Assessment
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <FileText className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Image Analysis Tab */}
          <TabsContent value="image-analysis" data-testid="image-analysis-content">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Mammogram</CardTitle>
                  <CardDescription>
                    Upload a mammogram image for AI-powered analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleImageAnalysis} className="space-y-4" data-testid="image-analysis-form">
                    <div className="space-y-2">
                      <Label htmlFor="image-upload">Select Image</Label>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        required
                        data-testid="image-upload-input"
                      />
                      {selectedFile && (
                        <p className="text-sm text-gray-600" data-testid="selected-file-name">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={loading} className="w-full" data-testid="analyze-image-btn">
                      {loading ? "Analyzing..." : "Analyze Image"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {analysisResult && analysisResult.analysis_type === "image" && (
                <Card className="border-2" data-testid="image-analysis-result">
                  <CardHeader>
                    <CardTitle>Analysis Result</CardTitle>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getRiskColor(analysisResult.risk_level)}`} data-testid="risk-level-badge">
                      {getRiskIcon(analysisResult.risk_level)}
                      <span className="font-semibold capitalize">{analysisResult.risk_level} Risk</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">AI Analysis:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap" data-testid="analysis-result-text">{analysisResult.result}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2" data-testid={`recommendation-${idx}`}>
                            <CheckCircle2 className="w-4 h-4 text-pink-500 flex-shrink-0 mt-1" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Risk Assessment Tab */}
          <TabsContent value="risk-assessment" data-testid="risk-assessment-content">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment Form</CardTitle>
                  <CardDescription>
                    Complete this form for a personalized risk assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRiskAssessment} className="space-y-4" data-testid="risk-assessment-form">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        min="18"
                        max="120"
                        defaultValue={medicalHistory?.age}
                        required
                        data-testid="age-input"
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="family_history">Family History of Breast Cancer</Label>
                      <Select name="family_history" defaultValue={medicalHistory?.family_history?.toString() || "false"} data-testid="family-history-select">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="previous_biopsies">Previous Biopsies</Label>
                      <Select name="previous_biopsies" defaultValue={medicalHistory?.previous_biopsies?.toString() || "false"} data-testid="previous-biopsies-select">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="hormone_therapy">Hormone Therapy</Label>
                      <Select name="hormone_therapy" defaultValue={medicalHistory?.hormone_therapy?.toString() || "false"} data-testid="hormone-therapy-select">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="first_pregnancy_age">Age at First Pregnancy (Optional)</Label>
                      <Input
                        id="first_pregnancy_age"
                        name="first_pregnancy_age"
                        type="number"
                        min="10"
                        max="60"
                        defaultValue={medicalHistory?.first_pregnancy_age}
                        data-testid="first-pregnancy-age-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="menstruation_age">Age at First Menstruation (Optional)</Label>
                      <Input
                        id="menstruation_age"
                        name="menstruation_age"
                        type="number"
                        min="8"
                        max="20"
                        defaultValue={medicalHistory?.menstruation_age}
                        data-testid="menstruation-age-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="breast_density">Breast Density</Label>
                      <Select name="breast_density" defaultValue={medicalHistory?.breast_density || "normal"} data-testid="breast-density-select">
                        <SelectTrigger>
                          <SelectValue placeholder="Select density" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fatty">Fatty</SelectItem>
                          <SelectItem value="scattered">Scattered</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="dense">Dense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading} className="flex-1" data-testid="calculate-risk-btn">
                        {loading ? "Calculating..." : "Calculate Risk"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveMedicalHistory}
                        variant="outline"
                        disabled={loading}
                        data-testid="save-history-btn"
                      >
                        Save History
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {analysisResult && analysisResult.analysis_type === "risk_assessment" && (
                <Card className="border-2" data-testid="risk-assessment-result">
                  <CardHeader>
                    <CardTitle>Risk Assessment Result</CardTitle>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getRiskColor(analysisResult.risk_level)}`} data-testid="risk-level-badge-assessment">
                      {getRiskIcon(analysisResult.risk_level)}
                      <span className="font-semibold capitalize">{analysisResult.risk_level} Risk</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">AI Assessment:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap" data-testid="assessment-result-text">{analysisResult.result}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2" data-testid={`assessment-recommendation-${idx}`}>
                            <CheckCircle2 className="w-4 h-4 text-pink-500 flex-shrink-0 mt-1" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" data-testid="history-content">
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
                <CardDescription>Your previous analyses and assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <p className="text-gray-500 text-center py-8" data-testid="no-history-message">
                    No analyses yet. Start by uploading an image or completing a risk assessment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis, idx) => (
                      <Card key={analysis.id} className="border" data-testid={`history-item-${idx}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">
                                {analysis.analysis_type === "image" ? "Image Analysis" : "Risk Assessment"}
                              </CardTitle>
                              <CardDescription>
                                {new Date(analysis.created_at).toLocaleString()}
                              </CardDescription>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${getRiskColor(analysis.risk_level)}`}>
                              {getRiskIcon(analysis.risk_level)}
                              <span className="font-semibold capitalize">{analysis.risk_level}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 line-clamp-3">{analysis.result}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;