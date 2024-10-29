export default function Success() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Thank you for subscribing!</h1>
      <p>You now have access to premium content.</p>
      <a href="/" className="text-blue-500 hover:underline">
        Return to homepage
      </a>
    </div>
  );
}