
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy } from "lucide-react";

const LicenseGenerator = () => {
  const location = useLocation();
  const [storeName, setStoreName] = useState(location.state?.storeName || "");
  const [months, setMonths] = useState("1");
  // Standalone app: no license generation logic needed

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>License Key Generator</CardTitle>
          {/* Standalone app: no license generation needed */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Store Name</label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Lahore Coffee Shop"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Duration</label>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* License generation and copy disabled for standalone */}
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseGenerator;
