import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Success() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Thank you for subscribing!</h1>
        <p className="mb-4">Your subscription has been activated.</p>
        <p className="text-sm text-gray-600">You will be redirected automatically...</p>
      </div>
    </div>
  );
}