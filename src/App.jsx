import SpendingTracker from "./SpendingTracker.jsx";

export default function App() {
  return (
    <div
      className="min-h-screen p-4 sm:p-8"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(56, 120, 140, 0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(90, 60, 140, 0.18), transparent 50%), linear-gradient(160deg, #07090f 0%, #0d1118 45%, #12161f 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <SpendingTracker />
      </div>
    </div>
  );
}
