import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <div className="text-sm font-semibold text-accent">404</div>
      <h1 className="text-3xl font-semibold mt-2">This page could not be found.</h1>
      <Link href="/" className="press inline-block mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold" data-testid="link-home-404">Back to the library</Link>
    </div>
  );
}
