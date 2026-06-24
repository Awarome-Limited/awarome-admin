import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-extrabold tracking-tight text-primary-foreground">
            A
          </div>
          <div>
            <CardTitle className="text-lg">Awarome Admin</CardTitle>
            <CardDescription className="mt-1">Sign in with your staff account</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
