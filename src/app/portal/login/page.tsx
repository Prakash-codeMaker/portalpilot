"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/primitives";

export default function PortalLoginPage() {
  const router = useRouter();
  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-[22px] font-medium">Sign in</h1>
      <p className="mt-2 text-[13px] text-muted">Demo credentials are accepted. This portal exists only to exercise observation and postcondition checks.</p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          router.push("/portal/dashboard");
        }}
      >
        <label className="block text-[13px]">
          Username
          <input name="username" defaultValue="operator" className="mt-1 h-9 w-full rounded-md border border-line px-3" />
        </label>
        <label className="block text-[13px]">
          Password
          <input name="password" type="password" defaultValue="demo" className="mt-1 h-9 w-full rounded-md border border-line px-3" />
        </label>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </Card>
  );
}
