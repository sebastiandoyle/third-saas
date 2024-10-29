import os
import json

def create_project_structure():
    # Project root directory
    root_dir = "subscription-demo"
    
    # Create main project directory
    os.makedirs(root_dir, exist_ok=True)
    
    # Create subdirectories
    directories = [
        "pages",
        "pages/api",
        "pages/api/webhooks",
        "pages/auth",
        "styles"
    ]
    
    for directory in directories:
        os.makedirs(os.path.join(root_dir, directory), exist_ok=True)

    # Package.json content
    package_json = {
        "name": "subscription-demo",
        "version": "1.0.0",
        "private": True,
        "scripts": {
            "dev": "next dev",
            "build": "next build",
            "start": "next start"
        },
        "dependencies": {
            "@stripe/stripe-js": "^2.2.0",
            "@supabase/supabase-js": "^2.38.4",
            "micro": "^10.0.1",
            "next": "^14.0.3",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "stripe": "^14.5.0"
        }
    }

    # File contents
    files = {
        'package.json': json.dumps(package_json, indent=2),

        '.env.local': '''NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PRICE_ID=your_stripe_price_id''',

        'pages/index.js': '''import { useEffect, useState } from 'react';
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
}''',

        'pages/api/create-checkout-session.js': '''import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        userId: userId,
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}''',

        'pages/api/webhooks/stripe.js': '''import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handleSubscriptionChange(subscription, customerId) {
  const userId = subscription.metadata.userId;

  await supabase
    .from('subscriptions')
    .upsert({
      id: subscription.id,
      user_id: userId,
      status: subscription.status,
      price_id: subscription.items.data[0].price.id,
      quantity: subscription.items.data[0].quantity,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      created: new Date(subscription.created * 1000),
      ended_at: subscription.ended_at
        ? new Date(subscription.ended_at * 1000)
        : null,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object, event.data.object.customer);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}''',

        'pages/auth/callback.js': '''import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-xl font-bold mb-4">Completing sign in...</h1>
        <p>You will be redirected automatically.</p>
      </div>
    </div>
  );
}''',

        'pages/success.js': '''import { useEffect } from 'react';
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
}''',

        'pages/_app.js': '''import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp''',

        'styles/globals.css': '''@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50;
}'''
    }

    # Create all files
    for file_path, content in files.items():
        full_path = os.path.join(root_dir, file_path)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

    print(f"Project structure created in '{root_dir}' directory")
    print("\nNext steps:")
    print("1. Navigate to the project directory: cd subscription-demo")
    print("2. Create a .gitignore file to exclude .env.local and node_modules")
    print("3. Install dependencies: npm install")
    print("4. Add your environment variables to .env.local")
    print("5. Run the development server: npm run dev")

if __name__ == "__main__":
    create_project_structure()
