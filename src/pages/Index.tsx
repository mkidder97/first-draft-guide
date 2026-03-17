import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import srcLogo from "@/assets/src-logo.png";

export default function Dashboard() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <img src={srcLogo} alt="SRC" className="h-10 w-10" />
        <h1 className="text-2xl font-bold text-foreground">SRC Client Portal</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to SRC Client Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Dashboard content coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
