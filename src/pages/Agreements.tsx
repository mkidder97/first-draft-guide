import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Agreements() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Agreements</h1>
      <Card>
        <CardHeader>
          <CardTitle>Service Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Agreements list coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
