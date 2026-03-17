import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
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
