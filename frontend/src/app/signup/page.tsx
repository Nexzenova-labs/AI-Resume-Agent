import { AuthRedirect } from "@/components/auth-redirect";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <AuthRedirect>
      <AuthForm mode="signup" />
    </AuthRedirect>
  );
}

