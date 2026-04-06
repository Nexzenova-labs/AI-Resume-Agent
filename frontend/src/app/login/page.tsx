import { AuthRedirect } from "@/components/auth-redirect";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <AuthRedirect>
      <AuthForm mode="login" />
    </AuthRedirect>
  );
}

