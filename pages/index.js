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

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkSubscription(session.user);
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
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) checkSubscription(user);
    setLoading(false);
  }

  async function checkSubscription(user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setSubscription(subscription);
  }

  async function handleSubscribe() {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      });
      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        console.error('Error:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Check your email for verification link!');
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {!user ? (
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl mb-4">Welcome</h1>
          <form onSubmit={handleSignIn} className="mb-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="block w-full mb-2 p-2 border rounded"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="block w-full mb-2 p-2 border rounded"
            />
            <button
              type="submit"
              className="w-full p-2 bg-blue-500 text-white rounded"
            >
              Sign In
            </button>
          </form>
          <form onSubmit={handleSignUp}>
            <button
              type="submit"
              className="w-full p-2 bg-green-500 text-white rounded"
            >
              Sign Up
            </button>
          </form>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl mb-4">Welcome, {user.email}</h1>
          <button
            onClick={handleSignOut}
            className="p-2 bg-red-500 text-white rounded mb-4"
          >
            Sign Out
          </button>
          
          {!subscription?.status === 'active' ? (
            <div>
              <p className="mb-4">Subscribe to access premium content!</p>
              <button
                onClick={handleSubscribe}
                className="p-2 bg-purple-500 text-white rounded"
              >
                Subscribe
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl mb-4">Premium Content</h2>
              <p>Thank you for subscribing! Here's your premium content.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}