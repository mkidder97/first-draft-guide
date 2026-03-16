import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewClient() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">New Client</h1>
      <Card>
        <CardHeader>
          <CardTitle>Create a New Client</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">New Client form coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
