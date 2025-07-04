export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Test Page Working! ✅
        </h1>
        <p className="text-gray-600">
          If you can see this, the basic Next.js setup is working correctly.
        </p>
        <div className="mt-4 p-4 bg-green-100 rounded">
          <p className="text-green-800">
            This confirms that Tailwind CSS and basic rendering are functional.
          </p>
        </div>
      </div>
    </div>
  );
} 