import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ApiErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unable to load this page</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
