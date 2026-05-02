export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Authentication Error</h1>
      <p className="mt-2 text-slate-600">
        There was an issue verifying your login. Please try signing in again.
      </p>
      <a
        href="/login"
        className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
      >
        Back to Login
      </a>
    </div>
  )
}
