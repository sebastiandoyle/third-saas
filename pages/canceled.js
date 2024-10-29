export default function Canceled() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Subscription canceled</h1>
      <p>Your subscription was not completed.</p>
      <a href="/" className="text-blue-500 hover:underline">
        Return to homepage
      </a>
    </div>
  );
}