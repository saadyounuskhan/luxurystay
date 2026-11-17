export default function Loader({ full = false }) {
  return (
    <div className={`flex items-center justify-center ${full ? 'min-h-screen' : 'py-12'}`} role="status">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-gold" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
