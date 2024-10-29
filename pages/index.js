// pages/index.js
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { loadStripe } from '@stripe/stripe-js';

// Log environment variables (except secrets)
console.log('Environment Check:', {
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasStripeKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  hasStripePrice: !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [debug, setDebug] = useState([]);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const addDebugMessage = (message, data = null) => {
    console.log(message, data);
    setDebug(prev => [`${new Date().toISOString()} - ${message}`, ...prev]);
  };

  useEffect(() => {
    addDebugMessage('Component mounted');
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      addDebugMessage('Auth state changed', { event, hasSession: !!session });
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
    addDebugMessage('Checking user');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) addDebugMessage('Error checking user', error);
    if (user) {
      addDebugMessage('User found', { id: user.id, email: user.email });
      setUser(user);
      checkSubscription(user);
    } else {
      addDebugMessage('No user found');
    }
    setLoading(false);
  }

  async function checkSubscription(user) {
    addDebugMessage('Checking subscription', { userId: user.id });
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      addDebugMessage('Error checking subscription', error);
    } else {
      addDebugMessage('Subscription status', subscription);
      setSubscription(subscription);
    }
  }

  async function handleSubscribe() {
    addDebugMessage('Starting subscription process');
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
      const data = await response.json();
      addDebugMessage('Checkout session created', data);

      if (data.error) {
        addDebugMessage('Error creating checkout session', data.error);
        alert(`Error: ${data.error}`);
        return;
      }

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (error) {
        addDebugMessage('Stripe redirect error', error);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      addDebugMessage('Subscription error', error);
      alert(`Error: ${error.message}`);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    addDebugMessage('Attempting sign in', { email: formEmail });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formEmail,
      password: formPassword,
    });
    
    if (error) {
      addDebugMessage('Sign in error', error);
      alert(`Sign in error: ${error.message}`);
    } else {
      addDebugMessage('Sign in successful', { user: data.user });
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    addDebugMessage('Attempting sign up', { email: formEmail });
    const { data, error } = await supabase.auth.signUp({
      email: formEmail,
      password: formPassword,
    });
    
    if (error) {
      addDebugMessage('Sign up error', error);
      alert(`Sign up error: ${error.message}`);
    } else {
      addDebugMessage('Sign up successful', { user: data.user });
      alert(data.user?.identities?.length === 0 
        ? 'Account already exists. Please sign in instead.' 
        : 'Check your email for verification link!');
    }
  }

  async function handleSignOut() {
    addDebugMessage('Attempting sign out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      addDebugMessage('Sign out error', error);
      alert(`Sign out error: ${error.message}`);
    } else {
      addDebugMessage('Sign out successful');
    }
  }

  if (loading) {
    return <div>Loading... Check console for debug information.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-bold mb-2">Debug Information:</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {debug.map((msg, i) => (
            <div key={i} className="mb-1">{msg}</div>
          ))}
        </pre>
      </div>

      {!user ? (
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl mb-4">Welcome</h1>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="block w-full mb-2 p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="block w-full mb-2 p-2 border rounded"
            />
            <button
              onClick={handleSignIn}
              className="w-full p-2 bg-blue-500 text-white rounded mb-2"
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

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-bold mb-2">Current State:</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify({ user, subscription, loading }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
