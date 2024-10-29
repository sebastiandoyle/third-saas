import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { loadStripe } from '@stripe/stripe-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await checkSubscription(session.user);
      } else {
        setUser(null);
        setSubscription(null);
      }
      setLoading(false);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) await checkSubscription(user);
      setLoading(false);
    } catch (error) {
      console.error('Error checking user:', error);
      setLoading(false);
    }
  }

  async function checkSubscription(user) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(null);
    }
  }

  async function handleSubscribe() {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email
        }),
      });

      const { sessionId, error } = await response.json();
      if (error) throw new Error(error);

      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) throw stripeError;
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formEmail,
        password: formPassword,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });
      if (error) throw error;
      alert('Check your email for the confirmation link!');
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formEmail,
        password: formPassword,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      {!user ? (
        <div>
          <h1 className="text-2xl mb-4">Welcome</h1>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSignIn}
              className="w-full p-2 bg-blue-500 text-white rounded"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              className="w-full p-2 bg-green-500 text-white rounded"
            >
              Sign Up
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl">Welcome, {user.email}</h1>
            <button
              onClick={handleSignOut}
              className="p-2 bg-red-500 text-white rounded"
            >
              Sign Out
            </button>
          </div>
          
          {!subscription ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl mb-4">Premium Content</h2>
              <p className="mb-4">Subscribe to access exclusive content!</p>
              <button
                onClick={handleSubscribe}
                className="w-full p-2 bg-purple-500 text-white rounded"
              >
                Subscribe Now
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl mb-4">Premium Content</h2>
              <p>Thank you for subscribing! Here's your exclusive content.</p>
              {/* Add your premium content here */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}