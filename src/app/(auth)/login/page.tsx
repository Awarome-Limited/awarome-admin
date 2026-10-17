import { AwaromeMark } from '@/components/awarome-mark';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-nav p-4">
      <div className="flex w-full max-w-[400px] flex-col gap-7">
        <div className="flex items-center justify-center gap-2.5 text-white">
          <AwaromeMark className="h-8 w-[30px]" />
          <span className="font-heading text-[24px] leading-none font-extrabold tracking-[-0.04em]">
            awarome
          </span>
          <span className="rounded-full border border-[#FFD500]/40 px-2 py-[3px] text-[10.5px] font-semibold tracking-[0.08em] text-[#FFD500] uppercase">
            Admin
          </span>
        </div>
        <div className="flex flex-col gap-6 rounded-[10px] bg-card p-7">
          <div>
            <h1 className="font-heading text-[26px] leading-tight font-bold tracking-[-0.04em]">
              Sign in
            </h1>
            <p className="mt-1.5 text-[14px] text-foreground-secondary">
              Use your Awarome staff account.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
